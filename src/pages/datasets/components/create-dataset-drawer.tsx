import { GSDrawer } from '@gpustack/core-ui';
import React, { useState } from 'react';
import { datasetDrawerWidth } from '../config';
import CreateDatasetContent from './create-dataset-content';

interface CreateDatasetDrawerProps {
  title: string;
  open: boolean;
  source: string;
  workerOptions?: any[];
  onOk: (values: any) => Promise<void> | void;
  onCancel: () => void;
}

// Page-level Create-Dataset drawer: a wide 3-column GSDrawer for HuggingFace,
// a narrow drawer for ModelScope / Local Path. Mirrors the model download drawer.
const CreateDatasetDrawer: React.FC<CreateDatasetDrawerProps> = ({
  title,
  open,
  source,
  workerOptions = [],
  onOk,
  onCancel
}) => {
  const [loading, setLoading] = useState(false);

  const handleOk = async (values: any) => {
    setLoading(true);
    try {
      await onOk(values);
    } finally {
      setLoading(false);
    }
  };

  return (
    <GSDrawer
      title={title}
      open={open}
      onClose={onCancel}
      destroyOnHidden={true}
      closeIcon={false}
      mask={{ closable: false }}
      keyboard={false}
      zIndex={2000}
      styles={{ wrapper: { width: datasetDrawerWidth(source) } }}
      footer={false}
    >
      {open && (
        <CreateDatasetContent
          source={source}
          workerOptions={workerOptions}
          loading={loading}
          onCancel={onCancel}
          onOk={handleOk}
        ></CreateDatasetContent>
      )}
    </GSDrawer>
  );
};

export default CreateDatasetDrawer;
