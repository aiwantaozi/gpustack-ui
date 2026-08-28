import { AutoTooltip, CopyButton, ExpandedRowGrid } from '@gpustack/core-ui';
import { useIntl } from '@umijs/max';
import { Col, Flex, Row, Tooltip } from 'antd';
import _ from 'lodash';
import React from 'react';
import { RoleValueMap } from '../../config';
import {
  ListItem,
  ModelInstanceListItem,
  PDRoleMetrics
} from '../../config/types';
import styles from '../../style/group-summary.module.less';
import PDMarkers from './pd-markers';
import { orderedRoleStatus, roleLabel, roleRatio } from './role-status';
import useKVTransferBudget, { ASSUMED_SEQ_LEN } from './use-kv-transfer-budget';
import usePDMetrics from './use-pd-metrics';

interface GroupSummaryProps {
  modelData: ListItem;
  instances: ModelInstanceListItem[];
  gridTemplate?: string;
  prefixWidth?: number;
  columnCount: number;
}

/**
 * Bytes per second as GB/s, or B/s below the point where GB/s rounds to zero.
 * The unit is fixed now: the server converts every engine's own unit before
 * this ever sees it (SGLang reports megabytes, vLLM bytes).
 */
const formatRate = (value: number): string => {
  const gb = value / 1024 ** 3;
  return gb < 0.01 ? `${value.toFixed(0)} B/s` : `${gb.toFixed(2)} GB/s`;
};

/** Sub-second figures read better in ms; a transfer that takes seconds is
 *  itself the finding, so it keeps its own unit. */
const formatSeconds = (value: number): string =>
  value < 1 ? `${(value * 1000).toFixed(1)} ms` : `${value.toFixed(2)} s`;

/**
 * Three rungs because this now formats two quantities four orders of magnitude
 * apart: one transfer's payload (KB to MB) and a whole request's KV cache,
 * which is 448 MB for a 0.6B model and several GB for a 70B one. Without the
 * GB rung the latter read as `2560.00 MB`.
 */
const formatBytes = (value: number): string => {
  const mb = value / 1024 ** 2;
  if (mb < 1) {
    return `${(value / 1024).toFixed(0)} KB`;
  }
  return mb < 1024 ? `${mb.toFixed(2)} MB` : `${(mb / 1024).toFixed(2)} GB`;
};

/**
 * The window every figure below is an aggregate over, as "15m" / "6h".
 *
 * Shown beside the headline rather than left implicit. `1.00` and `(no
 * traffic)` are both statements about a period, and without the period a
 * reader cannot tell a quiet minute from a dead deployment -- the question
 * "these numbers are from how long ago?" is the first one the panel drew.
 */
const formatWindow = (seconds: number): string => {
  if (seconds % 86400 === 0) {
    return `${seconds / 86400}d`;
  }
  if (seconds % 3600 === 0) {
    return `${seconds / 3600}h`;
  }
  return `${Math.round(seconds / 60)}m`;
};

const labelStyle: React.CSSProperties = {
  color: 'var(--ant-color-text-tertiary)'
};

const valueStyle: React.CSSProperties = {
  color: 'var(--ant-color-text-secondary)'
};

/**
 * A formatted figure split into its number and its unit.
 *
 * The formatters above return one string ("7.6 ms", "0.50 GB/s") because that
 * is what a tooltip or a log line wants. On a row the eye scans, the two halves
 * are not equals: the number is the reading and the unit is a footnote, and
 * rendering them identically makes the eye parse a string where it should be
 * taking a value.
 */
const Figure: React.FC<{ text: string; style?: React.CSSProperties }> = ({
  text,
  style
}) => {
  const at = text.indexOf(' ');
  if (at === -1) {
    return <span style={style ?? valueStyle}>{text}</span>;
  }
  return (
    <span style={style ?? valueStyle}>
      {text.slice(0, at)}
      <span className={styles.unit}>{text.slice(at + 1)}</span>
    </span>
  );
};

/**
 * `label value` pair, the shape of every figure in the telemetry rows.
 *
 * `stat` names how the figure was reduced over the window, and is set on every
 * figure that is a mean. Four different reductions sit side by side here --
 * a ratio, two means, a p99 and a latest-sample -- and rendered as bare
 * numbers they all read as "the value". A mean hides exactly the tail that
 * `Transfer p99` exists to expose, so which one a reader is looking at has to
 * be on the label, not only in the tooltip.
 */
const Metric: React.FC<{
  label: string;
  stat?: string;
  children: React.ReactNode;
}> = ({ label, stat, children }) => (
  <Flex align="center" gap={4}>
    <span style={labelStyle}>
      {label}
      {!!stat && <span className={styles.unit}>{stat}</span>}
    </span>
    {children}
  </Flex>
);

