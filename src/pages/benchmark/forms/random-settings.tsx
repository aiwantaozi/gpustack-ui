import { PageAction } from '@/config';
import {
  MinusOutlined,
  PlusOutlined,
  QuestionCircleOutlined
} from '@ant-design/icons';
import {
  InputNumber as CInputNumber,
  CheckboxField,
  CollapsePanel,
  Select as SealSelect,
  useAppUtils
} from '@gpustack/core-ui';
import { useIntl } from '@umijs/max';
import { Button, Form, InputNumber, Select, Switch, Tooltip } from 'antd';
import { createStyles } from 'antd-style';
import React, { useState } from 'react';
import DistributionChart from '../components/distribution-chart';
import { DatasetValueMap, LoadTypeValueMap, loadTypeOptions } from '../config';
import { useFormContext } from '../config/form-context';
import { FormData } from '../config/types';
import CustomDatasetPicker from './custom-dataset-picker';

// Latency SLA: one inline row per metric — "Metric [Avg ▾] [value] ms" — so the
// aggregation and threshold sit together instead of a wide table.
const useStyles = createStyles(({ token, css }) => ({
  slaRows: css`
    /* nudge right so the metric labels line up with the boxed inputs' text, +
       a gap before the Load panel */
    margin-left: 12px;
    margin-bottom: 12px;
    .sla-row {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .sla-row + .sla-row {
      margin-top: 16px;
    }
    .sla-row .metric {
      width: 60px;
      flex-shrink: 0;
      font-weight: 500;
    }
    .sla-row .agg {
      width: 84px;
      flex-shrink: 0;
    }
    .sla-row .val {
      flex: 1;
    }
  `,
  // A Switch styled as a bordered field row so it sits in the field flow (doesn't
  // float), matching the sibling inputs; the label carries a "?" help tooltip.
  switchField: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    min-height: 54px;
    padding: 0 12px;
    margin-bottom: 24px;
    border: 1px solid ${token.colorBorder};
    border-radius: ${token.borderRadius}px;
    .label {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      color: ${token.colorText};
    }
    .help {
      color: ${token.colorTextTertiary};
      cursor: help;
    }
  `,
  switchFieldDisabled: css`
    background: ${token.colorBgContainerDisabled};
    .label {
      color: ${token.colorTextTertiary};
    }
  `
}));

// SLA targets: one row per metric with an avg/p99 selector, instead of listing
// all 6 avg+p99 fields. Each metric maps to its two backend threshold fields;
// only the selected aggregation carries a value (the other is cleared).
const SLA_METRICS = [
  {
    key: 'ttft',
    avg: 'sla_avg_ttft_ms',
    p99: 'sla_p99_ttft_ms',
    labelId: 'benchmark.form.sla.metric.ttft'
  },
  {
    key: 'tpot',
    avg: 'sla_avg_tpot_ms',
    p99: 'sla_p99_tpot_ms',
    labelId: 'benchmark.form.sla.metric.tpot'
  },
  {
    key: 'latency',
    avg: 'sla_avg_latency_ms',
    p99: 'sla_p99_latency_ms',
    labelId: 'benchmark.form.sla.metric.latency'
  }
] as const;

const RandomSettingsForm: React.FC<{
  datasetList: Global.BaseOption<number | string>[];
}> = (props) => {
  const { datasetList } = props;
  const { styles, cx } = useStyles();
  const intl = useIntl();
  const { action, currentData } = useFormContext();
  const form = Form.useFormInstance();
  const profile = Form.useWatch('profile', form);
  const loadType = Form.useWatch('load_type', form);
  const datasetName = Form.useWatch('dataset_name', form);
  const { getRuleMessage } = useAppUtils();

  const disabled = action === PageAction.EDIT;

  // Field visibility derives from `load_type` (the axis) + `auto_tune`. The
  // load_type selector and auto_tune toggle are only offered for the Custom
  // preset; named presets fix both.
  const autoTune = Form.useWatch('auto_tune', form);
  const isCustom = profile === 'Custom';
  // Load Type + Auto-tune are always shown so the config is transparent, but
  // locked (read-only) for named presets — only Custom lets you change them.
  const presetLocked = !isCustom;
  const isFixedRate = loadType === LoadTypeValueMap.FixedRate;
  // Named presets are ALWAYS auto-tune (the ramp is the whole point); only Custom
  // can turn it off to run fixed manual stages. Derive from that so the section
  // renders correctly even if the auto_tune field value lags/is missing.
  const effectiveAutoTune = isCustom ? !!autoTune : true;
  // Manual stages table only in Custom manual mode; auto-tune discovers its own
  // points via the adaptive ramp.
  const showStages = isCustom && !autoTune;
  // SLA targets apply to the concurrency axis (latency-SLA scenario). Primary
  // input for the auto-tune Latency SLA preset; optional for Custom concurrency.
  const showSLA = loadType === LoadTypeValueMap.Concurrency;
  const isRandom = datasetName === DatasetValueMap.Random;
  // Custom dataset resource type: shows the resource picker + "+ New" instead of
  // the Random synthetic-data fields.
  const isCustomDataset = datasetName === DatasetValueMap.Custom;

  const rateLabel = isFixedRate
    ? intl.formatMessage({ id: 'benchmark.form.rate' })
    : intl.formatMessage({ id: 'benchmark.form.concurrency' });

  // Data distribution is opt-in, and input / output toggle independently. Each
  // section's inputs appear once its toggle is on (or, in EDIT, when any of its
  // values already exists). The means come from Input/Output Token Length.
  const inputTokens = Form.useWatch('dataset_input_tokens', form);
  const outputTokens = Form.useWatch('dataset_output_tokens', form);
  const inStdev = Form.useWatch('dataset_input_stdev', form);
  const inMin = Form.useWatch('dataset_input_min', form);
  const inMax = Form.useWatch('dataset_input_max', form);
  const outStdev = Form.useWatch('dataset_output_stdev', form);
  const outMin = Form.useWatch('dataset_output_min', form);
  const outMax = Form.useWatch('dataset_output_max', form);

  const hasVal = (...vs: any[]) => vs.some((v) => v != null && v !== '');
  // Initialize the disclosure from the prefilled config (clone / edit) — useWatch
  // can't see the still-unmounted distribution fields, so seed from currentData.
  const [distToggle, setDistToggle] = useState(() =>
    hasVal(
      currentData?.dataset_input_stdev,
      currentData?.dataset_input_min,
      currentData?.dataset_input_max,
      currentData?.dataset_output_stdev,
      currentData?.dataset_output_min,
      currentData?.dataset_output_max
    )
  );
  const showDist =
    distToggle || hasVal(inStdev, inMin, inMax, outStdev, outMin, outMax);
  const handleDistToggle = (checked: boolean) => {
    setDistToggle(checked);
    if (!checked) {
      form.setFieldsValue({
        dataset_input_stdev: null,
        dataset_input_min: null,
        dataset_input_max: null,
        dataset_output_stdev: null,
        dataset_output_min: null,
        dataset_output_max: null
      });
    }
  };

  // Shared prefix is opt-in too: the bucket list only appears once enabled (or,
  // in EDIT, when buckets already exist).
  const prefixBuckets = Form.useWatch('prefix_buckets', form);
  const [prefixToggle, setPrefixToggle] = useState(
    () =>
      Array.isArray(currentData?.prefix_buckets) &&
      currentData!.prefix_buckets.length > 0
  );
  const showPrefix =
    prefixToggle || (Array.isArray(prefixBuckets) && prefixBuckets.length > 0);
  const handlePrefixToggle = (checked: boolean) => {
    setPrefixToggle(checked);
    if (!checked) {
      form.setFieldValue('prefix_buckets', []);
    } else if (!prefixBuckets?.length) {
      form.setFieldValue('prefix_buckets', [
        { prefix_count: 1, bucket_weight: 100 }
      ]);
    }
  };

  // Per-metric SLA aggregation (avg | p99). Seeded from the prefilled config:
  // p99 iff only the p99 field is set, else avg (the default).
  const [slaAgg, setSlaAgg] = useState<Record<string, 'avg' | 'p99'>>(() =>
    Object.fromEntries(
      SLA_METRICS.map((m) => [
        m.key,
        (currentData as any)?.[m.p99] != null &&
        (currentData as any)?.[m.avg] == null
          ? 'p99'
          : 'avg'
      ])
    )
  );
  const handleAggChange = (
    m: (typeof SLA_METRICS)[number],
    next: 'avg' | 'p99'
  ) => {
    if (slaAgg[m.key] === next) return;
    // Move the entered value to the newly selected aggregation's field and clear
    // the old one, so only one of avg/p99 is ever submitted per metric.
    const oldField = slaAgg[m.key] === 'avg' ? m.avg : m.p99;
    const newField = next === 'avg' ? m.avg : m.p99;
    const cur = form.getFieldValue(oldField);
    form.setFieldsValue({ [oldField]: null, [newField]: cur ?? null } as any);
    setSlaAgg((s) => ({ ...s, [m.key]: next }));
  };

  // Collapsible field groups: Dataset / SLA / Load open by default; Execution
  // Limits and Advanced collapsed (rarely changed). Uses the app's CollapsePanel
  // for a style consistent with the model form & the Configuration section.
  const [groupKeys, setGroupKeys] = useState<string[]>([
    'dataset',
    'sla',
    'load'
  ]);
  const handleGroupChange = (keys: string | string[]) =>
    setGroupKeys(Array.isArray(keys) ? keys : [keys]);

  // ---- Group 1: Dataset (what data to send) ----
  const datasetContent = (
    <>
      <Form.Item<FormData>
        name="dataset_name"
        rules={[
          {
            required: true,
            message: getRuleMessage('select', 'benchmark.table.dataset')
          }
        ]}
      >
        <SealSelect
          disabled={disabled}
          options={datasetList?.map((item) => ({
            ...item,
            label: item.label,
            value: item.label
          }))}
          label={intl.formatMessage({ id: 'benchmark.table.dataset' })}
          required
        ></SealSelect>
      </Form.Item>
      {isCustomDataset && <CustomDatasetPicker />}
      {isRandom && (
        <>
          <Form.Item<FormData>
            name="dataset_input_tokens"
            rules={[
              {
                required: true,
                message: getRuleMessage(
                  'input',
                  'benchmark.table.inputTokenLength'
                )
              }
            ]}
          >
            <CInputNumber
              min={0}
              disabled={disabled}
              label={intl.formatMessage({
                id: 'benchmark.table.inputTokenLength'
              })}
              required
            ></CInputNumber>
          </Form.Item>
          <Form.Item<FormData>
            name="dataset_output_tokens"
            rules={[
              {
                required: true,
                message: getRuleMessage(
                  'input',
                  'benchmark.table.outputTokenLength'
                )
              }
            ]}
          >
            <CInputNumber
              min={0}
              disabled={disabled}
              label={intl.formatMessage({
                id: 'benchmark.table.outputTokenLength'
              })}
              required
            ></CInputNumber>
          </Form.Item>
          {/* Seed + its per-stage toggle on one row: the seed input takes the
              width, the switch sits right-aligned and vertically centered. */}
          <div
            style={{
              display: 'flex',
              gap: 16,
              alignItems: 'center',
              marginBottom: 24
            }}
          >
            <Form.Item<FormData>
              name="dataset_seed"
              getValueProps={(value) => ({ value: value || null })}
              style={{ flex: 1, marginBottom: 0 }}
            >
              <CInputNumber
                min={0}
                disabled={disabled}
                label={intl.formatMessage({
                  id: 'playground.image.params.seed'
                })}
                description={intl.formatMessage({
                  id: 'benchmark.form.datasetSeed.tips'
                })}
              ></CInputNumber>
            </Form.Item>
            <Form.Item<FormData>
              name="dataset_seed_increment"
              valuePropName="checked"
              label={intl.formatMessage({ id: 'benchmark.form.seedIncrement' })}
              tooltip={intl.formatMessage({
                id: 'benchmark.form.seedIncrement.tips'
              })}
              style={{ marginBottom: 0 }}
            >
              <Switch disabled={disabled} />
            </Form.Item>
          </div>
          {/* data distribution + shared prefix sub-options */}
          <>
            <div style={{ marginBottom: 8 }}>
              <CheckboxField
                checked={showDist}
                disabled={disabled}
                onChange={(e: any) => handleDistToggle(e.target.checked)}
                label={intl.formatMessage({
                  id: 'benchmark.form.group.distribution'
                })}
              />
            </div>
            {showDist && (
              <>
                <div style={{ fontWeight: 500, margin: '4px 0 8px' }}>
                  {intl.formatMessage({
                    id: 'benchmark.form.group.distribution.input'
                  })}
                </div>
                <div
                  style={{
                    display: 'flex',
                    gap: 16,
                    alignItems: 'center',
                    marginBottom: 16
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                      width: 150
                    }}
                  >
                    <Form.Item
                      name="dataset_input_stdev"
                      style={{ marginBottom: 0 }}
                    >
                      <CInputNumber
                        min={0}
                        disabled={disabled}
                        label={intl.formatMessage({
                          id: 'benchmark.form.dist.spread'
                        })}
                        description={intl.formatMessage({
                          id: 'benchmark.form.dist.spread.tip'
                        })}
                      ></CInputNumber>
                    </Form.Item>
                    <Form.Item
                      name="dataset_input_min"
                      style={{ marginBottom: 0 }}
                    >
                      <CInputNumber
                        min={0}
                        disabled={disabled}
                        label={intl.formatMessage({
                          id: 'benchmark.form.dist.min'
                        })}
                      ></CInputNumber>
                    </Form.Item>
                    <Form.Item
                      name="dataset_input_max"
                      style={{ marginBottom: 0 }}
                    >
                      <CInputNumber
                        min={0}
                        disabled={disabled}
                        label={intl.formatMessage({
                          id: 'benchmark.form.dist.max'
                        })}
                      ></CInputNumber>
                    </Form.Item>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <DistributionChart
                      mean={inputTokens}
                      stdev={inStdev}
                      min={inMin}
                      max={inMax}
                    />
                  </div>
                </div>
                <div style={{ fontWeight: 500, margin: '12px 0 8px' }}>
                  {intl.formatMessage({
                    id: 'benchmark.form.group.distribution.output'
                  })}
                </div>
                <div
                  style={{
                    display: 'flex',
                    gap: 16,
                    alignItems: 'center',
                    marginBottom: 16
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                      width: 150
                    }}
                  >
                    <Form.Item
                      name="dataset_output_stdev"
                      style={{ marginBottom: 0 }}
                    >
                      <CInputNumber
                        min={0}
                        disabled={disabled}
                        label={intl.formatMessage({
                          id: 'benchmark.form.dist.spread'
                        })}
                        description={intl.formatMessage({
                          id: 'benchmark.form.dist.spread.tip'
                        })}
                      ></CInputNumber>
                    </Form.Item>
                    <Form.Item
                      name="dataset_output_min"
                      style={{ marginBottom: 0 }}
                    >
                      <CInputNumber
                        min={0}
                        disabled={disabled}
                        label={intl.formatMessage({
                          id: 'benchmark.form.dist.min'
                        })}
                      ></CInputNumber>
                    </Form.Item>
                    <Form.Item
                      name="dataset_output_max"
                      style={{ marginBottom: 0 }}
                    >
                      <CInputNumber
                        min={0}
                        disabled={disabled}
                        label={intl.formatMessage({
                          id: 'benchmark.form.dist.max'
                        })}
                      ></CInputNumber>
                    </Form.Item>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <DistributionChart
                      mean={outputTokens}
                      stdev={outStdev}
                      min={outMin}
                      max={outMax}
                    />
                  </div>
                </div>
              </>
            )}
            <div
              style={{
                marginBottom: 8,
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              <CheckboxField
                checked={showPrefix}
                disabled={disabled}
                onChange={(e: any) => handlePrefixToggle(e.target.checked)}
                label={intl.formatMessage({
                  id: 'benchmark.form.sharedPrefix'
                })}
              />
              <Tooltip
                title={intl.formatMessage({ id: 'benchmark.form.prefix.tip' })}
              >
                <QuestionCircleOutlined
                  style={{ color: 'var(--ant-color-text-quaternary)' }}
                />
              </Tooltip>
            </div>
            {showPrefix && (
              <Form.List name="prefix_buckets">
                {(fields, { add, remove }) => (
                  <div style={{ marginBottom: 16 }}>
                    {fields.map((field) => (
                      <div
                        key={field.key}
                        style={{
                          display: 'flex',
                          gap: 8,
                          marginBottom: 8,
                          alignItems: 'center'
                        }}
                      >
                        <Form.Item
                          name={[field.name, 'prefix_tokens']}
                          style={{ marginBottom: 0, flex: 1 }}
                          rules={[
                            {
                              required: true,
                              message: getRuleMessage(
                                'input',
                                'benchmark.form.prefix.length'
                              )
                            }
                          ]}
                        >
                          <CInputNumber
                            min={1}
                            disabled={disabled}
                            label={intl.formatMessage({
                              id: 'benchmark.form.prefix.length'
                            })}
                          ></CInputNumber>
                        </Form.Item>
                        <Form.Item
                          name={[field.name, 'prefix_count']}
                          style={{ marginBottom: 0, flex: 1 }}
                        >
                          <CInputNumber
                            min={1}
                            disabled={disabled}
                            label={intl.formatMessage({
                              id: 'benchmark.form.prefix.count'
                            })}
                          ></CInputNumber>
                        </Form.Item>
                        <Form.Item
                          name={[field.name, 'bucket_weight']}
                          style={{ marginBottom: 0, flex: 1 }}
                        >
                          <CInputNumber
                            min={1}
                            disabled={disabled}
                            label={intl.formatMessage({
                              id: 'benchmark.form.prefix.weight'
                            })}
                          ></CInputNumber>
                        </Form.Item>
                        <Button
                          type="text"
                          disabled={disabled}
                          onClick={() => remove(field.name)}
                          icon={<MinusOutlined />}
                        />
                      </div>
                    ))}
                    <Button
                      type="dashed"
                      block
                      disabled={disabled}
                      onClick={() =>
                        add({ prefix_count: 1, bucket_weight: 100 })
                      }
                      icon={<PlusOutlined />}
                    >
                      {intl.formatMessage({
                        id: 'benchmark.form.prefix.add'
                      })}
                    </Button>
                  </div>
                )}
              </Form.List>
            )}
          </>
        </>
      )}
    </>
  );

  // ---- Group 2: Load (how to drive traffic) ----
  // Auto-tune is NOT a standalone toggle. For named presets it's implied by the
  // profile and folded into the load description: Load Type reads "… (managed by
  // profile)", the knob ceiling is shown as a "Search Limit", and an info note
  // explains the load is tuned automatically. Only the Custom preset exposes the
  // adaptive/manual switch (it can also run fixed manual stages).
  const loadContent = (
    <>
      {/* Load Type (axis). Locked for named presets — the value then reads
          "… (managed by profile)" to make the read-only nature explicit. */}
      <Form.Item<FormData> name="load_type">
        <SealSelect
          disabled={disabled || presetLocked}
          label={intl.formatMessage({ id: 'benchmark.form.loadType' })}
          options={loadTypeOptions.map((o) => ({
            label:
              intl.formatMessage({ id: o.label }) +
              (presetLocked
                ? ` (${intl.formatMessage({
                    id: 'benchmark.form.load.managedByProfile'
                  })})`
                : ''),
            value: o.value
          }))}
        ></SealSelect>
      </Form.Item>

      {/* Custom preset only: choose adaptive auto-tune vs manual fixed stages. */}
      {isCustom && (
        <div
          className={cx(styles.switchField, {
            [styles.switchFieldDisabled]: disabled
          })}
        >
          <span className="label">
            {intl.formatMessage({ id: 'benchmark.form.autoTune' })}
            <Tooltip
              title={intl.formatMessage({
                id: isFixedRate
                  ? 'benchmark.form.autoTune.rate.tip'
                  : 'benchmark.form.autoTune.concurrency.tip'
              })}
            >
              <QuestionCircleOutlined className="help" />
            </Tooltip>
          </span>
          <Form.Item<FormData> name="auto_tune" valuePropName="checked" noStyle>
            <Switch disabled={disabled} />
          </Form.Item>
        </div>
      )}

      {/* Named presets don't show the toggle (auto-tune is fixed by the profile),
          but the field MUST stay registered — an unmounted field isn't submitted,
          which would save auto_tune=false and make the runner do a manual
          `constant` run. Keep it hidden so it's always sent. */}
      {!isCustom && (
        <Form.Item<FormData> name="auto_tune" valuePropName="checked" hidden>
          <Switch />
        </Form.Item>
      )}

      {/* Auto-tune search range on one row: lower_bound = ramp start (geometric
          doubling begins here), upper_bound = ceiling. A shared label + "?"
          (Form.Item tooltip) frames it as one [min ~ max] range, not two fields. */}
      {effectiveAutoTune && (
        <Form.Item
          label={intl.formatMessage({
            id: isFixedRate
              ? 'benchmark.form.autoTune.rangeRate'
              : 'benchmark.form.autoTune.rangeConcurrency'
          })}
          tooltip={intl.formatMessage({
            id: isFixedRate
              ? 'benchmark.form.autoTune.range.rate.tip'
              : 'benchmark.form.autoTune.range.concurrency.tip'
          })}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Form.Item<FormData> name="lower_bound" noStyle>
              <InputNumber
                min={1}
                disabled={disabled}
                style={{ flex: 1, width: '100%' }}
                placeholder={intl.formatMessage({
                  id: 'benchmark.form.autoTune.rangeMin'
                })}
              />
            </Form.Item>
            <span style={{ color: 'var(--ant-color-text-tertiary)' }}>~</span>
            <Form.Item<FormData> name="upper_bound" noStyle>
              <InputNumber
                min={1}
                disabled={disabled}
                style={{ flex: 1, width: '100%' }}
                placeholder={intl.formatMessage({
                  id: 'benchmark.form.autoTune.rangeMax'
                })}
              />
            </Form.Item>
          </div>
        </Form.Item>
      )}

      {/* Stages table (Custom manual mode only): one row per rate + per-stage
          Requests / Max Seconds. */}
      {showStages && (
        <Form.List
          name="stages"
          rules={[
            {
              validator: async (_rule, value) => {
                if (!value || value.length === 0) {
                  return Promise.reject(
                    new Error(getRuleMessage('input', 'benchmark.form.stages'))
                  );
                }
              }
            }
          ]}
        >
          {(fields, { add, remove }, { errors }) => (
            <div style={{ marginBottom: 16 }}>
              <div style={{ marginBottom: 8, fontWeight: 500 }}>
                {intl.formatMessage({ id: 'benchmark.form.stages' })}
              </div>
              {fields.length > 0 && (
                <div
                  style={{
                    display: 'flex',
                    gap: 8,
                    marginBottom: 4,
                    fontSize: 12,
                    color: 'var(--ant-color-text-tertiary)'
                  }}
                >
                  <span style={{ flex: 1 }}>{rateLabel}</span>
                  <span style={{ flex: 1 }}>
                    {intl.formatMessage({ id: 'benchmark.form.requests' })}
                  </span>
                  <span style={{ flex: 1 }}>
                    {intl.formatMessage({ id: 'benchmark.form.maxSeconds' })}
                  </span>
                  <span style={{ width: 32 }} />
                </div>
              )}
              {fields.map((field) => (
                <div
                  key={field.key}
                  style={{ display: 'flex', gap: 8, marginBottom: 8 }}
                >
                  <Form.Item
                    name={[field.name, 'rate']}
                    style={{ marginBottom: 0, flex: 1 }}
                    rules={[
                      {
                        required: true,
                        message: getRuleMessage('input', 'benchmark.form.rate')
                      }
                    ]}
                  >
                    <InputNumber
                      min={1}
                      disabled={disabled}
                      placeholder={rateLabel}
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                  <Form.Item
                    name={[field.name, 'max_requests']}
                    style={{ marginBottom: 0, flex: 1 }}
                    dependencies={[['stages', field.name, 'max_seconds']]}
                    rules={[
                      {
                        validator: () =>
                          hasVal(
                            form.getFieldValue([
                              'stages',
                              field.name,
                              'max_requests'
                            ])
                          ) ||
                          hasVal(
                            form.getFieldValue([
                              'stages',
                              field.name,
                              'max_seconds'
                            ])
                          )
                            ? Promise.resolve()
                            : Promise.reject(
                                new Error(
                                  intl.formatMessage({
                                    id: 'benchmark.form.requestsOrSeconds'
                                  })
                                )
                              )
                      }
                    ]}
                  >
                    <InputNumber
                      min={1}
                      disabled={disabled}
                      placeholder={intl.formatMessage({
                        id: 'benchmark.form.requests'
                      })}
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                  <Form.Item
                    name={[field.name, 'max_seconds']}
                    style={{ marginBottom: 0, flex: 1 }}
                  >
                    <InputNumber
                      min={1}
                      disabled={disabled}
                      placeholder={intl.formatMessage({
                        id: 'benchmark.form.maxSeconds'
                      })}
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                  <Button
                    type="text"
                    disabled={disabled}
                    onClick={() => remove(field.name)}
                    icon={<MinusOutlined />}
                  />
                </div>
              ))}
              <Button
                type="dashed"
                block
                disabled={disabled}
                onClick={() => add({ rate: undefined })}
                icon={<PlusOutlined />}
              >
                {intl.formatMessage({ id: 'benchmark.form.addStage' })}
              </Button>
              <Form.ErrorList errors={errors} />
            </div>
          )}
        </Form.List>
      )}
    </>
  );

  // ---- Group: Latency SLA (concurrency axis only) ----
  // Optional "<= (ms)" targets — the benchmark's GOAL (auto-tune finds the max
  // concurrency that stays within them). A point meets the SLA when every SET
  // threshold holds (AND) + success >= 95%. One inline row per metric:
  // "Metric [Avg ▾] [value] ms"; only the selected aggregation carries a value.
  const aggOptions = [
    {
      label: intl.formatMessage({ id: 'benchmark.form.sla.agg.avg' }),
      value: 'avg'
    },
    {
      label: intl.formatMessage({ id: 'benchmark.form.sla.agg.p99' }),
      value: 'p99'
    }
  ];
  const slaContent = (
    <div className={styles.slaRows}>
      {SLA_METRICS.map((m) => {
        const activeField = slaAgg[m.key] === 'avg' ? m.avg : m.p99;
        return (
          <div className="sla-row" key={m.key}>
            <span className="metric">
              {intl.formatMessage({ id: m.labelId })}
            </span>
            <Select
              className="agg"
              value={slaAgg[m.key]}
              disabled={disabled}
              onChange={(v: 'avg' | 'p99') => handleAggChange(m, v)}
              options={aggOptions}
            />
            <div className="val">
              <Form.Item<FormData> name={activeField} noStyle>
                <InputNumber
                  min={0}
                  disabled={disabled}
                  addonAfter="ms"
                  placeholder="—"
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </div>
          </div>
        );
      })}
    </div>
  );

  // ---- Group: Execution Limits (when the benchmark stops) ----
  const executionLimitsContent = (
    <>
      {/* Auto-tune caps (anti-runaway): how many points / how long overall.
          multiplier / min_requests stay internal defaults (not exposed). */}
      {effectiveAutoTune && (
        <>
          <Form.Item<FormData> name="max_total_seconds">
            <CInputNumber
              min={1}
              disabled={disabled}
              label={intl.formatMessage({
                id: 'benchmark.form.autoTune.maxTotalSeconds'
              })}
            ></CInputNumber>
          </Form.Item>
          <Form.Item<FormData> name="max_points">
            <CInputNumber
              min={2}
              disabled={disabled}
              label={intl.formatMessage({
                id: 'benchmark.form.autoTune.maxPoints'
              })}
            ></CInputNumber>
          </Form.Item>
          <Form.Item<FormData>
            name="stop_on_saturation"
            valuePropName="checked"
            label={intl.formatMessage({
              id: 'benchmark.form.stopOnSaturation'
            })}
          >
            <Switch disabled={disabled} />
          </Form.Item>
        </>
      )}
      <Form.Item<FormData> name="max_errors">
        <CInputNumber
          min={0}
          disabled={disabled}
          label={intl.formatMessage({ id: 'benchmark.form.maxErrors' })}
        ></CInputNumber>
      </Form.Item>
      <Form.Item<FormData> name="max_error_rate">
        <CInputNumber
          min={0}
          max={1}
          step={0.01}
          disabled={disabled}
          label={intl.formatMessage({ id: 'benchmark.form.maxErrorRate' })}
        ></CInputNumber>
      </Form.Item>
    </>
  );

  // ---- Group: Advanced (rarely changed) ----
  const advancedContent = (
    <>
      <Form.Item<FormData> name="turns">
        <CInputNumber
          min={1}
          disabled={disabled}
          label={intl.formatMessage({ id: 'benchmark.form.turns' })}
        ></CInputNumber>
      </Form.Item>
      <Form.Item<FormData> name="warmup">
        <CInputNumber
          min={0}
          disabled={disabled}
          label={intl.formatMessage({ id: 'benchmark.form.warmup' })}
        ></CInputNumber>
      </Form.Item>
      <Form.Item<FormData> name="cooldown">
        <CInputNumber
          min={0}
          disabled={disabled}
          label={intl.formatMessage({ id: 'benchmark.form.cooldown' })}
        ></CInputNumber>
      </Form.Item>
    </>
  );

  // Top-level collapsible groups (order = the user's flow: what data → the goal
  // → how to drive → when to stop → rarely-touched). SLA is the goal, so it sits
  // right after Dataset and before Load. Advanced is collapsed by default.
  // The header carries a data-field anchor so the top scroll-spy nav can jump to
  // each section (see segmentOptions in ./index).
  const groupLabel = (field: string, id: string) => (
    <span data-field={field} style={{ scrollMarginTop: 160 }}>
      {intl.formatMessage({ id })}
    </span>
  );
  return (
    <CollapsePanel
      activeKey={groupKeys}
      accordion={false}
      onChange={handleGroupChange}
      items={[
        {
          key: 'dataset',
          label: groupLabel('dataset', 'benchmark.form.group.dataset'),
          forceRender: true,
          children: datasetContent
        },
        ...(showSLA
          ? [
              {
                key: 'sla',
                label: groupLabel('sla', 'benchmark.form.group.sla'),
                forceRender: true,
                children: slaContent
              }
            ]
          : []),
        {
          key: 'load',
          label: groupLabel('load', 'benchmark.form.group.load'),
          forceRender: true,
          children: loadContent
        },
        {
          key: 'execution',
          label: groupLabel('execution', 'benchmark.form.group.execution'),
          forceRender: true,
          children: executionLimitsContent
        },
        {
          key: 'advanced',
          label: groupLabel('advanced', 'benchmark.form.group.advanced'),
          forceRender: true,
          children: advancedContent
        }
      ]}
    ></CollapsePanel>
  );
};

export default RandomSettingsForm;
