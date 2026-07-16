import {
  DownOutlined,
  RightOutlined,
  WarningOutlined
} from '@ant-design/icons';
import { useIntl } from '@umijs/max';
import { Alert, Button, Table, Tooltip } from 'antd';
import _ from 'lodash';
import React, { useMemo, useState } from 'react';
import styled from 'styled-components';
import {
  loadAxisLabelId,
  loadValueDecimals,
  VALIDITY_MESSAGE_KEY
} from '../../config';
import { useDetailContext } from '../../config/detail-context';
import { BenchmarkResultItem } from '../../config/types';
import OverviewChart, { ChartType } from './overview-chart';
import {
  getStageStatus,
  SectionRule,
  SectionTitle,
  statusLabelId,
  StatusTag
} from './ui';

// Human "1h 3m 48s" (drops empty leading units). An auto-tune sweep can run for
// tens of minutes across all points, so h/m/s reads clearer than raw seconds.
const fmtDuration = (sec: number): string => {
  const s = Math.max(0, Math.round(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  return [h ? `${h}h` : '', h || m ? `${m}m` : '', `${r}s`]
    .filter(Boolean)
    .join(' ');
};

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
  /* First screen = the Hero: one elevated panel (soft shadow, no hard border).
     Blue is confined to the left recommendation column (≈ half the band) so it
     stays the visual anchor without flooding the page. No card-in-card. */
  .top-band {
    display: flex;
    flex-wrap: wrap;
    align-items: stretch;
    min-height: 400px;
    border-radius: var(--ant-border-radius);
    overflow: hidden;
    box-shadow:
      0 1px 2px rgba(0, 0, 0, 0.06),
      0 0 0 1px var(--ant-color-border-secondary);
  }
  .rec-col {
    flex: 0.8 1 260px;
    min-width: 240px;
    display: flex;
    flex-direction: column;
    background: var(--ant-color-primary-bg);
    padding: 20px 20px;
  }
  /* Recommendation content fills the column height (distributed top→bottom) so
     a taller Hero doesn't leave blue dead space below the checklist. */
  .rec-col > div:last-child {
    flex: 1;
  }
  .chart-col {
    flex: 2.4 1 480px;
    min-width: 360px;
    display: flex;
    flex-direction: column;
    padding: 16px 18px 12px;
    border-left: 1px solid var(--ant-color-border-secondary);
  }
  /* The chart fills the remaining column height so its x-axis never floats with
     empty space under it. */
  .chart-col .chart-fill {
    flex: 1;
    min-height: 0;
  }
  /* Detailed metrics = secondary evidence: fixed 3 per row, so expanding
     "show more" adds new rows instead of shrinking the existing charts. */
  .charts-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 18px 16px;
  }
  @media (max-width: 900px) {
    .charts-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
  @media (max-width: 600px) {
    .charts-grid {
      grid-template-columns: minmax(0, 1fr);
    }
  }
  .rate-cell {
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }
  .rate-cell .n {
    font-weight: 600;
  }
  .chart-cell .c-title {
    font-size: 12px;
    font-weight: 500;
    color: var(--ant-color-text-secondary);
    margin-bottom: 2px;
  }
  /* Stage table: transparent header (only the column labels, no gray bar) and
     a blue highlight for the selected/recommended row. */
  .stage-table .ant-table-thead > tr > th {
    background: transparent !important;
    border-bottom: 1px solid var(--ant-color-border-secondary);
    color: var(--ant-color-text-tertiary);
    font-weight: 500;
  }
  .stage-table .ant-table-thead > tr > th::before {
    display: none !important;
  }
  /* Two-line header: label on top, unit on a smaller muted line below so the
     column stays narrow instead of stretching to fit "... (Tokens/s)". */
  .stage-table .col-title {
    display: flex;
    flex-direction: column;
    line-height: 1.2;
  }
  .stage-table .col-title .col-unit {
    font-size: 12px;
    font-weight: 400;
    color: var(--ant-color-text-quaternary);
  }
  .selected-row td {
    background-color: var(--ant-color-primary-bg) !important;
  }
  .clickable-row {
    cursor: pointer;
  }
`;

interface OverviewProps {
  results: BenchmarkResultItem[];
  selectedId?: number | null;
  onSelect: (r: BenchmarkResultItem) => void;
  // Recommendation content, rendered in the top-left of the blue band.
  bestPoints?: React.ReactNode;
}

const Overview: React.FC<OverviewProps> = ({
  results,
  selectedId,
  onSelect,
  bestPoints
}) => {
  const intl = useIntl();
  const { detailData } = useDetailContext();
  // Detailed metrics: only the first 3 charts are shown; the rest expand on
  // demand to keep the page short.
  const [showMore, setShowMore] = useState(false);

  const slaTtft = detailData?.sla_avg_ttft_ms;
  const slaTpot = detailData?.sla_avg_tpot_ms;

  const sorted = useMemo(
    () => [...results].sort((a, b) => (a.rate ?? 0) - (b.rate ?? 0)),
    [results]
  );
  // Whole-sweep totals shown above the stage table: requests summed across all
  // points; elapsed = wall-clock from the first point's start to the last
  // point's end (covers the gaps between sequential points), falling back to the
  // sum of per-point durations when timestamps are missing. Each point's
  // `raw_metrics` is its guidellm benchmark dump (start_time / end_time /
  // duration), so this is the true end-to-end run time, not one stage's.
  const totals = useMemo(() => {
    let requests = 0;
    let minStart = Infinity;
    let maxEnd = -Infinity;
    let durSum = 0;
    for (const r of sorted) {
      requests += r.request_total ?? 0;
      const b: any = r.raw_metrics || {};
      if (typeof b.start_time === 'number') {
        minStart = Math.min(minStart, b.start_time);
      }
      if (typeof b.end_time === 'number') {
        maxEnd = Math.max(maxEnd, b.end_time);
      }
      if (typeof b.duration === 'number') durSum += b.duration;
    }
    const seconds =
      isFinite(minStart) && isFinite(maxEnd) && maxEnd > minStart
        ? maxEnd - minStart
        : durSum;
    return { stages: sorted.length, requests, seconds };
  }, [sorted]);
  // Charts plot only the fixed-rate (constant) sweep points. The synchronous
  // baseline has no rate, and the throughput pass is a saturated outlier whose
  // huge latency would squash the useful range — both are kept in the table but
  // excluded from the curves.
  const chartData = useMemo(
    () => sorted.filter((r) => r.rate != null),
    [sorted]
  );
  const dec = loadValueDecimals(detailData);
  // Concurrency-based load: the base Throughput chart's x-axis is already
  // concurrency, so a separate "Throughput vs Concurrency" would duplicate it.
  const isConcurrency =
    loadAxisLabelId(detailData) === 'benchmark.form.concurrency';
  const rates = useMemo(
    () => chartData.map((r) => String(_.round(r.rate ?? 0, dec))),
    [chartData, dec]
  );
  const isMulti = sorted.length > 1;

  const rateAxisName = intl.formatMessage({ id: loadAxisLabelId(detailData) });
  // Short unit for the load axis (req/s vs conc.), shown after the operating
  // point on the recommended marker so "@ 45" reads as "@ 45 req/s".
  const rateUnit = intl.formatMessage({
    id: isConcurrency
      ? 'benchmark.table.best.unit.concurrency'
      : 'benchmark.table.best.unit.rate'
  });

  const recommendedRate =
    detailData?.recommended_rate ?? detailData?.knee_rate ?? null;
  const peakRate = detailData?.peak_rate ?? null;
  // The knee is informational only (a "balanced" marker); the recommendation is
  // the peak when there is no SLA. Hide the knee marker when it coincides with
  // the recommended point to avoid a redundant overlapping badge.
  const kneeRate =
    detailData?.knee_rate != null && detailData.knee_rate !== recommendedRate
      ? detailData.knee_rate
      : null;

  const gridCharts: { type: ChartType; titleId: string }[] = [
    { type: 'throughput', titleId: 'benchmark.detail.chart.throughput' },
    { type: 'latency', titleId: 'benchmark.detail.chart.latency' },
    { type: 'percentile', titleId: 'benchmark.detail.chart.percentile' },
    { type: 'tput_ttft', titleId: 'benchmark.detail.chart.tputTtft' },
    { type: 'tput_tpot', titleId: 'benchmark.detail.chart.tputTpot' },
    { type: 'tput_itl', titleId: 'benchmark.detail.chart.tputItl' },
    // Only useful when the base Throughput chart isn't already vs concurrency.
    ...(!isConcurrency
      ? [
          {
            type: 'tput_conc' as ChartType,
            titleId: 'benchmark.detail.chart.tputConc'
          }
        ]
      : []),
    { type: 'success' as ChartType, titleId: 'benchmark.detail.chart.success' }
  ];
  const visibleCharts = showMore ? gridCharts : gridCharts.slice(0, 3);
  const moreCount = gridCharts.length - 3;

  if (!isMulti) {
    return null;
  }

  // Test-coverage validity is computed on the backend (single source of truth);
  // here we only localize its warning codes + params.
  const validityWarnings: string[] = (detailData?.validity?.warnings || []).map(
    (w) =>
      intl.formatMessage(
        { id: VALIDITY_MESSAGE_KEY[w.code] || w.code },
        (w.params || {}) as Record<string, string | number>
      )
  );

  const num = (v: number | null) => (v != null ? _.round(v, 2) : '-');
  const MS = 'ms';
  const TPS = 'Tokens/s';
  // Header with the unit on a second, smaller line so long "... (Tokens/s)"
  // labels don't widen the column.
  const unitTitle = (label: string, unit: string) => (
    <span className="col-title">
      <span>{label}</span>
      <span className="col-unit">{unit}</span>
    </span>
  );

  // When the recommended point is NOT the peak, annotate the Peak row with its
  // delta vs the recommended point (base = recommended) on throughput + latency.
  // This makes "why not peak" obvious at a glance: a small throughput gain (green)
  // for a large latency cost (red).
  const recPoint =
    recommendedRate != null && peakRate != null && recommendedRate !== peakRate
      ? sorted.find((r) => r.rate === recommendedRate)
      : undefined;
  const withPeakDelta =
    (field: keyof BenchmarkResultItem, higherIsBetter: boolean) =>
    (v: number | null, r: BenchmarkResultItem) => {
      const base = num(v);
      const recVal = recPoint?.[field] as number | null | undefined;
      if (
        !recPoint ||
        r.rate !== peakRate ||
        v == null ||
        recVal == null ||
        recVal === 0
      ) {
        return base;
      }
      const pct = _.round(((v - recVal) / recVal) * 100, 0);
      if (pct === 0) return base;
      const good = higherIsBetter ? pct > 0 : pct < 0;
      return (
        <span>
          {base}{' '}
          <span
            style={{
              fontSize: 12,
              color: good
                ? 'var(--ant-color-success)'
                : 'var(--ant-color-error)'
            }}
          >
            ({pct > 0 ? '+' : ''}
            {pct}%)
          </span>
        </span>
      );
    };
  // Record the complementary load dimension: when the primary axis is
  // concurrency, also show the achieved request rate (RPS); when it's request
  // rate, also show the achieved average concurrency.
  const compColumn = isConcurrency
    ? {
        title: 'RPS',
        dataIndex: 'requests_per_second_mean',
        render: num
      }
    : {
        title: intl.formatMessage({
          id: 'benchmark.detail.requests.concurrency'
        }),
        dataIndex: 'request_concurrency_mean',
        render: (v: number | null) => (v != null ? _.round(v, 0) : '-')
      };
  // Per-row SLA verdict, mirroring the backend _meets_sla: every SET threshold
  // must hold (<=) AND success >= 95%. Latency-family thresholds are ms; avg TTFT/
  // TPOT are already ms, request_latency is seconds (scale x1000), p99 values come
  // from the raw metrics dump.
  const pct = (r: BenchmarkResultItem, field: string, key: string): number =>
    _.get(r.raw_metrics, [
      'metrics',
      field,
      'successful',
      'percentiles',
      key
    ]) ?? 0;
  const slaChecks: Array<
    [keyof typeof detailData, (r: any) => number, number]
  > = [
    ['sla_avg_ttft_ms', (r) => r.time_to_first_token_mean, 1],
    ['sla_p99_ttft_ms', (r) => pct(r, 'time_to_first_token_ms', 'p99'), 1],
    ['sla_avg_tpot_ms', (r) => r.time_per_output_token_mean, 1],
    ['sla_p99_tpot_ms', (r) => pct(r, 'time_per_output_token_ms', 'p99'), 1],
    ['sla_avg_latency_ms', (r) => r.request_latency_mean, 1000],
    ['sla_p99_latency_ms', (r) => pct(r, 'request_latency', 'p99'), 1000]
  ];
  const hasSlaTargets = slaChecks.some(([k]) => detailData?.[k] != null);
  const slaPass = (r: BenchmarkResultItem): boolean => {
    const total = r.request_total ?? 0;
    if (total <= 0 || (r.request_successful ?? 0) / total < 0.95) return false;
    for (const [key, get, scale] of slaChecks) {
      const thr = detailData?.[key] as number | undefined;
      if (thr == null) continue;
      const val = get(r);
      if (val == null || val * scale > thr) return false;
    }
    return true;
  };
  // Latency cell that turns red when it breaches its own avg SLA threshold, so the
  // offending metric (not just the row) is obvious.
  const latencyCell =
    (field: keyof BenchmarkResultItem, slaKey: keyof typeof detailData) =>
    (v: number | null, r: BenchmarkResultItem) => {
      const node = withPeakDelta(field, false)(v, r);
      const thr = detailData?.[slaKey] as number | undefined;
      if (thr != null && v != null && v > thr) {
        return <span style={{ color: 'var(--ant-color-error)' }}>{node}</span>;
      }
      return node;
    };

  // Early-stop reason for a stage. A point normally stops at max_requests (its
  // target); any other reason (dataset exhausted, time limit, too many errors)
  // means it under-ran — surfaced as a ? next to the request count so the
  // shortfall isn't mistaken for lost data.
  const terminationTip = (t: any): string => {
    const map: Record<string, string> = {
      requests_exhausted: 'benchmark.detail.termination.requestsExhausted',
      max_seconds: 'benchmark.detail.termination.maxSeconds',
      max_duration: 'benchmark.detail.termination.maxSeconds',
      max_errors: 'benchmark.detail.termination.maxErrors',
      max_error_rate: 'benchmark.detail.termination.maxErrors'
    };
    const id = map[t?.reason] || 'benchmark.detail.termination.default';
    return intl.formatMessage(
      { id },
      {
        reason: t?.reason ?? '-',
        requested: t?.requested ?? '-',
        processed: t?.processed ?? '-'
      }
    );
  };

  const columns = [
    {
      title: rateAxisName,
      dataIndex: 'rate',
      render: (v: number | null, r: BenchmarkResultItem) => {
        // The synchronous / throughput sweep passes have no *target* rate — show
        // the strategy name + their *achieved* RPS (they are the sweep's lower /
        // upper bounds; the interpolated points sit between them).
        if (v == null) {
          const s = r.strategy_type;
          const label = s ? s.charAt(0).toUpperCase() + s.slice(1) : '-';
          const rps = r.requests_per_second_mean;
          return (
            <span style={{ color: 'var(--ant-color-text-tertiary)' }}>
              {label}
              {rps != null && ` · ${_.round(rps, 2)}/s`}
            </span>
          );
        }
        const kind = getStageStatus(r, detailData);
        return (
          <span className="rate-cell">
            <span className="n">{_.round(v, dec)}</span>
            {kind !== 'ok' && (
              <StatusTag
                kind={kind}
                label={intl.formatMessage({ id: statusLabelId[kind] })}
              />
            )}
          </span>
        );
      }
    },
    compColumn,
    ...(hasSlaTargets
      ? [
          {
            // Per-row SLA verdict: ✓ within all set thresholds, ✗ otherwise.
            title: 'SLA',
            key: 'sla',
            width: 80,
            align: 'center' as const,
            render: (_v: unknown, r: BenchmarkResultItem) => {
              if (r.rate == null) {
                return (
                  <span style={{ color: 'var(--ant-color-text-tertiary)' }}>
                    -
                  </span>
                );
              }
              return slaPass(r) ? (
                <span style={{ color: 'var(--ant-color-success)' }}>✓</span>
              ) : (
                <span style={{ color: 'var(--ant-color-error)' }}>✗</span>
              );
            }
          }
        ]
      : []),
    {
      title: unitTitle(
        intl.formatMessage({ id: 'benchmark.detail.avg.ttft' }),
        MS
      ),
      dataIndex: 'time_to_first_token_mean',
      render: latencyCell('time_to_first_token_mean', 'sla_avg_ttft_ms')
    },
    {
      title: unitTitle(
        intl.formatMessage({ id: 'benchmark.detail.avg.tpot' }),
        MS
      ),
      dataIndex: 'time_per_output_token_mean',
      render: latencyCell('time_per_output_token_mean', 'sla_avg_tpot_ms')
    },
    {
      title: unitTitle(
        intl.formatMessage({ id: 'benchmark.detail.avg.itl' }),
        MS
      ),
      dataIndex: 'inter_token_latency_mean',
      render: num
    },
    {
      // Compact acronym headers (TPS / In TPS / Out TPS) to match the list
      // table; TPS is the 'Tokens/s' unit subtitle string.
      title: unitTitle('TPS', TPS),
      dataIndex: 'tokens_per_second_mean',
      render: withPeakDelta('tokens_per_second_mean', true)
    },
    {
      title: unitTitle('In TPS', TPS),
      dataIndex: 'input_tokens_per_second_mean',
      render: num
    },
    {
      title: unitTitle('Out TPS', TPS),
      dataIndex: 'output_tokens_per_second_mean',
      render: num
    },
    {
      title: intl.formatMessage({ id: 'benchmark.detail.requests.success' }),
      key: 'success',
      render: (_v: unknown, r: BenchmarkResultItem) => {
        const total = r.request_total ?? 0;
        const ok = r.request_successful ?? 0;
        // Flag a low success rate (>5% failed/incomplete). Common on the
        // Throughput probe when max-concurrency overwhelms the server — a signal
        // the sweep's upper bound (and thus its whole range) is under-measured.
        const low = total > 0 && ok / total < 0.95;
        const term = (r.raw_metrics as any)?.termination;
        const early = term?.reason && term.reason !== 'max_requests';
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              ...(low ? { color: 'var(--ant-color-error)' } : {})
            }}
          >
            {ok}/{total}
            {early && (
              <Tooltip title={terminationTip(term)}>
                <WarningOutlined
                  style={{ color: 'var(--ant-color-warning)' }}
                />
              </Tooltip>
            )}
          </span>
        );
      }
    }
  ];

  return (
    <Wrapper>
      {validityWarnings.length > 0 && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 12 }}
          message={intl.formatMessage({
            id: 'benchmark.detail.validity.title'
          })}
          description={
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {validityWarnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          }
        />
      )}
      <div className="top-band">
        <div className="rec-col">
          <SectionTitle>
            {intl.formatMessage({
              id: 'benchmark.detail.summary.recommendation'
            })}
          </SectionTitle>
          {bestPoints}
        </div>
        <div className="chart-col">
          <SectionTitle>
            {intl.formatMessage({ id: 'benchmark.detail.chart.knee' })}
          </SectionTitle>
          <div className="chart-fill">
            <OverviewChart
              type="knee"
              fill
              sorted={chartData}
              rates={rates}
              rateDecimals={dec}
              rateAxisName={rateAxisName}
              rateUnit={rateUnit}
              slaTtft={slaTtft}
              slaTpot={slaTpot}
              recommendedRate={recommendedRate}
              kneeRate={kneeRate}
              peakRate={peakRate}
            />
          </div>
        </div>
      </div>

      <div>
        <SectionTitle>
          {intl.formatMessage({ id: 'benchmark.detail.summary.supporting' })}
        </SectionTitle>
        <div className="charts-grid">
          {visibleCharts.map((c) => (
            <div className="chart-cell" key={c.type}>
              <div className="c-title">
                {intl.formatMessage({ id: c.titleId })}
              </div>
              <OverviewChart
                type={c.type}
                height={180}
                sorted={chartData}
                rates={rates}
                rateAxisName={rateAxisName}
                rateDecimals={dec}
                slaTtft={slaTtft}
                slaTpot={slaTpot}
                kneeRate={recommendedRate}
                peakRate={peakRate}
              />
            </div>
          ))}
        </div>
        {moreCount > 0 && (
          <Button
            type="link"
            size="small"
            style={{ paddingLeft: 0, marginTop: 4 }}
            icon={showMore ? <DownOutlined /> : <RightOutlined />}
            onClick={() => setShowMore((v) => !v)}
          >
            {showMore
              ? intl.formatMessage({ id: 'benchmark.detail.summary.showLess' })
              : intl.formatMessage(
                  { id: 'benchmark.detail.summary.showMore' },
                  { n: moreCount }
                )}
          </Button>
        )}
      </div>

      <SectionRule />

      <div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
            flexWrap: 'wrap',
            marginBottom: 12
          }}
        >
          <SectionTitle style={{ marginBottom: 0 }}>
            {intl.formatMessage({ id: 'benchmark.detail.summary.stages' })}
          </SectionTitle>
          {/* Whole-sweep totals: three stat blocks (big value + small label) so
              the end-to-end run cost reads at a glance, not as fine print. */}
          <div style={{ display: 'flex', gap: 24, alignItems: 'baseline' }}>
            {[
              {
                value: String(totals.stages),
                label: 'benchmark.detail.summary.totalStages'
              },
              {
                value: totals.requests.toLocaleString(),
                label: 'benchmark.detail.summary.totalRequests'
              },
              {
                value: fmtDuration(totals.seconds),
                label: 'benchmark.detail.summary.totalDuration'
              }
            ].map((s) => (
              <span
                key={s.label}
                style={{
                  display: 'inline-flex',
                  alignItems: 'baseline',
                  gap: 6
                }}
              >
                <span
                  style={{
                    fontSize: 18,
                    fontWeight: 600,
                    color: 'var(--ant-color-text)'
                  }}
                >
                  {s.value}
                </span>
                <span
                  style={{
                    fontSize: 12,
                    color: 'var(--ant-color-text-tertiary)'
                  }}
                >
                  {intl.formatMessage({ id: s.label })}
                </span>
              </span>
            ))}
          </div>
        </div>
        <Table
          className="stage-table"
          size="small"
          rowKey="id"
          pagination={false}
          columns={columns}
          dataSource={sorted}
          onRow={(r) => ({ onClick: () => onSelect(r) })}
          rowClassName={(r) =>
            ['clickable-row', r.id === selectedId ? 'selected-row' : ''].join(
              ' '
            )
          }
        />
      </div>
    </Wrapper>
  );
};

export default Overview;
