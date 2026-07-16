import { useIntl } from '@umijs/max';
import _, { round } from 'lodash';
import React from 'react';
import styled from 'styled-components';
import { loadAxisLabelId, loadValueDecimals } from '../../config';
import { useDetailContext } from '../../config/detail-context';
import { SectionTitle } from './ui';

// Grouped metric report: three small cards (Basic / Throughput / Latency), each
// a label→value list. Reads like a report, not a database dump.
const Box = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
  .group {
    border: 1px solid var(--ant-color-border-secondary);
    border-radius: var(--ant-border-radius);
    padding: 14px 16px;
  }
  .metric {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 12px;
    padding: 5px 0;
    font-size: 14px;
  }
  .metric .m-label {
    color: var(--ant-color-text-secondary);
  }
  .metric .m-value {
    font-weight: 600;
    white-space: nowrap;
  }
  .metric .m-value .unit {
    font-weight: 400;
    font-size: 12px;
    color: var(--ant-color-text-tertiary);
    margin-left: 3px;
  }
  .metric .m-value .sub {
    font-weight: 400;
    font-size: 12px;
  }
`;

interface MetricDef {
  title: string;
  path: string | string[];
  unit?: string;
  render: (value: any) => React.ReactNode;
}

const throughputColumns: MetricDef[] = [
  {
    title: 'benchmark.detail.throughput.totalToken',
    path: 'tokens_per_second_mean',
    unit: 'Tokens/s',
    render: (value: number) => round(value, 2)
  },
  {
    title: 'benchmark.detail.throughput.inputToken',
    path: 'input_tokens_per_second_mean',
    unit: 'Tokens/s',
    render: (value: number) => round(value, 2)
  },
  {
    title: 'benchmark.detail.throughput.outputToken',
    path: 'output_tokens_per_second_mean',
    unit: 'Tokens/s',
    render: (value: number) => round(value, 2)
  }
];

const latencyColumns: MetricDef[] = [
  {
    title: 'benchmark.detail.avg.reqLatency',
    path: 'request_latency_mean',
    unit: 'ms',
    render: (value: number) => round(value, 2)
  },
  {
    title: 'benchmark.detail.avg.ttft',
    path: 'time_to_first_token_mean',
    unit: 'ms',
    render: (value: number) => round(value, 2)
  },
  {
    title: 'benchmark.detail.avg.tpot',
    path: 'time_per_output_token_mean',
    unit: 'ms',
    render: (value: number) => round(value, 2)
  },
  {
    title: 'benchmark.detail.avg.itl',
    path: 'inter_token_latency_mean',
    unit: 'ms',
    render: (value: number) => round(value, 2)
  }
];

const MetricsResult: React.FC<{ data?: any }> = (props) => {
  const { detailData } = useDetailContext();
  const data = props.data ?? detailData;
  const intl = useIntl();
  const t = (id?: string) => (id ? intl.formatMessage({ id }) : '');

  const bench0 = ['raw_metrics', 'benchmarks', '0'];
  const reqTotal = (k: string) =>
    round(_.get(data, [...bench0, 'metrics', 'request_totals', k]), 0) || 0;
  const success = reqTotal('successful');
  const failed = reqTotal('errored');
  const incomplete = reqTotal('incomplete');
  // Actual number of requests made this run. Prefer the measured total from
  // request_totals; fall back to the configured `total_requests` (which is empty
  // for stages / auto-tune runs, so it must NOT be the denominator — that showed
  // "20/0"), then to the sum of the status buckets.
  const total =
    reqTotal('total') ||
    round(data?.total_requests ?? 0, 0) ||
    success + failed + incomplete;
  const concAvg =
    round(
      _.get(data, [
        ...bench0,
        'metrics',
        'request_concurrency',
        'successful',
        'mean'
      ]),
      0
    ) || 0;
  const duration = _.get(data, [...bench0, 'duration']);

  const row = (key: string, label: React.ReactNode, value: React.ReactNode) => (
    <div className="metric" key={key}>
      <span className="m-label">{label}</span>
      <span className="m-value">{value}</span>
    </div>
  );

  const basicRows: React.ReactNode[] = [];
  // The selected stage's load value lives here now (no separate header line).
  if (data?.rate != null) {
    basicRows.push(
      row(
        'rate',
        t(loadAxisLabelId(detailData)),
        round(data.rate, loadValueDecimals(detailData))
      )
    );
  }
  basicRows.push(
    row(
      'requests',
      t('benchmark.detail.summary.request'),
      <>
        {success}/{total}
        {failed > 0 && (
          <span className="sub" style={{ color: 'var(--ant-color-error)' }}>
            {' '}
            · {failed} {t('benchmark.detail.requests.failed')}
          </span>
        )}
        {incomplete > 0 && (
          <span className="sub" style={{ color: 'var(--ant-color-warning)' }}>
            {' '}
            · {incomplete} {t('benchmark.detail.requests.incomplete')}
          </span>
        )}
      </>
    )
  );
  basicRows.push(
    row('conc', t('benchmark.detail.requests.concurrency'), concAvg)
  );
  basicRows.push(
    row(
      'duration',
      t('benchmark.detail.result.duration'),
      duration ? (
        <>
          {round(duration, 2)}
          <span className="unit">s</span>
        </>
      ) : (
        0
      )
    )
  );

  const renderGroup = (titleId: string, cols: MetricDef[]) => (
    <div className="group">
      <SectionTitle>{t(titleId)}</SectionTitle>
      {cols.map((c) => (
        <div className="metric" key={c.title}>
          <span className="m-label">{t(c.title)}</span>
          <span className="m-value">
            {c.render(_.get(data, c.path) ?? 0)}
            {c.unit && <span className="unit">{c.unit}</span>}
          </span>
        </div>
      ))}
    </div>
  );

  return (
    <Box>
      <div className="group">
        <SectionTitle>{t('benchmark.detail.result.basic')}</SectionTitle>
        {basicRows}
      </div>
      {renderGroup('benchmark.detail.summary.throughput', throughputColumns)}
      {renderGroup('benchmark.detail.summary.latency', latencyColumns)}
    </Box>
  );
};

export default MetricsResult;
