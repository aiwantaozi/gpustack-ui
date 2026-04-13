import CardWrapper from '@/components/card-wrapper';
import { PageContainerInner } from '@/pages/_components/page-box';
import { baseColorMap } from '@/pages/dashboard/config';
import { CalendarOutlined, ReloadOutlined } from '@ant-design/icons';
import { useIntl, useModel } from '@umijs/max';
import { Button, DatePicker, Segmented, Select, Tabs, Tooltip } from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import React, { useMemo, useState } from 'react';
import styled from 'styled-components';

type MetricKey = 'input' | 'output' | 'total' | 'requests';
type TabKey = 'models' | 'users' | 'projects' | 'apikeys';
type GroupKey = 'models' | 'users' | 'projects' | 'apikeys';
type ScopeKey = 'all' | 'self';

interface UsageEntity {
  key: string;
  name: string;
  values: number[];
}

interface UsageDataset {
  key: TabKey;
  entities: UsageEntity[];
}

interface SummaryMetric {
  key: MetricKey;
  label: string;
  allTimeTotal: number;
  selectedTotal: number;
}

interface ChartSeries {
  key: string;
  label: string;
  color: string;
  values: number[];
}

interface EntityRelation {
  modelKeys: string[];
  userKeys: string[];
  apiKeyKeys: string[];
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

const StyledPage = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;

  .ant-tabs-nav {
    margin-bottom: 0;
  }
`;

const OverviewCard = styled(CardWrapper)`
  padding: 0;
  overflow: hidden;
`;

const OverviewHeader = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 20px;
  border-bottom: 1px solid var(--ant-color-border-secondary);

  @media (max-width: 1180px) {
    flex-direction: column;
    align-items: stretch;
  }
`;

const Toolbar = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
`;

const ScopeSwitch = styled.div`
  .ant-segmented {
    background: var(--ant-color-bg-container);
    border: 1px solid var(--ant-color-border);
  }
`;

const MetricPanel = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 320px;
  padding: 8px 12px;
  border-radius: 12px;
  border: 1px solid var(--ant-color-border);
  background: var(--ant-color-bg-container);

  .metricLabel {
    flex: none;
    font-size: 13px;
    font-weight: 600;
    color: var(--ant-color-text-secondary);
  }

  .metricSelect {
    min-width: 260px;
    flex: 1;
  }
`;

const SummaryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
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

  .subValue {
    margin-top: 8px;
    font-size: 13px;
    color: var(--ant-color-text-tertiary);
  }
`;

const ControlRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  flex-wrap: wrap;

  .controlLabel {
    font-size: 13px;
    color: var(--ant-color-text-secondary);
  }

  .controlSelect {
    width: 180px;
  }

  @media (max-width: 1180px) {
    justify-content: flex-start;
  }
`;

const OverviewBody = styled.div`
  padding: 18px 20px 16px;
`;

const BigChart = styled.div`
  display: flex;
  align-items: flex-end;
  gap: 10px;
  height: 280px;
  padding: 24px 0 12px;
  position: relative;
  overflow: hidden;

  .guide {
    position: absolute;
    left: 0;
    right: 0;
    top: 44px;
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
    width: min(52px, 100%);
    display: flex;
    flex-direction: column-reverse;
    overflow: hidden;
    border-radius: 12px 12px 2px 2px;
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

const DetailTabs = styled(CardWrapper)`
  padding: 0;
  overflow: hidden;

  .ant-tabs-nav {
    margin-bottom: 0;
    padding-inline: 12px;
  }

