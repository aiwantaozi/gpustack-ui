import React from 'react';
import styled from 'styled-components';
import { BenchmarkResultItem } from '../../config/types';

// ── Unified design language for the Summary tab ────────────────────────────
// One semantic palette, applied everywhere (badge, chart markers, row
// highlight) so the page reads with a single visual grammar:
//   blue = recommended / selected   green = peak / SLA met
//   red  = overloaded / SLA broken   orange = warning (near the knee)
//   gray = secondary

export type StageStatusKind =
  | 'recommended'
  | 'peak'
  | 'balanced'
  | 'overloaded'
  | 'ok';

interface DetailLike {
  knee_rate?: number | null;
  recommended_rate?: number | null;
  peak_rate?: number | null;
}

// A stage's verdict, derived once and reused by the table + the chart markers.
export const getStageStatus = (
  r: BenchmarkResultItem,
  detail?: DetailLike
): StageStatusKind => {
  const rate = r.rate;
  const recRate = detail?.recommended_rate ?? detail?.knee_rate;
  if (rate != null && recRate != null && rate === recRate) {
    return 'recommended';
  }
  if (rate != null && detail?.peak_rate != null && rate === detail.peak_rate) {
    return 'peak';
  }
  // The knee (latency-throughput balance point) is informational only — not the
  // recommendation — so it gets its own "balanced" marker below peak/recommended.
  if (rate != null && detail?.knee_rate != null && rate === detail.knee_rate) {
    return 'balanced';
  }
  // "Overloaded" = a meaningful share of requests failed / didn't finish, OR the
  // rate is past the throughput peak. A couple of incomplete requests at the
  // max_seconds time boundary (common at low rates) is normal, not overload, so
  // gate on a failure RATE (>5%) rather than any single failure.
  const failedCount = (r.request_errored ?? 0) + (r.request_incomplete ?? 0);
  const total = r.request_total ?? (r.request_successful ?? 0) + failedCount;
  const failRate = total > 0 ? failedCount / total : 0;
  const pastPeak = detail?.peak_rate != null && (rate ?? 0) > detail.peak_rate;
  if (failRate > 0.05 || pastPeak) {
    return 'overloaded';
  }
  return 'ok';
};

// Echarts can't read CSS variables, so marker colors live here as hex matching
// the antd token defaults.
export const STATUS_HEX: Record<StageStatusKind, string> = {
  recommended: '#1677ff',
  peak: '#52c41a',
  balanced: '#faad14',
  overloaded: '#ff4d4f',
  ok: '#8c8c8c'
};

export const statusLabelId: Record<StageStatusKind, string> = {
  recommended: 'benchmark.detail.status.recommended',
  peak: 'benchmark.detail.status.peak',
  balanced: 'benchmark.detail.status.balanced',
  overloaded: 'benchmark.detail.status.overloaded',
  ok: 'benchmark.detail.status.healthy'
};

// One glyph per status, matching the chart markers (⭐ recommended · ▲ peak ·
// ◆ balanced/knee · ✕ overloaded) so the badge and the chart speak the same
// language.
export const statusGlyph: Record<StageStatusKind, string> = {
  recommended: '⭐',
  peak: '▲',
  balanced: '◆',
  overloaded: '✕',
  ok: '•'
};

const TagEl = styled.span<{ $kind: StageStatusKind }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  font-weight: 600;
  padding: 1px 9px;
  border-radius: 10px;
  ${({ $kind }) => {
    const map: Record<StageStatusKind, [string, string]> = {
      recommended: ['--ant-color-primary', '--ant-color-primary-bg'],
      peak: ['--ant-color-success', '--ant-color-success-bg'],
      balanced: ['--ant-color-warning', '--ant-color-warning-bg'],
      overloaded: ['--ant-color-error', '--ant-color-error-bg'],
      ok: ['--ant-color-text-tertiary', '--ant-color-fill-quaternary']
    };
    const [fg, bg] = map[$kind];
    return `color: var(${fg}); background: var(${bg});`;
  }}
  .glyph {
    font-size: 11px;
    line-height: 1;
  }
`;

// The single status badge used across the page.
export const StatusTag: React.FC<{
  kind: StageStatusKind;
  label: string;
}> = ({ kind, label }) => (
  <TagEl $kind={kind}>
    <span className="glyph">{statusGlyph[kind]}</span>
    {label}
  </TagEl>
);

// Type scale — the page uses exactly four sizes: 60 (hero) · 16 (section) ·
// 14 (metric) · 12 (label). SectionTitle is the 16.
export const SectionTitle = styled.div`
  font-size: 16px;
  font-weight: 600;
  color: var(--ant-color-text);
  margin-bottom: 12px;
`;

// Hairline separator between major sections (flat layout, no boxes).
export const SectionRule = styled.div`
  border-top: 1px solid var(--ant-color-border-secondary);
`;
