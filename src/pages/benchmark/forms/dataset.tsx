import { PageAction } from '@/config';
import { AutoTooltip, Select as SealSelect } from '@gpustack/core-ui';
import { useIntl } from '@umijs/max';
import { Form, Select } from 'antd';
import React from 'react';
import { AUTO_TUNE_DEFAULTS } from '../config';
import { useFormContext } from '../config/form-context';
import { FormData, ProfileOption, StageRow } from '../config/types';
import RandomSettingsForm from './random-settings';

// The Preset (profile) is the single top-level selector. Picking one auto-fills
// the form from its builtin config (load_type / sla / dataset defaults); the
// "Custom" preset starts blank for fully manual config. `load_type` (not a
// "mode") is the traffic-shape axis; field visibility derives from it.
const DatasetForm: React.FC = () => {
  const intl = useIntl();
  const form = Form.useFormInstance();
  const { action, datasetList, profilesOptions, applyAutoName } =
    useFormContext();
  const disabled = action === PageAction.EDIT;

  const handleProfileChange = (profile: string) => {
    const config: Partial<ProfileOption> =
      (profilesOptions as any[])?.find((o) => o.value === profile)?.config ||
      {};
    // Default to auto-tune when the profile config doesn't say otherwise (named
    // presets set it explicitly; Custom omits it → default on, so it aligns with
    // the presets — same Load/Execution Limits fields — and can be toggled off
    // for manual stages).
    const autoTune = config.auto_tune ?? true;
    // Auto-tune presets have no manual stages; the ramp discovers points itself.
    const stages: StageRow[] = autoTune ? [] : (config.stages ?? []);
    form.setFieldsValue({
      load_type: config.load_type ?? 'fixed_rate',
      auto_tune: autoTune,
      lower_bound: config.lower_bound ?? AUTO_TUNE_DEFAULTS.lower_bound,
      upper_bound: config.upper_bound ?? AUTO_TUNE_DEFAULTS.upper_bound,
      max_points: config.max_points ?? AUTO_TUNE_DEFAULTS.max_points,
      max_total_seconds:
        config.max_total_seconds ?? AUTO_TUNE_DEFAULTS.max_total_seconds,
      dataset_name: config.dataset_name,
      dataset_input_tokens: config.dataset_input_tokens ?? null,
      dataset_output_tokens: config.dataset_output_tokens ?? null,
      dataset_seed: config.dataset_seed ?? null,
      dataset_seed_increment: (config as any).dataset_seed_increment ?? true,
      total_requests: config.total_requests ?? null,
      max_seconds: config.max_seconds ?? null,
      request_rate: config.request_rate ?? -1,
      stages: stages,
      sla_avg_ttft_ms: config.sla_avg_ttft_ms ?? null,
      sla_avg_tpot_ms: config.sla_avg_tpot_ms ?? null,
      sla_p99_ttft_ms: (config as any).sla_p99_ttft_ms ?? null,
      sla_p99_tpot_ms: (config as any).sla_p99_tpot_ms ?? null,
      sla_avg_latency_ms: (config as any).sla_avg_latency_ms ?? null,
      sla_p99_latency_ms: (config as any).sla_p99_latency_ms ?? null
    });
    applyAutoName?.();
  };

  return (
    <>
      <Form.Item<FormData>
        data-field="profile"
        name="profile"
        rules={[{ required: true }]}
      >
        <SealSelect
          disabled={disabled}
          onChange={handleProfileChange}
          label={intl.formatMessage({ id: 'benchmark.form.profile' })}
          required
        >
          {(profilesOptions as any[])?.map((item) => (
            <Select.Option
              key={item.value}
              value={item.value}
              label={item.label}
            >
              <AutoTooltip
                ghost
                showTitle={!!(item.tips || item.config?.description)}
                title={
                  item.tips
                    ? intl.formatMessage({ id: item.tips })
                    : item.config?.description || false
                }
              >
                {item.label}
              </AutoTooltip>
            </Select.Option>
          ))}
        </SealSelect>
      </Form.Item>

      <RandomSettingsForm datasetList={datasetList} />
    </>
  );
};

export default DatasetForm;
