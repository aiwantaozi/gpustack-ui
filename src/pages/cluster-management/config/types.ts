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
// Topology: how far apart this cluster's workers are.
//
// The wire form is camelCase, matching the neighbouring `k8s_options` blob —
// the backend declares aliases for exactly this.
// --------------------------------------------------------------------------

/**
 * The built-in leaf. It takes the worker's *name* rather than a label, which is
 * why the tightest gather choice exists even for a cluster that has declared
 * nothing — and why a missing label can only cost resolution, never
 * schedulability.
 */
export const NODE_LAYER = 'NodeTopologyLayer';

/** The domain a worker lands in when every one of a layer's label keys misses. */
export const UNCLASSIFIED = '<unclassified>';

export type GatherStrategy = 'MustGather' | 'PreferGather';

export interface TopologyLayer {
  /**
   * Operator-chosen, and shown verbatim in the deployment form's "at least in
   * the same ___" choices — so it is the display name as well as the id. That
   * is deliberate: there is no separate display field, which forces the name
   * to be something an operator actually recognises.
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

export interface ClusterTopology {
  layers?: TopologyLayer[];
  defaultGatherStrategy?: GatherStrategy | null;
  defaultGatherLayer?: string | null;
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
  children?: TopologyDomain[];
}

export interface TopologyPreview {
  /** Root-to-leaf, leaf included. */
  layers: string[];
  /** Layer name -> its declared any-of keys, so the page can name the missing key. */
  label_keys: Record<string, string[]>;
  total_workers: number;
  /** Deduplicated across layers: one worker missing two labels is one problem. */
  unclassified_workers: number;
  root: TopologyDomain;
}

export interface GatherTier {
  layer: string;
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
