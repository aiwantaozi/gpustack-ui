import { Divider } from 'antd';
import React, { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { queryBenchmarkResults } from '../../apis';
import { useDetailContext } from '../../config/detail-context';
import { BenchmarkResultItem } from '../../config/types';
import BestPoints from './best-points';
import ConfigSummary from './config-summary';
import MetricsResult from './metrics-result';
import Overview from './overview';
import PercentileResult from './percentile-result';
import SelectedStage from './selected-stage';
import { SectionRule } from './ui';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const Summary: React.FC = () => {
  const { id, detailData } = useDetailContext();
  const [results, setResults] = useState<BenchmarkResultItem[]>([]);
  const [selected, setSelected] = useState<BenchmarkResultItem | null>(null);

  useEffect(() => {
    if (!id) {
      return;
    }
    queryBenchmarkResults(id)
      .then((data) => setResults(data || []))
      .catch(() => setResults([]));
  }, [id]);

  const isMulti = results.length > 1;

  // Default selection = knee (recommended) → peak → first.
  useEffect(() => {
    if (!isMulti) {
      setSelected(null);
      return;
    }
    const byRate = (rate?: number | null) =>
      rate == null ? undefined : results.find((r) => (r.rate ?? -1) === rate);
    // Peak among schedulable (fixed-rate) points — ignore the null-rate
    // synchronous / throughput passes.
    const peak = results
      .filter((r) => r.rate != null)
      .reduce<BenchmarkResultItem | null>(
        (best, r) =>
          !best ||
          (r.tokens_per_second_mean ?? 0) > (best.tokens_per_second_mean ?? 0)
            ? r
            : best,
        null
      );
    setSelected(
      byRate(detailData?.recommended_rate ?? detailData?.knee_rate) ||
        peak ||
        results[0]
    );
  }, [results, isMulti, detailData?.recommended_rate, detailData?.knee_rate]);

  const resultsView = useMemo(() => {
    if (isMulti) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <Overview
            results={results}
            selectedId={selected?.id ?? null}
            onSelect={setSelected}
            bestPoints={<BestPoints results={results} onSelect={setSelected} />}
          />
          <SectionRule />
          <SelectedStage selected={selected} />
        </div>
      );
    }
    // Single point (or legacy data): the existing single-result view.
    return (
      <>
        <MetricsResult />
        <Divider />
        <PercentileResult />
      </>
    );
  }, [isMulti, results, selected]);

  return (
    <Container>
      <ConfigSummary />
      {resultsView}
    </Container>
  );
};

export default Summary;
