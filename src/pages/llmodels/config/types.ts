export interface ListItem {
  source: string;
  backend: string;
  categories?: string[];
  reranker: boolean;
  image_only?: boolean;
  huggingface_repo_id: string;
  huggingface_file_name: string;
  backend_version?: string;
  huggingface_filename: string;
  ollama_library_model_name: string;
  model_scope_file_path: string;
  model_scope_model_id: string;
  embedding_only?: boolean;
  ready_replicas: number;
  speech_to_text?: boolean;
  text_to_speech?: boolean;
  enable_model_route?: boolean;
  replicas: number;
  s3Address: string;
  lora_list: Array<{
    huggingface_filename: string;
    local_path: string;
    lora_name: string;
    lora_repo_name: string;
    model_file_id: string;
    model_scope_file_path: string;
    path: string;
    source: string;
  }>;
  owner_principal_id?: number;
  name: string;
  description: string;
  id: number;
  cluster_id: number;
  local_path?: string;
  created_at: string;
  updated_at: string;
  // Built-in values are 'public' | 'authed' | 'allowed_users';
  // additional values (e.g. 'allowed_principals') may be contributed
  // by plugins via `accessControl.prependedPolicies` or by
  // overriding the default via `accessControl.allowedUsersOverride`.
  // The `(string & {})` tail keeps literal autocomplete for the
  // built-ins while still accepting plugin-defined values.
  access_policy: 'public' | 'authed' | 'allowed_users' | (string & {});
  native_anthropic_api?: boolean;
  generic_proxy?: boolean;
  gpu_selector?: {
    gpu_ids: string[];
    gpus_per_replica?: number;
  };
  gpu_type_selector?: GPUTypeSelector | null;
  worker_selector?: object;

  // --- PD: user intent ---
  roles?: RoleSpec[] | null;
  disaggregation?: DisaggregationSpec | null;

  // --- PD: server-owned status, read-only ---
  //
  // `state` answers exactly one question: can this serve. It is NOT
  // `ready_replicas > 0` under PD — a 3P1D whose router is down is four
  // running instances and zero service. Being up but worse than asked for
  // lives beside it in `degradations`, never inside it, so `state === 'running'`
  // is the servability gate everywhere with no per-shape special case.
  state?: string | null;
  state_message?: string | null;
  // Per-role detail for the row's hover panel, and the source of the replica
  // column's denominator under PD.
  role_status?: Record<string, RoleStatus> | null;
  // A member predates the config it is shown with. Orthogonal to `state`: a
  // stale group is usually still serving.
  stale?: boolean | null;
  // `DegradationValueMap` values, and a list because they coexist.
  degradations?: string[] | null;
}

// ---------------------------------------------------------------------------
// Prefill/decode disaggregation.
//
// A model with `roles` set is a *group*: one pool, one router, one generation
// at a time. `roles` alone is plain multi-role orchestration; both together is
// PD. `roles` absent is every model that exists today, and that path must stay
// byte-for-byte what it is.
// ---------------------------------------------------------------------------

// One role's overrides. Every deployment field left undefined inherits the
// Model-level field of the same name, which is what lets a homogeneous 1P1D
// be "flip a switch and type two numbers" rather than three full forms. The
// override surface is the *whole* of `backend_parameters` and `env` on
// purpose: measured on Ascend 910B2, prefill and decode differ in nearly every
// performance-related parameter.
export interface RoleSpec {
  name: string;
  replicas: number;
  backend?: string | null;
  backend_version?: string | null;
  image_name?: string | null;
  run_command?: string | null;
  backend_parameters?: string[] | null;
  env?: Record<string, any> | null;
  gpu_selector?: {
    gpu_ids?: string[];
    gpus_per_replica?: number;
  } | null;
  worker_selector?: Record<string, any> | null;
  // The only entry point for a heterogeneous group, and the precondition for
  // gang admission.
  gpu_type_selector?: GPUTypeSelector | null;
  extended_kv_cache?: Record<string, any> | null;
  dependencies?: string[] | null;
  cpu_only?: boolean;
}

