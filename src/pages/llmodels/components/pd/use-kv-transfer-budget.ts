/**
 * How much bandwidth this group's KV transfer would need.
 *
 * A reference figure beside the measured rate, because the measured rate alone
 * is not readable. `0.42 GB/s` is comfortable for a DeepSeek-class MLA model
 * and a catastrophe for a 70B GQA one — they differ by roughly an order of
 * magnitude in KV bytes per token — so nobody can tell from the number whether
 * the link is the problem. It comes from the model's own config rather than
 * from a measurement, which is why a group that has never served a request
 * still has one.
 *
 * ⚠️ **A reference, deliberately not a verdict.** The endpoint will compare a
 * measured rate against the requirement and return `sufficient` / `tight` /
 * `insufficient`, and this hook does not ask it to. The comparison would be
 * against a 200 ms window this panel picked, so a red "insufficient" would be
 * judging a deployment by an SLO its owner never set — and it lands on a panel
 * whose other alarms are all statements about what the group actually did.
 *
 * ⚠️ **Two assumptions, printed as two assumptions.** A 4096-token request and
 * that 200 ms window, both chosen here. The panel shows them beside the figure:
 * a requirement is a property of a workload rather than of a model, so "needs
 * 2.19 GB/s" without the request it was computed for is a claim about this
 * deployment that nobody made.
 *
 * The window is sent directly rather than derived from a TTFT target and a
 * share of it. Both reach the same number, but the derived route costs a reader
 * two premises to reach one, and the share is invisible. "Move this KV within
 * 200 ms" is a single premise, arguable on sight.
 */
import { useCallback, useState } from 'react';
import { estimateKVTransferBudget } from '../../apis';
import type { KVTransferBudget } from '../../config/types';

/** Sequence length the requirement assumes. */
export const ASSUMED_SEQ_LEN = 4096;
/**
 * The window the KV has to cross the network in.
 *
 * Picked, not derived: 200 ms is a round figure in the range a TTFT-sensitive
 * deployment cares about, and stating it beats computing it from a TTFT target
 * and a share, which hands the reader two premises for one number.
 */
export const ASSUMED_TRANSFER_MS = 200;

export interface KVTransferBudgetState {
  loading: boolean;
  /** Absent whenever the model's config could not be read — which is a "we
   *  cannot tell", so the panel shows one figure fewer rather than an error
   *  beside working telemetry. */
  budget?: KVTransferBudget | null;
  requiredBytesPerSecond?: number | null;
}

const EMPTY: KVTransferBudgetState = { loading: false };

export default function useKVTransferBudget() {
  const [state, setState] = useState<KVTransferBudgetState>(EMPTY);

  const fetchBudget = useCallback(async (modelId?: number) => {
    if (!modelId) {
      setState(EMPTY);
      return;
    }
    setState((current) => ({ ...current, loading: true }));
    try {
      const data = await estimateKVTransferBudget({
        model_id: modelId,
        seq_len: ASSUMED_SEQ_LEN,
        transfer_budget_ms: ASSUMED_TRANSFER_MS
      });
      setState({
        loading: false,
        budget: data,
        requiredBytesPerSecond: data.required_bandwidth_bytes_per_second
      });
    } catch {
      // Swallowed on purpose. This figure is an addition to the panel, and
      // every reason it fails — a model config that cannot be read, a gated
      // repo, an architecture that reports no KV dimensions — says nothing
      // about the group's health. Surfacing it as an error next to live
      // telemetry would claim otherwise.
      setState(EMPTY);
    }
  }, []);

  return { budget: state, fetchBudget };
}
