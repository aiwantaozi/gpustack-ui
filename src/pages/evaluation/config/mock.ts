import {
  CreateEvaluationFormValues,
  EvaluationDetailData,
  EvaluationInstance,
  EvaluationRecord,
  EvaluationResultRow,
  EvaluationSuite
} from './types';

export const taskLabelMap: Record<string, string> = {
  mmlu_pro: 'MMLU',
  leaderboard_gpqa: 'GPQA',
  ifeval: 'IFEval',
  aime: 'AIME',
  humaneval: 'HumanEval',
  longbench2: 'LongBench V2',
  mmmlu: 'MMMLU',
  'ceval-valid': 'CEval'
};

export const visibleSuiteTaskMap: Record<string, string[]> = {
  general: ['mmlu_pro', 'leaderboard_gpqa', 'ifeval'],
  reasoning: ['aime'],
  coding: ['humaneval'],
  'long-context': ['longbench2'],
  multilingual: ['mmmlu']
};

export const evaluationSuites: EvaluationSuite[] = [
  {
    id: 'general',
    name: 'General',
    description:
      'Recommended default suite for broad model quality checks. Combines general knowledge, hard scientific reasoning, and instruction following into one easy-to-explain entry point for product users.',
    category: 'general_language',
    limit: '30%',
    tasks: ['mmlu_pro', 'leaderboard_gpqa', 'ifeval'],
    estimated_runtime_level: 'medium',
    recommended_for: [
      'default model comparison',
      'release candidate evaluation',
      'broad capability checks'
    ],
    default_enabled: true
  },
  {
    id: 'reasoning',
    name: 'Reasoning',
    description:
      "Focused hard-reasoning suite using olympiad-style math problems to highlight a model's step-by-step problem solving ability.",
    category: 'reasoning',
    limit: '20%',
    tasks: ['aime'],
    estimated_runtime_level: 'medium',
    recommended_for: [
      'hard reasoning comparison',
      'math-heavy evaluation',
      'differentiating top-tier models'
    ],
    default_enabled: true
  },
  {
    id: 'coding',
    name: 'Coding',
    description:
      'Coding suite for baseline code generation quality using a widely adopted executable benchmark that is already available in the current lm-eval task inventory.',
    category: 'coding',
    limit: '15%',
    tasks: ['humaneval'],
    estimated_runtime_level: 'medium',
    recommended_for: [
      'code generation checks',
      'developer-facing model selection',
      'lightweight coding regression tests'
    ],
    default_enabled: true
  },
  {
    id: 'long-context',
    name: 'Long Context',
    description:
      'Long-context suite for document-level understanding, retrieval, and multi-span reasoning. Useful for modern long-window models, but more expensive than the default quick checks.',
    category: 'long_context',
    limit: '10%',
    tasks: ['longbench2'],
    estimated_runtime_level: 'long',
    recommended_for: [
      'long document analysis',
      'retrieval and synthesis stress testing',
      'long-context regression tracking'
    ],
    default_enabled: true
  },
  {
    id: 'multilingual',
    name: 'Multilingual',
    description:
      'Multilingual suite for cross-language and Chinese capability tracking, using a broad multilingual benchmark together with a commonly used Chinese evaluation set.',
    category: 'multilingual',
    limit: '25%',
    tasks: ['mmmlu', 'ceval-valid'],
    estimated_runtime_level: 'medium',
    recommended_for: [
      'multilingual comparison',
      'Chinese capability validation',
      'localization readiness checks'
    ],
    default_enabled: true
  },
  {
    id: 'quick',
    name: 'Quick',
    description:
      'Fast preset for a low-cost first pass. Covers broad general quality, instruction following, and baseline coding ability without the heavier long-context or hard-science tasks.',
    category: 'preset',
    limit: '20%',
    tasks: ['mmlu_pro', 'ifeval', 'humaneval'],
    estimated_runtime_level: 'short',
    recommended_for: [
      'quick smoke tests',
      'default first-run evaluation',
      'low-cost model screening'
    ],
    default_enabled: true
  }
];

export const evaluationClusters = [
  { value: 1, label: 'Production Cluster' },
  { value: 2, label: 'Staging Cluster' },
  { value: 3, label: 'Research Cluster' }
];