// The form's shape for a role: `RoleSpec` plus the per-group override
// switches, which are UI-only and stripped before submit. A switch left off
// means the group's fields submit as null, so the form and the payload are the
// same shape and nothing has to guess which fields to drop.
export interface RoleFormItem extends RoleSpec {
  overrides?: Record<string, boolean>;
  // Router only: "managed by the system" versus hand-written.
  managed?: boolean;
}

export interface DisaggregationSpec {
  mode: string;
  readiness?: 'any_per_role' | 'all';
  kv_load_failure_policy?: 'fail' | 'recompute';
  router_kind?: string | null;
}

// Per-role readiness detail, carried on the model row rather than computed per
// request: the list endpoint returns models without their instances, and the
// list needs per-role detail on a row the user has not expanded.
export interface RoleStatus {
  desired: number;
  ready: number;
}

// `POST /v2/models/{id}/restart`. The endpoint converges the model onto its
// current spec rather than cycling processes, so "nothing to do" is a success:
// `restarted: false` means the members already run that spec (or there are
// none), which is why the caller has to read this instead of the status code.
export interface ModelRestartResult {
  spec_digest: string;
  restarted: boolean;
  deleted_instances?: string[];
  message?: string | null;
}

// One entry of `GET /v2/pd-modes`. Deliberately loose below the fields the UI
// reads: the catalog's whole point is that adding an engine is a YAML change,
// so the UI must not mirror its full schema.
export interface PDMode {
  name: string;
  display_name: string;
  description?: string;
  backends: string[];
  backend_versions?: Record<string, string> | null;
  runtime?: string | null;
  roles?: Record<string, any>;
  router?: {
    protocol?: string;
    image?: string | null;
    command?: string | null;
    health_path?: string | null;
    capabilities?: Record<string, boolean>;
    peers?: Record<string, any>;
  } | null;
  kv_lease?: {
    connector?: string;
    param?: string | null;
    inject_to?: string | null;
    settable?: boolean;
    engine_default?: number | null;
    gpustack_default?: number | null;
    expired_metric?: string | null;
    description?: string | null;
  } | null;
}

// vGPU scheduling (issue #5192): deploy onto a GPU provided by a
// gpustack-operator InstanceType. Mutually exclusive with `gpu_selector`.
// Percentages 1-100 request a soft slice; both 0 request a whole card from
// the type pool; `accelerator_partitioned_profile` requests a hardware
// partition (e.g. MIG) and is mutually exclusive with the percentages.
export interface GPUTypeSelector {
  type?: string | null;
  accelerator_sliced_memory_percentage?: number | null;
  accelerator_sliced_cores_percentage?: number | null;
  accelerator_partitioned_profile?: string | null;
}

export type DeployFormKey = 'deployment' | 'catalog';

/**
 * An entry of the deploy form's cluster dropdown. `provider` is what tells the
 * form which GPU sources the target supports (ProviderValueMap).
 */
export type ClusterOption = Global.BaseOption<
  number,
  {
    provider: string;
    state: string;
    is_default: boolean;
    gpu_instance_enabled?: boolean;
    owner_principal_id?: number;
    workers: number;
    ready_workers: number;
    gpus: number;
  }
>;

export type SourceType =
  | 'huggingface'
  | 'model_scope'
  | 'local_path'
  | 'ollama_library';

