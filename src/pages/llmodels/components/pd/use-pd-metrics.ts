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
import type { PDMetrics, PDRoleMetrics } from '../../config/types';

// The server's verdict values. Compared against, never re-derived from the
// number against a client-side threshold: a second copy of the judgement is a
// second thing that can disagree with the alarm text beside it.
const AGGREGATED = 'aggregated';
const IDLE = 'idle';
const UNMEASURABLE = 'unmeasurable';
// Per-worker counters — the good denominator, because a low ratio then points
// at one decode rather than at "the group".
const DENOMINATOR_PER_WORKER = 'router_per_worker';

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
}

const EMPTY: PDMetricsState = {
  loading: false,
  available: false,
  aggregated: false,
  idle: false,
  unmeasurable: false,
  weakDenominator: false,
  roles: {}
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
    idle: data.status === IDLE,
    unmeasurable: data.status === UNMEASURABLE,
    weakDenominator:
      !!data.request_count_source &&
      data.request_count_source !== DENOMINATOR_PER_WORKER,
    countedRole: transfer.counted_on_role,
    rate: transfer.bytes_per_second,
    bytesPerTransfer: transfer.bytes_per_transfer,
    p99Seconds: transfer.seconds_p99,
    // `?? null` rather than `|| null`, so a real 0 stays 0 and only an absent
    // counter is null: Mooncake exports none, and "0 expired leases" there
    // would be a claim we cannot make.
    failedTransfers: transfer.failures ?? null,
    kvExpired: transfer.leases_expired ?? null,
    roles: data.roles || {}
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
