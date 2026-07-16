import { Dataset } from '@/pages/datasets/config/types';
import { createContext, useContext } from 'react';
import { BenchmarkDetail } from './detail-types';

interface DetailContextProps {
  detailData: BenchmarkDetail;
  clusterList?: Global.BaseOption<number>[];
  id: number;
  loading?: boolean;
  profilesOptions: Global.BaseOption<string>[];
  // Downloaded Dataset resources — used to resolve a custom benchmark's
  // `dataset_id` to the dataset's source label for display.
  datasetResources?: Dataset[];
}

const DetailContext = createContext<DetailContextProps>(
  {} as DetailContextProps
);

export const useDetailContext = () => {
  const context = useContext(DetailContext);
  if (!context) {
    throw new Error('useDetailContext must be used within a DetailProvider');
  }
  return context;
};

export default DetailContext;
