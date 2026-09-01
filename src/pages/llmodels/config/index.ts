import { StatusMaps } from '@/config';
import { EditOutlined } from '@ant-design/icons';
import { backendOptionsMap } from '../constants/backend-parameters';

export const backendTipsList = [
  {
    title: backendOptionsMap.vllm,
    tips: 'models.form.backend.vllm'
  },
  {
    title: backendOptionsMap.SGLang,
    tips: 'models.form.backend.sglang'
  },
  {
    title: backendOptionsMap.ascendMindie,
    tips: 'models.form.backend.mindie'
  },
  {
    title: backendOptionsMap.voxBox,
    tips: 'models.form.backend.voxbox'
  }
];

export const localPathTipsList = [
  {
    title: {
      text: 'models.localpath.gguf.tips.title',
      locale: true
    },
    tips: 'models.localpath.gguf.tips'
  },
  {
    title: {
      text: 'models.localpath.shared.tips.title',
      locale: true
    },
    tips: 'models.localpath.chunks.tips'
  },
  {
    title: {
      text: 'models.localpat.safe.tips.title',
      locale: true
    },
    tips: 'models.localpath.safe.tips'
  }
];

export const backendLabelMap = {
  [backendOptionsMap.llamaBox]: 'llama-box',
  [backendOptionsMap.vllm]: 'vLLM',
  [backendOptionsMap.voxBox]: 'vox-box',
  [backendOptionsMap.ascendMindie]: 'Ascend MindIE',
  [backendOptionsMap.custom]: 'Custom'
};

export const backendParamsHolderTips = {
  [backendOptionsMap.llamaBox]: {
    holder: 'models.form.backend_parameters.llamabox.placeholder',
    tooltip: 'models.form.backend_parameters.vllm.tips'
  },
  [backendOptionsMap.vllm]: {
    holder: 'models.form.backend_parameters.vllm.placeholder',
    tooltip: 'models.form.backend_parameters.vllm.tips'
  },
  [backendOptionsMap.SGLang]: {
    holder: 'models.form.backend_parameters.sglang.placeholder',
    tooltip: ''
  },
  [backendOptionsMap.voxBox]: null
};

export const modelTaskMap = {
  textToSpeech: 'text-to-speech',
  speechToText: 'speech-to-text',
  textToText: 'text-to-text',
  textToImage: 'text-to-image',
  audio: 'audio',
  image: 'image'
};

export const ModelscopeTaskMap = {
  [modelTaskMap.textToSpeech]: 'text-to-speech',
  [modelTaskMap.speechToText]: 'auto-speech-recognition',
  [modelTaskMap.textToText]: 'TextToText',
  [modelTaskMap.textToImage]: 'text-to-image',
  audio: ['text-to-speech', 'auto-speech-recognition']
};

export const HuggingFaceTaskMap = {
  [modelTaskMap.textToSpeech]: 'text-to-speech',
  [modelTaskMap.speechToText]: 'automatic-speech-recognition',
  [modelTaskMap.textToText]: 'text-2-text',
  [modelTaskMap.textToImage]: 'text-to-image',
  audio: ['text-to-speech', 'automatic-speech-recognition']
};

export const AudioModeTypeMap = {
  FunASR: ['FunASR', 'funasr', 'fun-asr', 'fun_asr'],
  Bark: ['Bark', 'bark'],
  Whisper: ['Whisper', 'whisper'],
  CosyVoice: ['CosyVoice', 'cosyvoice', 'cosy-voice', 'cosy_voice']
};
interface ModelSource {
  huggingface: string;
  huggingface_value: string;
  ollama_library: string;
  ollama_library_value: string;
  modelScope: string;
  modelscope_value: string;
  local_path: string;
  local_path_value: string;
  model_scope: string;
}

export const modelSourceMap: ModelSource = {
  huggingface: 'Hugging Face',
  huggingface_value: 'huggingface',
  ollama_library: 'Ollama Library',
  ollama_library_value: 'ollama_library',
  modelScope: 'ModelScope',
  modelscope_value: 'model_scope',
  model_scope: 'ModelScope',
  local_path: 'Local Path',
  local_path_value: 'local_path'
};

