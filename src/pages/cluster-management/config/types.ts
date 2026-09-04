import { ProviderType } from '.';

export interface CredentialFormData {
  name: string;
  provider: string;
  key: string;
  secret: string;
  description?: string;
  id?: number;
}

export type ClusterStatusType = 'provisioning' | 'provisioned' | 'ready';

export interface CredentialListItem {
  id: number;
  name: string;
  provider: ProviderType;
  access_key: string;
  secret_key: string;
  description?: string;
  owner_principal_id?: number | null;
  created_at: string;
  updated_at: string;
}

export interface NodePoolFormData {
  name: string;
  instance_type: string;
  os_image: string;
  image_name: string;
  replicas: number;
  batch_size: number;
  labels: Record<string, string>;
  cloud_options: Record<string, any>;
  instance_spec: Record<string, any>;
}

export interface NodePoolListItem extends NodePoolFormData {
  id: number;
  instance_type: string;
  replicas: number;
  workers: number;
  ready_workers?: number;
  batch_size: number;
  labels: Record<string, string>;
  cloud_options: Record<string, any>;
  os_image: string;
  created_at: string;
  updated_at: string;
  cluster_id: number;
}
export interface VolumeMount {
  name: string;
  mountPath: string;
  readOnly: boolean;
  volumeSource: {
    hostPath: {
      path: string;
      type: string;
    };
    persistentVolumeClaim: {
      claimName: string;
      readOnly: boolean;
    };
    configMap: {
      name: string;
      optional: boolean;
    };
  };
}

export interface ImageCredential {
  registry: string;
  username: string;
  password: string;
}

export interface GpuInstanceOptions {
  // The mere presence of `gpuInstanceOptions` on `k8s_options` signals
  // "GPU instances enabled" for the cluster — absence opts the cluster out,
  // so there's no separate boolean flag on the wire.
  //
  // Every knob mirrors a GPUStack Operator setting of the same name and is
  // tri-state: absent (or `null`) means GPUStack does not manage that setting
  // and the cluster keeps its own value — a different instruction from an
  // explicit `false`. The backend drops nulls when persisting, so `null` is
  // how the form says "not managed".
  //
  // Keeps its legacy name — renaming it to the operator's
  // `instance-access-static-address` would break the payload for every
  // existing client, so the mismatch stays confined to this one field.
  gpuInstancesAccessStaticAddress?: string | null;
  // Operator `instance-type-derived-from-node` (operator default: true).
  gpuInstanceTypeDerivedFromNode?: boolean | null;
  // Operator `instance-type-mixed-on-node` (operator default: true).
  gpuInstanceTypeMixedOnNode?: boolean | null;
}

export interface K8sOptions {
  // Backend serializes K8sOptions with camelCase aliases (by_alias=True on
  // the SQL JSON column). The top-level `k8s_options` field on the cluster
  // stays snake_case, but everything inside follows the backend wire shape.
  volumeMounts?: VolumeMount[];
  imageCredentials?: ImageCredential[];
  // Base nodeSelector applied to every worker DaemonSet; each per-runtime
  // DaemonSet additionally gets a vendor PCI-presence label merged on top at
  // render time, so per-vendor overrides are no longer configured here.
  nodeSelector?: Record<string, string>;
  // Override for the gpustack-operator container image. Falls back to the
  // server's default when unset.
  operatorImage?: string | null;
  // GPU-instance support knobs; presence enables GPU instance handling.
  gpuInstanceOptions?: GpuInstanceOptions;
  // Kubernetes namespace the cluster's manifests render into. Falls back to
  // `gpustack-system` at render time when unset.
  namespace?: string | null;
}

