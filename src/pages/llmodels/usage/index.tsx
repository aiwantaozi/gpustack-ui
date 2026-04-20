import CardWrapper from '@/components/card-wrapper';
import { TABLE_SORT_DIRECTIONS } from '@/config/settings';
import { PageContainerInner } from '@/pages/_components/page-box';
import { baseColorMap } from '@/pages/dashboard/config';
import {
  CalendarOutlined,
  DownloadOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import { useIntl, useModel } from '@umijs/max';
import type { TableColumnsType } from 'antd';
import {
  Button,
  DatePicker,
  Empty,
  Popover,
  Segmented,
  Select,
  Table,
  Tabs,
  Tooltip
} from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import React, { useMemo, useState } from 'react';
import styled from 'styled-components';

type MetricKey = 'input' | 'output' | 'total' | 'requests';
type SummaryKey = MetricKey | 'modelsUsed';
type ViewKey = 'models' | 'users' | 'apikeys';
type GroupKey = 'none' | 'models' | 'users' | 'apikeys';
type GranularityKey = 'day' | 'week' | 'month';
type ScopeKey = 'all' | 'self';

interface UsageRecord {
  key: string;
  modelKey: string;
  userKey: string;
  apiKeyKey: string;
  provider: string;
  cluster: string;
  inputValues: number[];
}

interface AggregatedRow {
  key: string;
  label: string;
  provider?: string;
  cluster?: string;
  userLabel?: string;
  inputValues: number[];
  outputValues: number[];
  totalValues: number[];
  requestValues: number[];
  modelsUsed: number;
  apiKeysUsed: number;
  lastActive: string;
}

interface ChartSeries {
  key: string;
  label: string;
  color: string;
  values: number[];
}

const RangePicker = DatePicker.RangePicker;

const chartColors = [
  baseColorMap.base,
  baseColorMap.baseR1,
  baseColorMap.baseR2,
  baseColorMap.baseR3
];

const datePoints = Array.from({ length: 16 }, (_, index) =>
  dayjs('2026-03-24').add(index, 'day')
);

const mockDateRange: [Dayjs, Dayjs] = [
  datePoints[0],
  datePoints[datePoints.length - 1]
];

const modelMeta = {
  'qwen3.5-9b': { label: 'Qwen3.5-9B', provider: 'Qwen', cluster: 'cn-a' },
  'qwen3.5-27b': { label: 'Qwen3.5-27B', provider: 'Qwen', cluster: 'cn-b' },
  'minimax-m1-8b': {
    label: 'MiniMax-M1-8B',
    provider: 'MiniMax',
    cluster: 'cn-a'
  },
  'deepseek-v3.2': {
    label: 'DeepSeek-V3.2',
    provider: 'DeepSeek',
    cluster: 'cn-b'
  },
  'glm-4.6': { label: 'GLM-4.6', provider: 'Zhipu', cluster: 'cn-a' },
  'llama-3.3-70b': {
    label: 'Llama-3.3-70B',
    provider: 'Meta',
    cluster: 'us-west'
  },
  'yi-lightning': { label: 'Yi-Lightning', provider: '01.AI', cluster: 'cn-c' },
  'mistral-small-3.1': {
    label: 'Mistral-Small-3.1',
    provider: 'Mistral',
    cluster: 'eu-central'
  }
} as const;

const userMeta = {
  'dev-michelia': { label: 'dev-michelia' },
  'dev-wangyimi': { label: 'dev-wangyimi' },
  'dev-frank': { label: 'dev-frank' },
  'test-xunfeng': { label: 'test-xunfeng' }
} as const;

const apiKeyMeta = {
  'key-1': { label: 'key_d8q99khrxxwnz7IT', userKey: 'dev-frank' },
  'key-2': { label: 'key_roB5bVsiUyx66o5I', userKey: 'test-xunfeng' },
  'key-3': { label: 'key_dev_michelia', userKey: 'dev-michelia' },
  'key-4': { label: 'key_dev_wangyimi', userKey: 'dev-wangyimi' }
} as const;

const usageRecords: UsageRecord[] = [
  {
    key: 'record-1',
    modelKey: 'qwen3.5-9b',
    userKey: 'dev-michelia',
    apiKeyKey: 'key-3',
    provider: 'Qwen',
    cluster: 'cn-a',
    inputValues: [
      22, 18, 16, 20, 18, 16, 20, 18, 24, 280, 16, 14, 16, 14, 18, 22
    ]
  },
  {
    key: 'record-2',
    modelKey: 'qwen3.5-9b',
    userKey: 'dev-frank',
    apiKeyKey: 'key-1',
    provider: 'Qwen',
    cluster: 'cn-a',
    inputValues: [8, 10, 0, 12, 0, 0, 14, 6, 8, 96, 0, 6, 0, 0, 8, 24]
  },
  {
    key: 'record-3',
    modelKey: 'qwen3.5-27b',
    userKey: 'dev-wangyimi',
    apiKeyKey: 'key-4',
    provider: 'Qwen',
    cluster: 'cn-b',
    inputValues: [120, 32, 18, 34, 2, 48, 20, 50, 70, 1, 0, 0, 18, 0, 0, 0]
  },
  {
    key: 'record-4',
    modelKey: 'minimax-m1-8b',
    userKey: 'dev-michelia',
    apiKeyKey: 'key-3',
    provider: 'MiniMax',
    cluster: 'cn-a',
    inputValues: [0, 0, 62, 0, 0, 0, 0, 0, 16, 0, 0, 0, 6, 0, 0, 0]
  },
  {
    key: 'record-5',
    modelKey: 'minimax-m1-8b',
    userKey: 'test-xunfeng',
    apiKeyKey: 'key-2',
    provider: 'MiniMax',
    cluster: 'cn-a',
    inputValues: [2, 2, 56, 0, 2, 0, 0, 0, 16, 0, 0, 0, 4, 0, 0, 0]
  },
  {
    key: 'record-6',
    modelKey: 'deepseek-v3.2',
    userKey: 'dev-frank',
    apiKeyKey: 'key-1',
    provider: 'DeepSeek',
    cluster: 'cn-b',
    inputValues: [0, 94, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
  },
  {
    key: 'record-7',
    modelKey: 'glm-4.6',
    userKey: 'test-xunfeng',
    apiKeyKey: 'key-2',
    provider: 'Zhipu',
    cluster: 'cn-a',
    inputValues: [132, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
  },
  {
    key: 'record-8',
    modelKey: 'llama-3.3-70b',
    userKey: 'dev-wangyimi',
    apiKeyKey: 'key-4',
    provider: 'Meta',
    cluster: 'us-west',
    inputValues: [8, 0, 0, 0, 0, 0, 0, 0, 0, 0, 146, 0, 0, 0, 0, 0]
  },
  {
    key: 'record-9',
    modelKey: 'yi-lightning',
    userKey: 'dev-frank',
    apiKeyKey: 'key-1',
    provider: '01.AI',
    cluster: 'cn-c',
    inputValues: [0, 128, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
  },
  {
    key: 'record-10',
    modelKey: 'mistral-small-3.1',
    userKey: 'dev-michelia',
    apiKeyKey: 'key-3',
    provider: 'Mistral',
    cluster: 'eu-central',
    inputValues: [2, 2, 54, 18, 2, 4, 8, 10, 18, 0, 0, 0, 0, 0, 4, 6]
  },
  {
    key: 'record-11',
    modelKey: 'mistral-small-3.1',
    userKey: 'dev-wangyimi',
    apiKeyKey: 'key-4',
    provider: 'Mistral',
    cluster: 'eu-central',
    inputValues: [0, 0, 58, 22, 4, 4, 6, 6, 32, 0, 0, 0, 0, 0, 4, 8]
  }
];

const StyledPage = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const Toolbar = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
`;

const FilterGroup = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;

  .filterSelect {
    width: 180px;
  }
`;

const ScopeSwitch = styled.div`
  .ant-segmented {
    background: var(--ant-color-bg-container);
    border: 1px solid var(--ant-color-border);
  }
`;

const OverviewCard = styled(CardWrapper)`
  padding: 0;
  overflow: hidden;
`;

const OverviewHeader = styled.div`
  display: grid;
  gap: 14px;
  padding: 18px 20px 0;
`;

const SummaryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 12px;

  @media (max-width: 1320px) {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  @media (max-width: 900px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 760px) {
    grid-template-columns: 1fr;
  }
`;

const SummaryCard = styled.div`
  padding: 14px 16px;
  border-radius: 10px;
  background: linear-gradient(
    180deg,
    rgba(255, 255, 255, 0.96) 0%,
    rgba(246, 249, 255, 0.9) 100%
  );
  border: 1px solid var(--ant-color-border-secondary);

  .label {
    font-size: 13px;
    font-weight: 600;
    color: var(--ant-color-text-secondary);
  }

  .value {
    margin-top: 8px;
    font-size: 28px;
    line-height: 1;
    font-weight: 700;
    color: var(--ant-color-text);
  }
`;

const ChartControls = styled.div`
  display: flex;
  justify-content: flex-start;
  align-items: center;
  gap: 20px;
  flex-wrap: wrap;
  padding: 0;

  .controlItem {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 0;
    font-size: 12px;
    color: var(--ant-color-text-secondary);
  }

  .controlLabel {
    font-weight: 600;
    color: var(--ant-color-text);
    white-space: nowrap;
  }

  .controlSelect {
    min-width: 92px;

    .ant-select-selector {
      border: 0 !important;
      border-radius: 0 !important;
      background: transparent !important;
      box-shadow: none !important;
      height: 24px !important;
      padding-inline: 0 !important;
    }

    .ant-select-selection-item {
      line-height: 24px !important;
      font-size: 12px;
      font-weight: 600;
      color: var(--ant-color-text);
    }

    .ant-select-arrow {
      color: var(--ant-color-text-tertiary);
    }
  }

  @media (max-width: 760px) {
    .controlSelect {
      min-width: 82px;
    }
  }
`;

const OverviewBody = styled.div`
  padding: 16px 20px 18px;
`;

const BigChart = styled.div`
  display: flex;
  align-items: flex-end;
  gap: 10px;
  height: 260px;
  padding: 22px 0 12px;
  position: relative;
  overflow: hidden;

  .guide {
    position: absolute;
    left: 0;
    right: 0;
    top: 42px;
    border-top: 1px dashed var(--ant-color-border);
  }

  .barCol {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-end;
    gap: 8px;
    height: 100%;
  }

  .barTrack {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: flex-end;
    justify-content: center;
  }

  .barStack {
    width: min(56px, 100%);
    display: flex;
    flex-direction: column-reverse;
    overflow: hidden;
    border-radius: 12px 12px 3px 3px;
    box-shadow: 0 10px 24px rgba(0, 85, 255, 0.12);
  }

  .barSegment {
    width: 100%;
    min-height: 2px;
  }

  .barLabel {
    font-size: 12px;
    color: var(--ant-color-text-tertiary);
  }
`;

const LegendRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  padding-top: 10px;
  border-top: 1px solid var(--ant-color-border-secondary);

  .legendItem {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    color: var(--ant-color-text-secondary);
    font-size: 12px;
  }

  .legendDot {
    width: 10px;
    height: 10px;
    border-radius: 3px;
    flex: none;
  }
`;

const TableCard = styled(CardWrapper)`
  padding: 0;
  overflow: hidden;

  .ant-tabs-nav {
    padding: 0 16px;
    margin-bottom: 12px;
  }

  .ant-table-wrapper {
    padding: 0 16px 16px;
  }

  @media (max-width: 760px) {
    .ant-tabs-nav {
      padding: 0 12px;
    }

    .ant-table-wrapper {
      padding: 0 12px 12px;
    }
  }
`;

const ExportPanel = styled.div`
  display: grid;
  gap: 6px;
  min-width: 140px;
`;

const NameCell = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;

  .title {
    font-weight: 600;
    color: var(--ant-color-text);
  }

  .sub {
    font-size: 12px;
    color: var(--ant-color-text-tertiary);
  }
`;

const includesAny = (source: string[], selected: string[]) => {
  if (!selected.length) {
    return true;
  }
  return selected.some((item) => source.includes(item));
};

const formatValue = (value: number) => {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(3).replace(/\.?0+$/, '')}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(3).replace(/\.?0+$/, '')}K`;
  }
  return `${value}`;
};

const getRangeIndexes = (range: [Dayjs, Dayjs] | null) => {
  if (!range) {
    return { start: 0, end: datePoints.length - 1 };
  }
  const [startDate, endDate] = range;
  const start = datePoints.findIndex((date) =>
    date.isSame(startDate.startOf('day'), 'day')
  );
  const end = datePoints.findIndex((date) =>
    date.isSame(endDate.startOf('day'), 'day')
  );
  return {
    start: start >= 0 ? start : 0,
    end: end >= 0 ? end : datePoints.length - 1
  };
};

const sumRange = (values: number[], start: number, end: number) =>
  values.slice(start, end + 1).reduce((sum, value) => sum + value, 0);

const getBucketStart = (date: Dayjs, granularity: GranularityKey) => {
  if (granularity === 'month') {
    return date.startOf('month');
  }
  if (granularity === 'week') {
    const daysFromMonday = (date.day() + 6) % 7;
    return date.subtract(daysFromMonday, 'day').startOf('day');
  }
  return date.startOf('day');
};

const formatBucketLabel = (date: Dayjs, granularity: GranularityKey) => {
  if (granularity === 'month') {
    return date.format('MMM YYYY');
  }
  return date.format('MMM DD');
};

const escapeCsvCell = (value: string | number) => {
  const raw = String(value ?? '');
  if (/[",\n]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
};

const downloadCsv = (
  fileName: string,
  headers: string[],
  rows: Array<Array<string | number>>
) => {
  const csvContent = [headers, ...rows]
    .map((row) => row.map((cell) => escapeCsvCell(cell)).join(','))
    .join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const getOutputValues = (values: number[], seed: number) =>
  values.map((value, index) => Math.round(value * 0.42 + ((seed + index) % 3)));

const getRequestValues = (values: number[], seed: number) =>
  values.map((value, index) =>
    Math.max(1, Math.round(value * 0.08 + ((seed + index) % 2)))
  );

const getMetricValues = (row: AggregatedRow, metric: MetricKey) => {
  if (metric === 'input') {
    return row.inputValues;
  }
  if (metric === 'output') {
    return row.outputValues;
  }
  if (metric === 'requests') {
    return row.requestValues;
  }
  return row.totalValues;
};

const getLastActive = (values: number[]) => {
  for (let index = values.length - 1; index >= 0; index -= 1) {
    if (values[index] > 0) {
      return datePoints[index].format('YYYY-MM-DD');
    }
  }
  return datePoints[0].format('YYYY-MM-DD');
};

const sortRowsByMetric = (rows: AggregatedRow[], metric: MetricKey) => {
  const cloned = [...rows];
  cloned.sort((left, right) => {
    const leftValue = getMetricValues(left, metric).reduce(
      (sum, value) => sum + value,
      0
    );
    const rightValue = getMetricValues(right, metric).reduce(
      (sum, value) => sum + value,
      0
    );
    return rightValue - leftValue;
  });
  return cloned;
};

const UsagePage: React.FC = () => {
  const intl = useIntl();
  const initialInfo = useModel('@@initialState') || { initialState: undefined };
  const isAdmin = Boolean(initialInfo.initialState?.currentUser?.is_admin);
  const currentUsername =
    initialInfo.initialState?.currentUser?.username ||
    userMeta['dev-michelia'].label;

  const [scope, setScope] = useState<ScopeKey>('self');
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>(
    mockDateRange
  );
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [selectedApiKeys, setSelectedApiKeys] = useState<string[]>([]);
  const [metric, setMetric] = useState<MetricKey>('total');
  const [groupBy, setGroupBy] = useState<GroupKey>('none');
  const [granularity, setGranularity] = useState<GranularityKey>('day');
  const [activeView, setActiveView] = useState<ViewKey>('models');

  const rangeIndexes = useMemo(() => getRangeIndexes(dateRange), [dateRange]);

  const currentUserKey = useMemo(() => {
    return (
      Object.entries(userMeta).find(
        ([, meta]) => meta.label === currentUsername
      )?.[0] || currentUsername
    );
  }, [currentUsername]);

  const userMetaMap = useMemo<Record<string, { label: string }>>(
    () => ({
      ...userMeta,
      [currentUserKey]: { label: currentUsername }
    }),
    [currentUserKey, currentUsername]
  );

  const apiKeyMetaMap = useMemo<
    Record<string, { label: string; userKey: string }>
  >(
    () => ({
      ...apiKeyMeta,
      'key-current-user': {
        label: `key_${currentUserKey.replace(/[^a-zA-Z0-9_-]/g, '_')}`,
        userKey: currentUserKey
      }
    }),
    [currentUserKey]
  );

  const currentUsageRecords = useMemo<UsageRecord[]>(() => {
    if (usageRecords.some((record) => record.userKey === currentUserKey)) {
      return usageRecords;
    }

    return [
      ...usageRecords,
      {
        key: 'record-current-user-qwen',
        modelKey: 'qwen3.5-9b',
        userKey: currentUserKey,
        apiKeyKey: 'key-current-user',
        provider: 'Qwen',
        cluster: 'cn-a',
        inputValues: [
          18, 22, 20, 28, 16, 24, 30, 26, 34, 42, 36, 32, 38, 44, 40, 48
        ]
      },
      {
        key: 'record-current-user-mistral',
        modelKey: 'mistral-small-3.1',
        userKey: currentUserKey,
        apiKeyKey: 'key-current-user',
        provider: 'Mistral',
        cluster: 'eu-central',
        inputValues: [0, 8, 12, 0, 16, 18, 0, 22, 20, 0, 24, 28, 0, 26, 30, 34]
      }
    ];
  }, [currentUserKey]);

  const effectiveSelectedUsers = useMemo(() => {
    if (scope === 'self') {
      return [currentUserKey];
    }
    return selectedUsers;
  }, [currentUserKey, scope, selectedUsers]);

  const filteredRecords = useMemo(() => {
    return currentUsageRecords.filter((record) => {
      return (
        includesAny([record.modelKey], selectedModels) &&
        includesAny([record.apiKeyKey], selectedApiKeys) &&
        includesAny([record.userKey], effectiveSelectedUsers)
      );
    });
  }, [
    currentUsageRecords,
    effectiveSelectedUsers,
    selectedApiKeys,
    selectedModels
  ]);

  const aggregateRows = (view: ViewKey): AggregatedRow[] => {
    const grouped = new Map<string, AggregatedRow>();

    filteredRecords.forEach((record, recordIndex) => {
      const outputValues = getOutputValues(record.inputValues, recordIndex);
      const requestValues = getRequestValues(record.inputValues, recordIndex);
      const totalValues = record.inputValues.map(
        (value, index) => value + outputValues[index]
      );
      const groupKey =
        view === 'models'
          ? record.modelKey
          : view === 'users'
            ? record.userKey
            : record.apiKeyKey;

      if (!grouped.has(groupKey)) {
        const baseLabel =
          view === 'models'
            ? modelMeta[record.modelKey as keyof typeof modelMeta].label
            : view === 'users'
              ? userMetaMap[record.userKey]?.label || record.userKey
              : apiKeyMetaMap[record.apiKeyKey]?.label || record.apiKeyKey;

        grouped.set(groupKey, {
          key: groupKey,
          label: baseLabel,
          provider:
            view === 'models'
              ? modelMeta[record.modelKey as keyof typeof modelMeta].provider
              : undefined,
          cluster:
            view === 'models'
              ? modelMeta[record.modelKey as keyof typeof modelMeta].cluster
              : undefined,
          userLabel:
            view === 'apikeys'
              ? userMetaMap[record.userKey]?.label || record.userKey
              : undefined,
          inputValues: new Array(datePoints.length).fill(0),
          outputValues: new Array(datePoints.length).fill(0),
          totalValues: new Array(datePoints.length).fill(0),
          requestValues: new Array(datePoints.length).fill(0),
          modelsUsed: 0,
          apiKeysUsed: 0,
          lastActive: datePoints[0].format('YYYY-MM-DD')
        });
      }

      const row = grouped.get(groupKey)!;
      row.inputValues = row.inputValues.map(
        (value, index) => value + record.inputValues[index]
      );
      row.outputValues = row.outputValues.map(
        (value, index) => value + outputValues[index]
      );
      row.totalValues = row.totalValues.map(
        (value, index) => value + totalValues[index]
      );
      row.requestValues = row.requestValues.map(
        (value, index) => value + requestValues[index]
      );
    });

    grouped.forEach((row) => {
      const matchingRecords = filteredRecords.filter((record) => {
        if (view === 'models') {
          return record.modelKey === row.key;
        }
        if (view === 'users') {
          return record.userKey === row.key;
        }
        return record.apiKeyKey === row.key;
      });
      row.modelsUsed = new Set(
        matchingRecords.map((record) => record.modelKey)
      ).size;
      row.apiKeysUsed = new Set(
        matchingRecords.map((record) => record.apiKeyKey)
      ).size;
      row.lastActive = getLastActive(row.totalValues);
    });

    return Array.from(grouped.values());
  };

  const availableViews = useMemo(() => {
    const items: { key: ViewKey; label: string }[] = [
      { key: 'models', label: intl.formatMessage({ id: 'usage.view.models' }) },
      {
        key: 'apikeys',
        label: intl.formatMessage({ id: 'usage.view.apikeys' })
      }
    ];
    if (isAdmin && scope === 'all') {
      items.splice(1, 0, {
        key: 'users',
        label: intl.formatMessage({ id: 'usage.view.users' })
      });
    }
    return items;
  }, [intl, isAdmin, scope]);

  const availableGroupOptions = useMemo(() => {
    const items = [
      { value: 'none', label: intl.formatMessage({ id: 'usage.group.none' }) },
      {
        value: 'models',
        label: intl.formatMessage({ id: 'usage.group.models' })
      },
      {
        value: 'apikeys',
        label: intl.formatMessage({ id: 'usage.group.apikeys' })
      }
    ];
    if (isAdmin && scope === 'all') {
      items.splice(1, 0, {
        value: 'users',
        label: intl.formatMessage({ id: 'usage.group.users' })
      });
    }
    return items;
  }, [intl, isAdmin, scope]);

  const groupRows = useMemo(() => {
    if (groupBy === 'none') {
      const row: AggregatedRow = {
        key: 'all',
        label: intl.formatMessage({ id: 'usage.label.total' }),
        inputValues: new Array(datePoints.length).fill(0),
        outputValues: new Array(datePoints.length).fill(0),
        totalValues: new Array(datePoints.length).fill(0),
        requestValues: new Array(datePoints.length).fill(0),
        modelsUsed: new Set(filteredRecords.map((record) => record.modelKey))
          .size,
        apiKeysUsed: new Set(filteredRecords.map((record) => record.apiKeyKey))
          .size,
        lastActive: datePoints[0].format('YYYY-MM-DD')
      };

      filteredRecords.forEach((record, index) => {
        const outputValues = getOutputValues(record.inputValues, index);
        const requestValues = getRequestValues(record.inputValues, index);
        row.inputValues = row.inputValues.map(
          (value, valueIndex) => value + record.inputValues[valueIndex]
        );
        row.outputValues = row.outputValues.map(
          (value, valueIndex) => value + outputValues[valueIndex]
        );
        row.totalValues = row.totalValues.map(
          (value, valueIndex) =>
            value + record.inputValues[valueIndex] + outputValues[valueIndex]
        );
        row.requestValues = row.requestValues.map(
          (value, valueIndex) => value + requestValues[valueIndex]
        );
      });

      row.lastActive = getLastActive(row.totalValues);
      return row.totalValues.some((value) => value > 0) ? [row] : [];
    }

    return aggregateRows(groupBy as ViewKey);
  }, [filteredRecords, groupBy, intl]);
  const viewRows = useMemo(
    () => aggregateRows(activeView),
    [activeView, filteredRecords]
  );

  const summaryValues = useMemo(() => {
    const metrics: Record<SummaryKey, number> = {
      input: 0,
      output: 0,
      total: 0,
      requests: 0,
      modelsUsed: 0
    };

    filteredRecords.forEach((record, index) => {
      const outputValues = getOutputValues(record.inputValues, index);
      const requestValues = getRequestValues(record.inputValues, index);
      const totalValues = record.inputValues.map(
        (value, valueIndex) => value + outputValues[valueIndex]
      );
      metrics.input += sumRange(
        record.inputValues,
        rangeIndexes.start,
        rangeIndexes.end
      );
      metrics.output += sumRange(
        outputValues,
        rangeIndexes.start,
        rangeIndexes.end
      );
      metrics.total += sumRange(
        totalValues,
        rangeIndexes.start,
        rangeIndexes.end
      );
      metrics.requests += sumRange(
        requestValues,
        rangeIndexes.start,
        rangeIndexes.end
      );
    });

    metrics.modelsUsed = new Set(
      filteredRecords
        .filter(
          (record) =>
            sumRange(record.inputValues, rangeIndexes.start, rangeIndexes.end) >
            0
        )
        .map((record) => record.modelKey)
    ).size;

    return metrics;
  }, [filteredRecords, rangeIndexes.end, rangeIndexes.start]);

  const chartSeries = useMemo<ChartSeries[]>(() => {
    const rows = sortRowsByMetric(groupRows, metric).slice(0, 4);
    const remainingRows = sortRowsByMetric(groupRows, metric).slice(4);
    const series = rows.map((row, index) => ({
      key: row.key,
      label: row.label,
      color: chartColors[index % chartColors.length],
      values: getMetricValues(row, metric)
    }));

    if (remainingRows.length) {
      const others = new Array(datePoints.length).fill(0);
      remainingRows.forEach((row) => {
        getMetricValues(row, metric).forEach((value, index) => {
          others[index] += value;
        });
      });
      series.push({
        key: 'others',
        label: intl.formatMessage({ id: 'usage.legend.others' }),
        color: chartColors[series.length % chartColors.length],
        values: others
      });
    }
    return series;
  }, [groupRows, intl, metric]);

  const selectedChartBuckets = useMemo(() => {
    const buckets = new Map<
      string,
      {
        date: string;
        label: string;
        values: { key: string; color: string; value: number }[];
      }
    >();

    datePoints
      .slice(rangeIndexes.start, rangeIndexes.end + 1)
      .forEach((date, offsetIndex) => {
        const bucketStart = getBucketStart(date, granularity);
        const bucketKey = bucketStart.format('YYYY-MM-DD');
        if (!buckets.has(bucketKey)) {
          buckets.set(bucketKey, {
            date: bucketKey,
            label: formatBucketLabel(bucketStart, granularity),
            values: chartSeries.map((series) => ({
              key: series.key,
              color: series.color,
              value: 0
            }))
          });
        }

        const bucket = buckets.get(bucketKey)!;
        chartSeries.forEach((series, seriesIndex) => {
          bucket.values[seriesIndex].value +=
            series.values[rangeIndexes.start + offsetIndex];
        });
      });

    return Array.from(buckets.values());
  }, [chartSeries, granularity, rangeIndexes.end, rangeIndexes.start]);

  const selectedChartValues = useMemo(
    () => selectedChartBuckets.map((bucket) => bucket.values),
    [selectedChartBuckets]
  );

  const maxChartValue = useMemo(() => {
    return Math.max(
      ...selectedChartValues.map((dayValues) =>
        dayValues.reduce((sum, item) => sum + item.value, 0)
      ),
      0
    );
  }, [selectedChartValues]);

  const modelOptions = Object.entries(modelMeta).map(([key, value]) => ({
    value: key,
    label: value.label
  }));
  const userOptions = Object.entries(userMetaMap).map(([key, value]) => ({
    value: key,
    label: value.label
  }));
  const apiKeyOptions = Object.entries(apiKeyMetaMap).map(([key, value]) => ({
    value: key,
    label: value.label
  }));

  const rangeStartLabel =
    selectedChartBuckets[0]?.label ||
    datePoints[rangeIndexes.start].format('MMM DD');
  const rangeEndLabel =
    selectedChartBuckets[selectedChartBuckets.length - 1]?.label ||
    datePoints[rangeIndexes.end].format('MMM DD');

  const metricOptions: { label: string; value: MetricKey }[] = [
    {
      label: intl.formatMessage({ id: 'usage.metric.inputTokens' }),
      value: 'input'
    },
    {
      label: intl.formatMessage({ id: 'usage.metric.outputTokens' }),
      value: 'output'
    },
    {
      label: intl.formatMessage({ id: 'usage.metric.totalTokens' }),
      value: 'total'
    },
    {
      label: intl.formatMessage({ id: 'usage.metric.requests' }),
      value: 'requests'
    }
  ];
  const granularityOptions: { label: string; value: GranularityKey }[] = [
    {
      label: intl.formatMessage({ id: 'usage.granularity.day' }),
      value: 'day'
    },
    {
      label: intl.formatMessage({ id: 'usage.granularity.week' }),
      value: 'week'
    },
    {
      label: intl.formatMessage({ id: 'usage.granularity.month' }),
      value: 'month'
    }
  ];
  const summaryOptions: { label: string; value: SummaryKey }[] = [
    ...metricOptions,
    {
      label: intl.formatMessage({ id: 'usage.summary.modelsCalled' }),
      value: 'modelsUsed'
    }
  ];

  const baseColumns: TableColumnsType<AggregatedRow> = [
    {
      title:
        activeView === 'models'
          ? intl.formatMessage({ id: 'usage.table.model' })
          : activeView === 'users'
            ? intl.formatMessage({ id: 'usage.table.user' })
            : intl.formatMessage({ id: 'usage.table.apiKey' }),
      dataIndex: 'label',
      key: 'label',
      width: activeView === 'models' ? 220 : 200,
      sorter: (left, right) => left.label.localeCompare(right.label),
      render: (_, row) => (
        <NameCell>
          <span className="title">{row.label}</span>
          {activeView === 'apikeys' ? (
            <span className="sub">{row.userLabel}</span>
          ) : null}
        </NameCell>
      )
    }
  ];

  const viewColumns: Record<ViewKey, TableColumnsType<AggregatedRow>> = {
    models: [
      ...baseColumns,
      {
        title: intl.formatMessage({ id: 'usage.table.provider' }),
        dataIndex: 'provider',
        key: 'provider',
        width: 120,
        sorter: (left, right) =>
          (left.provider || '').localeCompare(right.provider || '')
      },
      {
        title: intl.formatMessage({ id: 'usage.table.cluster' }),
        dataIndex: 'cluster',
        key: 'cluster',
        width: 120,
        sorter: (left, right) =>
          (left.cluster || '').localeCompare(right.cluster || '')
      }
    ],
    users: [
      ...baseColumns,
      {
        title: intl.formatMessage({ id: 'usage.table.modelsUsed' }),
        dataIndex: 'modelsUsed',
        key: 'modelsUsed',
        width: 110,
        sorter: (left, right) => left.modelsUsed - right.modelsUsed
      },
      {
        title: intl.formatMessage({ id: 'usage.table.apiKeysUsed' }),
        dataIndex: 'apiKeysUsed',
        key: 'apiKeysUsed',
        width: 120,
        sorter: (left, right) => left.apiKeysUsed - right.apiKeysUsed
      }
    ],
    apikeys: [
      ...baseColumns,
      {
        title: intl.formatMessage({ id: 'usage.table.user' }),
        dataIndex: 'userLabel',
        key: 'userLabel',
        width: 150,
        sorter: (left, right) =>
          (left.userLabel || '').localeCompare(right.userLabel || '')
      },
      {
        title: intl.formatMessage({ id: 'usage.table.modelsUsed' }),
        dataIndex: 'modelsUsed',
        key: 'modelsUsed',
        width: 110,
        sorter: (left, right) => left.modelsUsed - right.modelsUsed
      }
    ]
  };

  const metricColumns: TableColumnsType<AggregatedRow> = [
    {
      title: intl.formatMessage({ id: 'usage.metric.inputTokens' }),
      key: 'input',
      width: 130,
      sorter: (left, right) =>
        sumRange(left.inputValues, rangeIndexes.start, rangeIndexes.end) -
        sumRange(right.inputValues, rangeIndexes.start, rangeIndexes.end),
      render: (_, row) =>
        formatValue(
          sumRange(row.inputValues, rangeIndexes.start, rangeIndexes.end)
        )
    },
    {
      title: intl.formatMessage({ id: 'usage.metric.outputTokens' }),
      key: 'output',
      width: 130,
      sorter: (left, right) =>
        sumRange(left.outputValues, rangeIndexes.start, rangeIndexes.end) -
        sumRange(right.outputValues, rangeIndexes.start, rangeIndexes.end),
      render: (_, row) =>
        formatValue(
          sumRange(row.outputValues, rangeIndexes.start, rangeIndexes.end)
        )
    },
    {
      title: intl.formatMessage({ id: 'usage.metric.totalTokens' }),
      key: 'total',
      width: 130,
      defaultSortOrder: 'descend',
      sorter: (left, right) =>
        sumRange(left.totalValues, rangeIndexes.start, rangeIndexes.end) -
        sumRange(right.totalValues, rangeIndexes.start, rangeIndexes.end),
      render: (_, row) =>
        formatValue(
          sumRange(row.totalValues, rangeIndexes.start, rangeIndexes.end)
        )
    },
    {
      title: intl.formatMessage({ id: 'usage.metric.requests' }),
      key: 'requests',
      width: 120,
      sorter: (left, right) =>
        sumRange(left.requestValues, rangeIndexes.start, rangeIndexes.end) -
        sumRange(right.requestValues, rangeIndexes.start, rangeIndexes.end),
      render: (_, row) =>
        formatValue(
          sumRange(row.requestValues, rangeIndexes.start, rangeIndexes.end)
        )
    },
    {
      title: intl.formatMessage({ id: 'usage.table.lastActive' }),
      dataIndex: 'lastActive',
      key: 'lastActive',
      width: 120,
      sorter: (left, right) =>
        dayjs(left.lastActive).valueOf() - dayjs(right.lastActive).valueOf(),
      render: (value) => dayjs(value).format('MM-DD')
    }
  ];

  const columns = [...viewColumns[activeView], ...metricColumns];

  const handleScopeChange = (value: string | number) => {
    const nextScope = value as ScopeKey;
    setScope(nextScope);
    if (nextScope === 'self') {
      if (activeView === 'users') {
        setActiveView('models');
      }
      if (groupBy === 'users') {
        setGroupBy('none');
      }
      setSelectedUsers([]);
    }
  };

  const handleExportSummary = () => {
    const rows = summaryOptions.map((item) => [
      item.label,
      summaryValues[item.value]
    ]);
    downloadCsv(
      `usage-summary-${dayjs().format('YYYYMMDD-HHmmss')}.csv`,
      [
        intl.formatMessage({ id: 'usage.chart.metric' }),
        intl.formatMessage({ id: 'usage.summary.selectedRange' })
      ],
      rows
    );
  };

  const handleExportTrend = () => {
    const dateHeaders = selectedChartBuckets.map((bucket) => bucket.date);
    const rows = chartSeries.map((series) => [
      series.label,
      ...selectedChartBuckets.map(
        (bucket) =>
          bucket.values.find((item) => item.key === series.key)?.value || 0
      )
    ]);
    downloadCsv(
      `usage-trend-${dayjs().format('YYYYMMDD-HHmmss')}.csv`,
      [intl.formatMessage({ id: 'usage.table.model' }), ...dateHeaders],
      rows
    );
  };

  const handleExportTable = () => {
    const headers =
      activeView === 'models'
        ? [
            intl.formatMessage({ id: 'usage.table.model' }),
            intl.formatMessage({ id: 'usage.table.provider' }),
            intl.formatMessage({ id: 'usage.table.cluster' })
          ]
        : activeView === 'users'
          ? [
              intl.formatMessage({ id: 'usage.table.user' }),
              intl.formatMessage({ id: 'usage.table.modelsUsed' }),
              intl.formatMessage({ id: 'usage.table.apiKeysUsed' })
            ]
          : [
              intl.formatMessage({ id: 'usage.table.apiKey' }),
              intl.formatMessage({ id: 'usage.table.user' }),
              intl.formatMessage({ id: 'usage.table.modelsUsed' })
            ];

    const metricHeaders = [
      intl.formatMessage({ id: 'usage.metric.inputTokens' }),
      intl.formatMessage({ id: 'usage.metric.outputTokens' }),
      intl.formatMessage({ id: 'usage.metric.totalTokens' }),
      intl.formatMessage({ id: 'usage.metric.requests' }),
      intl.formatMessage({ id: 'usage.table.lastActive' })
    ];

    const rows = viewRows.map((row) => {
      const head =
        activeView === 'models'
          ? [row.label, row.provider || '-', row.cluster || '-']
          : activeView === 'users'
            ? [row.label, row.modelsUsed, row.apiKeysUsed]
            : [row.label, row.userLabel || '-', row.modelsUsed];
      return [
        ...head,
        sumRange(row.inputValues, rangeIndexes.start, rangeIndexes.end),
        sumRange(row.outputValues, rangeIndexes.start, rangeIndexes.end),
        sumRange(row.totalValues, rangeIndexes.start, rangeIndexes.end),
        sumRange(row.requestValues, rangeIndexes.start, rangeIndexes.end),
        row.lastActive
      ];
    });

    downloadCsv(
      `usage-table-${activeView}-${dayjs().format('YYYYMMDD-HHmmss')}.csv`,
      [...headers, ...metricHeaders],
      rows
    );
  };

  return (
    <PageContainerInner
      header={{
        title: intl.formatMessage({ id: 'usage.dailyTitle' })
      }}
      extra={[
        <Toolbar key="usage-controls">
          {isAdmin ? (
            <ScopeSwitch>
              <Segmented
                value={scope}
                onChange={handleScopeChange}
                options={[
                  {
                    label: intl.formatMessage({ id: 'usage.scope.self' }),
                    value: 'self'
                  },
                  {
                    label: intl.formatMessage({ id: 'usage.scope.all' }),
                    value: 'all'
                  }
                ]}
              />
            </ScopeSwitch>
          ) : null}
          <RangePicker
            value={dateRange}
            onChange={(value) => setDateRange(value as [Dayjs, Dayjs] | null)}
            size="middle"
            allowClear={false}
            format="MM/DD/YY"
            suffixIcon={<CalendarOutlined />}
            disabledDate={(current) =>
              current.isBefore(datePoints[0], 'day') ||
              current.isAfter(datePoints[datePoints.length - 1], 'day')
            }
          />
          <FilterGroup>
            <Select
              mode="multiple"
              value={selectedModels}
              onChange={(value) => setSelectedModels(value as string[])}
              className="filterSelect"
              maxTagCount="responsive"
              placeholder={intl.formatMessage({ id: 'usage.filter.model' })}
              options={modelOptions}
            />
            {isAdmin && scope === 'all' ? (
              <Select
                mode="multiple"
                value={selectedUsers}
                onChange={(value) => setSelectedUsers(value as string[])}
                className="filterSelect"
                maxTagCount="responsive"
                placeholder={intl.formatMessage({ id: 'usage.filter.user' })}
                options={userOptions}
              />
            ) : null}
            <Select
              mode="multiple"
              value={selectedApiKeys}
              onChange={(value) => setSelectedApiKeys(value as string[])}
              className="filterSelect"
              maxTagCount="responsive"
              placeholder={intl.formatMessage({ id: 'usage.filter.apiKey' })}
              options={apiKeyOptions}
            />
          </FilterGroup>
          <Tooltip title="Refresh">
            <Button icon={<ReloadOutlined />} />
          </Tooltip>
          <Popover
            trigger="click"
            placement="bottomRight"
            content={
              <ExportPanel>
                <Button type="text" size="small" onClick={handleExportSummary}>
                  {intl.formatMessage({ id: 'usage.export.summary' })}
                </Button>
                <Button type="text" size="small" onClick={handleExportTrend}>
                  {intl.formatMessage({ id: 'usage.export.trend' })}
                </Button>
                <Button type="text" size="small" onClick={handleExportTable}>
                  {intl.formatMessage({ id: 'usage.export.table' })}
                </Button>
              </ExportPanel>
            }
          >
            <Tooltip title={intl.formatMessage({ id: 'usage.export' })}>
              <Button icon={<DownloadOutlined />} />
            </Tooltip>
          </Popover>
        </Toolbar>
      ]}
    >
      <StyledPage>
        <OverviewCard>
          <OverviewHeader>
            <SummaryGrid>
              {summaryOptions.map((item) => {
                const value = summaryValues[item.value];
                return (
                  <SummaryCard key={item.value}>
                    <div className="label">{item.label}</div>
                    <div className="value">{formatValue(value)}</div>
                  </SummaryCard>
                );
              })}
            </SummaryGrid>
            <ChartControls>
              <div className="controlItem">
                <span className="controlLabel">
                  {intl.formatMessage({ id: 'usage.chart.metric' })}
                </span>
                <Select
                  value={metric}
                  onChange={(value) => setMetric(value as MetricKey)}
                  className="controlSelect"
                  options={metricOptions}
                />
              </div>
              <div className="controlItem">
                <span className="controlLabel">
                  {intl.formatMessage({ id: 'usage.groupBy' })}
                </span>
                <Select
                  value={groupBy}
                  onChange={(value) => setGroupBy(value as GroupKey)}
                  className="controlSelect"
                  options={availableGroupOptions}
                />
              </div>
              <div className="controlItem">
                <span className="controlLabel">
                  {intl.formatMessage({ id: 'usage.granularity' })}
                </span>
                <Select
                  value={granularity}
                  onChange={(value) => setGranularity(value as GranularityKey)}
                  className="controlSelect"
                  options={granularityOptions}
                />
              </div>
            </ChartControls>
          </OverviewHeader>
          <OverviewBody>
            {chartSeries.length ? (
              <>
                <BigChart>
                  <span className="guide" />
                  {selectedChartValues.map((dayValues, index) => {
                    const dayTotal = dayValues.reduce(
                      (sum, item) => sum + item.value,
                      0
                    );
                    const ratio = maxChartValue ? dayTotal / maxChartValue : 0;
                    const stackHeight = Math.max(4, ratio * 100);
                    return (
                      <div className="barCol" key={`${index}-${dayTotal}`}>
                        <div className="barTrack">
                          <div
                            className="barStack"
                            style={{ height: `${stackHeight}%` }}
                          >
                            {dayValues.map((item) => {
                              const segmentRatio = dayTotal
                                ? item.value / dayTotal
                                : 0;
                              return (
                                <div
                                  key={`${index}-${item.key}`}
                                  className="barSegment"
                                  style={{
                                    height: `${Math.max(2, segmentRatio * 100)}%`,
                                    backgroundColor: item.color,
                                    opacity: item.value ? 1 : 0.25
                                  }}
                                />
                              );
                            })}
                          </div>
                        </div>
                        {index === 0 ||
                        index === selectedChartValues.length - 1 ? (
                          <div className="barLabel">
                            {index === 0 ? rangeStartLabel : rangeEndLabel}
                          </div>
                        ) : (
                          <div className="barLabel" />
                        )}
                      </div>
                    );
                  })}
                </BigChart>
                <LegendRow>
                  {chartSeries.map((series) => (
                    <div className="legendItem" key={series.key}>
                      <span
                        className="legendDot"
                        style={{ backgroundColor: series.color }}
                      />
                      <span>{series.label}</span>
                    </div>
                  ))}
                </LegendRow>
              </>
            ) : (
              <Empty description={intl.formatMessage({ id: 'usage.empty' })} />
            )}
          </OverviewBody>
        </OverviewCard>

        <TableCard>
          <Tabs
            activeKey={activeView}
            onChange={(value) => setActiveView(value as ViewKey)}
            items={availableViews.map((item) => ({ ...item, children: null }))}
          />
          <Table<AggregatedRow>
            rowKey="key"
            columns={columns}
            dataSource={viewRows}
            scroll={{ x: 1200 }}
            sortDirections={TABLE_SORT_DIRECTIONS}
            showSorterTooltip={false}
            locale={{
              emptyText: (
                <Empty
                  description={intl.formatMessage({ id: 'usage.empty' })}
                />
              )
            }}
            pagination={{ pageSize: 8, showSizeChanger: false }}
          />
        </TableCard>
      </StyledPage>
    </PageContainerInner>
  );
};

export default UsagePage;