export const modelSourceValueMap = {
  [modelSourceMap.huggingface_value]: modelSourceMap.huggingface,
  [modelSourceMap.ollama_library_value]: modelSourceMap.ollama_library,
  [modelSourceMap.modelscope_value]: modelSourceMap.modelScope,
  [modelSourceMap.local_path_value]: modelSourceMap.local_path
};

export const sourceOptions = [
  {
    label: 'Hugging Face',
    value: modelSourceMap.huggingface_value,
    key: 'huggingface'
  },
  {
    label: 'ModelScope',
    value: modelSourceMap.modelscope_value,
    key: 'model_scope'
  },
  {
    label: 'models.form.localPath',
    locale: true,
    value: modelSourceMap.local_path_value,
    key: 'local_path'
  }
];

export const InstanceStatusMap = {
  Initializing: 'initializing',
  Starting: 'starting',
  Pending: 'pending',
  Running: 'running',
  Scheduled: 'scheduled',
  Error: 'error',
  Downloading: 'downloading',
  Unknown: 'unknown',
  Analyzing: 'analyzing',
  Unreachable: 'unreachable'
};

export const InstanceRealtimeLogStatus = [
  InstanceStatusMap.Downloading,
  InstanceStatusMap.Initializing,
  InstanceStatusMap.Starting
];

export const InstanceStatusMapValue = {
  [InstanceStatusMap.Initializing]: 'Initializing',
  [InstanceStatusMap.Pending]: 'Pending',
  [InstanceStatusMap.Running]: 'Running',
  [InstanceStatusMap.Scheduled]: 'Scheduled',
  [InstanceStatusMap.Error]: 'Error',
  [InstanceStatusMap.Downloading]: 'Downloading',
  [InstanceStatusMap.Unknown]: 'Unknown',
  [InstanceStatusMap.Analyzing]: 'Analyzing',
  [InstanceStatusMap.Starting]: 'Starting',
  [InstanceStatusMap.Unreachable]: 'Unreachable'
};

export const status: any = {
  [InstanceStatusMap.Running]: StatusMaps.success,
  [InstanceStatusMap.Pending]: StatusMaps.transitioning,
  [InstanceStatusMap.Initializing]: StatusMaps.transitioning,
  [InstanceStatusMap.Scheduled]: StatusMaps.transitioning,
  [InstanceStatusMap.Error]: StatusMaps.error,
  [InstanceStatusMap.Downloading]: StatusMaps.transitioning,
  [InstanceStatusMap.Unknown]: StatusMaps.inactive,
  [InstanceStatusMap.Analyzing]: StatusMaps.transitioning,
  [InstanceStatusMap.Starting]: StatusMaps.transitioning,
  [InstanceStatusMap.Unreachable]: StatusMaps.error
};

export const MyModelsStatusValueMap = {
  Stopped: 'stopped',
  NotReady: 'not_ready',
  Ready: 'ready'
};

export const MyModelsStatusMap = {
  [MyModelsStatusValueMap.Stopped]: StatusMaps.inactive,
  [MyModelsStatusValueMap.NotReady]: StatusMaps.error,
  [MyModelsStatusValueMap.Ready]: StatusMaps.success
};

export const MyModelsStatusLabelMap = {
  [MyModelsStatusValueMap.Stopped]: 'models.mymodels.status.inactive',
  [MyModelsStatusValueMap.NotReady]: 'models.mymodels.status.degrade',
  [MyModelsStatusValueMap.Ready]: 'models.mymodels.status.active'
};

export const ScheduleValueMap = {
  Auto: 'auto',
  Manual: 'manual',
  SpecificGPUType: 'specific_gpu_type'
};

// Manual scheduling picks the GPUs one of two ways, chosen by a tab: whole
// cards out of the cluster's inventory (gpu_selector), or a whole / sliced /
// partitioned GPU out of an InstanceType pool (gpu_type_selector, "vGPU").
// UI-only field — the payload it maps to is one selector or the other.
export const ManualGPUModeMap = {
  FullGPU: 'full_gpu',
  VGPU: 'vgpu'
};