  .ant-tabs-content-holder {
    display: none;
  }
`;

const CardsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;

  @media (max-width: 1200px) {
    grid-template-columns: 1fr;
  }
`;

const DetailCard = styled(CardWrapper)`
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 236px;

  .title {
    font-size: 22px;
    font-weight: 600;
    color: var(--ant-color-text);
  }

  .meta {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    color: var(--ant-color-text-secondary);
  }

  .dot {
    width: 9px;
    height: 9px;
    border-radius: 2px;
    background: linear-gradient(
      180deg,
      rgba(85, 167, 255, 0.92) 0%,
      rgba(0, 85, 255, 0.82) 100%
    );
    flex: none;
  }

  .peak {
    font-size: 13px;
    color: var(--ant-color-text-tertiary);
  }
`;

const MiniChart = styled.div`
  position: relative;
  display: flex;
  align-items: flex-end;
  gap: 8px;
  height: 140px;
  padding-top: 28px;

  .guide {
    position: absolute;
    left: 0;
    right: 0;
    top: 44px;
    border-top: 1px dashed var(--ant-color-border);
  }

  .miniBarWrap {
    flex: 1;
    min-width: 0;
    height: 100%;
    display: flex;
    align-items: flex-end;
  }

  .miniBar {
    width: 100%;
    border-radius: 10px 10px 2px 2px;
    background: linear-gradient(
      180deg,
      rgba(85, 167, 255, 0.88) 0%,
      rgba(0, 85, 255, 0.72) 100%
    );
  }
`;

const CardFooter = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: var(--ant-color-text-tertiary);
`;

const mockDateRange: [Dayjs, Dayjs] = [datePoints[0], datePoints[datePoints.length - 1]];

const tabDatasets: UsageDataset[] = [
  {
    key: 'models',
    entities: [
      {
        key: 'qwen3.5-9b',
        name: 'Qwen3.5-9B',
        values: [16, 18, 14, 17, 15, 18, 20, 18, 22, 402, 17, 15, 18, 16, 14, 18]
      },
      {
        key: 'qwen3.5-27b',
        name: 'Qwen3.5-27B',
        values: [120, 32, 18, 34, 2, 48, 20, 50, 70, 1, 0, 0, 18, 0, 0, 0]
      },
      {
        key: 'minimax-m1-8b',
        name: 'MiniMax-M1-8B',
        values: [2, 2, 118, 0, 2, 0, 0, 0, 32, 0, 0, 0, 10, 0, 0, 0]
      },
      {
        key: 'deepseek-v3.2',
        name: 'DeepSeek-V3.2',
        values: [0, 94, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
      },
      {
        key: 'glm-4.6',
        name: 'GLM-4.6',
        values: [132, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
      },
      {
        key: 'llama-3.3-70b',
        name: 'Llama-3.3-70B',
        values: [8, 0, 0, 0, 0, 0, 0, 0, 0, 0, 146, 0, 0, 0, 0, 0]
      },
      {
        key: 'yi-lightning',
        name: 'Yi-Lightning',
        values: [0, 128, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
      },
      {
        key: 'mistral-small-3.1',
        name: 'Mistral-Small-3.1',
        values: [2, 2, 112, 40, 6, 8, 14, 16, 50, 0, 0, 0, 0, 0, 8, 14]
      }
    ]
  },
  {
    key: 'users',
    entities: [
      {
        key: 'dev-michelia',
        name: 'dev-michelia',
        values: [10, 8, 7, 10, 8, 7, 8, 6, 10, 560, 7, 6, 7, 8, 9, 12]
      },
      {
        key: 'dev-wangyimi',
        name: 'dev-wangyimi',
        values: [28, 12, 6, 52, 15, 10, 6, 12, 14, 9, 0, 0, 4, 110, 3, 4]
      },
      {
        key: 'dev-frank',
        name: 'dev-frank',
        values: [16, 48, 0, 18, 0, 0, 34, 14, 16, 70, 0, 10, 0, 0, 20, 108]
      },
      {
        key: 'test-xunfeng',
        name: 'test-xunfeng',
        values: [0, 46, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
      }
    ]
  },
  {
    key: 'projects',
    entities: [
      {
        key: 'chat-completion',
        name: 'CHAT_COMPLETION',
        values: [18, 20, 16, 18, 16, 18, 18, 20, 22, 540, 18, 12, 14, 16, 14, 18]
      },
      {
        key: 'completion',
        name: 'COMPLETION',
        values: [48, 18, 10, 62, 18, 12, 10, 16, 18, 12, 0, 0, 10, 134, 8, 8]
      },
      {
        key: 'embedding',
        name: 'EMBEDDING',
        values: [6, 88, 0, 10, 0, 0, 18, 6, 6, 42, 0, 4, 0, 0, 12, 74]
      },
      {
        key: 'rerank',
        name: 'RERANK',
        values: [0, 26, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
      },
      {
        key: 'image-generation',
        name: 'IMAGE_GENERATION',
        values: [0, 0, 8, 0, 0, 12, 0, 0, 6, 28, 0, 4, 0, 0, 10, 18]
      },
      {
        key: 'audio-transcription',
        name: 'AUDIO_TRANSCRIPTION',
        values: [4, 0, 0, 6, 0, 0, 8, 0, 4, 14, 0, 0, 0, 10, 0, 0]
      },
      {
        key: 'audio-speech',
        name: 'AUDIO_SPEECH',
        values: [0, 2, 0, 0, 4, 0, 0, 6, 0, 18, 0, 0, 2, 0, 0, 12]
      }
    ]
  },
  {
    key: 'apikeys',
    entities: [
      {
        key: 'key-1',
        name: 'key_d8q99khrxxwnz7IT',
        values: [16, 48, 0, 18, 0, 0, 34, 14, 16, 70, 0, 10, 0, 0, 20, 108]
      },
      {
        key: 'key-2',
        name: 'key_roB5bVsiUyx66o5I',
        values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 124]
      },
      {
        key: 'key-3',
        name: 'key_dev_michelia',
        values: [10, 8, 7, 10, 8, 7, 8, 6, 10, 560, 7, 6, 7, 8, 9, 12]
      },
      {
        key: 'key-4',
        name: 'key_dev_wangyimi',
        values: [28, 12, 6, 52, 15, 10, 6, 12, 14, 9, 0, 0, 4, 110, 3, 4]
      }
    ]
  }
];

const entityRelations: Record<string, EntityRelation> = {
  'qwen3.5-9b': {
    modelKeys: ['qwen3.5-9b'],
    userKeys: ['dev-michelia', 'dev-frank'],
    apiKeyKeys: ['key-1', 'key-3']
  },
  'qwen3.5-27b': {
    modelKeys: ['qwen3.5-27b'],
    userKeys: ['dev-wangyimi'],
    apiKeyKeys: ['key-4']
  },
  'minimax-m1-8b': {
    modelKeys: ['minimax-m1-8b'],
    userKeys: ['dev-michelia', 'test-xunfeng'],
    apiKeyKeys: ['key-3']
  },
  'deepseek-v3.2': {
    modelKeys: ['deepseek-v3.2'],
    userKeys: ['dev-frank'],
    apiKeyKeys: ['key-1']
  },
  'glm-4.6': {
    modelKeys: ['glm-4.6'],
    userKeys: ['test-xunfeng'],
    apiKeyKeys: ['key-2']
  },
  'llama-3.3-70b': {
    modelKeys: ['llama-3.3-70b'],
    userKeys: ['dev-wangyimi'],
    apiKeyKeys: ['key-4']
  },
  'yi-lightning': {
    modelKeys: ['yi-lightning'],
    userKeys: ['dev-frank'],
    apiKeyKeys: ['key-1']
  },
  'mistral-small-3.1': {
    modelKeys: ['mistral-small-3.1'],
    userKeys: ['dev-michelia', 'dev-wangyimi'],
    apiKeyKeys: ['key-3', 'key-4']
  },
  'dev-michelia': {
    modelKeys: ['qwen3.5-9b', 'minimax-m1-8b', 'mistral-small-3.1'],
    userKeys: ['dev-michelia'],
    apiKeyKeys: ['key-3']
  },
  'dev-wangyimi': {
    modelKeys: ['qwen3.5-27b', 'llama-3.3-70b', 'mistral-small-3.1'],
    userKeys: ['dev-wangyimi'],
    apiKeyKeys: ['key-4']
  },
  'dev-frank': {
    modelKeys: ['qwen3.5-9b', 'deepseek-v3.2', 'yi-lightning'],
    userKeys: ['dev-frank'],
    apiKeyKeys: ['key-1']
  },
  'test-xunfeng': {
    modelKeys: ['glm-4.6', 'minimax-m1-8b'],
    userKeys: ['test-xunfeng'],
    apiKeyKeys: ['key-2']
  },
  'chat-completion': {
    modelKeys: ['qwen3.5-9b', 'qwen3.5-27b', 'yi-lightning'],
    userKeys: ['dev-michelia', 'dev-wangyimi'],
    apiKeyKeys: ['key-1', 'key-3']
  },
  completion: {
    modelKeys: ['glm-4.6', 'deepseek-v3.2'],
    userKeys: ['dev-frank', 'test-xunfeng'],
    apiKeyKeys: ['key-1', 'key-2']
  },
  embedding: {
    modelKeys: ['minimax-m1-8b', 'mistral-small-3.1'],
    userKeys: ['dev-michelia'],
    apiKeyKeys: ['key-3']
  },
  rerank: {
    modelKeys: ['qwen3.5-27b'],
    userKeys: ['dev-wangyimi'],
    apiKeyKeys: ['key-4']
  },
  'image-generation': {
    modelKeys: ['llama-3.3-70b'],
    userKeys: ['dev-wangyimi'],
    apiKeyKeys: ['key-4']
  },
  'audio-transcription': {
    modelKeys: ['minimax-m1-8b'],
    userKeys: ['dev-frank'],
    apiKeyKeys: ['key-1']
  },
  'audio-speech': {
    modelKeys: ['mistral-small-3.1'],
    userKeys: ['dev-michelia'],
    apiKeyKeys: ['key-3']
  },
  'key-1': {
    modelKeys: ['qwen3.5-9b', 'deepseek-v3.2', 'yi-lightning'],
    userKeys: ['dev-frank'],
    apiKeyKeys: ['key-1']
  },
  'key-2': {
    modelKeys: ['glm-4.6'],
    userKeys: ['test-xunfeng'],
    apiKeyKeys: ['key-2']
  },
  'key-3': {
    modelKeys: ['qwen3.5-9b', 'minimax-m1-8b', 'mistral-small-3.1'],
    userKeys: ['dev-michelia'],
    apiKeyKeys: ['key-3']
  },
  'key-4': {
    modelKeys: ['qwen3.5-27b', 'llama-3.3-70b', 'mistral-small-3.1'],
    userKeys: ['dev-wangyimi'],
    apiKeyKeys: ['key-4']
  }
};

const metricMultipliers: Record<MetricKey, number> = {
  input: 1,
  output: 0.42,
  total: 1.42,
  requests: 0.08
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

const formatOperationLabel = (value: string) => {
  if (!value.includes('_')) {
    return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
  }
  return value
    .split('_')
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(' ');
};

const getMetricValues = (values: number[], metric: MetricKey) => {
  return values.map((value, index) => {
    if (metric === 'output') {
      return Math.round(value * metricMultipliers.output + (index % 3));
    }
    if (metric === 'requests') {
      return Math.max(1, Math.round(value * metricMultipliers.requests));
    }
    if (metric === 'total') {
      const outputValue = Math.round(value * metricMultipliers.output + (index % 3));
      return value + outputValue;
    }
    return value;
  });
};

const getRangeIndexes = (range: [Dayjs, Dayjs] | null) => {
  if (!range) {
    return { start: 0, end: datePoints.length - 1 };
  }
  const [startDate, endDate] = range;
  const start = datePoints.findIndex((date) =>
    date.isSame(startDate.startOf('day'), 'day')
  );
  const end = datePoints.findIndex((date) => date.isSame(endDate.startOf('day'), 'day'));
  return {
    start: start >= 0 ? start : 0,
    end: end >= 0 ? end : datePoints.length - 1
  };
};

const sumRange = (values: number[], start: number, end: number) => {
  return values.slice(start, end + 1).reduce((sum, value) => sum + value, 0);
};

const includesAny = (source: string[], selected: string[]) => {
  if (!selected.length) {
    return true;
  }
  return selected.some((item) => source.includes(item));
};

const UsagePage: React.FC = () => {
  const intl = useIntl();
  const initialInfo = useModel('@@initialState') || { initialState: undefined };
  const isAdmin = Boolean(initialInfo.initialState?.currentUser?.is_admin);
  const currentUsername = initialInfo.initialState?.currentUser?.username;
  const [selectedMetrics, setSelectedMetrics] = useState<MetricKey[]>(['input']);
  const [activeTab, setActiveTab] = useState<TabKey>('models');
  const [groupBy, setGroupBy] = useState<GroupKey>('apikeys');
  const [scope, setScope] = useState<ScopeKey>('self');
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>(mockDateRange);
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [selectedApiKeys, setSelectedApiKeys] = useState<string[]>([]);

  const rangeIndexes = useMemo(() => getRangeIndexes(dateRange), [dateRange]);

  const activeMetrics = selectedMetrics.length ? selectedMetrics : ['input'];
  const primaryMetric = activeMetrics[0];

  const detailDataset = useMemo(() => {
    return tabDatasets.find((item) => item.key === activeTab) || tabDatasets[0];
  }, [activeTab]);

  const groupedDataset = useMemo(() => {
    return tabDatasets.find((item) => item.key === groupBy) || tabDatasets[0];
  }, [groupBy]);

  const availableUsers =
    tabDatasets.find((item) => item.key === 'users')?.entities || [];
  const currentUserKey = useMemo(() => {
    const matchedUser = availableUsers.find((item) => item.name === currentUsername);
    return matchedUser?.key || availableUsers[0]?.key || '';
  }, [availableUsers, currentUsername]);

  const effectiveSelectedUsers = useMemo(() => {
    if (scope === 'self' && currentUserKey) {
      return [currentUserKey];
    }
    return selectedUsers;
  }, [currentUserKey, scope, selectedUsers]);

  const matchesSelections = (entity: UsageEntity) => {
    const relation = entityRelations[entity.key] || {
      modelKeys: [],
      userKeys: [],
      apiKeyKeys: []
    };
    return (
      includesAny(relation.modelKeys, selectedModels) &&
      includesAny(relation.userKeys, effectiveSelectedUsers) &&
      includesAny(relation.apiKeyKeys, selectedApiKeys)
    );
  };

  const filteredGroupEntities = useMemo(() => {
    return groupedDataset.entities.filter(matchesSelections);
  }, [effectiveSelectedUsers, groupedDataset.entities, selectedApiKeys, selectedModels]);

  const filteredDetailEntities = useMemo(() => {
    return detailDataset.entities.filter(matchesSelections);
  }, [detailDataset.entities, effectiveSelectedUsers, selectedApiKeys, selectedModels]);

  const metricOptions = [
    { label: intl.formatMessage({ id: 'usage.metric.inputTokens' }), value: 'input' },
    { label: intl.formatMessage({ id: 'usage.metric.outputTokens' }), value: 'output' },
    { label: intl.formatMessage({ id: 'usage.metric.totalTokens' }), value: 'total' },
    { label: intl.formatMessage({ id: 'usage.metric.requests' }), value: 'requests' }
  ];

  const summaryMetrics = useMemo<SummaryMetric[]>(() => {
    return activeMetrics.map((metricKey) => {
      const allTimeTotal = filteredGroupEntities.reduce((sum, entity) => {
        return sum + getMetricValues(entity.values, metricKey).reduce((inner, value) => inner + value, 0);
      }, 0);
      const selectedTotal = filteredGroupEntities.reduce((sum, entity) => {
        return (
          sum +
          sumRange(
            getMetricValues(entity.values, metricKey),
            rangeIndexes.start,
            rangeIndexes.end
          )
        );
      }, 0);

      return {
        key: metricKey,
        label:
          metricOptions.find((item) => item.value === metricKey)?.label?.toString() || '',
        allTimeTotal,
        selectedTotal
      };
    });
  }, [activeMetrics, filteredGroupEntities, metricOptions, rangeIndexes.end, rangeIndexes.start]);

  const chartSeries = useMemo<ChartSeries[]>(() => {
    return activeMetrics.map((metricKey, index) => {
      const values = datePoints.map((_, dateIndex) => {
        return filteredGroupEntities.reduce((sum, entity) => {
          const metricValues = getMetricValues(entity.values, metricKey);
          return sum + metricValues[dateIndex];
        }, 0);
      });

      return {
        key: metricKey,
        label: `${metricOptions.find((item) => item.value === metricKey)?.label} · ${
          intl.formatMessage({ id: `usage.group.${groupBy}` })
        }`,
        color: chartColors[index % chartColors.length],
        values
      };
    });
  }, [activeMetrics, filteredGroupEntities, groupBy, intl, metricOptions]);

  const selectedChartValues = useMemo(() => {
    return datePoints
      .slice(rangeIndexes.start, rangeIndexes.end + 1)
      .map((_, offsetIndex) =>
        chartSeries.map((series) => ({
          key: series.key,
          color: series.color,
          value: series.values[rangeIndexes.start + offsetIndex]
        }))
      );
  }, [chartSeries, rangeIndexes.end, rangeIndexes.start]);

  const maxChartValue = useMemo(() => {
    return Math.max(
      ...selectedChartValues.map((dayValues) =>
        dayValues.reduce((sum, series) => sum + series.value, 0)
      ),
      0
    );
  }, [selectedChartValues]);

  const detailCards = useMemo(() => {
    return filteredDetailEntities.map((entity) => {
      const metricValues = getMetricValues(entity.values, primaryMetric);
      const displayName =
        activeTab === 'projects' ? formatOperationLabel(entity.name) : entity.name;
      return {
        ...entity,
        displayName,
        metricValues,
        total: metricValues.reduce((sum, value) => sum + value, 0),
        selectedTotal: sumRange(metricValues, rangeIndexes.start, rangeIndexes.end),
        peak: Math.max(...metricValues, 0)
      };
    });
  }, [activeTab, filteredDetailEntities, primaryMetric, rangeIndexes.end, rangeIndexes.start]);

  const tabItems = [
    { key: 'models', label: intl.formatMessage({ id: 'usage.tab.models' }) },
    { key: 'projects', label: intl.formatMessage({ id: 'usage.tab.projects' }) },
    { key: 'apikeys', label: intl.formatMessage({ id: 'usage.tab.apikeys' }) }
  ];
  if (isAdmin && scope === 'all') {
    tabItems.splice(1, 0, {
      key: 'users',
      label: intl.formatMessage({ id: 'usage.tab.users' })
    });
  }

  const groupOptions = [
    { label: intl.formatMessage({ id: 'usage.group.models' }), value: 'models' },
    { label: intl.formatMessage({ id: 'usage.group.projects' }), value: 'projects' },
    { label: intl.formatMessage({ id: 'usage.group.apikeys' }), value: 'apikeys' }
  ];
  if (isAdmin && scope === 'all') {
    groupOptions.splice(1, 0, {
      label: intl.formatMessage({ id: 'usage.group.users' }),
      value: 'users'
    });
  }

  const modelFilterOptions = useMemo(() => {
    return (tabDatasets.find((item) => item.key === 'models')?.entities || []).map((entity) => ({
      label: entity.name,
      value: entity.key
    }));
  }, []);

  const userFilterOptions = useMemo(() => {
    return (tabDatasets.find((item) => item.key === 'users')?.entities || []).map((entity) => ({
      label: entity.name,
      value: entity.key
    }));
  }, []);

  const apiKeyFilterOptions = useMemo(() => {
    return (tabDatasets.find((item) => item.key === 'apikeys')?.entities || []).map((entity) => ({
      label: entity.name,
      value: entity.key
    }));
  }, []);

  const rangeStartLabel = datePoints[rangeIndexes.start].format('MMM DD');
  const rangeEndLabel = datePoints[rangeIndexes.end].format('MMM DD');

  const handleScopeChange = (value: string | number) => {
    const nextScope = value as ScopeKey;
    setScope(nextScope);
    if (nextScope === 'self') {
      if (groupBy === 'users') {
        setGroupBy('apikeys');
      }
      if (activeTab === 'users') {
        setActiveTab('models');
      }
      setSelectedUsers([]);
    }
  };

  return (
    <PageContainerInner
      header={{
        title: intl.formatMessage({ id: 'usage.dailyTitle' })
      }}
      extra={[
        <Toolbar key="usage-controls">
          <MetricPanel>
            <span className="metricLabel">
              {intl.formatMessage({ id: 'usage.metric.select' })}
            </span>
            <Select
              mode="multiple"
              value={activeMetrics}
              onChange={(value) =>
                setSelectedMetrics(
                  (value as MetricKey[]).length ? (value as MetricKey[]) : ['input']
                )
              }
              className="metricSelect"
              maxTagCount="responsive"
              placeholder={intl.formatMessage({ id: 'usage.metric.select' })}
              options={metricOptions}
            />
          </MetricPanel>
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
          {isAdmin && (
            <ScopeSwitch>
              <Segmented
                value={scope}
                onChange={handleScopeChange}
                options={[
                  {
                    label: intl.formatMessage({ id: 'usage.scope.all' }),
                    value: 'all'
                  },
                  {
                    label: intl.formatMessage({ id: 'usage.scope.self' }),
                    value: 'self'
                  }
                ]}
              />
            </ScopeSwitch>
          )}
          <Tooltip title="Refresh">
            <Button icon={<ReloadOutlined />} />
          </Tooltip>
        </Toolbar>
      ]}
    >
      <StyledPage>
        <OverviewCard>
          <OverviewHeader>
            <div style={{ flex: 1 }}>
              <SummaryGrid>
                {summaryMetrics.map((metric) => (
                  <SummaryCard key={metric.key}>
                    <div className="label">
                      {intl.formatMessage(
                        { id: 'usage.summary.totalMetric' },
                        { metric: metric.label }
                      )}
                    </div>
                    <div className="value">{formatValue(metric.allTimeTotal)}</div>
                    <div className="subValue">
                      {intl.formatMessage({ id: 'usage.summary.selectedRange' })}:{' '}
                      {formatValue(metric.selectedTotal)}
                    </div>
                  </SummaryCard>
                ))}
              </SummaryGrid>
            </div>
            <ControlRow>
              <span className="controlLabel">
                {intl.formatMessage({ id: 'usage.filterBy' })}
              </span>
              <Select
                mode="multiple"
                value={selectedApiKeys}
                onChange={(value) => setSelectedApiKeys(value as string[])}
                className="controlSelect"
                maxTagCount="responsive"
                placeholder={intl.formatMessage({ id: 'usage.filter.apiKey' })}
                options={apiKeyFilterOptions}
              />
              <Select
                mode="multiple"
                value={selectedModels}
                onChange={(value) => setSelectedModels(value as string[])}
                className="controlSelect"
                maxTagCount="responsive"
                placeholder={intl.formatMessage({ id: 'usage.filter.model' })}
                options={modelFilterOptions}
              />
              {isAdmin && scope === 'all' ? (
                <Select
                  mode="multiple"
                  value={selectedUsers}
                  onChange={(value) => setSelectedUsers(value as string[])}
                  className="controlSelect"
                  maxTagCount="responsive"
                  placeholder={intl.formatMessage({ id: 'usage.filter.user' })}
                  options={userFilterOptions}
                />
              ) : null}
              <span className="controlLabel">
                {intl.formatMessage({ id: 'usage.groupBy' })}
              </span>
              <Select
                value={groupBy}
                onChange={(value) => setGroupBy(value)}
                className="controlSelect"
                options={groupOptions}
              />
            </ControlRow>
          </OverviewHeader>
          <OverviewBody>
            <BigChart>
              <span className="guide" />
              {selectedChartValues.map((dayValues, index) => {
                const dayTotal = dayValues.reduce((sum, item) => sum + item.value, 0);
                const ratio = maxChartValue ? dayTotal / maxChartValue : 0;
                const stackHeight = Math.max(4, ratio * 100);
                return (
                  <div className="barCol" key={`${index}-${dayTotal}`}>
                    <div className="barTrack">
                      <div className="barStack" style={{ height: `${stackHeight}%` }}>
                        {dayValues.map((item) => {
                          const segmentRatio = dayTotal ? item.value / dayTotal : 0;
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
                    {index === 0 || index === selectedChartValues.length - 1 ? (
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
          </OverviewBody>
        </OverviewCard>

        <DetailTabs>
          <Tabs
            activeKey={activeTab}
            onChange={(value) => setActiveTab(value as TabKey)}
            items={tabItems.map((item) => ({ ...item, children: null }))}
          />
        </DetailTabs>

        <CardsGrid>
          {detailCards.map((card) => (
            <DetailCard key={card.key}>
              <div className="title">{card.displayName}</div>
              <div className="meta">
                <span className="dot" />
                <span>
                  {formatValue(card.total)}{' '}
                  {
                    metricOptions.find((item) => item.value === primaryMetric)
                      ?.label as React.ReactNode
                  }
                </span>
              </div>
              <div className="peak">
                {intl.formatMessage({ id: 'usage.summary.selectedRange' })}:{' '}
                {formatValue(card.selectedTotal)}
              </div>
              <MiniChart>
                <span className="guide" />
                {card.metricValues.map((value, index) => {
                  const ratio = card.peak ? value / card.peak : 0;
                  return (
                    <div className="miniBarWrap" key={`${card.key}-${index}`}>
                      <div
                        className="miniBar"
                        style={{
                          height: `${Math.max(3, ratio * 100)}%`,
                          opacity: value ? 1 : 0.18
                        }}
                      />
                    </div>
                  );
                })}
              </MiniChart>
              <CardFooter>
                <span>{rangeStartLabel}</span>
                <span>{rangeEndLabel}</span>
              </CardFooter>
            </DetailCard>
          ))}
        </CardsGrid>
      </StyledPage>
    </PageContainerInner>
  );
};

export default UsagePage;
