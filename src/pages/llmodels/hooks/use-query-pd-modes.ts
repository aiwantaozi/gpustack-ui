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
   * The options for one engine.
   *
   * A mode whose recipe targets another engine is disabled with a reason
   * rather than dropped: injecting one engine's connector config into another
   * fails silently at run time, so the backend refuses the combination — and
   * the user needs to see why, not just find the option missing.
   *
   * `custom` declares no backends and is therefore always available: it
   * injects nothing, which is also what makes it the only mode under which a
   * group may mix engines.
   */
  const buildOptions = (backend?: string): PDModeOption[] =>
    pdModes.map((mode) => {
      const targets = mode.backends || [];
      const usable = !targets.length || !backend || targets.includes(backend);
      return {
        label: mode.display_name || mode.name,
        value: mode.name,
        disabled: !usable,
        reason: usable
          ? undefined
          : intl.formatMessage(
              { id: 'models.form.pd.mode.backend.mismatch' },
              { backend, targets: targets.join(' / ') }
            ),
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