export const scheduleList = [
  {
    label: 'models.form.scheduletype.auto',
    locale: true,
    value: ScheduleValueMap.Auto
  },
  {
    label: 'models.form.scheduletype.manual',
    value: ScheduleValueMap.Manual,
    locale: true
  }
  // {
  //   label: 'models.form.scheduletype.gpuType',
  //   value: ScheduleValueMap.SpecificGPUType,
  //   locale: true
  // }
];

export const ActionList = [
  {
    label: 'common.button.edit',
    key: 'edit',
    icon: EditOutlined
  },
  {
    label: 'models.openinplayground',
    key: 'chat',
    icon: EditOutlined
  },
  {
    label: 'common.button.delete',
    key: 'delete',
    icon: EditOutlined
  }
];

export const ModelSortType = {
  trendingScore: 'trendingScore',
  likes: 'likes',
  downloads: 'downloads',
  lastModified: 'lastModified'
};

export const ModelScopeSortType = {
  [ModelSortType.trendingScore]: 'Default',
  [ModelSortType.likes]: 'StarsCount',
  [ModelSortType.downloads]: 'DownloadsCount',
  [ModelSortType.lastModified]: 'GmtModified'
};

export const placementStrategyOptions = [
  {
    label: 'Spread',
    value: 'spread'
  },
  {
    label: 'Binpack',
    value: 'binpack'
  }
];

export const modelCategoriesMap = {
  image: 'image',
  text_to_speech: 'text_to_speech',
  speech_to_text: 'speech_to_text',
  embedding: 'embedding',
  reranker: 'reranker',
  llm: 'llm'
};

export const categoryOptions = [
  {
    label: 'LLM',
    value: modelCategoriesMap.llm
  },
  {
    label: 'Embedding',
    value: modelCategoriesMap.embedding
  },
  {
    label: 'Reranker',
    value: modelCategoriesMap.reranker
  },
  {
    label: 'Image',
    value: modelCategoriesMap.image
  },
  {
    label: 'Text-to-Speech',
    value: modelCategoriesMap.text_to_speech
  },
  {
    label: 'Speech-to-Text',
    value: modelCategoriesMap.speech_to_text
  }
];

export const modelCategories = [
  { label: 'common.options.auto', value: null, locale: true },
  ...categoryOptions
];

export const getbackendParameters = (data: any) => {
  const backendParameters = data.backend_parameters || {};
  const result: string[] = [];
  Object.keys(backendParameters)?.forEach((key: string) => {
    result.push(`${key}=${backendParameters[key]}`);
  });
  return result;
};

export const setbackendParameters = (data: any) => {
  const result: Record<string, string> = {};
  const backendParameters = data.backend_parameters || [];
  backendParameters.forEach((item: string) => {
    const [key, value] = item.split('=');
    result[key] = value;
  });
  return result;
};

// extract the key of a backend parameter.
// supported formats: '--key', '--key=value', '--key value'
export const getBackendParameterKey = (param: string): string => {
  const trimmed = String(param).trim();
  const matched = trimmed.match(/^([^=\s]+)/);
  return matched ? matched[1] : trimmed;
};

// merge two backend_parameters lists and dedupe by key.
// params from `priorityParams` (e.g. defaultSpec) win over `baseParams`.
export const mergeBackendParameters = (
  baseParams: string[] = [],
  priorityParams: string[] = []
): string[] => {
  const safeBase = baseParams || [];
  const safePriority = priorityParams || [];

  const priorityKeys = new Set(
    safePriority.map((param) => getBackendParameterKey(param))
  );

  const filteredBase = safeBase.filter(
    (param) => !priorityKeys.has(getBackendParameterKey(param))
  );

  return [...filteredBase, ...safePriority];
};

export const modelLabels = [
  { label: 'Image', value: 'image_only' },
  { label: 'Text-to-speech', value: 'text_to_speech' },
  { label: 'Speech-to-text', value: 'speech_to_text' },
  { label: 'reranker', value: 'reranker' },
  { label: 'Embedding', value: 'embedding_only' }
];

