import { LockOutlined, WarningOutlined } from '@ant-design/icons';
import { AutoTooltip } from '@gpustack/core-ui';
import { useIntl } from '@umijs/max';
import { Button, Empty, Flex, Segmented, Tree } from 'antd';
import { createStyles } from 'antd-style';
import { useState } from 'react';
import {
  ACCELERATOR_DOMAIN,
  NODE_LAYER,
  TopologyDomain,
  TopologyView,
  TopologyWorker
} from '../../config/types';
import { LocationField, isDiscovered, shownValue } from './location';

/** Hosts shown per domain before "N more". Forty expanded is not a view. */
const HOSTS_PREVIEW = 3;

/** The nested tree; any other value is a field id to group flat by. */
export const TREE_GROUPING = 'tree';

const useStyles = createStyles(({ css }) => ({
  tree: css`
    .ant-tree-treenode {
      width: 100%;
      padding-block: 2px;
    }
    .ant-tree-node-content-wrapper {
      flex: 1;
      min-width: 0;
    }
    .row {
      display: flex;
      align-items: center;
      gap: 12px;
      width: 100%;
      min-width: 0;
    }
    .label {
      flex-shrink: 0;
    }
    .meta {
      color: var(--ant-color-text-tertiary);
      font-size: 12px;
      white-space: nowrap;
    }
    .tail {
      margin-left: auto;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      color: var(--ant-color-text-tertiary);
      font-size: 12px;
      white-space: nowrap;
    }
    .warn {
      color: var(--ant-color-warning);
    }
    .host {
      cursor: pointer;
      &:hover {
        color: var(--ant-color-primary);
      }
    }
  `
}));

interface TreeViewProps {
  view: TopologyView;
  fields: LocationField[];
  /** After the toolbar's search and filter. */
  workers: TopologyWorker[];
  grouping: string;
  onGroupingChange: (grouping: string) => void;
  /** Switch to the table and point at this row. The tree is for checking. */
  onHostClick: (worker: TopologyWorker) => void;
  /** The bucket's "set location": select its hosts and open the batch panel. */
  onSetLocation: (workers: TopologyWorker[], field: string) => void;
}

interface Group {
  key: string;
  label: React.ReactNode;
  workers: TopologyWorker[];
  unfilledField?: string;
  tail?: React.ReactNode;
  children?: Group[];
}

/**
 * [S1b] The same workers, grouped two ways, because a domain may span racks
 * and one tree would lose a dimension. Both are computed here from `workers`
 * — switching costs no request, and the toolbar's filter applies to both.
 * Nothing is edited on the tree (P8): clicking a host goes back to its row.
 */
