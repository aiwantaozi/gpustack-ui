import { getRequestId } from '@/atoms/models';
import FileSkeleton from '@/pages/llmodels/components/model-source/file-skeleton';
import TitleWrapper from '@/pages/llmodels/components/title-wrapper';
import '@/pages/llmodels/style/hf-model-file.less';
import { BaseSelect, SimpleOverlay } from '@gpustack/core-ui';
import { useIntl } from '@umijs/max';
import { Empty } from 'antd';
import _ from 'lodash';
import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState
} from 'react';
import styled from 'styled-components';
import {
  queryHuggingfaceDatasetFiles,
  queryModelScopeDatasetFiles
} from '../apis';
import { datasetSourceMap } from '../config';
import DatasetFileItem from './dataset-file-item';

const ItemFileWrapper = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  width: 100%;
  gap: 24px;
`;

interface DatasetFileProps {
  selectedDataset: any;
  modelSource: string;
  ref: any;
  onSelectFile?: (file: any) => void;
}

// Middle-column file list. Lists ALL files in the dataset repo (only the
// `type === 'file'` check, exactly like the model file list). Selecting a file
// => single-file mode; selecting the same file again / none => whole-dataset
// mode. The file card shows a format tag for display only (no filtering).
const DatasetFile: React.FC<DatasetFileProps> = forwardRef((props, ref) => {
  const { modelSource, selectedDataset } = props;
  const intl = useIntl();
  const [dataSource, setDataSource] = useState<{
    fileList: any[];
    loading: boolean;
  }>({ fileList: [], loading: false });
  const [sortType, setSortType] = useState<string>('name');
  const [current, setCurrent] = useState<string>('');
  const currentPathRef = useRef<string>('');
  const axiosTokenRef = useRef<any>(null);

  const sortOptions = useRef<any[]>([
    { label: intl.formatMessage({ id: 'models.sort.name' }), value: 'name' },
    { label: intl.formatMessage({ id: 'models.sort.size' }), value: 'size' }
  ]);

  const handleSelectFile = (item: any) => {
    props.onSelectFile?.(item);
    setCurrent(item?.path || '');
    currentPathRef.current = item?.path || '';
  };

  const handleSelectFileManually = (data: any) => {
    if (data.path === currentPathRef.current) {
      // toggle off => whole-dataset mode
      handleSelectFile({});
      return;
    }
    handleSelectFile(data);
  };

  const getHuggingfaceFiles = async () => {
    try {
      const res = await queryHuggingfaceDatasetFiles(
        { name: selectedDataset.name || '' },
        { signal: axiosTokenRef.current.signal }
      );
      return _.filter(res, (file: any) => file.type === 'file').map(
        (file: any) => ({ path: file.path, size: file.size })
      );
    } catch (error) {
      return [];
    }
  };

  const getModelScopeFiles = async () => {
    try {
      // The MS file-list API keys off the numeric dataset id (threaded from the
      // search row as `datasetId`), not namespace/name.
      if (selectedDataset.datasetId == null) {
        return [];
      }
      const data = await queryModelScopeDatasetFiles(
        {
          id: selectedDataset.datasetId,
          revision: selectedDataset.revision || 'master'
        },
        { signal: axiosTokenRef.current.signal }
      );
      return _.map(
        _.filter(
          _.get(data, ['Data', 'Files']),
          (file: any) => file.Type === 'blob'
        ),
        (item: any) => ({ path: item.Path, size: item.Size })
      );
    } catch (error) {
      return [];
    }
  };

  const handleFetchFiles = async () => {
    if (!selectedDataset?.name) {
      setDataSource({ fileList: [], loading: false });
      handleSelectFile({});
      return;
    }
    axiosTokenRef.current?.abort?.();
    axiosTokenRef.current = new AbortController();
    setDataSource((pre) => ({ ...pre, loading: true }));
    setCurrent('');
    try {
      const currentParentRequestId = getRequestId();
      let list = [];
      if (modelSource === datasetSourceMap.huggingface_value) {
        list = await getHuggingfaceFiles();
      } else if (modelSource === datasetSourceMap.modelscope_value) {
        list = await getModelScopeFiles();
      }
      if (currentParentRequestId !== getRequestId()) {
        return;
      }
      const sortList = _.sortBy(list, (item: any) =>
        sortType === 'size' ? item.size : item.path
      );
      // Default to whole-dataset mode (no file preselected).
      handleSelectFile({});
      setDataSource({ fileList: sortList, loading: false });
    } catch (error) {
      setDataSource({ fileList: [], loading: false });
      handleSelectFile({});
    }
  };

  const handleSortChange = (value: string) => {
    const list = _.sortBy(dataSource.fileList, (item: any) =>
      value === 'size' ? item.size : item.path
    );
    setSortType(value);
    setDataSource({ ...dataSource, fileList: list });
  };

  const cancelRequest = () => {
    axiosTokenRef.current?.abort?.();
  };

  useImperativeHandle(ref, () => ({
    fetchFiles: handleFetchFiles,
    cancelRequest
  }));

  useEffect(() => {
    if (selectedDataset?.name) {
      handleFetchFiles();
    } else {
      setDataSource({ fileList: [], loading: false });
    }
    return () => cancelRequest();
  }, [selectedDataset?.name]);

  return (
    <div className="files-wrap">
      <TitleWrapper style={{ paddingInline: '24px' }}>
        <span className="title">
          {intl.formatMessage({ id: 'datasets.available.files' })} (
          {dataSource.fileList.length || 0})
        </span>
        <BaseSelect
          value={sortType}
          onChange={handleSortChange}
          labelRender={({ label }: any) => (
            <span>
              {intl.formatMessage({ id: 'model.deploy.sort' })}: {label}
            </span>
          )}
          options={sortOptions.current}
          size="middle"
          style={{ width: '120px', fontWeight: 400 }}
        ></BaseSelect>
      </TitleWrapper>
      <SimpleOverlay height={'calc(100vh - 300px)'}>
        <div style={{ padding: '16px 24px' }}>
          {dataSource.loading ? (
            <ItemFileWrapper>
              {_.times(5, (index: number) => (
                <FileSkeleton key={index} counts={2}></FileSkeleton>
              ))}
            </ItemFileWrapper>
          ) : dataSource.fileList.length ? (
            <ItemFileWrapper>
              {_.map(dataSource.fileList, (item: any) => (
                <DatasetFileItem
                  key={item.path}
                  data={item}
                  active={item.path === current}
                  onSelect={handleSelectFileManually}
                ></DatasetFileItem>
              ))}
            </ItemFileWrapper>
          ) : (
            <Empty
              styles={{ image: { height: 'auto', marginTop: '20px' } }}
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={intl.formatMessage({ id: 'models.search.nofiles' })}
            />
          )}
        </div>
      </SimpleOverlay>
    </div>
  );
});

export default DatasetFile;
