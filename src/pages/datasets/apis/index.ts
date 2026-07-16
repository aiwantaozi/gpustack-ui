import { downloadFile, listDatasets, listFiles } from '@huggingface/hub';
import { request } from '@umijs/max';
import { CancelToken } from 'axios';
import qs from 'query-string';
import { Dataset, DatasetCreate } from '../config/types';

export const DATASETS_API = '/datasets';

// Client-side HF/ModelScope calls go through the gpustack proxy (same as the
// model download flow) to avoid CORS — there is NO backend search proxy.
const setProxyUrl = (url: string) => {
  return `/proxy?url=${encodeURIComponent(url)}`;
};

const MODEL_SCOPE_DATASET_API = `https://modelscope.cn/api/v1/datasets/`;
const MODEL_SCOPE_LIST_DATASET_API = `https://www.modelscope.cn/api/v1/dolphin/datasets`;
// Base for the numeric-id repo endpoints (e.g. /repo/tree file listing).
const MODEL_SCOPE_LIST_DATASET_API_BASE = `https://www.modelscope.cn/api/v1/datasets/`;

// ===================== Dataset CRUD =====================

export async function queryDatasetsList(
  params: Global.SearchParams,
  options?: {
    token?: CancelToken;
  }
) {
  return request<Global.PageResponse<Dataset>>(`${DATASETS_API}`, {
    method: 'GET',
    params,
    cancelToken: options?.token
  });
}

export async function queryDatasetDetail(
  id: number | string,
  options?: {
    token?: CancelToken;
  }
) {
  return request<Dataset>(`${DATASETS_API}/${id}`, {
    method: 'GET',
    cancelToken: options?.token
  });
}

export async function createDataset(data: DatasetCreate) {
  return request<Dataset>(`${DATASETS_API}`, {
    method: 'POST',
    data
  });
}

export async function updateDataset(id: number | string, data: any) {
  return request<Dataset>(`${DATASETS_API}/${id}`, {
    method: 'PUT',
    data
  });
}

export async function deleteDataset(
  id: number | string,
  params?: { checked?: boolean }
) {
  return request(`${DATASETS_API}/${id}?cleanup=${!!params?.checked}`, {
    method: 'DELETE'
  });
}

export async function resetDataset(id: number | string) {
  return request<Dataset>(`${DATASETS_API}/${id}/reset`, {
    method: 'POST'
  });
}

// ===================== HuggingFace dataset search (client-side) =====================

// list datasets from HuggingFace (mirrors queryHuggingfaceModels for datasets).
export async function queryHuggingfaceDatasets(
  params: {
    limit?: number;
    search: {
      query: string;
      tags?: string[];
      sort?: string;
    };
  },
  options?: any
) {
  const result = [];
  for await (const dataset of listDatasets({
    ...params,
    limit: params.limit || 500,
    additionalFields: ['tags'],
    fetch(_url: any, config: any): Promise<Response> {
      const url = params.search.sort
        ? `${_url}&sort=${params.search.sort}`
        : _url;
      return fetch(setProxyUrl(url), {
        ...config,
        signal: options?.signal
      });
    }
  })) {
    result.push(dataset);
  }
  return result;
}

// list files inside a HuggingFace dataset repo (repo type = 'dataset').
export async function queryHuggingfaceDatasetFiles(
  params: { name: string },
  options?: any
) {
  const result = [];
  for await (const fileInfo of listFiles({
    repo: { type: 'dataset', name: params.name },
    recursive: true,
    fetch(url: any, config: any): Promise<Response> {
      return fetch(setProxyUrl(url), {
        ...config,
        signal: options?.signal
      });
    }
  })) {
    result.push(fileInfo);
  }
  return result;
}

export async function queryHuggingfaceDatasetDetail(
  params: { repo: string },
  options?: any
) {
  const url = `https://huggingface.co/api/datasets/${params.repo}`;
  return request(setProxyUrl(url), {
    method: 'GET',
    cancelToken: options?.token
  });
}

// download a text file (README.md) from a HuggingFace dataset repo.
export async function downloadHuggingfaceDatasetFile(
  params: { repo: string; revision: string; path: string },
  options?: any
) {
  const { repo, revision, path } = params;
  const res = await (
    await downloadFile({
      repo: { type: 'dataset', name: repo },
      revision,
      path,
      fetch(url: any, config: any): Promise<Response> {
        return fetch(setProxyUrl(url), {
          ...config,
          signal: options?.signal
        });
      }
    })
  )?.text();
  return res;
}

// ===================== ModelScope dataset search (client-side) =====================

// list datasets from ModelScope. Mirrors the model MS search but for datasets:
// GET dolphin/datasets?PageSize&PageNumber&Query&Target&Sort. The search string
// goes in `Query` (e.g. Query=AI-ModelScope/HC3-Chinese); `Target` stays empty.
// Sort="" trending | "downloads". Response: { Code, Data: [ { Namespace, Name, ... } ] }.
export async function queryModelScopeDatasets(
  params: {
    PageSize?: number;
    PageNumber?: number;
    Query?: string;
    Target?: string;
    Sort?: string;
  },
  options?: any
) {
  const url = `${MODEL_SCOPE_LIST_DATASET_API}?${qs.stringify({
    PageSize: params.PageSize ?? 30,
    PageNumber: params.PageNumber ?? 1,
    Query: params.Query ?? '',
    Target: params.Target ?? '',
    Sort: params.Sort ?? ''
  })}`;
  const res = await fetch(setProxyUrl(url), {
    method: 'GET',
    signal: options?.signal
  });
  if (!res.ok) {
    throw new Error('Network response was not ok');
  }
  return res.json();
}

// ModelScope dataset detail (used for the README preview). Mirrors the model MS
// detail endpoint (models -> datasets).
export async function queryModelScopeDatasetDetail(
  params: { name: string },
  options?: any
) {
  return request(setProxyUrl(`${MODEL_SCOPE_DATASET_API}${params.name}`), {
    method: 'GET',
    cancelToken: options?.token
  });
}

// ===================== ModelScope dataset files (client-side) =====================

// List a ModelScope dataset's repo files. The real API keys off the NUMERIC
// dataset id (not namespace/name) and uses /repo/tree:
//   GET .../datasets/{id}/repo/tree?Revision=master&Root=&PageNumber=1&PageSize=100
// Response: { Data: { Files: [ { Name, Type: 'blob'|'tree', Path, Size, ... } ] } }.
// MVP: root level only (Root=''), first 100 entries; no subdirectory recursion.
export async function queryModelScopeDatasetFiles(
  params: { id: number | string; revision?: string },
  options?: any
) {
  const url = `${MODEL_SCOPE_LIST_DATASET_API_BASE}${params.id}/repo/tree?${qs.stringify(
    {
      Revision: params.revision || 'master',
      Root: '',
      PageNumber: 1,
      PageSize: 100
    }
  )}`;
  const res = await fetch(setProxyUrl(url), {
    method: 'GET',
    signal: options?.signal
  });
  if (!res.ok) {
    throw new Error('Network response was not ok');
  }
  return res.json();
}
