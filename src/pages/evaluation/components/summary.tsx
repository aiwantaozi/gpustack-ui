import { useIntl } from '@umijs/max';
import { Descriptions, Divider, Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import React, { useMemo } from 'react';
import styled from 'styled-components';
import BenchmarkConfig from '../../benchmark/components/summary/benchmark';
import BenchmarkInstance from '../../benchmark/components/summary/instance';
import Section from '../../benchmark/components/summary/section';
import { EvaluationDetailMeta, EvaluationResultRow } from '../config/types';
import '../styles.less';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

type SummaryProps = {
  meta: EvaluationDetailMeta;
  results: EvaluationResultRow[];
};

const Summary: React.FC<SummaryProps> = ({ meta, results }) => {
  const intl = useIntl();

  const categoryRowSpanMap = useMemo(() => {
    const counts = new Map<string, number>();
    results.forEach((item) => {
      counts.set(item.category, (counts.get(item.category) || 0) + 1);
    });
    return counts;
  }, [results]);

  const taskRowSpanMap = useMemo(() => {
    const counts = new Map<string, number>();
    results.forEach((item) => {
      const key = `${item.category}::${item.task || '__empty__'}::${item.subTask || '__empty__'}`;
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    return counts;
  }, [results]);

  const columns = useMemo<ColumnsType<EvaluationResultRow>>(
    () => [
      {
        title: intl.formatMessage({ id: 'evaluation.detail.table.category' }),
        dataIndex: 'category',
        key: 'category',
        width: 120,
        align: 'left',
        onCell: (_, index) => {
          const current = results[index || 0];
          const prev = results[(index || 0) - 1];
          if (prev?.category === current.category) {
            return { rowSpan: 0 };
          }
          return {
            rowSpan: categoryRowSpanMap.get(current.category) || 1,
            style: { verticalAlign: 'top', textAlign: 'left' }
          };
        }
      },
      {
        title: intl.formatMessage({ id: 'evaluation.detail.table.tasks' }),
        dataIndex: 'task',
        key: 'task',
        width: 180,
        align: 'left',
        onCell: (_, index) => {
          const current = results[index || 0];
          const prev = results[(index || 0) - 1];
          const currentKey = `${current.category}::${current.task || '__empty__'}::${current.subTask || '__empty__'}`;
          const prevKey = prev
            ? `${prev.category}::${prev.task || '__empty__'}::${prev.subTask || '__empty__'}`
            : '';
          if (prevKey === currentKey) {
            return { rowSpan: 0 };
          }
          return {
            rowSpan: taskRowSpanMap.get(currentKey) || 1,
            style: { verticalAlign: 'top', textAlign: 'left' }
          };
        }
      },
      {
        title: intl.formatMessage({ id: 'evaluation.detail.table.subTask' }),
        dataIndex: 'subTask',
        key: 'subTask',
        width: 150,
        align: 'left',
        render: (value: string) => value || '-'
      },
      {
        title: intl.formatMessage({ id: 'evaluation.detail.table.filter' }),
        dataIndex: 'filter',
        key: 'filter',
        width: 150,
        align: 'left',
        render: (value: string) => value || '-'
      },
      {
        title: intl.formatMessage({ id: 'evaluation.detail.table.nshot' }),
        dataIndex: 'nshot',
        key: 'nshot',
        width: 90,
        align: 'left',
        render: (value: number | null) => value ?? '-'
      },
      {
        title: intl.formatMessage({ id: 'evaluation.detail.table.metric' }),
        dataIndex: 'metric',
        key: 'metric',
        width: 130,
        align: 'left',
        render: (value: string) => value || '-'
      },
      {
        title: intl.formatMessage({ id: 'evaluation.detail.table.value' }),
        dataIndex: 'value',
        key: 'value',
        width: 110,
        align: 'left',
        render: (value: number | null) => (value === null ? '-' : value.toFixed(4))
      },
      {
        title: intl.formatMessage({ id: 'evaluation.detail.table.totalSample' }),
        dataIndex: 'totalSample',
        key: 'totalSample',
        width: 130,
        align: 'left',
        render: (value: number | null) => value ?? '-'
      },
      {
        title: intl.formatMessage({
          id: 'evaluation.detail.table.effectiveSample'
        }),
        dataIndex: 'effectiveSample',
        key: 'effectiveSample',
        width: 150,
        align: 'left',
        render: (value: number | null) => value ?? '-'
      }
    ],
    [categoryRowSpanMap, intl, results, taskRowSpanMap]
  );

  return (
    <Container>
      <Section
        title={intl.formatMessage({ id: 'benchmark.detail.summary.results' })}
        minHeight={420}
      >
        <Descriptions
          colon={false}
          column={3}
          items={[
            {
              key: 'start',
              label: intl.formatMessage({ id: 'evaluation.detail.startTime' }),
              children: meta.startTime
            },
            {
              key: 'end',
              label: intl.formatMessage({ id: 'evaluation.detail.endTime' }),
              children: meta.endTime
            },
            {
              key: 'duration',
              label: intl.formatMessage({ id: 'evaluation.detail.duration' }),
              children: meta.duration
            }
          ]}
        />
        <Divider />
        <Table
          rowKey="key"
          size="small"
          tableLayout="fixed"
          className="evaluation-results-table"
          pagination={false}
          columns={columns}
          dataSource={results}
          scroll={{ x: 1060 }}
          styles={{
            header: {
              row: {
                backgroundColor: 'transparent'
              },
              cell: {
                fontWeight: 400,
                height: 40,
                borderBottom: '1px solid var(--ant-color-split)'
              }
            },
            body: {
              cell: {
                height: 54
              }
            }
          }}
        />
      </Section>
      <Section title={intl.formatMessage({ id: 'benchmark.detail.configure' })}>
        <BenchmarkInstance />
        <Divider />
        <BenchmarkConfig />
      </Section>
    </Container>
  );
};

export default Summary;
