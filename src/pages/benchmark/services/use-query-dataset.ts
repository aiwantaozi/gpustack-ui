import { queryDatasetsList } from '@/pages/datasets/apis';
import { Dataset } from '@/pages/datasets/config/types';
import { useState } from 'react';
import { datasetList as datasetOptions } from '../config';

const useQueryDataset = () => {
  // Built-in dataset TYPE options (Random / ShareGPT / Dataset). These gate the
  // form's dataset section and are NOT the downloaded Dataset resources.
  const [datasetList, setDatasetList] = useState<
    Global.BaseOption<number | string>[]
  >([]);
  // Real Dataset resources (downloaded rows), used by the custom-dataset picker
  // to list/filter datasets by worker + read column_mapping.
  const [datasetResources, setDatasetResources] = useState<Dataset[]>([]);
  const [resourcesLoading, setResourcesLoading] = useState(false);

  const fetchDatasetData = async () => {
    setDatasetList([...datasetOptions]);
    return datasetOptions;
  };

  const fetchDatasetResources = async () => {
    setResourcesLoading(true);
    try {
      const res = await queryDatasetsList({ page: -1 });
      const list = res.items || [];
      setDatasetResources(list);
      return list;
    } catch (error) {
      setDatasetResources([]);
      return [];
    } finally {
      setResourcesLoading(false);
    }
  };

  return {
    datasetList,
    datasetResources,
    resourcesLoading,
    fetchDatasetData,
    fetchDatasetResources
  };
};

export default useQueryDataset;
