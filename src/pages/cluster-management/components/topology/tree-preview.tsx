import { AutoTooltip, IconFont } from '@gpustack/core-ui';
import { useIntl } from '@umijs/max';
import { Button, Empty, Flex, Spin, Tag, Tree } from 'antd';
import { useMemo } from 'react';
import {
  NODE_LAYER,
  TopologyDomain,
  TopologyPreview
} from '../../config/types';

interface TreePreviewProps {
  data?: TopologyPreview | null;
  loading?: boolean;
  /**
   * Opens the bulk-labelling flow for the workers behind an unclassified
   * bucket. The whole reason the API hands the ids back: without a direct
   * entry point, acting on "20 workers are missing this label" is a hunt
   * through the worker list.
   */
  onLabelWorkers?: (workerIds: number[], missingKeys: string[]) => void;
}

/**
 * The right-hand column: what the declaration on the left actually does.
 *
 * Three things have to be visible without a click, because they are what the
 * operator came to find out:
 *
 * 1. **Capacity per domain.** The real question is "does my 2P2D fit in one
 *    rack", and a tree of names cannot answer it.
 * 2. **The unclassified bucket as its own node**, naming the key it is missing
 *    and offering the fix. It is the failure this feature is most likely to
 *    hit and the one that reports nothing on its own.
 * 3. **Which any-of key matched.** The any-of list is what lets a mixed fleet
 *    work; without showing the winner the operator cannot tell which spelling
 *    applied to which rack.
 *
 * Workers are collapsed by default — forty of them expanded is not a view of
 * anything.
 */
const TreePreview: React.FC<TreePreviewProps> = ({
  data,
  loading,
  onLabelWorkers
}) => {
  const intl = useIntl();

  const treeData = useMemo(() => {
    if (!data?.root) {
      return [];
    }

    const render = (node: TopologyDomain, path: string): any => {
      const key = `${path}/${node.layer}:${node.name}`;
      const isLeaf = node.layer === NODE_LAYER;
      const missingKeys = data.label_keys?.[node.layer] || [];

      return {
        key,
        // A domain with no children still gets `isLeaf` from the layer, not
        // from the child count: an empty rack is a rack, and rendering it as a
        // worker would misreport the shape of the fleet.
        isLeaf,
        title: (
          <Flex align="center" gap={8} style={{ width: '100%' }}>
            {node.unclassified ? (
              <>
                <IconFont
                  type="icon-exclamation-circle"
                  style={{ color: 'var(--ant-color-warning)' }}
                />
                <span style={{ color: 'var(--ant-color-warning-text)' }}>
                  {intl.formatMessage({ id: 'clusters.topology.unclassified' })}
                </span>
              </>
            ) : (
              <AutoTooltip ghost title={node.name} minWidth={20}>
                {node.name}
              </AutoTooltip>
            )}

            <span className="text-tertiary">
              {intl.formatMessage(
                { id: 'clusters.topology.preview.capacity' },
                {
                  workers: node.workers,
                  gpus: node.gpus,
                  free: node.free_gpus
                }
              )}
            </span>

            {/* Which spelling won, when the layer declares more than one. A
                single declared key needs no annotation — it is not a choice. */}
            {node.matched_label_key && missingKeys.length > 1 && (
              <Tag bordered={false}>{node.matched_label_key}</Tag>
            )}

            {node.unclassified && (
              <>
                <span className="text-tertiary">
                  {intl.formatMessage(
                    { id: 'clusters.topology.unclassified.missing' },
                    { keys: missingKeys.join(' / ') }
                  )}
                </span>
                {!!onLabelWorkers && !!node.worker_ids?.length && (
                  <Button
                    type="link"
                    size="small"
                    onClick={(e) => {
                      // The node is inside a Tree row; without this the click
                      // also toggles the branch it sits on.
                      e.stopPropagation();
                      onLabelWorkers(node.worker_ids || [], missingKeys);
                    }}
                  >
                    {intl.formatMessage({
                      id: 'clusters.topology.unclassified.label'
                    })}
                  </Button>
                )}
              </>
            )}
          </Flex>
        ),
        children: (node.children || []).map((child) => render(child, key))
      };
    };

    const root = render(data.root, '');
    return [
      {
        ...root,
        title: (
          <Flex align="center" gap={8}>
            <span>
              {intl.formatMessage({ id: 'clusters.topology.cluster' })}
            </span>
            <span className="text-tertiary">
              {intl.formatMessage(
                { id: 'clusters.topology.preview.capacity' },
                {
                  workers: data.root.workers,
                  gpus: data.root.gpus,
                  free: data.root.free_gpus
                }
              )}
            </span>
          </Flex>
        )
      }
    ];
  }, [data, intl, onLabelWorkers]);

  /**
   * Expanded down to the domain layer and no further. The layer list is
   * root-to-leaf with the leaf last, so every key whose node is above the leaf
   * is open and the workers stay folded.
   */
  const defaultExpanded = useMemo(() => {
    const keys: string[] = [];
    const walk = (node: TopologyDomain, path: string) => {
      const key = `${path}/${node.layer}:${node.name}`;
      if (node.layer !== NODE_LAYER) {
        keys.push(key);
      }
      (node.children || []).forEach((child) => walk(child, key));
    };
    if (data?.root) {
      walk(data.root, '');
    }
    return keys;
  }, [data]);

  if (loading && !data) {
    return (
      <Flex align="center" justify="center" style={{ minHeight: 240 }}>
        <Spin />
      </Flex>
    );
  }

  if (!data?.total_workers) {
    return (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description={intl.formatMessage({
          id: 'clusters.topology.preview.noWorkers'
        })}
      />
    );
  }

  return (
    <Spin spinning={!!loading}>
      {/* The number the page leads with. Deduplicated server-side, so a worker
          missing two labels is counted once — it is one worker to go and
          label, not two problems. Deliberately not an error: an unclassified
          worker still schedules, it just cannot be told apart from its
          neighbours. */}
      {!!data.unclassified_workers && (
        <Flex align="center" gap={6} style={{ marginBottom: 12 }}>
          <IconFont
            type="icon-exclamation-circle"
            style={{ color: 'var(--ant-color-warning)' }}
          />
          <span>
            {intl.formatMessage(
              { id: 'clusters.topology.unclassified.summary' },
              {
                count: data.unclassified_workers,
                total: data.total_workers
              }
            )}
          </span>
        </Flex>
      )}
      <Tree
        treeData={treeData}
        // Keyed on the declaration's shape so editing a labelKey re-opens the
        // new tree instead of leaving the operator staring at collapsed
        // branches after every keystroke.
        key={defaultExpanded.join('|')}
        defaultExpandedKeys={defaultExpanded}
        selectable={false}
        blockNode
      />
    </Spin>
  );
};

export default TreePreview;