// do not trigger form check compatibility when these fields change, maybe triggered manually
export const DO_NOT_TRIGGER_CHECK_COMPATIBILITY = [
  'model_scope_model_id',
  'huggingface_repo_id',
  'huggingface_filename',
  'model_scope_file_path',
  'name',
  'description',
  'env',
  'source',
  'cluster_id',
  'quantization',
  'size',
  'restart_on_error',
  'worker_selector',
  'backend_parameters',
  'local_path',
  'backend_version',
  'ollama_library_model_name',
  'scheduleType',
  'manualGpuMode',
  'placement_strategy',
  'backend',
  'gpu_selector.gpu_ids',
  'run_command',
  'image_name',
  'extended_kv_cache.enabled',
  'extended_kv_cache.mode',
  'extended_kv_cache.cache_service_id',
  'extended_kv_cache.ram_size',
  'speculative_config.enabled',
  'speculative_config.draft_model',
  'max_context_len',
  'native_anthropic_api',
  // Whether PD is on, and which recipe it picked: neither changes what the
  // deployment needs from a worker.
  'pdMode',
  'disaggregation.mode',
  // Role edits do not move the model-level answer either — and they are the
  // fields a user types through, so leaving them out would mean a round trip
  // per keystroke. Per-role sizing needs the endpoint to report a claim per
  // role, which it does not yet.
  'roles'
];

// ignore to compare old and new data when these fields change in updating model
// `native_anthropic_api` only reconfigures the gateway's ai-proxy provider, so
// the running instances stay as they are.
export const DO_NOT_NOTIFY_RECREATE = [
  'categories',
  'replicas',
  'description',
  'native_anthropic_api'
];

export const defaultFormValues = {
  replicas: 1,
  description: '',
  categories: null,
  env: {},
  scheduleType: ScheduleValueMap.Auto,
  manualGpuMode: ManualGPUModeMap.FullGPU,
  placement_strategy: 'spread',
  gpu_ids: null,
  gpu_selector: {},
  worker_selector: {},
  backend_parameters: [],
  backend_version: null,
  native_anthropic_api: false
};

export const getBackendParamsTips = (backend: string) => {
  if (backend === backendOptionsMap.llamaBox) {
    return {
      backend: 'llama-box',
      releases: 'https://github.com/gpustack/llama-box/releases',
      link: 'https://github.com/gpustack/llama-box?tab=readme-ov-file#usage',
      version: 'v0.0.140'
    };
  }
  if (backend === backendOptionsMap.vllm) {
    return {
      backend: 'vLLM',
      releases: 'https://github.com/vllm-project/vllm/releases',
      link: 'https://docs.vllm.ai/en/stable/cli/serve.html',
      version: 'v0.8.5'
    };
  }
  if (backend === backendOptionsMap.ascendMindie) {
    return {
      backend: 'Ascend MindIE',
      releases: '',
      link: 'https://docs.gpustack.ai/latest/user-guide/built-in-inference-backends/?h=parameters+reference#parameters-reference_2',
      version: '1.0.0'
    };
  }

  if (backend === backendOptionsMap.SGLang) {
    return {
      backend: 'SGLang',
      releases: '',
      link: 'https://docs.sglang.io/docs/advanced_features/server_arguments',
      version: 'v0.5.4'
    };
  }

  return {
    backend: 'vox-box',
    releases: 'https://github.com/gpustack/vox-box/releases',
    link: '',
    version: 'v0.0.13'
  };
};

export const scheduleTypeTips = [
  {
    title: {
      text: 'models.form.scheduletype.auto',
      locale: true
    },
    tips: 'models.form.scheduletype.auto.tips'
  },
  {
    title: {
      text: 'models.form.scheduletype.manual',
      locale: true
    },
    tips: 'models.form.scheduletype.manual.tips'
  }
];

// transform to enum type
export enum DeployFormKeyMap {
  DEPLOYMENT = 'deployment',
  CATALOG = 'catalog'
}

