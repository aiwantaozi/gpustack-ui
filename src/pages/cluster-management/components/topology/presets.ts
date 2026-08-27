import { TopologyLayer } from '../../config/types';

/**
 * Ready-made rungs, coarse to fine.
 *
 * The point is not to save typing on the *name* — it is that the label keys
 * are the part nobody remembers. `topology.kubernetes.io/zone` versus
 * `failure-domain.beta.kubernetes.io/zone` is a detail an operator should be
 * able to pick from a list instead of recalling, and getting it wrong produces
 * a silently unclassified fleet rather than an error.
 *
 * Every preset carries several keys because the field is any-of: a fleet that
 * mixes a cloud's labels with a private scheme works without relabelling, and
 * the first key present on a worker wins.
 */
export interface LayerPreset {
  key: string;
  /** Message id for the human-facing description of what this layer means. */
  descriptionId: string;
  /**
   * How coarse this layer is: 0 is the widest, larger is tighter.
   *
   * Used to insert a preset at its natural position instead of appending.
   * Appending produced `Region -> Rack -> Row` when the operator picked those
   * three in menu order — a chain that says a row lives inside a rack, which
   * is backwards and which the operator then has to fix with the arrows. The
   * menu is a list of *rungs*, not a queue.
   */
  rank: number;
  layer: TopologyLayer;
}

export const LAYER_PRESETS: LayerPreset[] = [
  {
    key: 'region',
    descriptionId: 'clusters.topology.preset.region',
    rank: 0,
    layer: {
      name: 'Region',
      labelKeys: [
        'topology.kubernetes.io/region',
        'failure-domain.beta.kubernetes.io/region'
      ]
    }
  },
  {
    key: 'zone',
    descriptionId: 'clusters.topology.preset.zone',
    rank: 1,
    layer: {
      name: 'Zone',
      labelKeys: [
        'topology.kubernetes.io/zone',
        'failure-domain.beta.kubernetes.io/zone'
      ]
    }
  },
  {
    key: 'row',
    descriptionId: 'clusters.topology.preset.row',
    rank: 2,
    layer: {
      name: 'Row',
      labelKeys: ['topology.gpustack.ai/row']
    }
  },
  {
    key: 'rack',
    descriptionId: 'clusters.topology.preset.rack',
    rank: 3,
    layer: {
      name: 'Rack',
      labelKeys: ['topology.gpustack.ai/rack', 'topology.kubernetes.io/rack']
    }
  }
];

/**
 * What the drawer opens with, and what Reset goes back to: **one** layer.
 *
 * Deliberately not the whole preset list. Depth past the rack buys nothing on
 * hardware where the host is already the tightest domain — measured on Ascend
 * 910B2, all eight cards inside a node are HCCS-connected, so `hostname` *is*
 * the tight domain and a row or chassis layer above it is a distinction the
 * fabric does not make. Seeding four layers would have operators labelling for
 * a hierarchy the scheduler cannot use.
 *
 * The other presets stay one click away in the insert menu for the fleets that
 * genuinely span zones.
 */
export const DEFAULT_TEMPLATE: TopologyLayer[] = [
  { ...LAYER_PRESETS[3].layer, parentLayer: null }
];
