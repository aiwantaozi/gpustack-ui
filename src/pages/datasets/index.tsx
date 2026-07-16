import { PaginationKey, TABLE_SORT_DIRECTIONS } from '@/config/settings';
import useTableFetch from '@/hooks/use-table-fetch';
import PageBox from '@/pages/_components/page-box';
import { useGenerateWorkerOptions } from '@/pages/llmodels/hooks/use-form-initial-values';
import {
  DeleteModal,
  FilterBar,
  IconFont,
  NoResult,
  useAppUtils
} from '@gpustack/core-ui';
import { useIntl } from '@umijs/max';
import { useMemoizedFn } from 'ahooks';
import { ConfigProvider, Table } from 'antd';
import _ from 'lodash';
import { useEffect, useState } from 'react';
import {
  DATASETS_API,
  createDataset,
  deleteDataset,
  queryDatasetDetail,
  queryDatasetsList,
  resetDataset
} from './apis';
import ColumnMappingDrawer from './components/column-mapping-drawer';
import CreateDatasetDrawer from './components/create-dataset-drawer';
import {
  datasetSourceActions,
  datasetSourceMap,
  getDatasetSourceLabel
} from './config';
import { Dataset as ListItem } from './config/types';
import useDatasetsColumns from './hooks/use-datasets-columns';

const Datasets = () => {
  const intl = useIntl();
  const { showSuccess } = useAppUtils();
  const { getWorkerOptionList, workerOptions, workersList } =
    useGenerateWorkerOptions();
  const {
    dataSource,
    rowSelection,
    queryParams,
    sortOrder,
    modalRef,
    fetchData,
    handleDelete,
    handleDeleteBatch,
    handlePageChange,
    handleTableChange,
    handleSearch,
    handleNameChange,
    handleQueryChange
  } = useTableFetch<ListItem>({
    key: PaginationKey.Datasets,
    fetchAPI: queryDatasetsList,
    deleteAPI: deleteDataset,
    API: DATASETS_API,
    watch: true,
    contentForDelete: 'datasets.dataset'
  });

  const [addStatus, setAddStatus] = useState<{
    open: boolean;
    source: string;
  }>({ open: false, source: datasetSourceMap.huggingface_value });
  const [mappingStatus, setMappingStatus] = useState<{
    open: boolean;
    dataset?: ListItem;
  }>({ open: false });

  const openCreateDrawer = (source: string) => {
    setAddStatus({ open: true, source });
  };

  // The "Create Dataset" dropdown item click (mirrors the model-files download
  // dropdown): each source opens the drawer preset to that source.
  const handleClickCreate = (item: any) => {
    openCreateDrawer(item?.key || datasetSourceMap.huggingface_value);
  };

  useEffect(() => {
    getWorkerOptionList();
  }, []);

  const handleWorkerChange = (value: number) => {
    handleQueryChange({ page: 1, worker_id: value });
  };

  const openColumnMapping = async (record: ListItem) => {
    // Re-fetch the full row so the drawer previews the latest columns /
    // sample_rows (the list stream may lag the inspection result).
    try {
      const detail = await queryDatasetDetail(record.id);
      setMappingStatus({ open: true, dataset: detail });
    } catch (error) {
      setMappingStatus({ open: true, dataset: record });
    }
  };

  const handleSelect = useMemoizedFn(async (val: string, record: ListItem) => {
    try {
      if (val === 'delete') {
        handleDelete(
          { ...record, name: getDatasetSourceLabel(record) },
          {
            checkConfig: {
              checkText: 'datasets.delete.tips',
              defautlChecked: false
            }
          }
        );
      } else if (val === 'retry') {
        await resetDataset(record.id);
        showSuccess();
      } else if (val === 'mapping') {
        openColumnMapping(record);
      }
    } catch (error) {
      // ignore
    }
  });

  const handleCreate = async (values: any) => {
    await createDataset(values);
    setAddStatus((pre) => ({ ...pre, open: false }));
    fetchData();
    showSuccess();
  };

  const handleDeleteByBatch = () => {
    handleDeleteBatch({
      checkConfig: {
        checkText: 'datasets.delete.tips',
        defautlChecked: false
      }
    });
  };

  const renderEmpty = (type?: string) => {
    if (type !== 'Table') return;
    return (
      <NoResult
        loading={dataSource.loading}
        loadend={dataSource.loadend}
        dataSource={dataSource.dataList}
        image={<IconFont type="icon-database-outlined" />}
        filters={_.omit(queryParams, ['sort_by'])}
        noFoundText={intl.formatMessage({ id: 'datasets.nofound' })}
        title={intl.formatMessage({ id: 'datasets.title' })}
        subTitle={intl.formatMessage({ id: 'datasets.subTitle' })}
        onClick={() => openCreateDrawer(datasetSourceMap.huggingface_value)}
        buttonText={intl.formatMessage({ id: 'datasets.button.create' })}
      ></NoResult>
    );
  };

  const columns = useDatasetsColumns({
    handleSelect,
    sortOrder,
    workersList
  });

  return (
    <>
      <PageBox>
        <FilterBar
          marginBottom={22}
          marginTop={30}
          actionType="dropdown"
          selectHolder={intl.formatMessage({ id: 'resources.filter.worker' })}
          inputHolder={intl.formatMessage({ id: 'common.filter.name' })}
          buttonText={intl.formatMessage({ id: 'datasets.button.create' })}
          handleSelectChange={handleWorkerChange}
          handleDeleteByBatch={handleDeleteByBatch}
          handleClickPrimary={handleClickCreate}
          handleSearch={handleSearch}
          selectOptions={workersList}
          handleInputChange={handleNameChange}
          rowSelection={rowSelection}
          actionItems={datasetSourceActions}
          showSelect={true}
        ></FilterBar>
        <ConfigProvider renderEmpty={renderEmpty}>
          <Table
            rowKey="id"
            tableLayout="fixed"
            sortDirections={TABLE_SORT_DIRECTIONS}
            showSorterTooltip={false}
            scroll={{ x: 900 }}
            onChange={handleTableChange}
            dataSource={dataSource.dataList}
            loading={{ spinning: dataSource.loading, size: 'middle' }}
            rowSelection={rowSelection}
            columns={columns}
            pagination={{
              showSizeChanger: true,
              pageSize: queryParams.perPage,
              current: queryParams.page,
              total: dataSource.total,
              hideOnSinglePage: queryParams.perPage === 10,
              onChange: handlePageChange,
              size: 'middle'
            }}
          ></Table>
        </ConfigProvider>
        <DeleteModal ref={modalRef}></DeleteModal>
      </PageBox>
      <CreateDatasetDrawer
        title={intl.formatMessage({ id: 'datasets.button.create' })}
        open={addStatus.open}
        source={addStatus.source}
        workerOptions={workerOptions}
        onCancel={() => setAddStatus((pre) => ({ ...pre, open: false }))}
        onOk={handleCreate}
      ></CreateDatasetDrawer>
      <ColumnMappingDrawer
        open={mappingStatus.open}
        dataset={mappingStatus.dataset}
        onCancel={() => setMappingStatus({ open: false })}
        onOk={() => {
          setMappingStatus({ open: false });
          fetchData();
        }}
      ></ColumnMappingDrawer>
    </>
  );
};

export default Datasets;