export interface LoraListItem {
  lora_name: string;
  lora_repo_name: string;
  source: 'huggingface' | 'model_scope';
  huggingface_filename: string;
  model_scope_file_path: string;
  local_path: string;
  path: string;
  model_file_id: number;
}
export interface FormData {
  image_name?: string;
  run_command?: string;
  enable_model_route?: boolean;
  backend: string;
  native_anthropic_api?: boolean;
  restart_on_error?: boolean;
  env?: Record<string, any>;
  size?: number;
  quantization?: number;
  categories?: string[];
  backend_parameters?: string[];
  backend_version?: string;
  source: SourceType;
  huggingface_repo_id: string;
  huggingface_filename: string;
  s3_address: string;
  ollama_library_model_name: string;
  distributed_inference_across_workers?: boolean;
  lora_list: LoraListItem[];
  local_path?: string;
  model_scope_model_id?: string;
  model_scope_file_path?: string;
  generic_proxy?: boolean;
  gpu_selector?: {
    gpu_ids?: string[];
    gpu_type?: string;
    gpu_count?: number;
    gpus_per_replica?: number;
  };
  gpu_type_selector?: GPUTypeSelector | null;
  placement_strategy?: string;
  cpu_offloading?: boolean;
  worker_selector?: object;
  scheduleType?: string;
  // Which GPU source the manual mode picks from (ManualGPUModeMap): whole
  // cards or an InstanceType pool. UI-only, stripped before submit.
  manualGpuMode?: string;
  name: string;
  replicas: number;
  description: string;
  optimize_long_prompt: boolean;
  enable_speculative_decoding: boolean;
  cluster_id: number;
  extended_kv_cache: {
    enabled: boolean;
    // absent mode means 'local' (legacy deployments)
    mode?: 'local' | 'shared';
    cache_service_id?: number | null;
    chunk_size: number;
    ram_ratio: number;
    ram_size: number;
  };
  speculative_config: {
    enabled: boolean;
    algorithm: string;
    draft_model: string;
    num_draft_tokens: number;
    ngram_min_match_length: number;
    ngram_max_match_length: number;
  };
  scaling_schedule?: ScalingSchedule | null;
  max_context_len: number;

  // --- PD ---
  // UI-only: which of the Segmented's modes is selected. Stripped before
  // submit; `disaggregation` is what carries the intent.
  pdMode?: string;
  roles?: RoleFormItem[] | null;
  disaggregation?: DisaggregationSpec | null;
}

export interface ScalingScheduleRule {
  start_cron: string;
  duration_seconds?: number | null;
  replicas: number;
  name?: string;
}

export interface ScalingSchedule {
  enabled: boolean;
  baseline_replicas?: number | null;
  rules: ScalingScheduleRule[];
}

interface ComputedResourceClaim {
  offload_layers: number;
  total_layers: number;
  ram: number;
  vram: Record<string, number>;
}

export interface DistributedServerItem {
  pid: number;
  port: number;
  // Numeric on the wire (ModelInstanceSubordinateWorker.worker_id), so it
  // matches a worker's `id` by identity in the worker-list lookup.
  worker_id: number;
  computed_resource_claim: ComputedResourceClaim;
}

export interface DistributedServers {
  subordinate_workers: DistributedServerItem[];
}
export interface ModelInstanceListItem {
  // --- PD ---
  // Which role of the parent Model this instance serves; absent for a plain
  // single-role deployment.
  role?: string | null;
  // Shared by every member of one group. A group is a *generation*, not a
  // replica index — pairing binds to this rather than to peer addresses,
  // because serving ports were measured to change on every rebuild.
  group_id?: string | null;
  // The generation this instance was created from. Differing from the model's
  // current digest is what makes the model stale.
  spec_digest?: string | null;
  named_ports?: Record<string, { base: number; count: number }> | null;
  backend?: string;
  cluster_id: number;
  // Inherited from the parent Model's owner_principal_id on the
  // wire so per-row tenant filtering works without joining.
  owner_principal_id?: number | null;
  backend_version?: string;
  source: string;
  categories?: string[];
  huggingface_repo_id: string;
  huggingface_filename: string;
  ollama_library_model_name: string;
  distributed_servers?: DistributedServers;
  computed_resource_claim?: ComputedResourceClaim;
  injected_backend_parameters?: string[];
  // Present only for shared-KV-cache deployments; injected=false means the
  // instance started without the shared cache and fell back to local mode.
  cache_config?: {
    injected: boolean;
    reason?: string;
    cache_service_name?: string;
    cache_service_id?: number;
    // present-tense view of the recorded endpoint: false when the cache
    // the engine started with has since gone away or moved
    endpoint_live?: boolean | null;
  };
  s3_address: string;
  worker_id: number;
  gpu_indexes?: number[];
  worker_ip: string;
  gpu_index: number;
  // Echoed from the parent Model when it was deployed via an InstanceType
  // (vGPU); drives the slice/partition display on the instance row.
  gpu_type_selector?: GPUTypeSelector | null;
  pid: number;
  port: number;
  name: string;
  state: string;
  state_message: string;
  download_progress: number;
  model_id: number;
  model_name: string;
  worker_name: string;
  id: number;
  created_at: string;
  updated_at: string;
  draft_model_source: {
    source: string;
    huggingface_repo_id: string;
    huggingface_filename: string;
    model_scope_model_id: string;
    model_scope_file_path: string;
    local_path: string;
  };
  draft_model_download_progress: 0;
  draft_model_resolved_path: string;
}

