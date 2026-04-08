export interface EvaluationSuite {
  id: string;
  name: string;
  description: string;
  category: string;
  limit: string;
  tasks: string[];
  estimated_runtime_level: string;
  recommended_for: string[];
  default_enabled: boolean;
}

export interface EvaluationInstance {
  id: number;
  cluster_id: number;
  cluster_name: string;
  model_id: number;
  model_name: string;
  instance_name: string;
  state: string;
}

export interface EvaluationRecord {
  id: string;
  name: string;
  model: string;
  modelInstance: string;
  clusterId: number;
  status: string;
  suiteId: string;
  description?: string;
  createdAt: string;
  scores: Record<string, number | null>;
}

export interface EvaluationResultRow {
  key: string;
  category: string;
  task: string;
  subTask: string;
  filter: string;
  nshot: number | null;
  metric: string;
  value: number | null;
  totalSample: number | null;
  effectiveSample: number | null;
}

export interface EvaluationDetailMeta {
  startTime: string;
  endTime: string;
  duration: string;
}

export interface EvaluationDetailData {
  id: string;
  name: string;
  meta: EvaluationDetailMeta;
  results: EvaluationResultRow[];
  detailData: any;
}

export interface CreateEvaluationFormValues {
  name: string;
  cluster_id: number;
  model_instance_id: number;
  suite_id: string;
  limit?: string;
  description?: string;
}
