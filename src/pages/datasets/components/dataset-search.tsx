import { getRequestId, setRquestId } from '@/atoms/models';
import SearchInput from '@/pages/llmodels/components/model-source/search-input';
import SearchResult from '@/pages/llmodels/components/model-source/search-result';
import SearchStyle from '@/pages/llmodels/style/search-result.less';
import { BaseSelect, ColumnWrapper } from '@gpustack/core-ui';
import { useIntl } from '@umijs/max';
import { Pagination } from 'antd';
import _ from 'lodash';
import React, { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { queryHuggingfaceDatasets, queryModelScopeDatasets } from '../apis';
import { DatasetSortType, datasetSourceMap } from '../config';

const MS_PAGE_SIZE = 30;

const PaginationMain = styled(Pagination)`
  .ant-pagination-slash {
    margin-inline: 5px;
  }
`;

interface DatasetSearchProps {
  source: string;
  onSelectDataset: (dataset: any) => void;
}

// Left column of the Create-Dataset drawer. Drives live dataset search for BOTH
// HuggingFace and ModelScope (branch on `source`), mirroring the model download
// SearchModel — HF loads the whole list client-side and slices per page; MS
// paginates server-side.
const DatasetSearch: React.FC<DatasetSearchProps> = (props) => {
  const { source, onSelectDataset } = props;
  const intl = useIntl();
  const isHF = source === datasetSourceMap.huggingface_value;

  const [dataSource, setDataSource] = useState<{
    dataList: any[];
    loading: boolean;
    networkError: boolean;
    sortType: string;
  }>({
    dataList: [],
    loading: false,
    networkError: false,
    sortType: DatasetSortType.trendingScore
  });

  const [current, setCurrent] = useState<string>('');
  const currentRef = useRef<string>('');
  const cacheRepoOptions = useRef<any[]>([]);
  const axiosTokenRef = useRef<any>(null);
  const searchInputRef = useRef<string>('');
  const searchRequestIdRef = useRef<number>(0);
  const [paginationInfo, setPaginationInfo] = useState({
    page: 1,
    perPage: isHF ? 10 : MS_PAGE_SIZE,
    total: 0
  });

  // HF supports all four sort keys; MS only trending (default) + downloads.
  const sortOptions = isHF
    ? [
        {
          label: intl.formatMessage({ id: 'models.sort.trending' }),
          value: DatasetSortType.trendingScore
        },
        {
          label: intl.formatMessage({ id: 'models.sort.likes' }),
          value: DatasetSortType.likes
        },
        {
          label: intl.formatMessage({ id: 'models.sort.downloads' }),
          value: DatasetSortType.downloads
        },
        {
          label: intl.formatMessage({ id: 'models.sort.updated' }),
          value: DatasetSortType.lastModified
        }
      ]
    : [
        {
          label: intl.formatMessage({ id: 'models.sort.trending' }),
          value: DatasetSortType.trendingScore
        },
        {
          label: intl.formatMessage({ id: 'models.sort.downloads' }),
          value: DatasetSortType.downloads
        }
      ];

  const handleOnSelect = (dataset: any) => {
    const item = dataset || {};
    onSelectDataset(item);
    setCurrent(item.id);
    currentRef.current = item.id;
  };

  const getCurrentPage = (page: number) => {
    const start = (page - 1) * paginationInfo.perPage;
    const end = start + paginationInfo.perPage;
    return cacheRepoOptions.current.slice(start, end);
  };

  // HuggingFace: fetch the whole result set (client-side pagination).
  const getDatasetsFromHuggingface = async (sort: string) => {
    const currentSearchId = setRquestId();
    const data = await queryHuggingfaceDatasets(
      { search: { query: searchInputRef.current || '', sort } },
      { signal: axiosTokenRef.current.signal }
    );
    if (getRequestId() !== currentSearchId) {
      throw 'new request has been sent';
    }
    return _.map(data || [], (item: any) => ({
      ...item,
      value: item.name,
      label: item.name,
      source
    }));
  };

  // ModelScope: server-side pagination. Maps dolphin/datasets rows to the shared
  // result-card shape (id = "{Namespace}/{Name}").
  const getDatasetsFromModelscope = async (queryParams: {
    sortType: string;
    page: number;
  }) => {
    const currentSearchId = setRquestId();
    const Sort =
      queryParams.sortType === DatasetSortType.downloads ? 'downloads' : '';
    const data = await queryModelScopeDatasets(
      {
        PageSize: MS_PAGE_SIZE,
        PageNumber: queryParams.page,
        Query: searchInputRef.current || '',
        Sort
      },
      { signal: axiosTokenRef.current.signal }
    );
    if (getRequestId() !== currentSearchId) {
      throw 'new request has been sent';
    }
    const rows = _.get(data, 'Data') || [];
    const list = _.map(rows, (item: any) => {
      const name = `${item.Namespace}/${item.Name}`;
      const tags = item.UserDefineTags
        ? String(item.UserDefineTags)
            .split(',')
            .map((t: string) => t.trim())
            .filter((t: string) => t)
        : (item.Tags || [])
            .map((t: any) => t?.level1TagName || t?.task)
            .filter((t: string) => t);
      return {
        path: item.Namespace,
        name,
        id: name,
        // Numeric dataset id — required by the MS /repo/tree file-list endpoint.
        datasetId: item.Id,
        value: name,
        label: name,
        downloads: item.Downloads,
        likes: item.Likes,
        updatedAt: (item.LastUpdatedTime || item.GmtModified) * 1000,
        revision: 'master',
        tags,
        readmeContent: item.ReadmeContent,
        source
      };
    });
    // No TotalCount in the datasets response: assume a next page exists while a
    // full page is returned, so the pager's Next arrow works.
    const total =
      rows.length === MS_PAGE_SIZE
        ? queryParams.page * MS_PAGE_SIZE + 1
        : (queryParams.page - 1) * MS_PAGE_SIZE + rows.length;
    setPaginationInfo((prev) => ({ ...prev, page: queryParams.page, total }));
    return list;
  };

  const handleOnSearchRepo = async (params: {
    sortType: string;
    page: number;
  }) => {
    const currentSearchId = (searchRequestIdRef.current += 1);
    axiosTokenRef.current?.abort?.('cancel previous request');
    axiosTokenRef.current = new AbortController();
    try {
      setDataSource((pre) => ({ ...pre, loading: true }));
      cacheRepoOptions.current = [];
      let list: any[] = [];
      if (isHF) {
        const resultList = await getDatasetsFromHuggingface(params.sortType);
        cacheRepoOptions.current = resultList;
        list = getCurrentPage(params.page);
        setPaginationInfo((prev) => ({
          ...prev,
          page: params.page,
          total: resultList.length
        }));
      } else {
        list = await getDatasetsFromModelscope(params);
        cacheRepoOptions.current = list;
      }
      setDataSource({
        dataList: list,
        loading: false,
        networkError: false,
        sortType: params.sortType
      });
      handleOnSelect(list[0]);
    } catch (error: any) {
      setDataSource({
        dataList: [],
        loading: currentSearchId !== searchRequestIdRef.current,
        sortType: params.sortType,
        networkError: error?.message === 'Failed to fetch'
      });
      handleOnSelect({});
      cacheRepoOptions.current = [];
    }
  };

  const handleSearchInputChange = (e: any) => {
    searchInputRef.current = e.target.value;
  };

  const handlerSearchDatasets = _.debounce(
    () => handleOnSearchRepo({ sortType: dataSource.sortType, page: 1 }),
    100
  );

  const handleSortChange = (value: string) => {
    handleOnSearchRepo({ sortType: value, page: 1 });
  };

  const handleOnPageChange = (page: number) => {
    if (isHF) {
      const currentList = getCurrentPage(page);
      setPaginationInfo((prev) => ({ ...prev, page }));
      setDataSource((pre) => ({ ...pre, dataList: currentList }));
      handleOnSelect(currentList[0]);
    } else {
      handleOnSearchRepo({ sortType: dataSource.sortType, page });
    }
  };

  const handleSelectManually = (dataset: any) => {
    if (dataset.id === currentRef.current) {
      return;
    }
    setRquestId();
    handleOnSelect(dataset);
  };

  useEffect(() => {
    handleOnSearchRepo({ sortType: dataSource.sortType, page: 1 });
    return () => {
      axiosTokenRef.current?.abort?.();
    };
    // re-run when the source switches (HF <-> MS).
  }, [source]);

  return (
    <div style={{ width: '100%' }}>
      <div className={SearchStyle['search-bar']}>
        <SearchInput
          onSearch={handlerSearchDatasets}
          onChange={handleSearchInputChange}
          modelSource={source}
        ></SearchInput>
        <div className={SearchStyle.filter}>
          <span className="flex-center gap-8">
            <BaseSelect
              value={dataSource.sortType}
              onChange={handleSortChange}
              prefix={
                <span>{intl.formatMessage({ id: 'model.deploy.sort' })}:</span>
              }
              options={sortOptions}
              size="middle"
              style={{ width: '150px' }}
            ></BaseSelect>
          </span>
          <PaginationMain
            simple={{ readOnly: true }}
            total={paginationInfo.total}
            current={paginationInfo.page}
            pageSize={paginationInfo.perPage}
            onChange={handleOnPageChange}
            showSizeChanger={false}
            hideOnSinglePage={paginationInfo.total <= paginationInfo.perPage}
          ></PaginationMain>
        </div>
      </div>
      <ColumnWrapper
        maxHeight={'calc(100vh - 210px)'}
        styles={{ container: { paddingTop: 0 } }}
      >
        <SearchResult
          loading={dataSource.loading}
          resultList={dataSource.dataList}
          networkError={dataSource.networkError}
          current={current}
          source={source}
          onSelect={handleSelectManually}
        ></SearchResult>
      </ColumnWrapper>
    </div>
  );
};

export default DatasetSearch;