export interface ModelInstanceFormData {
  model_id: number;
  model_name: string;
  source: string;
  huggingface_repo_id: string;
  huggingface_filename: string;
}

export interface GPUListItem {
  name: string;
  uuid: string;
  vendor: string;
  index: number;
  core: {
    total: number;
    utilization_rate: number;
  };
  memory: {
    total: number;
    utilization_rate: number;
    is_unified_memory: boolean;
    used: number;
    allocated: number;
  };
  temperature: number;
  id: string;
  worker_id: number;
  worker_name: string;
  worker_ip: string;
}

export interface CatalogItem {
  name: string;
  id: number;
  description: string;
  deployment_notes?: string;
  home: string;
  icon: string;
  categories: string[];
  capabilities: string[];
  size: number;
  size_unit: string;
  activated_size: number;
  licenses: string[];
  release_date: string;
  // Which source materialized this entry. Absent / builtin / official all mean
  // platform-owned content, which carries no badge.
  source_name?: string;
  source_type?: string;
}

export interface CatalogSpec {
  source: string;
  huggingface_repo_id: string;
  huggingface_filename: string;
  ollama_library_model_name: string;
  model_scope_model_id: string;
  model_scope_file_path: string;
  local_path: string;
  name: string;
  description: string;
  meta: Record<string, any>;
  replicas: number;
  ready_replicas: number;
  categories: any[];
  placement_strategy: string;
  cpu_offloading: boolean;
  mode: string;
  distributed_inference_across_workers: boolean;
  worker_selector: Record<string, any>;
  gpu_selector: {
    gpu_ids: string[];
    gpus_per_replica: number;
  };
  extended_kv_cache: {
    enabled: boolean;
    // absent mode means 'local' (legacy deployments)
    mode?: 'local' | 'shared';
    cache_service_id?: number | null;
    chunk_size: number;
    max_local_cpu_size: number;
    remote_url: string;
  };
  speculative_config: {
    enabled: boolean;
    algorithm: string;
    draft_model: string;
    num_draft_tokens: number;
    ngram_min_match_length: number;
    ngram_max_match_length: number;
  };
  backend: string;
  backend_version: string;
  backend_parameters: any[];
  quantization: string;
  size: number;
}

export interface EvaluateSpec {
  source?: string;
  cluster_id?: number;
  huggingface_repo_id?: string;
  huggingface_filename?: string;
  ollama_library_model_name?: string;
  model_scope_model_id?: string;
  model_scope_file_path?: string;
  local_path?: string;
  name?: string;
  description?: string;
  meta?: Record<string, any>;
  replicas?: number;
  ready_replicas?: number;
  categories?: any[];
  placement_strategy?: string;
  cpu_offloading?: boolean;
  distributed_inference_across_workers?: boolean;
  worker_selector?: Record<string, any>;
  gpu_selector?: {
    gpu_ids: string[];
    gpus_per_replica: number;
  };
  backend?: string;
  backend_version?: string;
  backend_parameters?: any[];
  env?: Record<string, any>;
  distributable?: boolean;
  quantization?: string;
  size?: number;
}

