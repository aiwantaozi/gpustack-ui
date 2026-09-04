import {
  DownOutlined,
  InfoCircleOutlined,
  WarningOutlined
} from '@ant-design/icons';
import { GSDrawer, useWindowResize } from '@gpustack/core-ui';
import { useIntl } from '@umijs/max';
import { useSize } from 'ahooks';
import {
  Alert,
  Button,
  Checkbox,
  Flex,
  Input,
  Modal,
  Segmented,
  Spin,
  Tooltip,
  message
} from 'antd';
import { createStyles } from 'antd-style';
import { useEffect, useRef, useState } from 'react';
import { topologyFieldLabel } from '../../config';
import {
  ACCELERATOR_DOMAIN,
  NODE_LAYER,
  TopologyView,
  TopologyWorker
} from '../../config/types';
import AdvancedDrawer from './advanced';
import CustomLayer, { CustomLayerValue } from './advanced/custom-layer';
import {
  DraftLayer,
  draftFromView,
  insertLayer,
  removeLayer,
  toWire
} from './advanced/draft';
import ColumnSettings from './column-settings';
import useColumnPrefs from './hooks/use-column-prefs';
import usePreview from './hooks/use-preview';
import useTopology from './hooks/use-topology';
import { LocationField, allFields, isDiscovered, isFilled } from './location';
import LocationTable from './location-table';
import Onboarding from './onboarding';
import { SetLocationPopover } from './set-location';
import {
  SpecContext,
  loadSpecContext,
  modelsGatheringOn,
  saveTopologySpec
} from './spec';
import TreeView, { TREE_GROUPING } from './tree-view';

const VIEW_MODE_KEY = 'gpustack.topology.viewMode';
const ONBOARDING_KEY = 'gpustack.topology.onboarding.dismissed';
/** Below this viewport width the drawer takes the whole screen. */
const FULL_WIDTH_BELOW = 1280;
const DRAWER_WIDTH = 1080;
/** How long a row pointed at from elsewhere stays tinted. */
const HIGHLIGHT_MS = 3000;
/** The table's header row, which the virtual body's height must leave out. */
const TABLE_HEADER_HEIGHT = 40;

type ViewMode = 'table' | 'tree';

const useStyles = createStyles(({ css }) => ({
  root: css`
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
  `,
  fixed: css`
    flex-shrink: 0;
    padding-inline: 24px;
  `,
  body: css`
    flex: 1;
    min-height: 0;
    padding-inline: 24px;
    overflow: auto;
  `,
  /* The numbers sit on the title line so the chrome is two rows: this one and
     the toolbar. Normal weight and a size down, so the name stays the title. */
  title: css`
    .info {
      color: var(--ant-color-text-tertiary);
      font-size: 14px;
    }
    .overview {
      font-weight: 400;
      font-size: 13px;
    }
    .sep {
      color: var(--ant-color-text-quaternary);
    }
    .warn {
      color: var(--ant-color-warning);
    }
    .previewing {
      color: var(--ant-color-primary);
      font-weight: 400;
      font-size: 12px;
    }
  `,
  selection: css`
    border-top: 1px solid var(--ant-color-border-secondary);
    padding-block: 10px;
    background: var(--ant-color-bg-container);
  `
}));

interface TopologyDrawerProps {
  open: boolean;
  clusterId?: number | null;
  clusterName?: string | null;
  /** Point at this worker's row when opening from elsewhere. */
  highlightWorkerId?: number | null;
  onClose: () => void;
}

interface BatchState {
  open: boolean;
  field?: string;
  /** Remaining switch groups for "fill by access switch", one panel each. */
  queue: { field: string; workers: TopologyWorker[] }[];
}

/**
 * [S1] "Which rack is this machine in": a table of workers with a column per
 * location field, every cell saved the moment it is filled. No Save button
 * and no discard prompt, because nothing here is staged — the one place that
 * stages, the label-key mapping sub-drawer, has its own.
 */
