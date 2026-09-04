import { useIntl } from '@umijs/max';
import { useState } from 'react';
import { queryPDModes } from '../apis';
import { PD_MODE_CUSTOM } from '../config';
import { PDMode } from '../config/types';

export interface PDModeOption {
  label: string;
  value: string;
  disabled?: boolean;
  // Why the option is unselectable. Shown rather than hidden: an option the
  // user cannot pick still tells them the capability exists and what it would
  // take to reach it.
  reason?: string;
  data: PDMode;
}

/**
 * The PD-mode catalog, fetched when the deploy drawer opens.
 *
 * Read from the server, never mirrored here: the catalog exists so that adding
 * an engine is a YAML change, and a hardcoded list in the frontend would spend
 * exactly that benefit.
 *
 * Action-driven, per the repo's request conventions — the caller invokes
 * `getPDModes()` from the drawer's open handler, not from an effect.
 */
/**
 * The transport alone, for both the picker's rows and the derived one-liner.
 *
 * The engine is already chosen and named in a field above, and the picker
 * hides recipes that do not fit it — so a list can never hold both
 * "vLLM + NIXL" and "SGLang + NIXL", which is the only reason the engine was
 * ever in this label.
 *
 * 🔑 **Falls back by splitting `display_name`, not by using it whole.** The
 * `transport` field is newer than some running servers, and an older one
 * simply omits it; taking `display_name` verbatim there would quietly put the
 * engine back ("vLLM + NIXL") and look like the change never landed. Every
 * shipped `display_name` is "<engine> + <transport>", and `Custom` has no
 * separator, so the split is correct for both.
 */
export const transportLabel = (mode?: PDMode) =>
  mode?.transport || mode?.display_name?.split(' + ').pop() || mode?.name || '';

export default function useQueryPDModes() {
  const intl = useIntl();
  const [pdModes, setPDModes] = useState<PDMode[]>([]);

  const getPDModes = async () => {
    try {
      const res = await queryPDModes();
      const list = res?.items || [];
      setPDModes(list);
      return list;
    } catch (error) {
      setPDModes([]);
      return [];
    }
  };

  /**
   * The options for one engine on one cluster's accelerators.
   *
   * A mode the combination cannot run is disabled with a reason rather than
   * dropped: an option the user cannot pick still tells them the capability
   * exists and what it would take to reach it. Two independent constraints:
   *
   * - `backends` — injecting one engine's connector config into another fails
   *   silently at run time, so the server refuses the combination.
   * - `gpu_filters.vendor` — every built-in recipe is accelerator-specific:
   *   `vllm-ascend-mooncake` injects an Ascend-only connector plus HCCL
   *   variables, and the NVIDIA recipes inject connectors no other runtime
   *   can read. `PDModeRuntimeFilter` drops the mismatched workers
   *   server-side; disabling it here is what makes the refusal visible
   *   before submit.
   *
   * `vendors` is the manufacturer slug set the cluster's workers report, from
   * `status.gpu_devices[].vendor`. Undefined or empty means unknown (options
   * still loading, no cluster picked, or no worker has reported devices yet)
   * and must not disable anything — absence of evidence is not a mismatch.
   *
   * `custom` declares neither constraint and is therefore always available: it
   * injects nothing, which is also what makes it the only mode under which a
   * group may mix engines.
   */
  const buildOptions = (backend?: string, vendors?: string[]): PDModeOption[] =>
    pdModes.map((mode) => {
      const targets = mode.backends || [];
      const backendOk =
        !targets.length || !backend || targets.includes(backend);
      // Absent on `custom` alone, and that is the mechanism that keeps the
      // DIY path open on an accelerator we ship no recipe for.
      const wanted = (mode.gpu_filters?.vendor || []).map((v) =>
        v.toLowerCase()
      );
      const vendorOk =
        !wanted.length ||
        !vendors?.length ||
        wanted.some((v) => vendors.includes(v));

      let reason: string | undefined;
      if (!backendOk) {
        reason = intl.formatMessage(
          { id: 'models.form.pd.mode.backend.mismatch' },
          { backend, targets: targets.join(' / ') }
        );
      } else if (!vendorOk) {
        reason = intl.formatMessage(
          { id: 'models.form.pd.mode.runtime.mismatch' },
          { runtime: wanted.join(' / '), vendors: vendors!.join(' / ') }
        );
      }

      return {
        label: transportLabel(mode),
        value: mode.name,
        disabled: !backendOk || !vendorOk,
        reason,
        data: mode
      };
    });

  const findMode = (name?: string | null) =>
    name ? pdModes.find((mode) => mode.name === name) : undefined;

  const isCustomMode = (name?: string | null) => name === PD_MODE_CUSTOM;

  return {
    pdModes,
    getPDModes,
    buildOptions,
    findMode,
    isCustomMode
  };
}