// Schema hint seeded into the catalog source editor. Mirrors the packaged
// model-catalog.yaml: a mapping with model_sets (and optionally draft_models),
// each model set carrying at least one spec. Comments only, so it cannot be
// saved unedited.
export const catalogSourceTemplate = `# A YAML mapping with model_sets (and optionally draft_models).
#
# Example:
#
# model_sets:
#   - name: Qwen3-0.6B
#     description: Dense causal language model with a 128K context.
#     home: https://qwenlm.github.io
#     # icon must be an absolute URL, a '/'-rooted path, or a raster data: URI
#     icon: https://example.com/icons/qwen.png
#     size: 0.6
#     categories:
#       - llm
#     capabilities:
#       - context/128K
#       - tools
#     licenses:
#       - apache-2.0
#     release_date: "2025-04-19"
#     specs:
#       - mode: standard
#         quantization: BF16
#         source: huggingface
#         huggingface_repo_id: Qwen/Qwen3-0.6B
#         backend: vLLM
#         backend_parameters:
#           - --max-model-len=8192
# draft_models: []
`;

// ---------------------------------------------------------------------------
// Prefill/decode disaggregation
// ---------------------------------------------------------------------------

// Phase one's role set. The data model allows any name; the backend's
// validation layer is what limits it to these three, and the UI mirrors that
// limit rather than offering an add-a-role affordance it cannot honour.
export const RoleValueMap = {
  Prefill: 'prefill',
  Decode: 'decode',
  Router: 'router'
};

export const RoleLabelMap = {
  [RoleValueMap.Prefill]: 'models.form.roles.prefill',
  [RoleValueMap.Decode]: 'models.form.roles.decode',
  [RoleValueMap.Router]: 'models.form.roles.router'
};

export const RoleOrder = [
  RoleValueMap.Prefill,
  RoleValueMap.Decode,
  RoleValueMap.Router
];

// The Segmented at the top of the PD block. Two states in phase one; the
// third (a homogeneous `kv_both` pool) is phase two and slots in here without
// changing the interaction, which is why this is a Segmented and not a Switch.
export const PDEnableValueMap = {
  Off: 'off',
  Disaggregated: 'disaggregated'
};

// `Model.state` — the model-level lifecycle. Not a copy of the instance
// lifecycle: there are no download or start phases here.
export const ModelStateValueMap = {
  Pending: 'pending',
  Partial: 'partial',
  Running: 'running',
  Error: 'error'
};

export const ModelStateMap = {
  [ModelStateValueMap.Pending]: StatusMaps.transitioning,
  [ModelStateValueMap.Partial]: StatusMaps.transitioning,
  [ModelStateValueMap.Running]: StatusMaps.success,
  [ModelStateValueMap.Error]: StatusMaps.error
};

export const ModelStateLabelMap = {
  [ModelStateValueMap.Pending]: 'models.state.pending',
  [ModelStateValueMap.Partial]: 'models.state.partial',
  [ModelStateValueMap.Running]: 'models.state.running',
  [ModelStateValueMap.Error]: 'models.state.error'
};

// Degradations are orthogonal to `state`: they say "serving, but worse than
// you asked for", so they coexist with `running` and are rendered as a warning
// badge beside its colour rather than replacing it.
export const DegradationValueMap = {
  CacheNotInjected: 'cache_not_injected',
  RatioUnmet: 'ratio_unmet',
  NoAtomicAdmission: 'no_atomic_admission',
  // Serving with no KV moving at all: disaggregation has collapsed into
  // aggregated serving. Kept apart from `bandwidth_degraded` because the two
  // have different fixes — slow transfer is a transport problem, no transfer
  // is a pairing that never formed.
  PDIneffective: 'pd_ineffective',
  // Members still in the namespace they were in before the upgrade. They
  // serve normally; what they do not do is appear in the tenant's quota
  // ledger, which is what atomic admission is decided on.
  PlacementDrifted: 'placement_drifted',
  // No prefill and decode member share a host, so every KV transfer crosses
  // the network. Placement-only, so unlike the bandwidth markers it is known
  // before any traffic has happened — which is the point of having it.
  PairingRemote: 'pairing_remote'
};

export const DegradationLabelMap = {
  [DegradationValueMap.CacheNotInjected]: 'models.pd.degraded.cache',
  [DegradationValueMap.RatioUnmet]: 'models.pd.degraded.ratio',
  [DegradationValueMap.NoAtomicAdmission]: 'models.pd.heterogeneous.warning',
  [DegradationValueMap.PDIneffective]: 'models.pd.degraded.ineffective',
  [DegradationValueMap.PlacementDrifted]: 'models.pd.degraded.placement',
  [DegradationValueMap.PairingRemote]: 'models.pd.degraded.pairing'
};