const TopologyDrawer: React.FC<TopologyDrawerProps> = ({
  open,
  clusterId,
  clusterName,
  highlightWorkerId,
  onClose
}) => {
  const intl = useIntl();
  const { styles } = useStyles();
  const { size } = useWindowResize();

  const preview = usePreview({ clusterId });
  const topo = useTopology({
    clusterId,
    open,
    // A location write changes the workers the preview was computed over.
    onWrite: () => preview.active && preview.rerun()
  });
  const displayed: TopologyView | null = preview.preview ?? topo.topology;
  const prefs = useColumnPrefs(clusterId);

  const [viewMode, setViewMode] = useState<ViewMode>(
    () => (localStorage.getItem(VIEW_MODE_KEY) as ViewMode) || 'table'
  );
  const [search, setSearch] = useState('');
  const [onlyUnfilled, setOnlyUnfilled] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [grouping, setGrouping] = useState<string>(TREE_GROUPING);
  const [lastField, setLastField] = useState<string>('rack');
  const [batch, setBatch] = useState<BatchState>({ open: false, queue: [] });
  const [mappingOpen, setMappingOpen] = useState(false);
  const [customLayer, setCustomLayer] = useState<SpecContext | null>(null);
  const [highlightId, setHighlightId] = useState<number | null>(null);
  const [onboardingDismissed, setOnboardingDismissed] = useState(
    () => localStorage.getItem(ONBOARDING_KEY) === '1'
  );

  const searchRef = useRef<any>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const bodySize = useSize(bodyRef);
  const highlightTimer = useRef<any>(null);
  /** The first write of a session says once that nothing running moves. */
  const wroteOnceRef = useRef(false);

  const highlight = (id: number) => {
    clearTimeout(highlightTimer.current);
    setHighlightId(id);
    highlightTimer.current = setTimeout(
      () => setHighlightId(null),
      HIGHLIGHT_MS
    );
  };

  useEffect(() => {
    if (!open) {
      preview.reset();
      setSearch('');
      setOnlyUnfilled(false);
      setSelectedIds([]);
      setGrouping(TREE_GROUPING);
      setBatch({ open: false, queue: [] });
      setMappingOpen(false);
      setCustomLayer(null);
      setHighlightId(null);
      wroteOnceRef.current = false;
      return;
    }
    if (highlightWorkerId) {
      setViewMode('table');
      highlight(highlightWorkerId);
    }
  }, [open]);

  const changeViewMode = (mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem(VIEW_MODE_KEY, mode);
    // The selection survives a trip to the tree; only its action bar hides.
    setBatch({ open: false, queue: [] });
  };

  const everyField: LocationField[] = displayed
    ? allFields(intl, displayed)
    : [];
  const fields = everyField.filter(prefs.isShown);
  const allWorkers = displayed?.workers || [];
  const needle = search.trim().toLowerCase();
  const workers = allWorkers.filter(
    (worker) =>
      (!needle || worker.name.toLowerCase().includes(needle)) &&
      (!onlyUnfilled || fields.some((field) => !isFilled(worker, field.id)))
  );
  const selectedWorkers = allWorkers.filter((worker) =>
    selectedIds.includes(worker.id)
  );

  const rackLayer = displayed?.layers.find((layer) => layer.id === 'rack');
  const domainView = displayed?.accelerator_domain;
  const domainAllAuto = allWorkers
    .filter((worker) => worker.location?.[ACCELERATOR_DOMAIN])
    .every((worker) => isDiscovered(worker.location[ACCELERATOR_DOMAIN]));
  const anyHandFilled = allWorkers.some((worker) =>
    Object.values(worker.location || {}).some(
      (location) => location.source === 'user'
    )
  );

  const fieldLabel = (id: string) =>
    everyField.find((field) => field.id === id)?.label ||
    topologyFieldLabel(intl, id);

  const summarize = (
    field: LocationField,
    targets: TopologyWorker[],
    value: string | null
  ) => {
    if (targets.length === 1) {
      return value
        ? intl.formatMessage(
            { id: 'clusters.topology.toast.setOne' },
            { host: targets[0].name, field: field.label, value }
          )
        : intl.formatMessage(
            { id: 'clusters.topology.toast.clearedOne' },
            { host: targets[0].name, field: field.label }
          );
    }
    return value
      ? intl.formatMessage(
          { id: 'clusters.topology.toast.set' },
          { count: targets.length, field: field.label, value }
        )
      : intl.formatMessage(
          { id: 'clusters.topology.toast.cleared' },
          { count: targets.length, field: field.label }
        );
  };

  const assign = async (
    field: LocationField,
    targets: TopologyWorker[],
    value: string | null
  ) => {
    setLastField(field.id);
    const suffix = wroteOnceRef.current
      ? ''
      : intl.formatMessage({ id: 'clusters.topology.toast.firstWrite' });
    await topo.assign(
      [{ worker_ids: targets.map((w) => w.id), layer: field.id, value }],
      summarize(field, targets, value) + suffix
    );
    wroteOnceRef.current = true;
  };

  const openBatch = (targets: TopologyWorker[], field: string) => {
    setViewMode('table');
    setSelectedIds(targets.map((w) => w.id));
    setBatch({ open: true, field, queue: [] });
  };

  const handleBatchApply = async (fieldId: string, value: string | null) => {
    const field = fields.find((f) => f.id === fieldId);
    if (!field) {
      return;
    }
    try {
      await assign(field, selectedWorkers, value);
    } catch (e: any) {
      message.error(e?.message);
      return;
    }
    // The selection stays so the next field can be filled for the same hosts;
    // a queued switch group replaces it and reopens the panel.
    const [next, ...rest] = batch.queue;
    if (next) {
      setSelectedIds(next.workers.map((w) => w.id));
      setBatch({ open: true, field: next.field, queue: rest });
    } else {
      setBatch({ open: false, queue: [] });
    }
  };

  /**
   * "Fill by access switch": hosts without a rack, grouped by the switch the
   * device reported. The operator names each group's rack; the grouping was
   * the hard part and it is already done.
   */
  const fillBySwitch = (field: LocationField) => {
    const groups = new Map<string, TopologyWorker[]>();
    allWorkers
      .filter(
        (worker) => !isFilled(worker, field.id) && isFilled(worker, 'switch')
      )
      .forEach((worker) => {
        const key = worker.location.switch.value;
        groups.set(key, [...(groups.get(key) || []), worker]);
      });
    const queue = Array.from(groups.values()).map((members) => ({
      field: field.id,
      workers: members
    }));
    const [first, ...rest] = queue;
    if (!first) {
      return;
    }
    setSelectedIds(first.workers.map((w) => w.id));
    setBatch({ open: true, field: first.field, queue: rest });
  };

  const saveFailed = (e: any) =>
    message.error(
      e?.response?.data?.message ||
        intl.formatMessage({ id: 'clusters.topology.save.failed' })
    );

  /**
   * A layer a saved model gathers on cannot go: the model would fail
   * validation on its next save for a reason it cannot see from its form.
   * The view says who; an older server does not, and then we ask.
   */
  const deleteCustomLayer = async (field: LocationField) => {
    if (!clusterId || !topo.topology) {
      return;
    }
    const layer = topo.topology.layers.find((l) => l.id === field.id);
    if (!layer?.referenced_by_models) {
      const referencing = await modelsGatheringOn(clusterId, field.id);
      if (referencing.length) {
        Modal.warning({
          title: intl.formatMessage(
            { id: 'clusters.topology.custom.referenced' },
            { name: field.label }
          ),
          content: referencing.join('、')
        });
        return;
      }
    }
    try {
      const { cluster } = await loadSpecContext(clusterId);
      const draft = removeLayer(
        draftFromView(intl, topo.topology, cluster.topology),
        field.id
      );
      await saveTopologySpec(cluster, toWire(draft, cluster.topology));
    } catch (e) {
      saveFailed(e);
      return;
    }
    prefs.forget(field.id);
    message.success(
      intl.formatMessage(
        { id: 'clusters.topology.columns.deleted' },
        { name: field.label }
      )
    );
    topo.refresh();
  };

  const openCustomLayer = async () => {
    if (!clusterId) {
      return;
    }
    try {
      setCustomLayer(await loadSpecContext(clusterId));
    } catch (e) {
      saveFailed(e);
    }
  };

  const handleCustomOk = async (value: CustomLayerValue) => {
    if (!customLayer || !topo.topology) {
      return;
    }
    const { cluster } = customLayer;
    const layer: DraftLayer = {
      id: value.name,
      name: value.name,
      builtin: false,
      active: false,
      labelKeys: value.labelKeys,
      primaryKey: null,
      customised: true
    };
    const draft = insertLayer(
      draftFromView(intl, topo.topology, cluster.topology),
      layer,
      value.index
    );
    try {
      await saveTopologySpec(cluster, toWire(draft, cluster.topology));
    } catch (e) {
      saveFailed(e);
      return;
    }
    setCustomLayer(null);
    // The new column shows at once, empty: that is what it is for.
    prefs.setShown(value.name, true);
    topo.refresh();
  };

  const customChain =
    customLayer && topo.topology
      ? draftFromView(intl, topo.topology, customLayer.cluster.topology).chain
      : [];
  const reserved = topo.topology
    ? [
        ...(topo.topology.vocabulary?.fields || []).map((field) => field.id),
        ...topo.topology.layers
          .filter((layer) => layer.builtin)
          .map((layer) => layer.id),
        ACCELERATOR_DOMAIN,
        NODE_LAYER,
        'host'
      ]
    : [];

  const showOnboarding =
    viewMode === 'table' &&
    !!displayed?.workers?.length &&
    !anyHandFilled &&
    !onboardingDismissed;

  const dismissOnboarding = () => {
    localStorage.setItem(ONBOARDING_KEY, '1');
    setOnboardingDismissed(true);
  };

  const overviewLink = (text: React.ReactNode, onClick: () => void) => (
    <Button type="link" size="small" style={{ padding: 0 }} onClick={onClick}>
      {text}
    </Button>
  );

  const clearFilters = () => {
    setSearch('');
    setOnlyUnfilled(false);
  };

  const width = size.width < FULL_WIDTH_BELOW ? '100%' : DRAWER_WIDTH;

  const titleText = clusterName
    ? `${intl.formatMessage({ id: 'clusters.topology.title' })} · ${clusterName}`
    : intl.formatMessage({ id: 'clusters.topology.title' });

  const title = (
    <Flex
      component="span"
      align="center"
      gap={10}
      wrap
      className={styles.title}
    >
      <span>{titleText}</span>
      {/* Said on this screen rather than in release notes: filling a location
          relocates nothing already running. */}
      <Tooltip
        title={intl.formatMessage({ id: 'clusters.topology.noRebalance' })}
      >
        <InfoCircleOutlined className="info" />
      </Tooltip>
      {displayed && (
        <Flex component="span" align="center" gap={8} wrap className="overview">
          {overviewLink(
            intl.formatMessage(
              { id: 'clusters.topology.overview.workers' },
              { count: allWorkers.length }
            ),
            clearFilters
          )}
          {fields
            .filter((field) => field.id !== ACCELERATOR_DOMAIN)
            .map((field) => {
              const layer = displayed.layers.find((l) => l.id === field.id);
              if (!layer?.domains) {
                return null;
              }
              return (
                <Flex key={field.id} align="center" gap={8}>
                  <span className="sep">·</span>
                  {overviewLink(
                    intl.formatMessage(
                      { id: 'clusters.topology.overview.domains' },
                      { field: field.label, count: layer.domains }
                    ),
                    () => {
                      changeViewMode('tree');
                      setGrouping(
                        field.id === 'rack' ? TREE_GROUPING : field.id
                      );
                    }
                  )}
                </Flex>
              );
            })}
          {!!domainView?.domains && (
            <>
              <span className="sep">·</span>
              {overviewLink(
                intl.formatMessage(
                  {
                    id: domainAllAuto
                      ? 'clusters.topology.overview.acceleratorDomains.auto'
                      : 'clusters.topology.overview.acceleratorDomains'
                  },
                  { count: domainView.domains }
                ),
                () => {
                  changeViewMode('tree');
                  setGrouping(ACCELERATOR_DOMAIN);
                }
              )}
            </>
          )}
          {!!rackLayer?.unclassified && (
            <>
              <span className="sep">·</span>
              <WarningOutlined className="warn" />
              {overviewLink(
                <span className="warn">
                  {intl.formatMessage(
                    { id: 'clusters.topology.overview.unfilled' },
                    {
                      count: rackLayer.unclassified,
                      field: fieldLabel('rack')
                    }
                  )}
                </span>,
                () => {
                  changeViewMode('table');
                  setOnlyUnfilled(true);
                }
              )}
            </>
          )}
        </Flex>
      )}
      {preview.active && (
        <span className="previewing">
          {intl.formatMessage({ id: 'clusters.topology.previewing' })}
        </span>
      )}
    </Flex>
  );

  return (
    <GSDrawer
      title={title}
      open={open}
      onClose={onClose}
      destroyOnHidden
      styles={{
        wrapper: { width },
        body: { paddingBlock: 0, overflow: 'hidden' }
      }}
    >
      <div
        className={styles.root}
        onKeyDown={(e) => {
          // "/" anywhere in the drawer focuses the search, unless typing.
          const tag = (e.target as HTMLElement).tagName;
          if (e.key === '/' && tag !== 'INPUT' && tag !== 'TEXTAREA') {
            e.preventDefault();
            searchRef.current?.focus?.();
          }
        }}
      >
        <Flex
          align="center"
          gap={12}
          className={styles.fixed}
          style={{ paddingBlock: 12 }}
        >
          <Segmented
            value={viewMode}
            onChange={(value) => changeViewMode(value as ViewMode)}
            options={[
              {
                value: 'table',
                label: intl.formatMessage({
                  id: 'clusters.topology.view.table'
                })
              },
              {
                value: 'tree',
                label: intl.formatMessage({ id: 'clusters.topology.view.tree' })
              }
            ]}
          />
          <Input.Search
            ref={searchRef}
            allowClear
            style={{ width: 240 }}
            placeholder={intl.formatMessage({
              id: 'clusters.topology.search.placeholder'
            })}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Checkbox
            checked={onlyUnfilled}
            onChange={(e) => setOnlyUnfilled(e.target.checked)}
          >
            {intl.formatMessage({ id: 'clusters.topology.filter.unfilled' })}
          </Checkbox>
          <span style={{ marginLeft: 'auto' }}>
            <ColumnSettings
              disabled={!topo.topology}
              fields={everyField}
              isShown={prefs.isShown}
              onToggle={prefs.setShown}
              gpus={prefs.gpus}
              source={prefs.source}
              onGpus={prefs.setGpus}
              onSource={prefs.setSource}
              referencedBy={(id) =>
                topo.topology?.layers.find((layer) => layer.id === id)
                  ?.referenced_by_models
              }
              onDeleteCustom={deleteCustomLayer}
              onAddCustom={openCustomLayer}
              onOpenMapping={() => setMappingOpen(true)}
            />
          </span>
        </Flex>

        <div className={styles.body}>
          {topo.error && (
            <Alert
              type="error"
              showIcon
              message={topo.error}
              style={{ marginBottom: 12 }}
            />
          )}
          {!displayed ? (
            <Flex align="center" justify="center" style={{ minHeight: 240 }}>
              <Spin spinning={topo.loading} />
            </Flex>
          ) : viewMode === 'tree' ? (
            <TreeView
              view={displayed}
              fields={fields}
              workers={workers}
              grouping={grouping}
              onGroupingChange={setGrouping}
              onHostClick={(worker) => {
                changeViewMode('table');
                highlight(worker.id);
              }}
              onSetLocation={openBatch}
            />
          ) : (
            <Flex orientation="vertical" gap={12} style={{ height: '100%' }}>
              {showOnboarding && (
                <Onboarding
                  hosts={allWorkers.length}
                  domains={domainAllAuto ? domainView?.domains || 0 : 0}
                  onDismiss={dismissOnboarding}
                />
              )}
              <div ref={bodyRef} style={{ flex: 1, minHeight: 0 }}>
                <LocationTable
                  workers={workers}
                  allWorkers={allWorkers}
                  fields={fields}
                  showGpus={prefs.gpus}
                  showSource={prefs.source}
                  selectedIds={selectedIds}
                  onSelectionChange={setSelectedIds}
                  highlightId={highlightId}
                  height={Math.max(
                    160,
                    (bodySize?.height || 400) - TABLE_HEADER_HEIGHT
                  )}
                  onAssign={assign}
                  onBusy={(busy) => (busy ? topo.beginBusy() : topo.endBusy())}
                  onFillUnfilled={(field, targets) =>
                    openBatch(targets, field.id)
                  }
                  onFillBySwitch={fillBySwitch}
                />
              </div>
            </Flex>
          )}
        </div>

        {viewMode === 'table' && selectedIds.length > 0 && displayed && (
          <Flex
            align="center"
            gap={16}
            className={`${styles.fixed} ${styles.selection}`}
          >
            <span>
              {intl.formatMessage(
                { id: 'clusters.topology.selected' },
                { count: selectedIds.length }
              )}
            </span>
            <SetLocationPopover
              open={batch.open}
              onOpenChange={(next) =>
                setBatch({
                  open: next,
                  field: batch.field,
                  queue: next ? batch.queue : []
                })
              }
              targets={selectedWorkers}
              allWorkers={allWorkers}
              fields={fields}
              defaultField={batch.field || lastField}
              onApply={handleBatchApply}
            >
              <Button type="primary" size="small">
                {intl.formatMessage({ id: 'clusters.topology.batch.button' })}
                <DownOutlined />
              </Button>
            </SetLocationPopover>
            <Button type="link" size="small" onClick={() => setSelectedIds([])}>
              {intl.formatMessage({ id: 'clusters.topology.clearSelection' })}
            </Button>
          </Flex>
        )}
      </div>

      {clusterId && topo.topology && (
        <AdvancedDrawer
          open={mappingOpen}
          clusterId={clusterId}
          view={topo.topology}
          displayed={displayed || topo.topology}
          preview={preview}
          onClose={() => {
            preview.reset();
            setMappingOpen(false);
          }}
          onSaved={() => {
            preview.reset();
            setMappingOpen(false);
            topo.refresh();
          }}
        />
      )}

      {customLayer && topo.topology && (
        <CustomLayer
          open
          chain={customChain}
          reserved={reserved}
          knownKeys={topo.topology.vocabulary?.known_keys || []}
          workerLabels={(topo.topology.workers || []).map(
            (w) => w.labels || {}
          )}
          onOk={handleCustomOk}
          onCancel={() => setCustomLayer(null)}
        />
      )}
    </GSDrawer>
  );
};

export default TopologyDrawer;
