import { QuestionCircleOutlined } from '@ant-design/icons';
import { GSDrawer, ModalFooter } from '@gpustack/core-ui';
import { useIntl } from '@umijs/max';
import { Alert, Flex, Modal, Select, Spin, Tabs, Tooltip, message } from 'antd';
import { createStyles } from 'antd-style';
import { useEffect, useRef, useState } from 'react';
import { topologyFieldLabel } from '../../../config';
import {
  ACCELERATOR_DOMAIN,
  ClusterListItem,
  TopologyView
} from '../../../config/types';
import { UsePreview } from '../hooks/use-preview';
import { fieldLayers } from '../location';
import { loadSpecContext, saveTopologySpec } from '../spec';
import { Draft, draftFromView, toWire } from './draft';
import FieldChain, { FieldRow, KeyList, StaticRow } from './field-chain';

/** How long the "count left zero" blink lasts. */
const FLASH_MS = 1000;

const useStyles = createStyles(({ css }) => ({
  title: css`
    .sub {
      margin-left: 8px;
      font-weight: 400;
      font-size: 12px;
      color: var(--ant-color-text-tertiary);
    }
  `,
  tabs: css`
    .ant-tabs-nav {
      margin-bottom: 12px;
    }
    .status {
      font-size: 12px;
      font-variant-numeric: tabular-nums;
    }
  `,
  pane: css`
    /* Same indent as a row's name column: chevron, gap and padding. */
    .stats {
      padding-left: 24px;
      font-size: 12px;
      font-variant-numeric: tabular-nums;
    }
  `
}));

interface AdvancedDrawerProps {
  open: boolean;
  clusterId: number;
  /** The saved mapping's view: what the draft starts from. */
  view: TopologyView;
  /** What the main drawer is showing right now (the preview once one runs). */
  displayed: TopologyView;
  preview: UsePreview;
  /** Closed without saving; the caller drops the preview. */
  onClose: () => void;
  /** Saved; the caller drops the preview and refetches. */
  onSaved: () => void;
}

/**
 * [S2] The rule layer under the table: which label each field reads. Every
 * change here is previewed — the main drawer redraws under the unsaved mapping
 * — and nothing reaches the cluster until Save (P7). That staged state is also
 * why closing asks for confirmation while the main drawer never does.
 */
