import { ListItem as WorkerListItem } from '@/pages/resources/config/types';
import _ from 'lodash';
import React, { useEffect, useMemo } from 'react';
import styled from 'styled-components';
import { ModelInstanceListItem } from '../../config/types';
import '../../style/instance-item.less';
import RoleGroupHeader from '../pd/role-group-header';
import { orderedRoleStatus } from '../pd/role-status';
import InstanceItem from './instance-item';

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
`;

interface InstanceItemProps {
  list: ModelInstanceListItem[];
  workerList: WorkerListItem[];
  modelData?: any;
  currentExpanded?: string;
  gridTemplate?: string;
  prefixWidth?: number;
  columns?: any[];
  handleChildSelect: (val: string, item: ModelInstanceListItem) => void;
  /**
   * Hands the loaded members back up so the collapsed row above can use them.
   *
   * The table owns this data and does not expose it — `renderChildren` is the
   * only place it surfaces, and it has no change callback. The replica cell
   * lives in a column, two levels away, and would otherwise have nothing but
   * `role_status` to render a state from. Reporting it from here is the only
   * seam that exists.
   */
  onInstancesChange?: (modelId: number, list: ModelInstanceListItem[]) => void;
}

const Instances: React.FC<InstanceItemProps> = ({
  list,
  workerList,
  modelData,
  currentExpanded,
  gridTemplate,
  prefixWidth,
  columns,
  handleChildSelect,
  onInstancesChange
}) => {
  const [firstLoad, setFirstLoad] = React.useState(true);
  // Which role groups the user has folded away. Every group starts open: the
  // expanded row was opened to see the members, so opening it onto a column of
  // headings would answer nothing.
  const [collapsed, setCollapsed] = React.useState<Set<string>>(new Set());

  const toggleRole = (name: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (!next.delete(name)) {
        next.add(name);
      }
      return next;
    });
  };

  const defaultOpenId = useMemo(() => {
    if (!currentExpanded) {
      return '';
    }
    const current = _.find(
      list,
      (item: ModelInstanceListItem) => item.worker_id
    );
    return current ? current.name : '';
  }, [currentExpanded, list]);

  useEffect(() => {
    setFirstLoad(false);
  }, []);

  // 🔑 An effect, and one of the few places that is the right tool: this is
  // not an effect *triggering* work, it is data that arrived by way of the
  // table's own loader being reported onward. There is no user action to hang
  // it off — the table fetches and re-fetches the children itself — and
  // calling the parent during render would be a write in someone else's
  // render pass.
  //
  // Keyed on `list`, so a member going starting -> running reaches the
  // tooltip too, rather than freezing at whatever the row said when it was
  // first opened.
  useEffect(() => {
    if (modelData?.id) {
      onInstancesChange?.(modelData.id, list);
    }
  }, [list, modelData?.id, onInstancesChange]);

  const renderInstance = (item: ModelInstanceListItem) => (
    <InstanceItem
      key={item.name}
      modelData={modelData}
      workerList={workerList}
      instanceData={item}
      defaultOpenId={firstLoad ? defaultOpenId : ''}
      handleChildSelect={handleChildSelect}
      gridTemplate={gridTemplate}
      prefixWidth={prefixWidth}
      columns={columns}
    ></InstanceItem>
  );

  // A model without roles is the flat list it has always been: same wrapper,
  // same rows, no summary bar and no headings. Everything below is additive and
  // reached only through this flag.
  if (!modelData?.roles?.length) {
    return <Wrapper>{_.map(list, renderInstance)}</Wrapper>;
  }

  // Group by role, in the order the roles run in, with `role_status` as the
  // authority for which roles exist and how many members each was asked for —
  // a role whose members have not been created yet still gets its heading, and
  // an instance whose role the spec no longer mentions still gets rendered.
  const columnCount = columns?.length ?? 0;
  const byRole = _.groupBy(
    list,
    (item: ModelInstanceListItem) => item.role || ''
  );
  const groups = orderedRoleStatus(modelData.role_status, modelData.roles).map(
    (item) => ({ item, instances: byRole[item.name] || [] })
  );
  const named = new Set(groups.map((group) => group.item.name));
  const ungrouped = _.flatMap(
    Object.keys(byRole).filter((role) => !named.has(role)),
    (role: string) => byRole[role]
  );

  return (
    <Wrapper>
      {/* No group-level bar here: the expansion is role headings and their
          members, nothing else. A `GroupSummary` panel once led it — PD
          effectiveness, KV transfer rate and per-member request counts, read
          from Prometheus on expand — and was removed along with its two hooks
          once the hold on rendering it turned permanent. The server side is
          untouched, so `GET /models/{id}/pd-metrics` and `POST
          /models/kv-transfer-budget` still answer if it is ever reinstated. */}
      {groups.map((group) => (
        <React.Fragment key={group.item.name}>
          <RoleGroupHeader
            item={group.item}
            gridTemplate={gridTemplate}
            prefixWidth={prefixWidth}
            columnCount={columnCount}
            collapsed={collapsed.has(group.item.name)}
            // No handler when there is nothing to hide, which is what turns
            // the caret off in the heading.
            onToggle={
              group.instances.length
                ? () => toggleRole(group.item.name)
                : undefined
            }
          ></RoleGroupHeader>
          {!collapsed.has(group.item.name) &&
            group.instances.map(renderInstance)}
        </React.Fragment>
      ))}
      {/* Members the role list does not account for. Rendered without a
          heading rather than dropped — hiding a running instance is the one
          thing this view must never do. */}
      {ungrouped.map(renderInstance)}
    </Wrapper>
  );
};
export default Instances;