export interface ClusterListItem {
  name: string;
  display_name: string;
  is_default: boolean;
  description: string;
  worker_config: Record<string, any>;
  // Per-cluster default container registry, promoted out of worker_config to
  // a top-level column on the backend (image resolution / registration token
  // read it directly). Falls back to the server default when unset.
  system_default_container_registry?: string | null;
  provider: ProviderType;
  credential_id: number;
  created_at: string;
  zone: string;
  region: string;
  gpus: number;
  models: number;
  workers: number;
  ready_workers: number;
  id: number;
  state: ClusterStatusType;
  state_message: string;
  worker_pools: NodePoolListItem[];
  k8s_options?: K8sOptions;
  // Stored alongside k8s_options and handled identically. Absent is not a
  // degraded state: it means no layers declared, which the tree already
  // handles by giving every worker a leaf of its own under the root.
  topology?: ClusterTopology | null;
  // Backend ClusterPublic carries this; admin-"All" namespace
  // resolution falls back to the cluster's owner Org name.
  owner_principal_id?: number;
}

export interface ClusterFormData {
  name: string;
  description: string;
  provider: ProviderType;
  is_default?: boolean;
  credential_id: number;
  zone: string;
  region: string;
  server_url?: string;
  worker_config?: Record<string, any>;
  system_default_container_registry?: string | null;
  worker_pools?: NodePoolFormData[];
  k8s_options?: K8sOptions;
}

export interface SystemConfig {
  disable_builtin_observability?: boolean;
  debug: boolean;
  grafana_url?: string;
  server_external_url: string | null;
  system_default_container_registry: string | null;
  showMonitoring?: boolean;
  // Platform-wide business timezone (IANA name) resolved from GPUSTACK_TIMEZONE.
  timezone?: string;
}

// --------------------------------------------------------------------------
// Topology: where this cluster's workers sit, and how far apart.
//
// The wire form of `ClusterTopology` is camelCase, matching the neighbouring
// `k8s_options` blob — the backend declares aliases for exactly this. The
// read models (`TopologyView` and friends) are snake_case like every other
// response body.
// --------------------------------------------------------------------------

/**
 * The built-in leaf. It takes the worker's *name* rather than a label, which is
 * why the tightest gather choice exists even for a cluster that has declared
 * nothing — and why a missing label can only cost resolution, never
 * schedulability.
 */
export const NODE_LAYER = 'NodeTopologyLayer';

/**
 * Orthogonal to the layer chain: an NVL72 domain is a whole rack, a
 * CloudMatrix384 domain spans sixteen. It is a scope of its own in the
 * scheduler and a column of its own in the UI.
 */
export const ACCELERATOR_DOMAIN = 'accelerator_domain';

/** The domain a worker lands in when every one of a layer's label keys misses. */
export const UNCLASSIFIED = '<unclassified>';

export type GatherStrategy = 'MustGather' | 'PreferGather';

export interface TopologyLayer {
  /**
   * A vocabulary id (`rack`) or an operator-chosen custom name. Custom names
   * are shown verbatim in the deployment form, so there is no separate
   * display field — which pushes them towards a word a deployer recognises.
   */
  name: string;
  /**
   * any-of, tried in order, first present wins. The same physical layer is
   * spelled differently by every vendor and cloud, and a mixed fleet must not
   * have to be relabelled before topology works at all.
   */
  labelKeys?: string[];
  /**
   * A chain rather than an ordered list: inserting a layer into a list
   * renumbers every layer below it, and these names are referenced from saved
   * model configurations. Unset means "hangs off the cluster root".
   */
  parentLayer?: string | null;
}

export interface AcceleratorDomainSpec {
  labelKeys?: string[];
  /**
   * Sub-domain, any-of. Machines in the same domain *and* sub-domain are
   * closer than same-domain-only (Atlas 950's compute cabinet). Usually the
   * keys of a location field, so a rack plays both roles at once.
   */
  subDomainKeys?: string[];
}

export interface ClusterTopology {
  /**
   * Empty means vocabulary mode. Entries are custom layers plus any vocabulary
   * field whose keys were customised (`name` == the vocabulary id).
   */
  layers?: TopologyLayer[];
  acceleratorDomain?: AcceleratorDomainSpec | null;
  defaultGatherStrategy?: GatherStrategy | null;
  defaultGatherLayer?: string | null;
}

export interface TopologyVocabularyField {
  id: string;
  /** Server fallback only; the UI has an i18n name for every builtin id. */
  name: string;
}

