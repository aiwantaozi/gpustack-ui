import Separator from '@/pages/llmodels/components/separator';
import TitleWrapper from '@/pages/llmodels/components/title-wrapper';
import { ColumnWrapper, ModalFooter } from '@gpustack/core-ui';
import { useIntl } from '@umijs/max';
import React, { useCallback, useRef, useState } from 'react';
import styled from 'styled-components';
import { datasetSourceMap } from '../config';
import DatasetCard from './dataset-card';
import DatasetFile from './dataset-file';
import DatasetSearch from './dataset-search';
import DatasetTargetForm from './dataset-target-form';

const ColWrapper = styled.div`
  display: flex;
  flex: 1;
  max-width: 33.33%;
`;

const FormWrapper = styled.div`
  display: flex;
  flex: 1;
  max-width: 100%;
`;

interface CreateDatasetContentProps {
  source: string;
  workerOptions?: any[];
  lockedWorkerId?: number;
  lockedWorkerName?: string;
  loading?: boolean;
  onCancel: () => void;
  onOk: (values: any) => void;
}

// Shared 3-column Create-Dataset body (used by the page GSDrawer + the benchmark
// SubDrawer overlay). HuggingFace and ModelScope show the full search/card/file
// columns; only Local Path shows just the target form. Mirrors DownloadModel.
const CreateDatasetContent: React.FC<CreateDatasetContentProps> = (props) => {
  const {
    source,
    workerOptions,
    lockedWorkerId,
    lockedWorkerName,
    loading,
    onCancel,
    onOk
  } = props;
  const intl = useIntl();
  const isSearchSource =
    source === datasetSourceMap.huggingface_value ||
    source === datasetSourceMap.modelscope_value;

  const formRef = useRef<any>(null);
  const fileRef = useRef<any>(null);
  const [selectedDataset, setSelectedDataset] = useState<any>({});
  const [fileName, setFileName] = useState<string>('');

  const handleOnSelectDataset = useCallback((item: any) => {
    setSelectedDataset(item || {});
    setFileName('');
  }, []);

  const handleSelectFile = useCallback((item: any) => {
    setFileName(item?.path || '');
  }, []);

  const generateSourceInfo = () => {
    if (source === datasetSourceMap.huggingface_value) {
      return {
        huggingface_repo_id: selectedDataset.name,
        huggingface_filename: fileName || undefined
      };
    }
    if (source === datasetSourceMap.modelscope_value) {
      return {
        model_scope_model_id: selectedDataset.name,
        model_scope_file_path: fileName || undefined
      };
    }
    return {};
  };

  const handleOk = (values: any) => {
    onOk({
      ...values,
      source,
      ...generateSourceInfo()
    });
  };

  const handleSubmit = () => {
    if (loading) return;
    formRef.current?.form?.submit?.();
  };

  // NOTE: DatasetFile fetches its own file list on selectedDataset change. We do
  // NOT also trigger it from here — a second concurrent fetch aborts the first,
  // which (on large repos) could race the list back to empty.

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      {isSearchSource && (
        <>
          <ColWrapper>
            <DatasetSearch
              key={source}
              source={source}
              onSelectDataset={handleOnSelectDataset}
            ></DatasetSearch>
            <Separator></Separator>
          </ColWrapper>
          <ColWrapper>
            <ColumnWrapper styles={{ container: { padding: 0 } }}>
              <DatasetCard
                selectedDataset={selectedDataset}
                modelSource={source}
              ></DatasetCard>
              <DatasetFile
                ref={fileRef}
                selectedDataset={selectedDataset}
                modelSource={source}
                onSelectFile={handleSelectFile}
              ></DatasetFile>
            </ColumnWrapper>
            <Separator></Separator>
          </ColWrapper>
        </>
      )}
      <FormWrapper>
        <ColumnWrapper
          styles={{ container: { paddingBlock: 0 } }}
          footer={
            <ModalFooter
              onCancel={onCancel}
              onOk={handleSubmit}
              okBtnProps={{ loading }}
              style={{
                padding: '16px 24px 8px',
                display: 'flex',
                justifyContent: 'flex-end'
              }}
            ></ModalFooter>
          }
        >
          {isSearchSource && (
            <TitleWrapper>
              {intl.formatMessage({ id: 'datasets.form.selectTarget' })}
              <span style={{ display: 'flex', height: 24 }}></span>
            </TitleWrapper>
          )}
          <DatasetTargetForm
            ref={formRef}
            source={source}
            workerOptions={workerOptions}
            lockedWorkerId={lockedWorkerId}
            lockedWorkerName={lockedWorkerName}
            onOk={handleOk}
          ></DatasetTargetForm>
        </ColumnWrapper>
      </FormWrapper>
    </div>
  );
};

export default CreateDatasetContent;