export interface EvaluateResult {
  compatible: boolean;
  compatibility_messages: string[];
  scheduling_messages: string[];
  default_spec: Record<string, any>;
  error?: boolean;
  error_message?: string;
  resource_claim?: {
    ram: number;
    vram: number;
  };
  cluster_id?: number;
  resource_claim_by_cluster_id?: {
    [key: number]: {
      ram: number;
      vram: number;
    };
  };
}

export interface BackendGroupOption {
  value: string;
  label: string;
  title?: string;
  default_backend_param: string[];
  default_version: string;
  isBuiltIn: boolean;
  versions: { label: string; value: string; title?: string }[];
}

export interface BackendGroupItem {
  value: string;
  label: string;
  title?: string;
  default_backend_param: string[];
  default_version: string;
  isBuiltIn: boolean;
  backend_source: string;
  enabled: boolean;
  common_parameters?: string[];
  parameter_format?: 'space' | 'equal' | null;
  versions: {
    label: string;
    value: string;
    title?: string;
    env?: Record<string, any>;
    is_deprecated: boolean;
  }[];
}

export interface BackendOption {
  value: string;
  label: string;
  title?: string;
  default_backend_param: string[];
  default_version: string;
  isBuiltIn: boolean;
  backend_source: string;
  default_env?: Record<string, any>;
  enabled: boolean;
  common_parameters?: string[];
  parameter_format?: 'space' | 'equal' | null;
  // Which managed source produced the entry — null for the packaged content and
  // for anything a user added by hand, neither of which carries a badge.
  source_name?: string;
  source_type?: string;
  versions: {
    label: string;
    value: string;
    title?: string;
    env?: Record<string, any>;
    is_deprecated: boolean;
  }[];
}

export interface AccessControlFormData {
  // See `RouteItem.access_policy` for why plugin-defined values are
  // accepted alongside the built-ins. The OSS "specific users" entry
  // now writes `allowed_principals` (with a user-only grant list);
  // `allowed_users` remains accepted as the deprecated released value.
  access_policy: 'public' | 'authed' | 'allowed_users' | (string & {});
  // Omitted when the caller isn't managing the user list (the
  // principal-based override, or authed/public) so the server leaves
  // existing grants untouched; an explicit (possibly empty) list
  // replaces the route's USER-kind grants.
  users?: { id: number }[];
  // Full grant set (any kind) submitted by the principal-based override
  // on save — replaces the route's entire grant set. OSS leaves it unset
  // (it manages users via `users`).
  principals?: {
    principal_type: string;
    principal_id: number;
    principal_name?: string;
    principal_display_name?: string;
  }[];
}

export interface BackendItem {
  backend_name: string;
  from_config: boolean;
  default_version: string;
  default_backend_param: string[];
  is_built_in: boolean;
  backend_source: string;
  enabled: boolean;
  common_parameters?: string[];
  parameter_format?: 'space' | 'equal' | null;
  source_name?: string;
  source_type?: string;
  versions: {
    version: string;
    env?: Record<string, any>;
    is_deprecated: boolean;
  }[];
}

export interface DraftModelItem {
  source: string;
  huggingface_repo_id: string;
  huggingface_filename: string;
  ollama_library_model_name: string;
  model_scope_model_id: string;
  model_scope_file_path: string;
  local_path: string;
  name: string;
  algorithm: string;
}

export interface InstanceRestartCount {
  main_worker_id: number;
  workers: {
    worker_id: number;
    name: string;
    restarts: {
      previous: boolean;
      started_at: string;
      containers: string[];
    }[];
    error?: string | null;
  }[];
}

export interface ModelLoraAdapterResult {
  lora_list: Array<{
    is_local: boolean;
    lora_repo_name: string;
    source: 'huggingface' | 'model_scope' | 'local_path';
  }>;
}
