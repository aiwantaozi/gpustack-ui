import { topologyFieldLabel } from '../../config';
import {
  ACCELERATOR_DOMAIN,
  NODE_LAYER,
  TopologyLayerView,
  TopologyView,
  TopologyWorker,
  WorkerLocation
} from '../../config/types';

/** A column of the location table: a layer or the accelerator domain. */
export interface LocationField {
  id: string;
  /** Already translated; custom layers pass their name through. */
  label: string;
  builtin: boolean;
  /** Some worker resolves a value here. */
  active: boolean;
  primaryKey: string | null;
  labelKeys: string[];
}

type Intl = { formatMessage: (d: { id: string }) => string };

export const fieldLayers = (view: TopologyView) =>
  view.layers.filter((layer) => layer.id !== NODE_LAYER);

/** Every field a cluster has, chain order then the accelerator domain. */
export const allFields = (intl: Intl, view: TopologyView): LocationField[] => [
  ...fieldLayers(view).map((layer) => ({
    id: layer.id,
    label: layer.builtin
      ? topologyFieldLabel(intl, layer.id, layer.name)
      : layer.name,
    builtin: layer.builtin,
    active: layer.active,
    primaryKey: layer.primary_key,
    labelKeys: layer.label_keys
  })),
  {
    id: ACCELERATOR_DOMAIN,
    label: topologyFieldLabel(intl, ACCELERATOR_DOMAIN),
    builtin: true,
    active: !!view.accelerator_domain?.active,
    primaryKey: view.accelerator_domain?.label_keys?.[0] || null,
    labelKeys: view.accelerator_domain?.label_keys || []
  }
];

/**
 * The rack always, because it is what the onboarding tells people to fill
 * first and an empty table has nowhere to write; everything else once some
 * worker has a value.
 */
export const shownByDefault = (field: LocationField) =>
  field.active || field.id === 'rack';

/** What a cluster's table shows before anyone touches the column picker. */
export const visibleFields = (intl: Intl, view: TopologyView) =>
  allFields(intl, view).filter(shownByDefault);

export const isFilled = (worker: TopologyWorker, field: string) =>
  !!worker.location?.[field]?.value;

export const isDiscovered = (location?: WorkerLocation | null) =>
  location?.source === 'discovered' || location?.source === 'node';

/** Hand-filled on top of a value the device reported; clearing brings it back. */
export const isOverride = (location?: WorkerLocation | null) =>
  location?.source === 'user' && !!location.discovered_value;

export const shownValue = (location?: WorkerLocation | null) =>
  location?.display || location?.value || '';

/**
 * Existing values of one column, most-used first. What the in-cell dropdown
 * offers: an operator filling rack nine of twelve is far more likely to want
 * "R3" than to be inventing a new name.
 */
export const valueOptions = (workers: TopologyWorker[], field: string) => {
  const counts = new Map<string, number>();
  workers.forEach((worker) => {
    const value = worker.location?.[field]?.value;
    if (value) {
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }
  });
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([value, count]) => ({ value, count }));
};

/**
 * Resolve a field's value from a worker's own labels and discovered facts,
 * the same any-of walk the server does. For the Workers list, which polls on
 * its own and must not add a request per row; labels win over facts because
 * a hand-filled value is what the operator expects to see.
 */
export const resolveLocation = (
  worker: {
    labels?: Record<string, string> | null;
    status?: { topology_facts?: Record<string, string> | null } | null;
  },
  labelKeys: string[]
): WorkerLocation | null => {
  const labels = worker.labels || {};
  const facts = worker.status?.topology_facts || {};
  for (const key of labelKeys) {
    if (labels[key]) {
      return {
        value: labels[key],
        source: 'user',
        key,
        discovered_value: facts[key] || null
      };
    }
  }
  for (const key of labelKeys) {
    if (facts[key]) {
      return { value: facts[key], source: 'discovered', key };
    }
  }
  return null;
};

export const layerKeys = (view: TopologyView | undefined, field: string) =>
  field === ACCELERATOR_DOMAIN
    ? view?.accelerator_domain?.label_keys || []
    : view?.layers.find((layer: TopologyLayerView) => layer.id === field)
        ?.label_keys || [];
