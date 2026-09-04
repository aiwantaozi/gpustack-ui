import { topologyFieldLabel } from '../../../config';
import { ClusterTopology, TopologyView } from '../../../config/types';
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

export type SubDomain =
  | { mode: 'none' }
  | { mode: 'field'; field: string }
  | { mode: 'keys'; keys: string[] };

export interface Draft {
  /** Root to leaf, host excluded. */
  chain: DraftLayer[];
  domainKeys: string[];
  subDomain: SubDomain;
}

export const draftFromView = (
  intl: { formatMessage: (d: { id: string }) => string },
  view: TopologyView,
  saved: ClusterTopology | null | undefined
): Draft => {
  const savedNames = new Set((saved?.layers || []).map((layer) => layer.name));
  const chain: DraftLayer[] = fieldLayers(view).map((layer) => ({
    id: layer.id,
    name: layer.builtin
      ? topologyFieldLabel(intl, layer.id, layer.name)
      : layer.name,
    builtin: layer.builtin,
    active: layer.active,
    labelKeys: layer.label_keys || [],
    primaryKey: layer.primary_key,
    customised: savedNames.has(layer.id)
  }));
  const domain = view.accelerator_domain;
  const subDomain: SubDomain = domain?.sub_domain_field
    ? { mode: 'field', field: domain.sub_domain_field }
    : domain?.sub_domain_keys?.length
      ? { mode: 'keys', keys: domain.sub_domain_keys }
      : { mode: 'none' };
  return { chain, domainKeys: domain?.label_keys || [], subDomain };
};

/**
 * Draft → wire. `layers` lists only what departs from the vocabulary — custom
 * layers and builtins with edited keys — each pointing at its predecessor in
 * the *full* chain, vocabulary neighbours included. An empty list is the
 * vocabulary mode the backend treats as the default.
 */
export const toWire = (
  draft: Draft,
  saved?: ClusterTopology | null
): ClusterTopology => {
  const entries = draft.chain
    .map((layer, index) => ({ layer, index }))
    .filter(({ layer }) => !layer.builtin || layer.customised)
    .map(({ layer, index }) => ({
      name: layer.id,
      labelKeys: layer.labelKeys,
      parentLayer: index === 0 ? null : draft.chain[index - 1].id
    }));
  const sub = draft.subDomain;
  const subDomainKeys =
    sub.mode === 'field'
      ? draft.chain.find((layer) => layer.id === sub.field)?.labelKeys || []
      : sub.mode === 'keys'
        ? sub.keys
        : [];
  return {
    ...(saved || {}),
    layers: entries,
    acceleratorDomain: { labelKeys: draft.domainKeys, subDomainKeys }
  };
};

export const insertLayer = (
  draft: Draft,
  layer: DraftLayer,
  index: number
): Draft => {
  const chain = [...draft.chain];
  chain.splice(index, 0, layer);
  return { ...draft, chain };
};

/** Also drops a sub-domain that pointed at the layer; nothing else refers to it. */
export const removeLayer = (draft: Draft, id: string): Draft => ({
  ...draft,
  chain: draft.chain.filter((layer) => layer.id !== id),
  subDomain:
    draft.subDomain.mode === 'field' && draft.subDomain.field === id
      ? { mode: 'none' }
      : draft.subDomain
});