export const evaluationInstances: EvaluationInstance[] = [
  {
    id: 101,
    cluster_id: 1,
    cluster_name: 'Production Cluster',
    model_id: 1,
    model_name: 'Qwen3-32B',
    instance_name: 'qwen3-32b-prod-a',
    state: 'RUNNING'
  },
  {
    id: 102,
    cluster_id: 1,
    cluster_name: 'Production Cluster',
    model_id: 2,
    model_name: 'DeepSeek-R1-Distill',
    instance_name: 'deepseek-r1-distill-prod',
    state: 'RUNNING'
  },
  {
    id: 103,
    cluster_id: 2,
    cluster_name: 'Staging Cluster',
    model_id: 3,
    model_name: 'Llama-3.1-70B',
    instance_name: 'llama-70b-staging',
    state: 'PENDING'
  },
  {
    id: 104,
    cluster_id: 3,
    cluster_name: 'Research Cluster',
    model_id: 4,
    model_name: 'Qwen2.5-Coder-32B',
    instance_name: 'qwen-coder-research',
    state: 'RUNNING'
  },
  {
    id: 105,
    cluster_id: 2,
    cluster_name: 'Staging Cluster',
    model_id: 5,
    model_name: 'Gemma-2-27B',
    instance_name: 'gemma-27b-staging',
    state: 'FAILED'
  }
];

export const mockEvaluationList: EvaluationRecord[] = [
  {
    id: 'eval-001',
    name: 'General Quality RC',
    model: 'Qwen3-32B',
    modelInstance: 'qwen3-32b-prod-a',
    clusterId: 1,
    status: 'RUNNING',
    suiteId: 'general',
    description: 'RC candidate smoke evaluation for the general suite.',
    createdAt: '2026-04-01 09:24:00',
    scores: {
      mmlu_pro: 76.4,
      leaderboard_gpqa: 54.1,
      ifeval: 83.2,
      aime: null,
      humaneval: null,
      longbench2: null,
      mmmlu: null
    }
  },
  {
    id: 'eval-002',
    name: 'Reasoning Faceoff',
    model: 'DeepSeek-R1-Distill',
    modelInstance: 'deepseek-r1-distill-prod',
    clusterId: 1,
    status: 'SUCCESS',
    suiteId: 'reasoning',
    description: 'Focused math and reasoning pass before release.',
    createdAt: '2026-03-31 18:10:00',
    scores: {
      mmlu_pro: null,
      leaderboard_gpqa: null,
      ifeval: null,
      aime: 41.7,
      humaneval: null,
      longbench2: null,
      mmmlu: null
    }
  },
  {
    id: 'eval-003',
    name: 'Code Regression Check',
    model: 'Qwen2.5-Coder-32B',
    modelInstance: 'qwen-coder-research',
    clusterId: 3,
    status: 'FAILED',
    suiteId: 'coding',
    description: 'Prototype coding regression run with placeholder failure.',
    createdAt: '2026-03-31 13:05:00',
    scores: {
      mmlu_pro: null,
      leaderboard_gpqa: null,
      ifeval: null,
      aime: null,
      humaneval: 62.9,
      longbench2: null,
      mmmlu: null
    }
  },
  {
    id: 'eval-004',
    name: 'Long Context Tracking',
    model: 'Llama-3.1-70B',
    modelInstance: 'llama-70b-staging',
    clusterId: 2,
    status: 'PENDING',
    suiteId: 'long-context',
    description: 'Waiting on running capacity in staging.',
    createdAt: '2026-03-30 20:42:00',
    scores: {
      mmlu_pro: null,
      leaderboard_gpqa: null,
      ifeval: null,
      aime: null,
      humaneval: null,
      longbench2: 44.8,
      mmmlu: null
    }
  },
  {
    id: 'eval-005',
    name: 'Localization Readiness',
    model: 'Gemma-2-27B',
    modelInstance: 'gemma-27b-staging',
    clusterId: 2,
    status: 'STOPPED',
    suiteId: 'multilingual',
    description: 'Prototype multilingual comparison with placeholder stop.',
    createdAt: '2026-03-29 11:15:00',
    scores: {
      mmlu_pro: null,
      leaderboard_gpqa: null,
      ifeval: null,
      aime: null,
      humaneval: null,
      longbench2: null,
      mmmlu: 58.3
    }
  }
];