const TreeView: React.FC<TreeViewProps> = ({
  view,
  fields,
  workers,
  grouping,
  onGroupingChange,
  onHostClick,
  onSetLocation
}) => {
  const intl = useIntl();
  const { styles } = useStyles();
  const [expanded, setExpanded] = useState<string[] | null>(null);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());

  const byId = new Map(workers.map((worker) => [worker.id, worker]));
  const fieldLabel = (id: string) =>
    fields.find((field) => field.id === id)?.label ||
    (id === ACCELERATOR_DOMAIN
      ? intl.formatMessage({ id: 'clusters.topology.field.acceleratorDomain' })
      : id);

  const capacity = (list: TopologyWorker[]) =>
    intl.formatMessage(
      { id: 'clusters.topology.preview.capacity' },
      {
        workers: list.length,
        gpus: list.reduce((sum, w) => sum + (w.gpus || 0), 0),
        free: list.reduce((sum, w) => sum + (w.free_gpus || 0), 0)
      }
    );

  const distinct = (list: TopologyWorker[], field: string) =>
    Array.from(
      new Set(list.map((w) => shownValue(w.location?.[field])).filter(Boolean))
    );

  /** Which other field to list on a group's tail: domains under a rack, racks under a domain. */
  const crossField = (field: string) =>
    field === ACCELERATOR_DOMAIN ? 'rack' : ACCELERATOR_DOMAIN;

  const groupTail = (field: string, list: TopologyWorker[]) => {
    const other = crossField(field);
    const values = distinct(list, other);
    if (!values.length) {
      return null;
    }
    return (
      <>
        <span>
          {fieldLabel(other)}: {values.join(' · ')}
        </span>
        {field !== ACCELERATOR_DOMAIN && values.length > 1 && (
          <span className="warn">
            <WarningOutlined style={{ marginRight: 4 }} />
            {intl.formatMessage(
              { id: 'clusters.topology.tree.spansDomains' },
              { count: values.length }
            )}
          </span>
        )}
      </>
    );
  };

  const allDiscovered = (list: TopologyWorker[], field: string) =>
    list.every((w) => isDiscovered(w.location?.[field]));

  const bucketLabel = (field: string) =>
    field === ACCELERATOR_DOMAIN
      ? intl.formatMessage({ id: 'clusters.topology.tree.unknownDomain' })
      : intl.formatMessage(
          { id: 'clusters.topology.tree.unfilled' },
          { field: fieldLabel(field) }
        );

  /** Flat: one group per value of `field`, plus the unfilled bucket. */
  const flatGroups = (field: string, list: TopologyWorker[]): Group[] => {
    const map = new Map<string, TopologyWorker[]>();
    const unfilled: TopologyWorker[] = [];
    list.forEach((worker) => {
      const value = worker.location?.[field]?.value;
      if (!value) {
        unfilled.push(worker);
        return;
      }
      map.set(value, [...(map.get(value) || []), worker]);
    });
    const groups: Group[] = Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([value, members]) => ({
        key: `${field}:${value}`,
        label: (
          <>
            <span>
              {fieldLabel(field)} {shownValue(members[0].location[field])}
            </span>
            {allDiscovered(members, field) && (
              <LockOutlined className="text-tertiary" />
            )}
          </>
        ),
        workers: members,
        tail: groupTail(field, members)
      }));
    if (unfilled.length) {
      groups.push({
        key: `${field}:<unfilled>`,
        label: bucketLabel(field),
        workers: unfilled,
        unfilledField: field
      });
    }
    return groups;
  };

  /** Nested: the server's tree, re-counted over the filtered workers. */
  const nestedGroups = (node: TopologyDomain, path: string): Group | null => {
    const key = `${path}/${node.layer}:${node.name}`;
    const children = (node.children || [])
      .filter((child) => child.layer !== NODE_LAYER)
      .map((child) => nestedGroups(child, key))
      .filter(Boolean) as Group[];
    const leaves = (node.children || [])
      .filter((child) => child.layer === NODE_LAYER)
      .flatMap((child) => child.worker_ids || [])
      .map((id) => byId.get(id))
      .filter(Boolean) as TopologyWorker[];
    const members = [...leaves, ...children.flatMap((c) => c.workers)];
    if (!members.length) {
      return null;
    }
    return {
      key,
      label: node.unclassified
        ? bucketLabel(node.layer)
        : `${fieldLabel(node.layer)} ${node.name}`,
      workers: members,
      unfilledField: node.unclassified ? node.layer : undefined,
      tail: node.unclassified ? null : groupTail(node.layer, members),
      children: children.length ? children : undefined
    };
  };

  const groups: Group[] =
    grouping === TREE_GROUPING
      ? ((view.tree?.children || [])
          .filter((child) => child.layer !== NODE_LAYER)
          .map((child) => nestedGroups(child, ''))
          .filter(Boolean) as Group[])
      : flatGroups(grouping, workers);

  // Hosts directly under the root (no layer active at all) in nested mode.
  const rootHosts =
    grouping === TREE_GROUPING
      ? ((view.tree?.children || [])
          .filter((child) => child.layer === NODE_LAYER)
          .flatMap((child) => child.worker_ids || [])
          .map((id) => byId.get(id))
          .filter(Boolean) as TopologyWorker[])
      : [];

  const hostNode = (worker: TopologyWorker, parentKey: string) => {
    const other = grouping === ACCELERATOR_DOMAIN ? 'rack' : ACCELERATOR_DOMAIN;
    const location = worker.location?.[other];
    return {
      key: `${parentKey}/host:${worker.id}`,
      isLeaf: true,
      selectable: false,
      title: (
        <span className="row host" onClick={() => onHostClick(worker)}>
          <AutoTooltip ghost title={worker.name} minWidth={20}>
            {worker.name}
          </AutoTooltip>
          {location?.value && (
            <span className="meta">
              {isDiscovered(location) && <LockOutlined />} {fieldLabel(other)}{' '}
              {shownValue(location)}
            </span>
          )}
          <span className="tail">
            {intl.formatMessage(
              { id: 'clusters.topology.tree.hostCapacity' },
              { gpus: worker.gpus, free: worker.free_gpus }
            )}
          </span>
        </span>
      )
    };
  };

  const hostNodes = (list: TopologyWorker[], parentKey: string): any[] => {
    const shown = revealed.has(parentKey) ? list : list.slice(0, HOSTS_PREVIEW);
    const nodes: any[] = shown.map((worker) => hostNode(worker, parentKey));
    if (shown.length < list.length) {
      nodes.push({
        key: `${parentKey}/more`,
        isLeaf: true,
        selectable: false,
        title: (
          <Button
            type="link"
            size="small"
            style={{ padding: 0 }}
            onClick={() => setRevealed(new Set([...revealed, parentKey]))}
          >
            {intl.formatMessage(
              { id: 'clusters.topology.tree.more' },
              { count: list.length - shown.length }
            )}
          </Button>
        )
      });
    }
    return nodes;
  };

  const groupNode = (group: Group): any => ({
    key: group.key,
    selectable: false,
    title: (
      <span className="row">
        <span className="label">
          {group.unfilledField && (
            <WarningOutlined className="warn" style={{ marginRight: 6 }} />
          )}
          {group.label}
        </span>
        <span className="meta">{capacity(group.workers)}</span>
        <span className="tail">
          {group.tail}
          {group.unfilledField && (
            <Button
              type="link"
              size="small"
              style={{ padding: 0 }}
              onClick={(e) => {
                e.stopPropagation();
                onSetLocation(group.workers, group.unfilledField!);
              }}
            >
              {intl.formatMessage({ id: 'clusters.topology.batch.button' })}
            </Button>
          )}
        </span>
      </span>
    ),
    children: group.children
      ? group.children.map(groupNode)
      : hostNodes(group.workers, group.key)
  });

  const treeData = [
    {
      key: 'root',
      selectable: false,
      title: (
        <span className="row">
          <span className="label">
            {intl.formatMessage({ id: 'clusters.topology.cluster' })}
          </span>
          <span className="meta">{capacity(workers)}</span>
        </span>
      ),
      children: [...groups.map(groupNode), ...hostNodes(rootHosts, 'root')]
    }
  ];

  const allGroupKeys: string[] = ['root'];
  const collect = (list: Group[]) =>
    list.forEach((group) => {
      allGroupKeys.push(group.key);
      if (group.children) {
        collect(group.children);
      }
    });
  collect(groups);

  const options = [
    {
      value: TREE_GROUPING,
      label: intl.formatMessage({ id: 'clusters.topology.tree.byLayer' })
    },
    {
      value: ACCELERATOR_DOMAIN,
      label: intl.formatMessage({ id: 'clusters.topology.tree.byDomain' })
    }
  ];
  if (grouping !== TREE_GROUPING && grouping !== ACCELERATOR_DOMAIN) {
    options.push({
      value: grouping,
      label: intl.formatMessage(
        { id: 'clusters.topology.tree.byField' },
        { field: fieldLabel(grouping) }
      )
    });
  }

  return (
    <Flex orientation="vertical" gap={12}>
      <Flex align="center" justify="space-between">
        <Segmented
          size="small"
          value={grouping}
          options={options}
          onChange={(value) => onGroupingChange(value as string)}
        />
        <Flex gap={4}>
          <Button
            type="link"
            size="small"
            onClick={() => setExpanded(allGroupKeys)}
          >
            {intl.formatMessage({ id: 'clusters.topology.tree.expandAll' })}
          </Button>
          <Button
            type="link"
            size="small"
            onClick={() => setExpanded(['root'])}
          >
            {intl.formatMessage({ id: 'clusters.topology.tree.collapseAll' })}
          </Button>
        </Flex>
      </Flex>
      {workers.length ? (
        <Tree
          className={styles.tree}
          treeData={treeData}
          blockNode
          selectable={false}
          // Down to the domain level by default: hosts stay folded.
          expandedKeys={expanded ?? allGroupKeys}
          onExpand={(keys) => setExpanded(keys as string[])}
        />
      ) : (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={intl.formatMessage({
            id: 'clusters.topology.preview.noWorkers'
          })}
        />
      )}
    </Flex>
  );
};

export default TreeView;
