/**
 * PD run-time metrics for the group summary.
 *
 * Two figures a scan of the instances cannot produce:
 *
 * - **PD effectiveness** — the only signal separating "PD is working" from
 *   "PD silently degraded to aggregated serving". That failure returns correct
 *   answers with zero errors and every instance RUNNING, so it is invisible
 *   everywhere else.
 * - **KV transfer rate** — bytes moved divided by time spent moving them, so a
 *   window that was mostly idle does not read as a collapse in throughput.
 *
 * Fetched from `GET /models/{id}/pd-metrics`, which runs the PromQL
 * server-side and hands back an answer; this hook never learns a metric name.
 *
 * **Action-driven**: the request fires when the row is expanded, not from an
 * effect watching a fetch function. A collapsed row costs nothing, which
 * matters because this is the only field in the list backed by a Prometheus
 * round trip.
 */
import { useCallback, useState } from 'react';
import { queryModelPDMetrics } from '../../apis';
import type {
  PDMemberMetrics,
  PDMetrics,
  PDRoleMetrics
} from '../../config/types';

// The server's verdict values. Compared against, never re-derived from the
// number against a client-side threshold: a second copy of the judgement is a
// second thing that can disagree with the alarm text beside it.
const AGGREGATED = 'aggregated';
// KV crossing for some of the traffic and not the rest — one member of a pool
// has stopped participating while the others still work. Kept apart from
// AGGREGATED because the two call for different reactions: a collapse is a
// pairing that never formed and is a whole-group fix, this points at one
// member of several and the group is still delivering most of the benefit.
const DEGRADED = 'degraded';
const IDLE = 'idle';
const UNMEASURABLE = 'unmeasurable';
// The denominators that localise. `router_per_worker` points at one decode
// rather than at "the group"; `engine_tokens` is the engine's own prompt-token
// split, which the server documents as the STRONGEST form — both operands come
// from one engine in one window, so there is no second counter to be missing,
// coarse, or scraped at a different moment.
//
// 🔴 Was `!== 'router_per_worker'`, which predates `engine_tokens` and so
// labelled the best denominator "coarse" — seen on a healthy Ascend group
// reading `engine_tokens`. The weak one is the route aggregate: it still
// answers "did anything get routed at all", which a ratio of zero is
// meaningless without, but localises nothing.
const STRONG_DENOMINATORS = new Set(['engine_tokens', 'router_per_worker']);

// 🔴 The edge of vLLM's first `request_prefill_kv_computed_tokens` bucket, and
// the reason the recompute tail is not rendered as a plain number.
//
// `histogram_quantile` interpolates inside whichever bucket it lands in, so a
// decode that recomputed *nothing* reports `quantile × 1.0` — measured 0.95
// and 0.99 on a healthy 1P1D. Showing "0.99 tokens recomputed" on a perfect
// deployment is exactly the false positive this whole panel exists to avoid,
// so the figure only becomes a signal once it clears this edge. The next
// bucket edges are 2, 5 and 10, so a real recomputation lands far above it.
const RECOMPUTE_FIRST_BUCKET = 1;

export interface PDMetricsState {
  loading: boolean;
  // Whether an answer exists at all. False also covers "Prometheus is not
  // reachable", with `reason` saying so — which is not a healthy zero.
  available: boolean;
  reason?: string | null;
  /** Seconds every figure below is aggregated over; the server picks it. */
  windowSeconds?: number | null;
  // The ratio, shown only where one was measured.
  effectiveness?: number | null;
  state?: string | null;
  aggregated: boolean;
  partiallyDegraded: boolean;
  idle: boolean;
  unmeasurable: boolean;
  // The ratio came from the route aggregate rather than per-worker counters:
  // still answers "did anything get routed", localises nothing.
  weakDenominator: boolean;
  countedRole?: string | null;
  // Transfer throughput while transferring, and the tail that a mean hides.
  rate?: number | null;
  bytesPerTransfer?: number | null;
  p99Seconds?: number | null;
  failedTransfers?: number | null;
  kvExpired?: number | null;
  // Per role: queue depth is the ratio-tuning signal, and TTFT/TPOT belong to
  // one role each rather than to the group.
  roles: Record<string, PDRoleMetrics>;
  // Per upstream engine, keyed by the router's `worker` label. Empty when the
  // mode's router exports no per-worker counters.
  members: Record<string, PDMemberMetrics>;
  /**
   * New KV tokens the receiving role computed per request, p99.
   *
   * 🔑 Complements `effectiveness` rather than repeating it, and the two have
   * opposite blind spots: that ratio sums every token in the window, so a
   * minority of requests recomputing whole prompts is diluted by the majority
   * that did not — 5% of requests, over mixed prompt lengths, can leave it at
   * 0.97 and inside `effective`. This jumps to those requests' prompt length.
   */
  recomputeTailTokens?: number | null;
  /** Whether that tail has cleared the first histogram bucket — see
   * `RECOMPUTE_FIRST_BUCKET`. Only then is it a finding rather than
   * interpolation noise, so the panel renders the number in this case and the
   * word "none" otherwise. Both are shown: hiding the healthy case entirely
   * left a reader unable to tell the check existed. */
  recomputeTailAlarming: boolean;
  /**
   * Prompt tokens per second that arrived over the wire.
   *
   * The input to a *derived* bandwidth, for the connectors that export no
   * byte counter of their own: multiply by the budget endpoint's
   * `bytes_per_token`. Left in tokens here because the conversion needs the
   * model's KV footprint, which means reading its config — a read the metrics
   * endpoint deliberately does not do on a polled path.
   *
   * ⚠️ Divided by wall clock, unlike `rate`, which divides by time spent
   * transferring. Not interchangeable: this answers "how much KV is this
   * deployment moving", `rate` answers "how fast is the link".
   */
  externalTokensPerSecond?: number | null;
}