const defaultSnapshot = {
  instances: {
    primary: {
      computed_resource_claim: {
        is_unified_memory: false,
        offload_layers: 0,
        total_layers: 80,
        ram: 0,
        vram: { '0': 48 },
        tensor_split: null,
        vram_utilization: 0.92
      },
      ports: [8000],
      worker_id: 11,
      worker_name: 'worker-prod-01',
      worker_ip: '192.168.50.21',
      gpu_type: 'NVIDIA A6000',
      gpu_indexes: [0],
      gpu_ids: ['gpu-prod-01'],
      id: 1001,
      name: 'primary',
      resolved_path: '/models/qwen3-32b-instruct.gguf',
      state: 'RUNNING',
      state_message: '',
      backend: 'vLLM',
      backend_version: '0.7.3',
      api_detected_backend_version: '0.7.3',
      backend_parameters: ['--max-model-len=32768', '--gpu-memory-utilization=0.92'],
      image_name: 'gpustack/vllm:0.7.3',
      run_command: 'python -m vllm.entrypoints.openai.api_server',
      env: {
        CUDA_VISIBLE_DEVICES: '0',
        HF_HUB_ENABLE_HF_TRANSFER: '1'
      },
      extended_kv_cache: {
        enabled: true,
        ram_ratio: 0.25,
        ram_size: '24GiB',
        chunk_size: '256MiB'
      },
      speculative_config: {
        enabled: false
      },
      subordinate_workers: []
    }
  },
  workers: {
    'worker-prod-01': {
      id: 11,
      name: 'worker-prod-01',
      cpu_total: 64,
      memory_total: 549755813888,
      os: {
        name: 'Ubuntu',
        version: '22.04'
      }
    }
  },
  gpus: {
    'gpu-prod-01': {
      vendor: 'NVIDIA',
      type: 'A6000',
      index: 0,
      device_index: 0,
      device_chip_index: 0,
      arch_family: 'Ampere',
      name: 'NVIDIA RTX A6000',
      uuid: 'GPU-prod-01',
      driver_version: '550.54.14',
      runtime_version: '12.4',
      compute_capability: '8.6',
      id: 'gpu-prod-01',
      worker_id: 11,
      worker_name: 'worker-prod-01',
      memory_total: 51539607552,
      core_total: 10752
    }
  }
};

