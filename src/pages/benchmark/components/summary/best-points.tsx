import { useIntl } from '@umijs/max';
import { round } from 'lodash';
import React from 'react';
import styled from 'styled-components';
import { loadAxisLabelId, loadValueDecimals } from '../../config';
import { useDetailContext } from '../../config/detail-context';
import { BenchmarkResultItem } from '../../config/types';

// A single continuous information flow — big number, a metric stream, then the
// "why" checklist. No nested boxes/grids; hierarchy comes from type + spacing.
const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 16px;
  .caption {
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    color: var(--ant-color-text-tertiary);
  }
  .hero {
    display: flex;
    align-items: baseline;
    gap: 8px;
    margin-top: 2px;
  }
  .hero .star {
    font-size: 22px;
    align-self: center;
  }
  .hero .value {
    font-size: 48px;
    font-weight: 800;
    line-height: 1;
    color: var(--ant-color-primary);
    letter-spacing: -1px;
  }
  .hero .hero-unit {
    font-size: 15px;
    font-weight: 500;
    color: var(--ant-color-text-tertiary);
  }
  /* Secondary line: verdict + operating point, mirroring the chart marker.
     Kept clearly readable (not a fine-print caption) — it carries the
     operating point, which is key context for the throughput above. */
  .hero-sub {
    margin-top: 8px;
    font-size: 15px;
    font-weight: 500;
    color: var(--ant-color-text);
  }
  /* Metric stream: label + value per line, separated by whitespace only. */
  .stats {
    display: flex;
    flex-direction: column;
    gap: 7px;
  }
  .stat {
    display: flex;
    align-items: baseline;
    gap: 8px;
    font-size: 14px;
  }
  .stat .s-label {
    color: var(--ant-color-text-secondary);
    min-width: 160px;
  }
  .stat .s-value {
    font-weight: 600;
    white-space: nowrap;
  }
  .stat .s-value .unit {
    font-size: 12px;
    font-weight: 400;
    color: var(--ant-color-text-tertiary);
    margin-left: 3px;
  }
  /* SLA target: the configured thresholds, shown as pills so an SLA run makes
     its budget explicit right next to the recommended point. */
  .sla {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding-top: 12px;
    border-top: 1px solid var(--ant-color-primary-border);
  }
  .sla .sla-items {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .sla .sla-pill {
    font-size: 12px;
    font-weight: 600;
    color: var(--ant-color-primary);
    background: var(--ant-color-bg-container);
    border: 1px solid var(--ant-color-primary-border);
    border-radius: 10px;
    padding: 1px 9px;
    white-space: nowrap;
  }
  .bullets {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding-top: 12px;
    border-top: 1px solid var(--ant-color-primary-border);
  }
  .bullets .b {
    display: flex;
    gap: 8px;
    font-size: 14px;
    line-height: 1.5;
    color: var(--ant-color-text);
  }
  .bullets .b .check {
    color: var(--ant-color-success);
    font-weight: 700;
    flex-shrink: 0;
  }
`;

interface BestPointsProps {
  results: BenchmarkResultItem[];
  onSelect: (r: BenchmarkResultItem) => void;
}

const BestPoints: React.FC<BestPointsProps> = ({ results, onSelect }) => {
  const intl = useIntl();
  const { detailData } = useDetailContext();

  const sorted = [...results].sort((a, b) => (a.rate ?? 0) - (b.rate ?? 0));
  const findByRate = (rate?: number | null) =>
    rate == null ? undefined : sorted.find((r) => (r.rate ?? -1) === rate);

  const recRate =
    detailData?.recommended_rate ??
    detailData?.knee_rate ??
    detailData?.peak_rate;
  const recPoint = findByRate(recRate);
  if (!recPoint || recRate == null) {
    return null;
  }

  const recTps = recPoint.tokens_per_second_mean ?? 0;
  const recTtft = recPoint.time_to_first_token_mean ?? 0;
  const recTpot = recPoint.time_per_output_token_mean ?? 0;
  const recWithinSla =
    detailData?.sla_met_rate != null && recRate === detailData.sla_met_rate;
  const hasSla = !!(detailData?.sla_avg_ttft_ms || detailData?.sla_avg_tpot_ms);
  const dec = loadValueDecimals(detailData);

  // The configured SLA budget (any subset of the 6 thresholds), shown as pills.
  const d = detailData;
  const slaTargets: string[] = [
    [d?.sla_avg_ttft_ms, 'TTFT Avg'],
    [d?.sla_p99_ttft_ms, 'TTFT p99'],
    [d?.sla_avg_tpot_ms, 'TPOT Avg'],
    [d?.sla_p99_tpot_ms, 'TPOT p99'],
    [d?.sla_avg_latency_ms, 'Latency Avg'],
    [d?.sla_p99_latency_ms, 'Latency p99']
  ]
    .filter(([v]) => v != null)
    .map(([v, label]) => `${label} ≤ ${v} ms`);

  // Throughput comparisons for the checklist.
  const recIdx = sorted.findIndex((r) => r.rate === recRate);
  const prev = recIdx > 0 ? sorted[recIdx - 1] : null;
  const peakPoint = findByRate(detailData?.peak_rate);
  const peakTps = peakPoint?.tokens_per_second_mean ?? 0;
  const peakTtft = peakPoint?.time_to_first_token_mean ?? 0;
  const pctUp = (from: number, to: number) =>
    from > 0 ? round(((to - from) / from) * 100, 0) : 0;
  const prevUp = prev ? pctUp(prev.tokens_per_second_mean ?? 0, recTps) : 0;
  // "Why not peak": measured from the recommended point (base). Small throughput
  // gain vs a large latency cost when pushing all the way to peak.
  const peakTpGain =
    recTps > 0 ? round(((peakTps - recTps) / recTps) * 100, 0) : 0;
  const peakLatCost =
    recTtft > 0 ? round(((peakTtft - recTtft) / recTtft) * 100, 0) : 0;

  const isPeak =
    detailData?.peak_rate != null && recRate === detailData.peak_rate;

  // Headline = the payoff metric (throughput); the operating point + verdict go
  // on the secondary line, matching the chart marker. "Max" when best == peak
  // (no higher sustained throughput), otherwise "Best".
  const verdict = isPeak ? 'Max' : 'Best';
  const isConc = loadAxisLabelId(detailData) === 'benchmark.form.concurrency';
  const rateUnit = intl.formatMessage({
    id: isConc
      ? 'benchmark.table.best.unit.concurrency'
      : 'benchmark.table.best.unit.rate'
  });

  const bullets: string[] = [];
  if (hasSla && recWithinSla) {
    bullets.push(
      intl.formatMessage({ id: 'benchmark.detail.reason.withinSla' })
    );
  }
  // Lead reason for a no-SLA sweep: why the knee (not the raw peak) is picked.
  if (!hasSla && !isPeak) {
    bullets.push(intl.formatMessage({ id: 'benchmark.detail.reason.balance' }));
  }
  if (prev && prevUp > 0) {
    bullets.push(
      intl.formatMessage(
        { id: 'benchmark.detail.reason.throughputVsPrev' },
        { up: prevUp, prevRate: round(prev.rate ?? 0, dec) }
      )
    );
  }
  if (isPeak) {
    bullets.push(
      intl.formatMessage({ id: 'benchmark.detail.reason.matchesPeak' })
    );
  } else if (peakTpGain > 0) {
    bullets.push(
      intl.formatMessage(
        { id: 'benchmark.detail.reason.peakTradeoff' },
        { tp: peakTpGain, lat: peakLatCost }
      )
    );
  }

  const stat = (label: string, value: number, unit: string) => (
    <div className="stat">
      <span className="s-label">{label}</span>
      <span className="s-value">
        {round(value, 0)}
        <span className="unit">{unit}</span>
      </span>
    </div>
  );

  return (
    <Wrapper onClick={() => onSelect(recPoint)}>
      <div>
        <div className="caption">
          {intl.formatMessage({ id: 'benchmark.detail.throughput.totalToken' })}
        </div>
        <div className="hero">
          <span className="star">⭐</span>
          <span className="value">{round(recTps, 0)}</span>
          <span className="hero-unit">tok/s</span>
        </div>
        <div className="hero-sub">
          {`${verdict} @ ${round(recRate, dec)} ${rateUnit}`}
        </div>
      </div>

      <div className="stats">
        {stat(
          intl.formatMessage({ id: 'benchmark.detail.avg.ttft' }),
          recTtft,
          'ms'
        )}
        {stat(
          intl.formatMessage({ id: 'benchmark.detail.avg.tpot' }),
          recTpot,
          'ms'
        )}
      </div>

      {slaTargets.length > 0 && (
        <div className="sla">
          <div className="caption">
            {intl.formatMessage({ id: 'benchmark.detail.sla.target' })}
          </div>
          <div className="sla-items">
            {slaTargets.map((t) => (
              <span className="sla-pill" key={t}>
                {t}
              </span>
            ))}
          </div>
        </div>
      )}

      {bullets.length > 0 && (
        <div className="bullets">
          {bullets.map((b, i) => (
            <div className="b" key={i}>
              <span className="check">✓</span>
              <span>{b}</span>
            </div>
          ))}
        </div>
      )}
    </Wrapper>
  );
};

export default BestPoints;