const EMPTY: PDMetricsState = {
  loading: false,
  available: false,
  aggregated: false,
  partiallyDegraded: false,
  idle: false,
  unmeasurable: false,
  weakDenominator: false,
  roles: {},
  members: {},
  recomputeTailAlarming: false
};

const toState = (data: PDMetrics): PDMetricsState => {
  const transfer = data.kv_transfer || {};
  return {
    loading: false,
    available: !!data.available,
    reason: data.reason,
    state: data.status,
    // Every figure below is an aggregate over this many seconds, and none of
    // them means anything without it: `1.00` and `(no traffic)` are both
    // statements about a period, and a reader who does not know the period
    // cannot tell whether "no traffic" describes a quiet minute or a dead
    // deployment. The server chooses it (15m by default), so it is reported
    // rather than assumed.
    windowSeconds: data.window_seconds ?? null,
    // A number only where one was measured. `unmeasurable` and `idle` render
    // as words, never as 0.00 — that value belongs to the aggregated alarm,
    // and putting it on a healthy group is the false positive this feature
    // exists to avoid.
    effectiveness:
      data.status === UNMEASURABLE || data.status === IDLE
        ? null
        : (data.kv_transfers_per_request ??
          (data.status === AGGREGATED ? 0 : null)),
    aggregated: data.status === AGGREGATED,
    partiallyDegraded: data.status === DEGRADED,
    idle: data.status === IDLE,
    unmeasurable: data.status === UNMEASURABLE,
    weakDenominator:
      !!data.request_count_source &&
      !STRONG_DENOMINATORS.has(data.request_count_source),
    countedRole: transfer.counted_on_role,
    rate: transfer.bytes_per_second,
    bytesPerTransfer: transfer.bytes_per_transfer,
    p99Seconds: transfer.seconds_p99,
    // `?? null` rather than `|| null`, so a real 0 stays 0 and only an absent
    // counter is null: Mooncake exports none, and "0 expired leases" there
    // would be a claim we cannot make.
    failedTransfers: transfer.failures ?? null,
    kvExpired: transfer.leases_expired ?? null,
    roles: data.roles || {},
    members: data.members || {},
    recomputeTailTokens: data.recomputed_tokens_p99 ?? null,
    recomputeTailAlarming:
      (data.recomputed_tokens_p99 ?? 0) >= RECOMPUTE_FIRST_BUCKET,
    externalTokensPerSecond: transfer.external_tokens_per_second ?? null
  };
};

export default function usePDMetrics() {
  const [metrics, setMetrics] = useState<PDMetricsState>(EMPTY);

  const fetchMetrics = useCallback(async (modelId?: number) => {
    if (!modelId) {
      setMetrics(EMPTY);
      return;
    }
    setMetrics((current) => ({ ...current, loading: true }));
    try {
      const data = await queryModelPDMetrics(modelId);
      setMetrics(toState(data));
    } catch (error: any) {
      // A failed request is "we could not tell", not "PD is broken". The two
      // call for opposite reactions, so an error never renders as a verdict.
      setMetrics({
        ...EMPTY,
        reason: error?.response?.data?.message || error?.message || null
      });
    }
  }, []);

  return { metrics, fetchMetrics };
}