const defaultResultRows: EvaluationResultRow[] = [
  {
    key: 'humaneval',
    category: 'Coding',
    task: 'humaneval',
    subTask: '',
    filter: 'create_test',
    nshot: 0,
    metric: 'pass@1',
    value: 0.8,
    totalSample: 164,
    effectiveSample: 10
  },
  {
    key: 'ifeval-loose-inst',
    category: 'General',
    task: 'ifeval',
    subTask: '',
    filter: 'none',
    nshot: 0,
    metric: 'inst_level_loose_acc',
    value: 0.4444,
    totalSample: 541,
    effectiveSample: 10
  },
  {
    key: 'ifeval-strict-inst',
    category: 'General',
    task: 'ifeval',
    subTask: '',
    filter: 'none',
    nshot: 0,
    metric: 'inst_level_strict_acc',
    value: 0.4444,
    totalSample: 541,
    effectiveSample: 10
  },
  {
    key: 'ifeval-loose-prompt',
    category: 'General',
    task: 'ifeval',
    subTask: '',
    filter: 'none',
    nshot: 0,
    metric: 'prompt_level_loose_acc',
    value: 0.3,
    totalSample: 541,
    effectiveSample: 10
  },
  {
    key: 'ifeval-strict-prompt',
    category: 'General',
    task: 'ifeval',
    subTask: '',
    filter: 'none',
    nshot: 0,
    metric: 'prompt_level_strict_acc',
    value: 0.3,
    totalSample: 541,
    effectiveSample: 10
  },
  {
    key: 'mmlu-pro',
    category: 'General',
    task: 'mmlu_pro',
    subTask: '',
    filter: 'custom-extract',
    nshot: null,
    metric: 'exact_match',
    value: 0.5786,
    totalSample: 12032,
    effectiveSample: 140
  },
  {
    key: 'mmlu-pro-biology',
    category: 'General',
    task: 'mmlu_pro',
    subTask: 'biology',
    filter: 'custom-extract',
    nshot: 5,
    metric: 'exact_match',
    value: 0.9,
    totalSample: 717,
    effectiveSample: 10
  },
  {
    key: 'mmlu-pro-business',
    category: 'General',
    task: 'mmlu_pro',
    subTask: 'business',
    filter: 'custom-extract',
    nshot: 5,
    metric: 'exact_match',
    value: 0.8,
    totalSample: 789,
    effectiveSample: 10
  },
  {
    key: 'mmlu-pro-chemistry',
    category: 'General',
    task: 'mmlu_pro',
    subTask: 'chemistry',
    filter: 'custom-extract',
    nshot: 5,
    metric: 'exact_match',
    value: 0.7,
    totalSample: 1132,
    effectiveSample: 10
  },
  {
    key: 'mmlu-pro-computer-science',
    category: 'General',
    task: 'mmlu_pro',
    subTask: 'computer_science',
    filter: 'custom-extract',
    nshot: 5,
    metric: 'exact_match',
    value: 0.4,
    totalSample: 410,
    effectiveSample: 10
  },
  {
    key: 'mmlu-pro-economics',
    category: 'General',
    task: 'mmlu_pro',
    subTask: 'economics',
    filter: 'custom-extract',
    nshot: 5,
    metric: 'exact_match',
    value: 0.6,
    totalSample: 844,
    effectiveSample: 10
  },
  {
    key: 'mmlu-pro-engineering',
    category: 'General',
    task: 'mmlu_pro',
    subTask: 'engineering',
    filter: 'custom-extract',
    nshot: 5,
    metric: 'exact_match',
    value: 0.8,
    totalSample: 969,
    effectiveSample: 10
  },
  {
    key: 'mmlu-pro-health',
    category: 'General',
    task: 'mmlu_pro',
    subTask: 'health',
    filter: 'custom-extract',
    nshot: 5,
    metric: 'exact_match',
    value: 0.6,
    totalSample: 818,
    effectiveSample: 10
  },
  {
    key: 'mmlu-pro-history',
    category: 'General',
    task: 'mmlu_pro',
    subTask: 'history',
    filter: 'custom-extract',
    nshot: 5,
    metric: 'exact_match',
    value: 0.5,
    totalSample: 381,
    effectiveSample: 10
  },
  {
    key: 'mmlu-pro-law',
    category: 'General',
    task: 'mmlu_pro',
    subTask: 'law',
    filter: 'custom-extract',
    nshot: 5,
    metric: 'exact_match',
    value: 0.2,
    totalSample: 1101,
    effectiveSample: 10
  },
  {
    key: 'mmlu-pro-math',
    category: 'General',
    task: 'mmlu_pro',
    subTask: 'math',
    filter: 'custom-extract',
    nshot: 5,
    metric: 'exact_match',
    value: 0.6,
    totalSample: 1351,
    effectiveSample: 10
  },
  {
    key: 'mmlu-pro-other',
    category: 'General',
    task: 'mmlu_pro',
    subTask: 'other',
    filter: 'custom-extract',
    nshot: 5,
    metric: 'exact_match',
    value: 0.6,
    totalSample: 924,
    effectiveSample: 10
  },
  {
    key: 'mmlu-pro-philosophy',
    category: 'General',
    task: 'mmlu_pro',
    subTask: 'philosophy',
    filter: 'custom-extract',
    nshot: 5,
    metric: 'exact_match',
    value: 0.7,
    totalSample: 499,
    effectiveSample: 10
  },
  {
    key: 'mmlu-pro-physics',
    category: 'General',
    task: 'mmlu_pro',
    subTask: 'physics',
    filter: 'custom-extract',
    nshot: 5,
    metric: 'exact_match',
    value: 0.3,
    totalSample: 1299,
    effectiveSample: 10
  },
  {
    key: 'mmlu-pro-psychology',
    category: 'General',
    task: 'mmlu_pro',
    subTask: 'psychology',
    filter: 'custom-extract',
    nshot: 5,
    metric: 'exact_match',
    value: 0.4,
    totalSample: 798,
    effectiveSample: 10
  }
];

