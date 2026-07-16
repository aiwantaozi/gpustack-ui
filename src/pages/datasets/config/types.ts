export interface Dataset {
  id: number;
  source: string;
  worker_id: number;
  owner_principal_id?: number | null;
  state: string;
  download_progress: number | null;
  state_message: string;
  columns: string[] | null;
  sample_rows: Record<string, any>[] | null;
  inspect_error: string | null;
  column_mapping: Record<string, string> | null;
  resolved_paths: string[];
  size: number;
  huggingface_repo_id: string;
  huggingface_filename: string;
  model_scope_model_id: string;
  model_scope_file_path: string;
  local_path: string;
  created_at: string;
  updated_at: string;
}

export interface DatasetCreate {
  source: string;
  huggingface_repo_id?: string;
  huggingface_filename?: string;
  model_scope_model_id?: string;
  model_scope_file_path?: string;
  local_path?: string;
  local_dir?: string;
  worker_id: number;
  column_mapping?: Record<string, string>;
}

export interface DatasetFormData {
  source: string;
  huggingface_repo_id?: string;
  huggingface_filename?: string;
  model_scope_model_id?: string;
  model_scope_file_path?: string;
  local_path?: string;
  local_dir?: string;
  worker_id?: any;
}