// The four override groups of a role tab. A group left on "same as model"
// submits its fields as null, which is exactly what the backend reads as
// "inherit" — so the form's shape and the payload's shape are the same and
// nothing has to decide which fields to strip.
export const OverrideGroupMap = {
  Backend: 'backend',
  Parameters: 'parameters',
  Scheduling: 'scheduling',
  Cache: 'cache'
};

export const OverrideGroupLabelMap = {
  [OverrideGroupMap.Backend]: 'models.form.roles.group.backend',
  [OverrideGroupMap.Parameters]: 'models.form.roles.group.parameters',
  [OverrideGroupMap.Scheduling]: 'models.form.roles.group.scheduling',
  [OverrideGroupMap.Cache]: 'models.form.roles.group.cache'
};

// Which RoleSpec fields each override group owns. Nulling a group means
// nulling exactly these, so the mapping lives in one place rather than being
// spelled out at each submit path.
export const OverrideGroupFields: Record<string, string[]> = {
  [OverrideGroupMap.Backend]: [
    'backend',
    'backend_version',
    'image_name',
    'run_command'
  ],
  [OverrideGroupMap.Parameters]: ['backend_parameters', 'env'],
  [OverrideGroupMap.Scheduling]: [
    'gpu_selector',
    'worker_selector',
    'gpu_type_selector'
  ],
  [OverrideGroupMap.Cache]: ['extended_kv_cache']
};

// The `custom` pd mode is the only one that injects nothing, so it is also the
// only one under which a mixed-engine group is legal — and the one where the
// user owns every connection-state parameter.
export const PD_MODE_CUSTOM = 'custom';

// Engines that have a built-in PD recipe. Anything else can still use PD, but
// only through `custom`.
export const PD_CAPABLE_BACKENDS = ['vLLM', 'SGLang'];

/**
 * Whether requests may be routed to this model.
 *
 * Mirrors the backend's `is_model_servable`, and is the ONE predicate the UI
 * should use for "can the user chat with this / benchmark this". Under PD a
 * running-instance count no longer implies servability, so `ready_replicas > 0`
 * is not it. A row whose `state` has not been computed yet falls back to the
 * counter, which is the same answer the gate gave before the field existed.
 */
export const isModelServable = (record: {
  state?: string | null;
  ready_replicas?: number;
}) => {
  if (!record?.state) {
    return (record?.ready_replicas ?? 0) > 0;
  }
  return record.state === ModelStateValueMap.Running;
};

/**
 * The replica column's denominator.
 *
 * Under PD `Model.replicas` is a 0/1 deployment switch, so `ready / replicas`
 * would render "5 / 1". The declared size of a group is the sum of its roles'
 * replica counts, router included, which `role_status` already carries. For a
 * model without roles the sum degenerates to `replicas` and the display is
 * unchanged.
 */
export const modelReplicaCounts = (record: {
  replicas?: number;
  ready_replicas?: number;
  roles?: { replicas: number }[] | null;
  role_status?: Record<string, { desired: number; ready: number }> | null;
}) => {
  if (!record?.roles?.length) {
    return {
      ready: record?.ready_replicas ?? 0,
      total: record?.replicas ?? 0
    };
  }
  const status = record.role_status;
  if (status) {
    const entries = Object.values(status);
    return {
      ready: entries.reduce((sum, item) => sum + (item?.ready ?? 0), 0),
      total: entries.reduce((sum, item) => sum + (item?.desired ?? 0), 0)
    };
  }
  // No status yet (a group that has never been reconciled): the spec still
  // knows the declared size, so show it rather than a bare zero.
  return {
    ready: record.ready_replicas ?? 0,
    total: record.roles.reduce((sum, role) => sum + (role?.replicas ?? 0), 0)
  };
};

export const isPDModel = (record: { roles?: unknown[] | null }) =>
  !!record?.roles?.length;
