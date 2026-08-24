/**
 * The seam for PD run-time metrics. Deliberately empty.
 *
 * Two rows of the group summary need figures no endpoint serves today:
 *
 * - **PD effectiveness** (`pd_disaggregation_ratio`) — the only signal that
 *   separates "PD is working" from "PD silently degraded to aggregated
 *   serving". That failure returns correct answers with zero errors and every
 *   KV counter at 0, so it is invisible everywhere else, and this is the only
 *   trigger `models.pd.effectiveness.degraded` has.
 * - **KV transfer bandwidth** (`nixl_bytes_transferred_sum /
 *   nixl_xfer_time_seconds_sum`) against *this group's own deploy-time
 *   baseline* — not against the link's nominal rate. Measured effective
 *   bandwidth on Ascend 910B2 is ~9% of a 200G link's nominal, so a nominal
 *   denominator would false-positive permanently on that hardware.
 *
 * The only channel carrying either today is `/prometheus`: admin-only, raw
 * series, not something a list row can read. Until a read endpoint exists this
 * reports `supported: false` and the summary bar omits both rows entirely — no
 * fabricated numbers, and no spinner that never resolves.
 *
 * When the endpoint lands this is the only file that changes: fetch it here
 * (action-driven, from the row's expand handler), keep the returned shape, and
 * both rows light up with no change at the call site.
 */
export interface PDMetrics {
  /** Whether a metrics read endpoint answered at all. */
  supported: boolean;
  /** `pd_disaggregation_ratio`, 0..1. Null while unsupported. */
  effectiveness?: number | null;
  /** Preformatted figures for `models.pd.bandwidth.degraded`. */
  bandwidth?: {
    actual: string;
    baseline: string;
    delta: string;
    degraded: boolean;
  } | null;
}

/**
 * Below this, PD is not disaggregating at all — the whole point of the
 * effectiveness row. Kept next to the seam so the threshold lands with the
 * data it judges.
 */
export const PD_EFFECTIVENESS_FLOOR = 0.01;

const PD_METRICS_UNAVAILABLE: PDMetrics = {
  supported: false,
  effectiveness: null,
  bandwidth: null
};

export default function usePDMetrics(_modelId?: number): PDMetrics {
  return PD_METRICS_UNAVAILABLE;
}
