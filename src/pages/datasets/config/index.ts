import { StatusMaps } from '@/config';
import { icons } from '@gpustack/core-ui';

// Dataset download lifecycle. Mirrors the model-file state model
// (ModelfileStateMap) so the list can reuse the StatusTag download-percent cell.
export const DatasetStateMap = {
  Downloading: 'downloading',
  Ready: 'ready',
  Error: 'error'
};

export const DatasetStateMapValue = {
  [DatasetStateMap.Downloading]: 'Downloading',
  [DatasetStateMap.Ready]: 'Ready',
  [DatasetStateMap.Error]: 'Error'
};

export const DatasetState: any = {
  [DatasetStateMap.Ready]: StatusMaps.success,
  [DatasetStateMap.Error]: StatusMaps.error,
  [DatasetStateMap.Downloading]: StatusMaps.transitioning
};

// Dataset sources mirror the model download sources (values match the backend
// DatasetCreate.source enum: huggingface / model_scope / local_path).
export const datasetSourceMap = {
  huggingface: 'Hugging Face',
  huggingface_value: 'huggingface',
  modelScope: 'ModelScope',
  modelscope_value: 'model_scope',
  local_path: 'Local Path',
  local_path_value: 'local_path'
};

export const datasetSourceValueMap: Record<string, string> = {
  [datasetSourceMap.huggingface_value]: datasetSourceMap.huggingface,
  [datasetSourceMap.modelscope_value]: datasetSourceMap.modelScope,
  [datasetSourceMap.local_path_value]: datasetSourceMap.local_path
};

// Readable source label for a dataset row. The backend no longer stores a
// user-facing `name` (Dataset mirrors ModelFile — identified by source), so the
// UI derives a source-TYPE-prefixed display string, mirroring how model files
// render their source (e.g. "Hugging Face/Qwen/Qwen3.5-9B"):
//   huggingface → "Hugging Face/<repo_id>[/<filename>]"
//   model_scope → "ModelScope/<model_id>[/<file_path>]"
//   local_path  → "Local Path/<local_path>"
export const getDatasetSourceLabel = (record: {
  source?: string;
  huggingface_repo_id?: string;
  huggingface_filename?: string;
  model_scope_model_id?: string;
  model_scope_file_path?: string;
  local_path?: string;
}): string => {
  const prefix = datasetSourceValueMap[record.source || ''] || '';
  let path = '';
  if (record.source === datasetSourceMap.huggingface_value) {
    path = [record.huggingface_repo_id, record.huggingface_filename]
      .filter((v) => v)
      .join('/');
  } else if (record.source === datasetSourceMap.modelscope_value) {
    path = [record.model_scope_model_id, record.model_scope_file_path]
      .filter((v) => v)
      .join('/');
  } else if (record.source === datasetSourceMap.local_path_value) {
    path = record.local_path || '';
  } else {
    return '';
  }
  return path ? (prefix ? `${prefix}/${path}` : path) : prefix;
};

export const datasetSourceOptions = [
  {
    label: 'Hugging Face',
    value: datasetSourceMap.huggingface_value
  },
  {
    label: 'ModelScope',
    value: datasetSourceMap.modelscope_value
  },
  {
    label: 'datasets.form.source.localPath',
    locale: true,
    value: datasetSourceMap.local_path_value
  }
];

// Sources offered by the "Create Dataset" dropdown (mirrors the model-files
// download dropdown `onLineSourceOptions`). Each opens the drawer with that
// source preset. HuggingFace gets the full 3-column live search; ModelScope /
// Local Path are simple forms.
export const datasetSourceActions = [
  {
    label: 'Hugging Face',
    locale: false,
    value: datasetSourceMap.huggingface_value,
    key: datasetSourceMap.huggingface_value,
    icon: icons.HF
  },
  {
    label: 'ModelScope',
    locale: false,
    value: datasetSourceMap.modelscope_value,
    key: datasetSourceMap.modelscope_value,
    icon: icons.ModelScope
  },
  {
    label: 'datasets.form.source.localPath',
    locale: true,
    value: datasetSourceMap.local_path_value,
    key: datasetSourceMap.local_path_value,
    icon: icons.LocalPath
  }
];

// Benchmark-usable dataset file extensions. Must match the backend worker's
// `_FILE_EXT_KIND` (gpustack/worker/dataset_manager.py) — the file list only
// offers single-file selection for these; everything else (README.md,
// .gitattributes, dataset_infos.json, images, …) is dropped.
export const DATASET_FILE_EXT_KIND: Record<string, string> = {
  '.json': 'json',
  '.jsonl': 'json',
  '.csv': 'csv',
  '.txt': 'text',
  '.text': 'text',
  '.parquet': 'parquet',
  '.arrow': 'arrow'
};

// Returns the lower-cased extension (with dot) of a path, or '' if none.
export const getFileExtension = (path: string): string => {
  const name = (path || '').toLowerCase();
  const idx = name.lastIndexOf('.');
  return idx > -1 ? name.slice(idx) : '';
};

// A file is benchmark-usable when its extension is a known kind.
export const isUsableDatasetFile = (path: string): boolean =>
  !!DATASET_FILE_EXT_KIND[getFileExtension(path)];

// The short format tag shown on a file card (e.g. "jsonl", "parquet").
export const getDatasetFileFormat = (path: string): string =>
  getFileExtension(path).replace('.', '');

// HuggingFace sort keys (appended to the listDatasets query URL, mirrors
// ModelSortType).
export const DatasetSortType = {
  trendingScore: 'trendingScore',
  likes: 'likes',
  downloads: 'downloads',
  lastModified: 'lastModified'
};

// Drawer width: the live-search sources (HuggingFace / ModelScope) need the wide
// 3-column layout; the plain Local Path form uses a narrow drawer (mirrors
// modalConfig).
export const datasetDrawerWidth = (source: string) =>
  source === datasetSourceMap.local_path_value ? 600 : 'calc(100vw - 220px)';

// The guidellm logical columns the user maps the dataset's detected columns to.
// Value = the backend column_mapping key; labelId = i18n label. `autoDetect` =
// the column names guidellm auto-maps when no explicit mapping is given (its
// GenerativeColumnMapper defaults) — shown as a hint so users can leave a field
// blank when their column already uses one of these names.
export const DATASET_LOGICAL_COLUMNS = [
  {
    key: 'text_column',
    labelId: 'datasets.column.text',
    autoDetect: [
      'prompt',
      'instruction',
      'question',
      'input',
      'context',
      'content',
      'text'
    ]
  },
  {
    key: 'prefix_column',
    labelId: 'datasets.column.prefix',
    autoDetect: ['system_prompt', 'system', 'prefix']
  },
  {
    key: 'prompt_tokens_count_column',
    labelId: 'datasets.column.promptTokens',
    autoDetect: ['prompt_tokens_count', 'input_tokens_count']
  },
  {
    key: 'output_tokens_count_column',
    labelId: 'datasets.column.outputTokens',
    autoDetect: ['output_tokens_count', 'completion_tokens_count']
  }
] as const;