export interface TopologyKnownKey {
  key: string;
  vendor: string;
  /** Which field ids this key is a sensible source for. */
  fits: string[];
  note?: string | null;
}

export interface TopologyLayerView {
  id: string;
  name: string;
  builtin: boolean;
  /** At least one worker resolves a value here; only active layers form the tree. */
  active: boolean;
  label_keys: string[];
  /** The key a hand-filled value is written to; null for custom layers. */
  primary_key: string | null;
  domains: number;
  classified: number;
  unclassified: number;
  /**
   * Models whose gather layer is this one; deleting it would strand them.
   * Older servers omit the field, and the UI then asks the models API itself.
   */
  referenced_by_models?: string[];
}

export interface AcceleratorDomainView {
  active: boolean;
  domains: number;
  classified: number;
  unclassified: number;
  label_keys: string[];
  sub_domain_keys: string[];
  /** The field whose keys `sub_domain_keys` mirror, when it is one. */
  sub_domain_field: string | null;
}

export type LocationSource = 'user' | 'discovered' | 'node';

export interface WorkerLocation {
  value: string;
  source: LocationSource;
  /** Which any-of key produced the value. */
  key: string;
  /** Still carried when a hand-filled value overrides it: clearing restores it. */
  discovered_value?: string | null;
  /** A human name for an auto value (a switch's system name over its chassis id). */
  display?: string | null;
}

export interface TopologyWorker {
  id: number;
  name: string;
  state: string;
  gpus: number;
  free_gpus: number;
  /** Keyed by field id; fields with no value are absent. */
  location: Record<string, WorkerLocation>;
  /** The worker's own labels, so key counts need no second request. */
  labels?: Record<string, string>;
}

export interface TopologyDomain {
  layer: string;
  name: string;
  /** Its label keys all missed. Rendered as a prompt to act, not as a domain. */
  unclassified?: boolean;
  /** Which of the layer's any-of keys actually matched here. */
  matched_label_key?: string | null;
  workers: number;
  gpus: number;
  /** GPUs with nothing allocated. The number "can my 2P2D fit here" needs. */
  free_gpus: number;
  /** Carried only on the unclassified bucket and the leaf — see the API doc. */
  worker_ids?: number[];
  /** Accelerator domains present under this node; two or more is worth a look. */
  accelerator_domains?: string[];
  children?: TopologyDomain[];
}

export interface TopologySuggestion {
  key: string;
  workers: number;
  distinct_values: number;
  looks_like: string;
}

/** Everything the topology drawer needs for its first paint, in one response. */
export interface TopologyView {
  vocabulary: {
    fields: TopologyVocabularyField[];
    known_keys: TopologyKnownKey[];
  };
  /** Root-to-leaf, every vocabulary field plus custom layers, the host last. */
  layers: TopologyLayerView[];
  accelerator_domain: AcceleratorDomainView;
  workers: TopologyWorker[];
  tree: TopologyDomain;
  suggestions: TopologySuggestion[];
}

export interface LocationAssignment {
  worker_ids: number[];
  /** A vocabulary field id, `accelerator_domain`, or a custom layer name. */
  layer: string;
  /** null deletes the field's own key and lets a discovered value show again. */
  value: string | null;
}

export interface LocationsResponse {
  /** The inverse operation, ready to be posted back verbatim as the undo. */
  previous: LocationAssignment[];
  topology: TopologyView;
}

export interface GatherTier {
  layer: string;
  /** Server fallback display name; builtin ids are named by the UI. */
  name?: string | null;
  feasible: boolean;
  /** Where the group would land, when it fits. */
  domain?: string | null;
  /** The solver's own words — "the roomiest rack holds 6". */
  reason?: string | null;
  best_domain?: string | null;
  needed: number;
  available: number;
  /**
   * Workers whose capacity could not be established. Non-zero makes
   * `available` a floor, and the form must not present a floor as a capacity
   * verdict: "we could not look" and "there is no room" call for opposite
   * reactions.
   */
  unmeasured: number;
}

export interface GatherFeasibility {
  /** Leaf-first: the tightest choice is the one that always exists. */
  tiers: GatherTier[];
  prefer?: GatherTier | null;
}