const AdvancedDrawer: React.FC<AdvancedDrawerProps> = ({
  open,
  clusterId,
  view,
  displayed,
  preview,
  onClose,
  onSaved
}) => {
  const intl = useIntl();
  const { styles } = useStyles();
  const [cluster, setCluster] = useState<ClusterListItem | null>(null);
  const [workerLabels, setWorkerLabels] = useState<Record<string, string>[]>(
    []
  );
  const [draft, setDraft] = useState<Draft | null>(null);
  const [baseline, setBaseline] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [domainExpanded, setDomainExpanded] = useState(false);
  const [flashing, setFlashing] = useState<Set<string>>(new Set());
  const prevCountsRef = useRef<Record<string, number>>({});

  useEffect(() => {
    if (!open) {
      setDraft(null);
      setCluster(null);
      setDomainExpanded(false);
      return;
    }
    loadSpecContext(clusterId).then((ctx) => {
      setCluster(ctx.cluster);
      setWorkerLabels(ctx.workerLabels);
      const initial = draftFromView(intl, view, ctx.cluster.topology);
      setDraft(initial);
      setBaseline(JSON.stringify(toWire(initial, ctx.cluster.topology)));
      prevCountsRef.current = {};
    });
  }, [open]);

  const total = displayed.workers?.length || 0;
  const classified: Record<string, number> = {};
  displayed.layers?.forEach((layer) => {
    classified[layer.id] = layer.classified;
  });
  classified[ACCELERATOR_DOMAIN] =
    displayed.accelerator_domain?.classified || 0;

  useEffect(() => {
    const left = Object.keys(classified).filter(
      (id) =>
        (prevCountsRef.current[id] ?? 0) === 0 &&
        classified[id] > 0 &&
        id in prevCountsRef.current
    );
    prevCountsRef.current = classified;
    if (left.length) {
      setFlashing(new Set(left));
      const timer = setTimeout(() => setFlashing(new Set()), FLASH_MS);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [displayed]);

  const update = (next: Draft) => {
    setDraft(next);
    preview.run(toWire(next, cluster?.topology));
  };

  const dirty =
    !!draft && JSON.stringify(toWire(draft, cluster?.topology)) !== baseline;

  const handleKeysChange = (id: string, keys: string[]) => {
    if (!draft) {
      return;
    }
    update({
      ...draft,
      chain: draft.chain.map((layer) =>
        layer.id === id
          ? {
              ...layer,
              labelKeys:
                layer.primaryKey && !keys.includes(layer.primaryKey)
                  ? [layer.primaryKey, ...keys]
                  : keys,
              customised: true
            }
          : layer
      )
    });
  };

  const handleClose = () => {
    if (!dirty) {
      onClose();
      return;
    }
    Modal.confirm({
      title: intl.formatMessage({ id: 'clusters.topology.advanced.discard' }),
      content: intl.formatMessage({
        id: 'clusters.topology.advanced.discard.tips'
      }),
      okText: intl.formatMessage({ id: 'clusters.topology.discard.ok' }),
      cancelText: intl.formatMessage({ id: 'common.button.cancel' }),
      okButtonProps: { danger: true },
      onOk: onClose
    });
  };

  const handleSave = async () => {
    if (!draft || !cluster) {
      return;
    }
    setSaving(true);
    try {
      await saveTopologySpec(cluster, toWire(draft, cluster.topology));
      message.success(
        intl.formatMessage({ id: 'clusters.topology.advanced.saved' })
      );
      onSaved();
    } catch (e: any) {
      message.error(
        e?.response?.data?.message ||
          intl.formatMessage({ id: 'clusters.topology.save.failed' })
      );
    } finally {
      setSaving(false);
    }
  };

  const domainLabel = topologyFieldLabel(intl, ACCELERATOR_DOMAIN);
  const domainActive = !!displayed.accelerator_domain?.active;
  const activeLayers = fieldLayers(displayed).filter(
    (layer) => layer.active
  ).length;

  const subDomainValue =
    draft?.subDomain.mode === 'field'
      ? draft.subDomain.field
      : draft?.subDomain.mode === 'keys'
        ? '__keys__'
        : '__none__';
  const subDomainOptions: any[] = [
    {
      value: '__none__',
      label: intl.formatMessage({
        id: 'clusters.topology.advanced.subDomain.none'
      })
    },
    ...(draft?.chain || []).map((layer) => ({
      value: layer.id,
      label: layer.name
    })),
    {
      value: '__keys__',
      label: intl.formatMessage({
        id: 'clusters.topology.advanced.subDomain.keys'
      })
    }
  ];

  /** Of the workers with a domain, how many also resolve the sub-domain field. */
  const subDomainCounts = (() => {
    if (!draft || draft.subDomain.mode !== 'field') {
      return null;
    }
    const field = draft.subDomain.field;
    const withDomain = (displayed.workers || []).filter(
      (worker) => worker.location?.[ACCELERATOR_DOMAIN]?.value
    );
    return {
      total: withDomain.length,
      classified: withDomain.filter((worker) => worker.location?.[field]?.value)
        .length
    };
  })();

  /**
   * How many domains, and how many racks the widest one spans: the number that
   * says why the domain is not a rung of the chain.
   */
  const domainStats = (() => {
    const rackActive = displayed.layers?.some(
      (layer) => layer.id === 'rack' && layer.active
    );
    if (!domainActive || !rackActive) {
      return null;
    }
    const racksByDomain = new Map<string, Set<string>>();
    (displayed.workers || []).forEach((worker) => {
      const domain = worker.location?.[ACCELERATOR_DOMAIN]?.value;
      if (!domain) {
        return;
      }
      const racks = racksByDomain.get(domain) || new Set<string>();
      const rack = worker.location?.rack?.value;
      if (rack) {
        racks.add(rack);
      }
      racksByDomain.set(domain, racks);
    });
    return {
      domains: racksByDomain.size,
      racks: Math.max(
        0,
        ...Array.from(racksByDomain.values()).map((racks) => racks.size)
      )
    };
  })();

  const vocabulary = {
    known: view.vocabulary?.known_keys || [],
    workerLabels
  };

  const withTips = (label: React.ReactNode, tipsId: string) => (
    <span>
      {label}{' '}
      <Tooltip title={intl.formatMessage({ id: tipsId })}>
        <QuestionCircleOutlined style={{ opacity: 0.6 }} />
      </Tooltip>
    </span>
  );

  const tabLabel = (name: string, status: string, tipsId: string) =>
    withTips(
      <>
        {name}
        <span className="text-tertiary status"> · {status}</span>
      </>,
      tipsId
    );

  const renderLayers = (current: Draft) => (
    <Flex orientation="vertical" gap={8} className={styles.pane}>
      <FieldChain
        rows={current.chain}
        total={total}
        classified={classified}
        flashing={flashing}
        vocabulary={vocabulary}
        onKeysChange={handleKeysChange}
      />
    </Flex>
  );

  const renderDomain = (current: Draft) => (
    <Flex orientation="vertical" gap={8} className={styles.pane}>
      <FieldRow
        fieldId={ACCELERATOR_DOMAIN}
        name={domainLabel}
        keys={current.domainKeys}
        lockedKey={current.domainKeys[0] || null}
        vocabulary={vocabulary}
        classified={classified[ACCELERATOR_DOMAIN]}
        total={total}
        flashing={flashing.has(ACCELERATOR_DOMAIN)}
        dim={!domainActive}
        expanded={domainExpanded}
        onToggle={() => setDomainExpanded(!domainExpanded)}
        onChange={(keys) => update({ ...current, domainKeys: keys })}
      />
      {domainStats && (
        <span className="text-secondary stats">
          {intl.formatMessage(
            { id: 'clusters.topology.mapping.domain.stats' },
            domainStats
          )}
        </span>
      )}
      <StaticRow
        name={withTips(
          intl.formatMessage({ id: 'clusters.topology.advanced.subDomain' }),
          'clusters.topology.mapping.subDomain.tips'
        )}
        dim={!domainActive}
        count={
          domainActive
            ? subDomainCounts
              ? intl.formatMessage(
                  { id: 'clusters.topology.mapping.classified' },
                  subDomainCounts
                )
              : '—'
            : undefined
        }
        detail={
          domainActive &&
          current.subDomain.mode === 'keys' && (
            <KeyList
              keys={current.subDomain.keys}
              fieldId={ACCELERATOR_DOMAIN}
              vocabulary={vocabulary}
              defaultEditing={!current.subDomain.keys.length}
              onChange={(keys) =>
                update({ ...current, subDomain: { mode: 'keys', keys } })
              }
            />
          )
        }
      >
        <Select
          size="small"
          style={{ flex: 1, minWidth: 0, maxWidth: 280 }}
          disabled={!domainActive}
          value={domainActive ? subDomainValue : undefined}
          placeholder={intl.formatMessage({
            id: 'clusters.topology.mapping.subDomain.placeholder'
          })}
          options={subDomainOptions}
          onChange={(value) => {
            if (value === '__none__') {
              update({ ...current, subDomain: { mode: 'none' } });
            } else if (value === '__keys__') {
              update({ ...current, subDomain: { mode: 'keys', keys: [] } });
            } else {
              update({
                ...current,
                subDomain: { mode: 'field', field: value }
              });
            }
          }}
        />
      </StaticRow>
    </Flex>
  );

  return (
    <GSDrawer
      title={
        <span className={styles.title}>
          {intl.formatMessage({ id: 'clusters.topology.mapping.title' })}
          <span className="sub">
            · {intl.formatMessage({ id: 'clusters.topology.mapping.intro' })}
          </span>
        </span>
      }
      open={open}
      onClose={handleClose}
      destroyOnHidden
      // Stacked on the main drawer, which stays where it is.
      push={false}
      styles={{
        wrapper: { width: 'min(720px, 100vw)' },
        body: { paddingInline: 24 }
      }}
      footer={
        <Flex align="center" justify="space-between" gap={12}>
          <span className="text-tertiary" style={{ fontSize: 12 }}>
            {preview.active &&
              intl.formatMessage({ id: 'clusters.topology.previewing.long' })}
          </span>
          <ModalFooter
            onCancel={handleClose}
            onOk={handleSave}
            okText={intl.formatMessage({ id: 'common.button.save' })}
            loading={saving}
            okBtnProps={{ disabled: !dirty || !!preview.error }}
            style={{ padding: 0 }}
          />
        </Flex>
      }
    >
      {!draft ? (
        <Flex align="center" justify="center" style={{ minHeight: 200 }}>
          <Spin />
        </Flex>
      ) : (
        <Flex orientation="vertical" gap={20}>
          {preview.error && (
            <Alert type="warning" showIcon message={preview.error} />
          )}

          {/* Inactive panes stay mounted: the draft is shared, and a fold or
              an open key list must survive a tab switch. */}
          <Tabs
            className={styles.tabs}
            defaultActiveKey="layers"
            items={[
              {
                key: 'layers',
                label: tabLabel(
                  intl.formatMessage({
                    id: 'clusters.topology.mapping.layers'
                  }),
                  activeLayers
                    ? intl.formatMessage(
                        { id: 'clusters.topology.mapping.layers.status' },
                        { count: activeLayers }
                      )
                    : intl.formatMessage({
                        id: 'clusters.topology.mapping.layers.status.empty'
                      }),
                  'clusters.topology.mapping.layers.tips'
                ),
                children: renderLayers(draft)
              },
              {
                key: 'domain',
                label: tabLabel(
                  domainLabel,
                  domainActive
                    ? intl.formatMessage(
                        { id: 'clusters.topology.mapping.domain.status' },
                        { count: displayed.accelerator_domain?.domains || 0 }
                      )
                    : intl.formatMessage({
                        id: 'clusters.topology.mapping.domain.status.inactive'
                      }),
                  'clusters.topology.mapping.domain.tips'
                ),
                children: renderDomain(draft)
              }
            ]}
          />

          {displayed.suggestions?.length > 0 && (
            <Flex orientation="vertical" gap={8}>
              <span style={{ fontWeight: 500 }}>
                {intl.formatMessage({
                  id: 'clusters.topology.advanced.suggestions'
                })}
              </span>
              {displayed.suggestions.map((suggestion) => (
                <span key={suggestion.key} className="text-tertiary">
                  <code>{suggestion.key}</code> ·{' '}
                  {intl.formatMessage(
                    { id: 'clusters.topology.advanced.suggestion' },
                    {
                      workers: suggestion.workers,
                      values: suggestion.distinct_values,
                      field: topologyFieldLabel(
                        intl,
                        suggestion.looks_like,
                        suggestion.looks_like
                      )
                    }
                  )}
                </span>
              ))}
            </Flex>
          )}
        </Flex>
      )}
    </GSDrawer>
  );
};

export default AdvancedDrawer;