export const buildMockEvaluationDetailFromRecord = (
  record: EvaluationRecord,
  overrides?: Partial<EvaluationDetailData>
): EvaluationDetailData => ({
  id: record.id,
  name: record.name,
  meta: {
    startTime: '2024-05-01 10:00:00',
    endTime: '2024-05-01 12:00:00',
    duration: '2 hours'
  },
  results: defaultResultRows,
  detailData: {
    profile: 'throughput-balanced',
    dataset_seed: 42,
    raw_metrics: {
      benchmarks: []
    },
    requests_per_second_mean: 0,
    request_latency_mean: 0,
    time_per_output_token_mean: 0,
    inter_token_latency_mean: 0,
    time_to_first_token_mean: 0,
    tokens_per_second_mean: 0,
    output_tokens_per_second_mean: 0,
    input_tokens_per_second_mean: 0,
    name: record.name,
    description: record.description || '',
    labels: {},
    dataset_id: 100,
    dataset_name: 'tinyBenchmarks',
    dataset_source: 'mock',
    dataset_input_tokens: 2048,
    dataset_output_tokens: 512,
    cluster_id: record.clusterId,
    model_id:
      evaluationInstances.find((item) => item.instance_name === record.modelInstance)
        ?.model_id || 1,
    model_name: record.model,
    model_instance_name: record.modelInstance,
    request_rate: 0,
    total_requests: 1980,
    state: record.status,
    state_message: '',
    progress: null,
    worker_id: 11,
    pid: 28231,
    snapshot: defaultSnapshot,
    gpu_summary: '1x NVIDIA RTX A6000',
    gpu_vendor_summary: 'NVIDIA',
    id: Number(record.id.replace(/\D/g, '')) || 1,
    created_at: record.createdAt,
    updated_at: record.createdAt
  },
  ...overrides
});

export const mockEvaluationDetails: Record<string, EvaluationDetailData> = {
  'eval-001': buildMockEvaluationDetailFromRecord(mockEvaluationList[0]),
  'eval-002': buildMockEvaluationDetailFromRecord(mockEvaluationList[1], {
    meta: {
      startTime: '2024-05-02 09:30:00',
      endTime: '2024-05-02 10:18:00',
      duration: '48 minutes'
    }
  }),
  'eval-003': buildMockEvaluationDetailFromRecord(mockEvaluationList[2], {
    meta: {
      startTime: '2024-05-03 14:15:00',
      endTime: '2024-05-03 15:01:00',
      duration: '46 minutes'
    }
  }),
  'eval-004': buildMockEvaluationDetailFromRecord(mockEvaluationList[3], {
    meta: {
      startTime: '2024-05-04 08:20:00',
      endTime: '2024-05-04 10:52:00',
      duration: '2 hours 32 minutes'
    }
  })
};

export const getMockEvaluationDetail = (id: string) => {
  if (mockEvaluationDetails[id]) {
    return mockEvaluationDetails[id];
  }
  const record = mockEvaluationList.find((item) => item.id === id);
  return record ? buildMockEvaluationDetailFromRecord(record) : undefined;
};

export const createMockEvaluationRecord = (
  values: CreateEvaluationFormValues
): EvaluationRecord => {
  const targetInstance = evaluationInstances.find(
    (item) => item.id === values.model_instance_id
  );

  return {
    id: `eval-${Date.now()}`,
    name: values.name,
    model: targetInstance?.model_name || '',
    modelInstance: targetInstance?.instance_name || '',
    clusterId: values.cluster_id,
    status: 'PENDING',
    suiteId: values.suite_id,
    description: values.description,
    createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
    scores: {
      mmlu_pro: null,
      leaderboard_gpqa: null,
      ifeval: null,
      aime: null,
      humaneval: null,
      longbench2: null,
      mmmlu: null
    }
  };
};
