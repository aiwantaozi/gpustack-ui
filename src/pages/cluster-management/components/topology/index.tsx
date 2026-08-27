import { GSDrawer, ModalFooter, useAppUtils } from '@gpustack/core-ui';
import { useIntl } from '@umijs/max';
import { Alert, Col, Row, message } from 'antd';
import { useCallback, useEffect, useRef, useState } from 'react';
import { previewClusterTopology, updateCluster } from '../../apis';
import {
  ClusterListItem,
  ClusterTopology,
  TopologyLayer,
  TopologyPreview
} from '../../config/types';
import LayerList from './layer-list';
import TreePreview from './tree-preview';

interface TopologyDrawerProps {
  open: boolean;
  cluster?: ClusterListItem | null;
  onClose: () => void;
  onLabelWorkers?: (workerIds: number[], missingKeys: string[]) => void;
}

/** How long to sit on a keystroke before redrawing the tree. */
const PREVIEW_DEBOUNCE_MS = 400;

/**
 * The default template: two layers, not four.
 *
 * Offering an empty list invites an operator to model their whole datacentre,
 * and depth past the rack buys nothing on hardware where the host is already
 * the tightest domain — measured on Ascend 910B2, all eight cards inside a
 * node are HCCS-connected, so `hostname` *is* the tight domain and a "chassis"
 * layer between them would be a distinction the fabric does not make.
 */
const DEFAULT_TEMPLATE: TopologyLayer[] = [
  {
    name: 'Rack',
    labelKeys: ['topology.gpustack.ai/rack', 'topology.kubernetes.io/zone'],
    parentLayer: null
  }
];

/**
 * Declaration and preview on one screen.
 *
 * A two-step wizard was the obvious shape and is the wrong one: the operator's
 * actual loop is "change a key, see who falls out of the bucket", and splitting
 * it means committing a guess to a live cluster to find out. That is also why
 * the preview endpoint is a POST carrying the *unsaved* declaration.
 */
const TopologyDrawer: React.FC<TopologyDrawerProps> = ({
  open,
  cluster,
  onClose,
  onLabelWorkers
}) => {
  const intl = useIntl();
  const { getRuleMessage } = useAppUtils();
  const [layers, setLayers] = useState<TopologyLayer[]>([]);
  const [preview, setPreview] = useState<TopologyPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Rotated on every open and on every fetch. A drawer closed and reopened, or
   * a keystroke landing while the previous preview is in flight, must not have
   * the stale answer paint over the fresh one.
   */
  const sessionRef = useRef(0);
  const timerRef = useRef<any>(null);

  const runPreview = useCallback(
    async (candidate: TopologyLayer[]) => {
      if (!cluster?.id) {
        return;
      }
      const session = ++sessionRef.current;
      setLoading(true);
      try {
        const named = candidate.filter((layer) => (layer.name || '').trim());
        const result = await previewClusterTopology({
          id: cluster.id,
          // An empty declaration is meaningful, not missing: it previews the
          // tree with no layers at all (one leaf per worker), which is what
          // clearing the list is asking to see. Sending null would silently
          // preview the *saved* one instead.
          topology: { layers: named }
        });
        if (sessionRef.current !== session) {
          return;
        }
        setPreview(result);
        setError(null);
      } catch (e: any) {
        if (sessionRef.current !== session) {
          return;
        }
        // A declaration that cannot become a tree (a fork, a dangling parent).
        // Shown inline rather than as a toast: it is a property of what is on
        // screen, and it clears itself as the operator types.
        setError(
          e?.response?.data?.message ||
            e?.message ||
            intl.formatMessage({ id: 'clusters.topology.preview.failed' })
        );
      } finally {
        if (sessionRef.current === session) {
          setLoading(false);
        }
      }
    },
    [cluster?.id, intl]
  );

  useEffect(() => {
    if (!open) {
      sessionRef.current += 1;
      clearTimeout(timerRef.current);
      setPreview(null);
      setError(null);
      return;
    }
    const saved = (cluster?.topology?.layers || []) as TopologyLayer[];
    const initial = saved.length ? saved : DEFAULT_TEMPLATE;
    setLayers(initial);
    runPreview(initial);
    // Deliberately keyed on `open` alone. Re-running on `cluster` would refetch
    // whenever the list behind the drawer polls and hands down a new object.
  }, [open]);

  const handleLayersChange = (next: TopologyLayer[]) => {
    setLayers(next);
    // Debounced, because this fires per keystroke inside a label key and the
    // preview walks every worker in the cluster.
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => runPreview(next), PREVIEW_DEBOUNCE_MS);
  };

  const handleSave = async () => {
    if (!cluster?.id) {
      return;
    }
    const named = layers.filter((layer) => (layer.name || '').trim());
    const topology: ClusterTopology = {
      ...(cluster.topology || {}),
      layers: named
    };
    setSaving(true);
    try {
      // The whole cluster, not a patch: the endpoint is a PUT and takes the
      // full resource, so sending only `topology` would blank every other
      // field.
      await updateCluster({
        id: cluster.id,
        data: { ...(cluster as any), topology } as any
      });
      message.success(intl.formatMessage({ id: 'common.message.success' }));
      onClose();
    } catch (e: any) {
      message.error(
        e?.response?.data?.message ||
          intl.formatMessage({ id: 'common.message.error' })
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <GSDrawer
      title={intl.formatMessage({ id: 'clusters.topology.title' })}
      open={open}
      onClose={onClose}
      destroyOnHidden
      styles={{ wrapper: { width: 1080 } }}
      footer={
        <ModalFooter
          onCancel={onClose}
          onOk={handleSave}
          okText={intl.formatMessage({ id: 'common.button.save' })}
          loading={saving}
        />
      }
    >
      {/* §2.5.5 detail 2, and it has to be said on this screen rather than in
          release notes: tightening the topology relocates nothing. The members
          of a running group already hold their workers, and nothing re-places
          them. Saying so here is also why `gather` is excluded from the spec
          digest — a digest bump would restart every member to move none. */}
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message={intl.formatMessage({ id: 'clusters.topology.noRebalance' })}
      />
      {error && (
        <Alert
          type="warning"
          showIcon
          closable
          style={{ marginBottom: 16 }}
          message={error}
          onClose={() => setError(null)}
        />
      )}
      <Row gutter={24}>
        <Col span={11}>
          <LayerList layers={layers} onChange={handleLayersChange} />
        </Col>
        <Col span={13}>
          <TreePreview
            data={preview}
            loading={loading}
            onLabelWorkers={onLabelWorkers}
          />
        </Col>
      </Row>
    </GSDrawer>
  );
};

export default TopologyDrawer;
