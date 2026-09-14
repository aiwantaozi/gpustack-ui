import { topologyFieldLabel } from '../../../config';
import {
  ClusterTopology,
  TopologyLayer,
  TopologyLayerView,
  TopologyView
} from '../../../config/types';
import { fieldLayers } from '../location';

/** One rung of the mapping being edited: a vocabulary field or a custom layer. */
export interface DraftLayer {
  /** The vocabulary id, or the custom layer's name. */
  id: string;
  /** Already translated for builtins. */
  name: string;
  builtin: boolean;
  /** Some worker resolves a value under the saved mapping. */
  active: boolean;
  labelKeys: string[];
  /** Locked, always first, where hand-filled values land. Null for custom layers. */
  primaryKey: string | null;
  /** Keys differ from the vocabulary default, so the entry has to be saved. */
  customised: boolean;
}

/**
 * The mapping being edited: one chain, root to leaf, host excluded.
 *
 * 🔴 It briefly held a second `acceleratorChain` of the same type, plus a
 * `chainOf` / `withChain` pair to say which one an edit was about. Review
 * collapsed the two into one, so an accelerator domain is now just a rung of
 * `chain` like any other — and a `Draft` is again a list, not a pair of lists
 * every caller has to choose between.
 */
export interface Draft {
  chain: DraftLayer[];
}

const toDraftLayer =
  (
    intl: { formatMessage: (d: { id: string }) => string },
    savedNames: Set<string>
  ) =>
  (layer: TopologyLayerView): DraftLayer => ({
    id: layer.id,
    name: layer.builtin
      ? topologyFieldLabel(intl, layer.id, layer.name)
      : layer.name,
    builtin: layer.builtin,
    active: layer.active,
    labelKeys: layer.label_keys || [],
    primaryKey: layer.primary_key,
    customised: savedNames.has(layer.id)
  });

export const draftFromView = (
  intl: { formatMessage: (d: { id: string }) => string },
  view: TopologyView,
  saved: ClusterTopology | null | undefined
): Draft => {
  const savedNames = new Set((saved?.layers || []).map((layer) => layer.name));
  return { chain: fieldLayers(view).map(toDraftLayer(intl, savedNames)) };
};

/**
 * One chain → wire. Lists only what departs from the vocabulary — custom
 * layers and builtins with edited keys — each pointing at its predecessor in
 * the *full* chain, vocabulary neighbours included. An empty list is the
 * vocabulary mode the backend treats as the default.
 */
const chainToWire = (rungs: DraftLayer[]): TopologyLayer[] =>
  rungs
    .map((layer, index) => ({ layer, index }))
    .filter(({ layer }) => !layer.builtin || layer.customised)
    .map(({ layer, index }) => ({
      name: layer.id,
      labelKeys: layer.labelKeys,
      parentLayer: index === 0 ? null : rungs[index - 1].id
    }));

/**
 * Draft → wire. Any `acceleratorLayers` / `acceleratorDomain` a stored spec
 * still carries is dropped rather than spread through: echoing a stale copy
 * back would write it to the cluster again on every save, and the server has
 * stopped reading it.
 */
export const toWire = (
  draft: Draft,
  saved?: ClusterTopology | null
): ClusterTopology => {
  const {
    acceleratorLayers: _droppedLayers,
    acceleratorDomain: _droppedDomain,
    ...rest
  } = (saved || {}) as ClusterTopology & {
    acceleratorLayers?: unknown;
    acceleratorDomain?: unknown;
  };
  return { ...rest, layers: chainToWire(draft.chain) };
};

export const insertLayer = (
  draft: Draft,
  layer: DraftLayer,
  index: number
): Draft => {
  const rungs = [...draft.chain];
  rungs.splice(index, 0, layer);
  return { ...draft, chain: rungs };
};

export const removeLayer = (draft: Draft, id: string): Draft => ({
  ...draft,
  chain: draft.chain.filter((layer) => layer.id !== id)
});
