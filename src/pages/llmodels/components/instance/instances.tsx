import { ListItem as WorkerListItem } from '@/pages/resources/config/types';
import _ from 'lodash';
import React, { useEffect, useMemo } from 'react';
import styled from 'styled-components';
import { ModelInstanceListItem } from '../../config/types';
import '../../style/instance-item.less';
import GroupSummary from '../pd/group-summary';
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
}

const Instances: React.FC<InstanceItemProps> = ({
  list,
  workerList,
  modelData,
  currentExpanded,
  gridTemplate,
  prefixWidth,
  columns,
  handleChildSelect
}) => {
  const [firstLoad, setFirstLoad] = React.useState(true);

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
      <GroupSummary
        modelData={modelData}
        instances={list}
        gridTemplate={gridTemplate}
        prefixWidth={prefixWidth}
        columnCount={columnCount}
      ></GroupSummary>
      {groups.map((group) => (
        <React.Fragment key={group.item.name}>
          <RoleGroupHeader
            item={group.item}
            gridTemplate={gridTemplate}
            prefixWidth={prefixWidth}
            columnCount={columnCount}
          ></RoleGroupHeader>
          {group.instances.map(renderInstance)}
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
