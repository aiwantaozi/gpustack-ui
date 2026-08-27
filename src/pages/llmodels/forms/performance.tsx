import React from 'react';

import KVCacheForm from './kv-cache';
import SpeculativeDecode from './speculative-decode';

interface PerformanceProps {
  /**
   * PD is on. Two things in this section stop being model-level:
   *
   * - **The extended KV cache** is already force-cleared when PD turns on
   *   (`forms/index.tsx`), because its benefit is asymmetric — prefill saves
   *   real compute on a hit, decode only gets a fallback whose prompt KV
   *   arrives over the connector anyway. A model-level setting hands decode a
   *   cost it cannot use. It moves to the roles, where the two sides can
   *   differ. Leaving the control here would leave one that gets wiped.
   * - **Speculative decoding** has no `RoleSpec` field, so it cannot differ
   *   per role at all. It moves to the group-level block, which says so.
   */
  pdEnabled?: boolean;
}

const Performance: React.FC<PerformanceProps> = ({ pdEnabled }) => {
  if (pdEnabled) {
    return null;
  }
  return (
    <>
      <div data-field="extended_kv_cache.enabled"></div>

      <KVCacheForm></KVCacheForm>
      <SpeculativeDecode></SpeculativeDecode>
    </>
  );
};

export default Performance;
