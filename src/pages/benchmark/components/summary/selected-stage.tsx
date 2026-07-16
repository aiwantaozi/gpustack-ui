import { DownOutlined, RightOutlined } from '@ant-design/icons';
import { useIntl } from '@umijs/max';
import { Button, Divider } from 'antd';
import React, { useMemo, useState } from 'react';
import styled from 'styled-components';
import { BenchmarkResultItem } from '../../config/types';
import MetricsResult from './metrics-result';
import PercentileResult from './percentile-result';
import { SectionTitle } from './ui';

interface SelectedStageProps {
  selected: BenchmarkResultItem | null;
}

// Flat: a quiet section title, content directly below, transparent table head.
const Block = styled.div`
  .ant-table-thead > tr > th {
    background: transparent !important;
    border-bottom: 1px solid var(--ant-color-border-secondary);
    color: var(--ant-color-text-tertiary);
    font-weight: 500;
  }
  .ant-table-thead > tr > th::before {
    display: none !important;
  }
`;

// v2.1 drill-down: reuse the legacy single-point view (MetricsResult +
// PercentileResult) but feed it the selected stage's data. The result row's
// `raw_metrics` is that stage's benchmarks[i] dump (with percentiles), so we
// reshape it to the { raw_metrics: { benchmarks: [bm] } } shape those components
// expect.
const SelectedStage: React.FC<SelectedStageProps> = ({ selected }) => {
  const intl = useIntl();
  // Tier 4: percentiles are rarely read on first open — collapse by default to
  // keep the page short.
  const [showPct, setShowPct] = useState(false);

  const shaped = useMemo(() => {
    if (!selected) return null;
    return {
      ...selected,
      total_requests: selected.request_total,
      raw_metrics: { benchmarks: [selected.raw_metrics] }
    };
  }, [selected]);

  if (!shaped || !selected) {
    return null;
  }

  return (
    <Block>
      <SectionTitle>
        {intl.formatMessage({ id: 'benchmark.detail.summary.stageDetail' })}
      </SectionTitle>
      <div>
        <MetricsResult data={shaped} />
        <Divider style={{ margin: '16px 0 8px' }} />
        <Button
          type="link"
          size="small"
          style={{ paddingLeft: 0 }}
          icon={showPct ? <DownOutlined /> : <RightOutlined />}
          onClick={() => setShowPct((v) => !v)}
        >
          {intl.formatMessage({
            id: showPct
              ? 'benchmark.detail.hidePercentiles'
              : 'benchmark.detail.showPercentiles'
          })}
        </Button>
        {showPct && (
          /* 9-column percentile table can be wider than the drawer — let it
             scroll horizontally instead of overflowing the layout. */
          <div style={{ overflowX: 'auto', marginTop: 8 }}>
            <PercentileResult data={shaped} />
          </div>
        )}
      </div>
    </Block>
  );
};

export default SelectedStage;
