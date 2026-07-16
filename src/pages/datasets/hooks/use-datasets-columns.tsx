import { tableSorter } from '@/config/settings';
import { convertFileSize } from '@/utils';
import {
  DeleteOutlined,
  DownloadOutlined,
  TableOutlined
} from '@ant-design/icons';
import { AutoTooltip, DropdownButtons, StatusTag } from '@gpustack/core-ui';
import { useIntl } from '@umijs/max';
import { ColumnsType } from 'antd/lib/table';
import dayjs from 'dayjs';
import { useMemo } from 'react';
import {
  DatasetState,
  DatasetStateMap,
  DatasetStateMapValue,
  datasetSourceValueMap,
  getDatasetSourceLabel
} from '../config';
import { Dataset as ListItem } from '../config/types';

const StateCell = (props: { data: ListItem }) => {
  const { data } = props;
  if (!data.state) {
    return null;
  }
  return (
    <StatusTag
      download={
        data.state === DatasetStateMap.Downloading
          ? { percent: data.download_progress || 0 }
          : undefined
      }
      statusValue={{
        status:
          data.state === DatasetStateMap.Downloading &&
          data.download_progress === 100
            ? DatasetState[DatasetStateMap.Ready]
            : DatasetState[data.state],
        text: DatasetStateMapValue[data.state],
        message:
          data.state === DatasetStateMap.Downloading &&
          data.download_progress === 100
            ? ''
            : data.state_message
      }}
    />
  );
};

const getWorkerName = (
  id: number,
  workersList: Global.BaseOption<number>[]
) => {
  const worker = workersList.find((item) => item.value === id);
  return worker?.label || '';
};

const useDatasetsColumns = (props: {
  handleSelect: (action: string, record: ListItem) => void;
  workersList: Global.BaseOption<number>[];
  sortOrder: string[];
}): ColumnsType<ListItem> => {
  const { workersList, handleSelect } = props;
  const intl = useIntl();

  const setActionList = (record: ListItem) => {
    const items: any[] = [
      {
        label: 'datasets.button.columnMapping',
        key: 'mapping',
        icon: <TableOutlined />
      }
    ];
    if (record.state === DatasetStateMap.Error) {
      items.push({
        label: 'datasets.button.retry',
        key: 'retry',
        icon: <DownloadOutlined />
      });
    }
    items.push({
      label: 'common.button.delete',
      key: 'delete',
      props: { danger: true },
      icon: <DeleteOutlined />
    });
    return items;
  };

  return useMemo(() => {
    return [
      {
        title: intl.formatMessage({ id: 'models.form.source' }),
        dataIndex: 'source',
        sorter: tableSorter(1),
        minWidth: 32,
        ellipsis: { showTitle: false },
        render: (text: string, record: ListItem) => {
          // Single source of truth for the prefixed source label.
          const title =
            getDatasetSourceLabel(record) ||
            datasetSourceValueMap[record.source] ||
            record.source;
          return (
            <AutoTooltip ghost title={title}>
              {title}
            </AutoTooltip>
          );
        }
      },
      {
        title: intl.formatMessage({ id: 'resources.worker' }),
        dataIndex: 'worker_id',
        minWidth: 32,
        ellipsis: { showTitle: false },
        render: (text: string, record: ListItem) => (
          <AutoTooltip ghost>
            <span>{getWorkerName(record.worker_id, workersList)}</span>
          </AutoTooltip>
        )
      },
      {
        title: intl.formatMessage({ id: 'common.table.status' }),
        dataIndex: 'state',
        width: 160,
        render: (text: string, record: ListItem) => <StateCell data={record} />
      },
      {
        title: intl.formatMessage({ id: 'resources.modelfiles.size' }),
        dataIndex: 'size',
        width: 110,
        align: 'right',
        ellipsis: { showTitle: false },
        render: (text: string, record: ListItem) => (
          <AutoTooltip ghost>
            <span>{convertFileSize(record.size, 1, true)}</span>
          </AutoTooltip>
        )
      },
      {
        title: intl.formatMessage({ id: 'common.table.createTime' }),
        dataIndex: 'created_at',
        key: 'created_at',
        sorter: tableSorter(2),
        width: 180,
        ellipsis: { showTitle: false },
        render: (text: number) => (
          <AutoTooltip ghost minWidth={20}>
            {dayjs(text).format('YYYY-MM-DD HH:mm:ss')}
          </AutoTooltip>
        )
      },
      {
        title: intl.formatMessage({ id: 'common.table.operation' }),
        dataIndex: 'operation',
        width: 120,
        render: (text: string, record: ListItem) => (
          <DropdownButtons
            items={setActionList(record)}
            onSelect={(val: string) => handleSelect(val, record)}
          ></DropdownButtons>
        )
      }
    ];
  }, [intl, workersList, handleSelect]);
};

export default useDatasetsColumns;
