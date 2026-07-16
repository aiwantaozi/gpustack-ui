import { createDataset } from '@/pages/datasets/apis';
import CreateDatasetContent from '@/pages/datasets/components/create-dataset-content';
import { datasetDrawerWidth, datasetSourceMap } from '@/pages/datasets/config';
import { Dataset } from '@/pages/datasets/config/types';
import { useGenerateWorkerOptions } from '@/pages/llmodels/hooks/use-form-initial-values';
import { SubDrawer } from '@gpustack/core-ui';
import { useIntl } from '@umijs/max';
import { Segmented } from 'antd';
import React, { useEffect, useState } from 'react';
import useBenchmarkOverlayLayout from '../hooks/use-overlay-layout';

interface DatasetOverlayProps {
  open: boolean;
  lockedWorkerId?: number;
  lockedWorkerName?: string;
  onCancel: () => void;
  onSubmit: (created: Dataset) => Promise<void> | void;
}

// Nested SubDrawer over the benchmark FormDrawer. Reuses the SAME 3-column
// Create-Dataset flow (HuggingFace live search / ModelScope / Local Path). When
// an instance is selected the worker is locked to it (co-location); otherwise
// the user picks the worker in the drawer's Cascader. On create it POSTs
// /datasets then hands the created row back.
const DatasetOverlay: React.FC<DatasetOverlayProps> = ({
  open,
  lockedWorkerId,
  lockedWorkerName,
  onCancel,
  onSubmit
}) => {
  const intl = useIntl();
  const [loading, setLoading] = useState(false);
  const [source, setSource] = useState<string>(
    datasetSourceMap.huggingface_value
  );
  const { getContainer } = useBenchmarkOverlayLayout(open);
  const { getWorkerOptionList, workerOptions } = useGenerateWorkerOptions();

  // Populate the worker Cascader for the unlocked case (no instance selected).
  useEffect(() => {
    if (open && lockedWorkerId == null) {
      getWorkerOptionList();
    }
  }, [open, lockedWorkerId]);

  const handleOk = async (values: any) => {
    setLoading(true);
    try {
      // `values.worker_id` is already resolved by the target form (locked =>
      // the instance's worker; unlocked => the picked cascader value).
      const created = await createDataset(values);
      await onSubmit(created);
    } finally {
      setLoading(false);
    }
  };

  const sourceOptions = [
    { label: 'Hugging Face', value: datasetSourceMap.huggingface_value },
    { label: 'ModelScope', value: datasetSourceMap.modelscope_value },
    {
      label: intl.formatMessage({ id: 'datasets.form.source.localPath' }),
      value: datasetSourceMap.local_path_value
    }
  ];

  return (
    <SubDrawer
      title={intl.formatMessage({ id: 'datasets.button.create' })}
      open={open}
      width={datasetDrawerWidth(source)}
      onCancel={onCancel}
      getContainer={getContainer}
    >
      {open && (
        <div style={{ height: '100%' }}>
          <div style={{ padding: '0 24px 12px' }}>
            <Segmented
              options={sourceOptions}
              value={source}
              onChange={(val) => setSource(val as string)}
            ></Segmented>
          </div>
          <CreateDatasetContent
            key={source}
            source={source}
            workerOptions={workerOptions}
            lockedWorkerId={lockedWorkerId}
            lockedWorkerName={lockedWorkerName}
            loading={loading}
            onCancel={onCancel}
            onOk={handleOk}
          ></CreateDatasetContent>
        </div>
      )}
    </SubDrawer>
  );
};

export default DatasetOverlay;