/**
 * The bar at the top of a group's expanded row: what is true of the group as a
 * whole and of no single member.
 *
 * "The group looks fine, and PD has silently degraded to aggregated serving" is
 * the most dangerous failure in this domain — correct answers, zero errors — so
 * the bar's job is to make the group's real health legible without the user
 * having to read four instance rows and infer it.
 *
 * It carries only what the rows around it do not. The parent row already shows
 * the model's state and its replica total, and each role heading below already
 * shows that role's ready/desired, so none of those are repeated here: an
 * expansion earns its space by adding what the row could not fit. What is left
 * is genuinely group-level — the mode, the group id, the router's address, and
 * the two figures that say whether disaggregation is doing anything at all.
 */
const GroupSummary: React.FC<GroupSummaryProps> = ({
  modelData,
  instances,
  gridTemplate,
  prefixWidth = 0,
  columnCount
}) => {
  const intl = useIntl();
  const { metrics, fetchMetrics } = usePDMetrics();
  const { budget, fetchBudget } = useKVTransferBudget();

  // Action-driven: this component only mounts when the row is expanded, so
  // mounting IS the action. Keyed on the model id so re-expanding a different
  // row refetches, and a collapsed row never costs a Prometheus round trip.
  //
  // Two independent requests, so they go together rather than in sequence:
  // the requirement is read from the model's config and the telemetry from
  // Prometheus, and neither is an input to the other.
  React.useEffect(() => {
    fetchMetrics(modelData?.id);
    fetchBudget(modelData?.id);
  }, [modelData?.id, fetchMetrics, fetchBudget]);
  const items = orderedRoleStatus(modelData?.role_status, modelData?.roles);
  const ratio = roleRatio(items);

  // A group is one generation at a time, so every member shares one group id;
  // the first that carries one is the group's.
  const groupId = _.find(
    instances,
    (item: ModelInstanceListItem) => !!item.group_id
  )?.group_id;
  const router = _.find(
    instances,
    (item: ModelInstanceListItem) =>
      item.role === RoleValueMap.Router && !!item.worker_ip
  );
  const routerAddress = router
    ? [router.worker_ip, router.port].filter(Boolean).join(':')
    : '';

  // 🔴 The verdict is the server's, not re-derived from the number against a
  // client-side threshold. A second copy of the judgement is a second thing
  // that can disagree with the alarm text beside it.
  const effectivenessDegraded = metrics.aggregated;
  // Ordered prefill -> decode -> router, matching the role sections below, so
  // the eye does not have to re-map the order between the two.
  const roleRows: [string, PDRoleMetrics][] = _.sortBy(
    Object.entries(metrics.roles || {}) as [string, PDRoleMetrics][],
    ([name]: [string, PDRoleMetrics]) =>
      ['prefill', 'decode', 'router'].indexOf(name)
  ).filter(
    ([, role]: [string, PDRoleMetrics]) =>
      role.time_to_first_token_seconds != null ||
      role.time_per_output_token_seconds != null ||
      role.pending_requests != null
  );

  // How much bandwidth this model's KV transfer needs, from its own config.
  // Rendered wherever the measured rate is — and also where it is not, which is
  // the point: an idle group cannot tell you whether its network is adequate,
  // and this figure can, because it never depended on traffic.
  //
  // 🔴 A sentence, not a row of label/value pairs like the measured figures
  // above it. Those are readings a user scans and compares over time; this is
  // one derivation whose three parts only mean anything in order -- this much
  // KV, in this long, therefore this fast. Split into `KV per 4096 tokens
  // 448 MB` and `Link needs 2.19 GB/s`, the eye reads two independent metrics
  // and has to reassemble the sentence to see that one causes the other.
  //
  // Both premises are in it rather than in the tooltip: the request size and
  // the window are figures this panel picked and the reader never configured,
  // so hidden they make the number unarguable rather than merely unexplained.
  //
  // And a reference, deliberately not a verdict -- judging a link against a
  // window we chose would be judging a deployment by an SLO its owner never
  // set.
  const perRequestBytes = budget.budget?.bytes_per_request ?? 0;
  const perTokenBytes = budget.budget?.bytes_per_token ?? 0;
  const layers = budget.budget?.layers ?? 0;
  const latentDim = budget.budget?.latent_dim;
  // Derived from the byte count rather than mapped from the dtype name, so the
  // product in the tooltip always multiplies out to the figure beside it --
  // a table keyed on "fp8" / "bf16" would drift the moment the server learns a
  // dtype this file does not know.
  const divisor = latentDim
    ? latentDim * layers
    : 2 *
      (budget.budget?.kv_heads ?? 0) *
      (budget.budget?.head_dim ?? 0) *
      layers;
  const elementBytes = divisor > 0 ? Math.round(perTokenBytes / divisor) : 0;
  const bandwidthRequirement = budget.requiredBytesPerSecond != null && (
    <Tooltip
      // Only the arithmetic behind the size. Everything else that stood here --
      // why the KV crosses at all, whose SLO the window is, which flags shrink
      // it -- was answering questions the reader had not asked yet.
      //
      // Two formulas because there are two KV layouts, and the `2 ×` belongs to
      // exactly one of them: MLA stores a single compressed latent rather than
      // per-head K and V, and applying the doubling there would inflate the one
      // number that makes those models cheap to disaggregate.
      title={intl.formatMessage(
        {
          id: latentDim
            ? 'models.pd.bandwidth.kvMath.mla'
            : 'models.pd.bandwidth.kvMath'
        },
        {
          kvHeads: budget.budget?.kv_heads,
          headDim: budget.budget?.head_dim,
          latentDim,
          element: elementBytes,
          dtype: budget.budget?.kv_cache_dtype,
          layers,
          perToken: formatBytes(perTokenBytes),
          seqLen: ASSUMED_SEQ_LEN,
          perRequest: formatBytes(perRequestBytes)
        }
      )}
    >
      <span style={labelStyle}>
        {intl.formatMessage(
          { id: 'models.pd.bandwidth.sentence' },
          {
            seqLen: ASSUMED_SEQ_LEN,
            perRequest: formatBytes(perRequestBytes),
            budget: Math.round(budget.budget?.transfer_budget_ms ?? 0),
            required: formatRate(budget.requiredBytesPerSecond)
          }
        )}
      </span>
    </Tooltip>
  );

  return (
    <div className={styles.autoHeightRow}>
      <ExpandedRowGrid gridTemplate={gridTemplate} prefixWidth={prefixWidth}>
        <ExpandedRowGrid.Cell
          span={columnCount}
          style={{ alignItems: 'stretch' }}
        >
          <Flex
            vertical
            gap={4}
            style={{
              width: '100%',
              padding: 'var(--ant-padding-xs) var(--ant-padding-sm)',
              marginBlock: 'var(--ant-margin-xxs)',
              borderRadius: 'var(--ant-border-radius-lg)',
              backgroundColor: 'var(--ant-color-fill-quaternary)'
            }}
          >
            {!!ratio && (
              <span style={{ color: 'var(--ant-color-warning)' }}>
                {intl.formatMessage(
                  { id: 'models.pd.ratio.waiting' },
                  {
                    configured: ratio.configured,
                    current: ratio.current,
                    role: ratio.waiting
                      .map((name) => roleLabel(intl, name))
                      .join(' / ')
                  }
                )}
              </span>
            )}
            {/* 🔴 The row this whole feature exists for. Both figures are
              rendered in every state, not only when they are bad: a number
              that appears only on failure teaches nobody what normal looks
              like, and "PD 有效性 0.98" is what makes the eventual 0.00
              readable. Below it, the two alarms in their own words. */}
            {metrics.available && (
              // Two columns, because there are two subjects: what the group as
              // a whole is doing, and what each role is doing inside it. Left
              // stacked under the headline, right stacked per role. Also the
              // only honest use of the width -- the card spans the whole table
              // and everything in it was hugging the left edge, five lines
              // deep against sixty percent empty.
              <Row gutter={16} style={{ width: '100%' }}>
                <Col xs={24} lg={11}>
                  <Flex vertical gap={4}>
                    {/* Row one: is disaggregation happening, and how is the
                    transport doing. Every figure is shown in every state, not
                    only when it is bad — a number that appears only on failure
                    teaches nobody what normal looks like. */}
                    {/* Its own line and its own size: this is the one question
                    the panel exists to answer, and beside three transport
                    figures at the same weight it was just the leftmost of
                    four. */}
                    <Flex align="baseline" gap={8}>
                      <span style={labelStyle}>
                        {intl.formatMessage({ id: 'models.pd.effectiveness' })}
                      </span>
                      {metrics.effectiveness != null ? (
                        <span
                          className={styles.headline}
                          style={
                            effectivenessDegraded
                              ? { color: 'var(--ant-color-error)' }
                              : undefined
                          }
                        >
                          {metrics.effectiveness.toFixed(2)}
                        </span>
                      ) : (
                        // No number, and the reason matters: "nobody called it in
                        // this window" versus "this mode exports no denominator".
                        // Neither is a degradation, and neither may render as
                        // 0.00 — that value belongs to the aggregated alarm.
                        <span style={labelStyle}>
                          {intl.formatMessage({
                            id: metrics.idle
                              ? 'models.pd.effectiveness.idle'
                              : 'models.pd.effectiveness.unmeasurable'
                          })}
                        </span>
                      )}
                      {metrics.windowSeconds != null && (
                        <span className={styles.window}>
                          {intl.formatMessage(
                            { id: 'models.pd.window' },
                            { window: formatWindow(metrics.windowSeconds) }
                          )}
                        </span>
                      )}
                    </Flex>
                    <Flex align="center" gap={16} wrap="wrap">
                      {metrics.rate != null && (
                        <Metric
                          label={intl.formatMessage({
                            id: 'models.pd.bandwidth'
                          })}
                        >
                          <Figure text={formatRate(metrics.rate)} />
                        </Metric>
                      )}
                      {metrics.p99Seconds != null && (
                        // The tail, because a degrading path shows up there first
                        // and the mean beside it is guaranteed to hide it.
                        <Metric
                          label={intl.formatMessage({
                            id: 'models.pd.transferP99'
                          })}
                        >
                          <Figure text={formatSeconds(metrics.p99Seconds)} />
                        </Metric>
                      )}
                      {metrics.bytesPerTransfer != null && (
                        // Falling here precedes a slowdown: smaller chunks pay the
                        // per-transfer overhead more often for the same volume.
                        <Metric
                          label={intl.formatMessage({
                            id: 'models.pd.bytesPerTransfer'
                          })}
                          stat={intl.formatMessage({
                            id: 'models.pd.stat.avg'
                          })}
                        >
                          <Figure
                            text={formatBytes(metrics.bytesPerTransfer)}
                          />
                        </Metric>
                      )}
                      {/* Cumulative counters, shown only when nonzero: a permanent
                      "0" is noise, while any nonzero value is something that
                      actually happened and has a name. */}
                      {!!metrics.failedTransfers && (
                        <Flex align="center" gap={4}>
                          <span style={labelStyle}>
                            {intl.formatMessage({
                              id: 'models.pd.failedTransfers'
                            })}
                          </span>
                          <span style={{ color: 'var(--ant-color-warning)' }}>
                            {metrics.failedTransfers}
                          </span>
                        </Flex>
                      )}
                      {!!metrics.kvExpired && (
                        // Not "transfers that failed": requests dropped between the
                        // two hops, whose prefill was computed for nothing.
                        <Flex align="center" gap={4}>
                          <span style={labelStyle}>
                            {intl.formatMessage({ id: 'models.pd.kvExpired' })}
                          </span>
                          <Tooltip
                            title={intl.formatMessage({
                              id: 'models.pd.kvExpired.tips'
                            })}
                          >
                            <span style={{ color: 'var(--ant-color-warning)' }}>
                              {metrics.kvExpired}
                            </span>
                          </Tooltip>
                        </Flex>
                      )}
                      {metrics.weakDenominator && (
                        // The ratio came from the route aggregate rather than
                        // per-worker counters: it still answers "did anything get
                        // routed" but no longer points at *which* decode stopped
                        // pulling, and that difference has to be legible.
                        <Tooltip
                          title={intl.formatMessage({
                            id: 'models.pd.denominator.weak.tips'
                          })}
                        >
                          <span style={labelStyle}>
                            {intl.formatMessage({
                              id: 'models.pd.denominator.weak'
                            })}
                          </span>
                        </Tooltip>
                      )}
                    </Flex>
                    {/* Its own line, below everything measured. What sits above
                      is what this deployment did; this is what its model would
                      need, computed from a config file — and read side by side
                      on one line, `KV transfer 0.15 GB/s` and `Link needs 2.19
                      GB/s` are two numbers in the same unit with no cue that
                      only one of them was observed. */}
                    {bandwidthRequirement}
                  </Flex>
                </Col>
                <Col xs={24} lg={13}>
                  <Flex vertical gap={4}>
                    {/* Row two: per role, because that is the premise of running
                    PD at all. TTFT belongs to prefill (it is what a user
                    waited for) and TPOT belongs to decode; a figure averaged
                    across both describes neither. Queue depth is the only
                    objective signal for whether the ratio is right and which
                    way it is wrong. */}
                    {roleRows.map(([name, role]: [string, PDRoleMetrics]) => (
                      // One role per line, its name a column rather than another
                      // item in the row. Inline, the only cue for where one role's
                      // figures ended and the next began was a 12px gap against
                      // the 4px inside a group.
                      <Flex align="center" gap={16} wrap="wrap" key={name}>
                        <span className={styles.roleName}>
                          {roleLabel(intl, name)}
                        </span>
                        {role.time_to_first_token_seconds != null && (
                          <Tooltip
                            title={intl.formatMessage({
                              id: 'models.pd.ttft.tips'
                            })}
                          >
                            <span>
                              <Metric
                                label={intl.formatMessage({
                                  id: 'models.pd.ttft'
                                })}
                                stat={intl.formatMessage({
                                  id: 'models.pd.stat.avg'
                                })}
                              >
                                <Figure
                                  text={formatSeconds(
                                    role.time_to_first_token_seconds
                                  )}
                                />
                              </Metric>
                            </span>
                          </Tooltip>
                        )}
                        {role.time_per_output_token_seconds != null && (
                          <Tooltip
                            title={intl.formatMessage({
                              id: 'models.pd.tpot.tips'
                            })}
                          >
                            <span>
                              <Metric
                                label={intl.formatMessage({
                                  id: 'models.pd.tpot'
                                })}
                                stat={intl.formatMessage({
                                  id: 'models.pd.stat.avg'
                                })}
                              >
                                <Figure
                                  text={formatSeconds(
                                    role.time_per_output_token_seconds
                                  )}
                                />
                              </Metric>
                            </span>
                          </Tooltip>
                        )}
                        {role.pending_requests != null && (
                          <Tooltip
                            title={intl.formatMessage({
                              id: 'models.pd.queue.tips'
                            })}
                          >
                            <span>
                              <Metric
                                label={intl.formatMessage({
                                  id: 'models.pd.queue'
                                })}
                              >
                                {/* Rounded, because it counts requests. A depth
                                rendered as `0.0` beside `TPOT 0.0 ms` reads as
                                one more duration. */}
                                <span
                                  style={
                                    role.pending_requests > 0
                                      ? { color: 'var(--ant-color-warning)' }
                                      : valueStyle
                                  }
                                >
                                  {Math.round(role.pending_requests)}
                                </span>
                              </Metric>
                            </span>
                          </Tooltip>
                        )}
                      </Flex>
                    ))}
                  </Flex>
                </Col>
              </Row>
            )}
            {!metrics.available && (
              // Why nothing could be measured, in the server's words. Kept
              // distinct from every verdict above: "we cannot tell" and "PD
              // stopped working" call for opposite reactions.
              //
              // The requirement still shows here, and this is the state where
              // it earns the most: with no telemetry at all it is the only
              // thing on the panel, and "this model needs 4.52 GB/s" is exactly
              // what a user checks their network against before the first
              // request rather than after.
              <Flex align="center" gap={16} wrap="wrap">
                {!!metrics.reason && (
                  <span style={labelStyle}>{metrics.reason}</span>
                )}
                {bandwidthRequirement}
              </Flex>
            )}
            {effectivenessDegraded && (
              <span style={{ color: 'var(--ant-color-error)' }}>
                {intl.formatMessage({ id: 'models.pd.effectiveness.degraded' })}
              </span>
            )}
            {/* Looked up when something needs copying, never scanned, so it
                sits under the telemetry and quieter than it: the figures that
                change keep the top of the panel. The markers ride here because
                they are the one part of the old status line the parent row does
                not carry -- stale and degraded are orthogonal to `Model.state`
                by construction, a stale group being usually still serving. */}
            <Flex
              align="center"
              gap={12}
              wrap="wrap"
              className={styles.identity}
            >
              <PDMarkers
                stale={modelData?.stale}
                degradations={modelData?.degradations}
              />
              {!!modelData?.disaggregation?.mode && (
                <span>{modelData.disaggregation.mode}</span>
              )}
              {!!groupId && (
                <Flex align="center" gap={2} style={{ maxWidth: 320 }}>
                  <AutoTooltip ghost minWidth={20}>
                    {groupId}
                  </AutoTooltip>
                  <CopyButton text={groupId} size="small" type="text" />
                </Flex>
              )}
              {!!routerAddress && (
                // The first place anyone looks when a group answers but answers
                // wrong, so it is copyable rather than only readable.
                <Flex align="center" gap={2}>
                  <span>{routerAddress}</span>
                  <CopyButton text={routerAddress} size="small" type="text" />
                </Flex>
              )}
            </Flex>
          </Flex>
        </ExpandedRowGrid.Cell>
      </ExpandedRowGrid>
    </div>
  );
};

export default GroupSummary;
