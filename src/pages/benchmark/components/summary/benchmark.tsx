import { getDatasetSourceLabel } from '@/pages/datasets/config';
import { useIntl } from '@umijs/max';
import { Descriptions } from 'antd';
import { DescriptionsItemType } from 'antd/es/descriptions';
import { round } from 'lodash';
import React from 'react';
import styled from 'styled-components';
import {
  DatasetValueMap,
  loadTypeOptions,
  loadValueDecimals
} from '../../config';
import { useDetailContext } from '../../config/detail-context';

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
  .group + .group {
    border-top: 1px solid var(--ant-color-border-secondary);
    padding-top: 18px;
  }
  .group-label {
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    color: var(--ant-color-text-tertiary);
    margin-bottom: 14px;
  }
`;

const Benchmark: React.FC = () => {
  const intl = useIntl();
  const { detailData, profilesOptions, datasetResources } = useDetailContext();
  const t = (id?: string) => (id ? intl.formatMessage({ id }) : '');

  const d = detailData as any;
  const isShareGPT = d?.dataset_name === DatasetValueMap.ShareGPT;
  // Custom benchmark: `dataset_name` is the type ("Dataset"); show the actual
  // dataset as a source-type-prefixed label. Fallback order:
  //   getDatasetSourceLabel(snapshot.dataset)  (snapshot carries source + fields)
  //   → getDatasetSourceLabel(resolved dataset resource by id)  (older rows)
  //   → "Dataset".
  const isCustomDataset =
    d?.dataset_name === DatasetValueMap.Custom || d?.dataset_id != null;
  const resolveCustomDatasetLabel = (): string => {
    const snapshot = d?.snapshot?.dataset;
    const snapshotLabel = snapshot && getDatasetSourceLabel(snapshot);
    if (snapshotLabel) {
      return snapshotLabel;
    }
    const found = (datasetResources || []).find(
      (ds) => ds.id === d?.dataset_id
    );
    return (found && getDatasetSourceLabel(found)) || DatasetValueMap.Custom;
  };
  const resolvedDatasetLabel = isCustomDataset
    ? resolveCustomDatasetLabel()
    : d?.dataset_name || '-';
  const dec = loadValueDecimals(d);
  const has = (v: any) =>
    v !== undefined &&
    v !== null &&
    v !== '' &&
    !(Array.isArray(v) && v.length === 0);

  const mk = () => {
    const arr: DescriptionsItemType[] = [];
    const add = (key: string, labelId: string, value: React.ReactNode) =>
      arr.push({ key, label: t(labelId), children: value });
    const addIf = (
      key: string,
      labelId: string,
      raw: any,
      value?: React.ReactNode
    ) => {
      if (has(raw)) add(key, labelId, value ?? raw);
    };
    return { arr, add, addIf };
  };

  // ── Dataset ──────────────────────────────────────────────────────────────
  const data = mk();
  data.add('dataset', 'benchmark.table.dataset', resolvedDatasetLabel);
  if (!isShareGPT) {
    data.add(
      'tokenLen',
      'benchmark.detail.inputOutputTokenLength',
      <span>
        {d?.dataset_input_tokens || '-'} / {d?.dataset_output_tokens || '-'}
      </span>
    );
  }
  data.addIf('inStdev', 'benchmark.form.inputStdev', d?.dataset_input_stdev);
  data.addIf('inMin', 'benchmark.form.inputMin', d?.dataset_input_min);
  data.addIf('inMax', 'benchmark.form.inputMax', d?.dataset_input_max);
  data.addIf('outStdev', 'benchmark.form.outputStdev', d?.dataset_output_stdev);
  data.addIf('outMin', 'benchmark.form.outputMin', d?.dataset_output_min);
  data.addIf('outMax', 'benchmark.form.outputMax', d?.dataset_output_max);
  data.addIf(
    'prefix',
    'benchmark.form.sharedPrefix',
    d?.prefix_buckets?.length ? d.prefix_buckets : null,
    (d?.prefix_buckets || [])
      .map(
        (b: any) =>
          `${b.prefix_tokens} tok${b.prefix_count ? ` ×${b.prefix_count}` : ''}`
      )
      .join(', ')
  );
  if (!isShareGPT) {
    data.addIf('seed', 'playground.image.params.seed', d?.dataset_seed);
  }

  // ── Latency SLA ──────────────────────────────────────────────────────────
  const sla = mk();
  sla.addIf('slaTtft', 'benchmark.form.sla.ttft', d?.sla_avg_ttft_ms);
  sla.addIf('slaP99Ttft', 'benchmark.form.sla.p99Ttft', d?.sla_p99_ttft_ms);
  sla.addIf('slaTpot', 'benchmark.form.sla.tpot', d?.sla_avg_tpot_ms);
  sla.addIf('slaP99Tpot', 'benchmark.form.sla.p99Tpot', d?.sla_p99_tpot_ms);
  sla.addIf(
    'slaAvgLat',
    'benchmark.form.sla.avgLatency',
    d?.sla_avg_latency_ms
  );
  sla.addIf(
    'slaP99Lat',
    'benchmark.form.sla.p99Latency',
    d?.sla_p99_latency_ms
  );

  // ── Load ───────────────────────────────────────────────────────────────
  const load = mk();
  load.add(
    'profile',
    'benchmark.form.profile',
    profilesOptions.find((o) => o.value === d?.profile)?.label ||
      d?.profile ||
      '-'
  );
  const ltLabel = loadTypeOptions.find((o) => o.value === d?.load_type)?.label;
  load.addIf(
    'load_type',
    'benchmark.form.loadType',
    d?.load_type,
    ltLabel ? t(ltLabel) : d?.load_type
  );
  load.addIf('autoTune', 'benchmark.form.autoTune', d?.auto_tune ? '✓' : null);
  load.addIf(
    'maxKnob',
    d?.load_type === 'concurrency'
      ? 'benchmark.form.autoTune.maxConcurrency'
      : 'benchmark.form.autoTune.maxRate',
    d?.auto_tune ? d?.upper_bound : null
  );
  load.addIf(
    'stages',
    'benchmark.form.stages',
    d?.stages,
    (d?.stages || []).map((s: any) => round(s.rate ?? 0, dec)).join(', ')
  );
  load.addIf(
    'rate',
    'benchmark.table.requestRate',
    d?.stages?.length || d?.auto_tune ? null : d?.request_rate,
    d?.request_rate
  );

  // ── Execution Limits (when the run stops) ────────────────────────────────
  const exec = mk();
  exec.addIf(
    'maxTotal',
    'benchmark.form.autoTune.maxTotalSeconds',
    d?.auto_tune ? d?.max_total_seconds : null
  );
  exec.addIf(
    'maxPoints',
    'benchmark.form.autoTune.maxPoints',
    d?.auto_tune ? d?.max_points : null
  );
  exec.addIf('total', 'benchmark.form.totalRequests', d?.total_requests);
  exec.addIf(
    'maxSeconds',
    'benchmark.form.maxSeconds',
    d?.max_seconds,
    `${d?.max_seconds} s`
  );
  exec.addIf('maxErrors', 'benchmark.form.maxErrors', d?.max_errors);
  exec.addIf('maxErrorRate', 'benchmark.form.maxErrorRate', d?.max_error_rate);
  if (d?.stop_on_saturation) {
    exec.add('stopSat', 'benchmark.form.stopOnSaturation', '✓');
  }

  // ── Advanced ─────────────────────────────────────────────────────────────
  const adv = mk();
  adv.addIf('turns', 'benchmark.form.turns', d?.turns);
  adv.addIf('warmup', 'benchmark.form.warmup', d?.warmup);
  adv.addIf('cooldown', 'benchmark.form.cooldown', d?.cooldown);

  const groups = [
    { labelId: 'benchmark.form.group.dataset', items: data.arr },
    { labelId: 'benchmark.form.group.sla', items: sla.arr },
    { labelId: 'benchmark.form.group.load', items: load.arr },
    { labelId: 'benchmark.form.group.execution', items: exec.arr },
    { labelId: 'benchmark.form.group.advanced', items: adv.arr }
  ].filter((g) => g.items.length > 0);

  return (
    <Wrapper>
      {groups.map((g) => (
        <div className="group" key={g.labelId}>
          <div className="group-label">{t(g.labelId)}</div>
          <Descriptions
            items={g.items}
            colon={false}
            column={3}
            styles={{ content: { justifyContent: 'flex-start' } }}
          />
        </div>
      ))}
    </Wrapper>
  );
};

export default Benchmark;
