import {
  LabelInfo,
  Select as SealSelect,
  useAppUtils
} from '@gpustack/core-ui';
import { useIntl } from '@umijs/max';
import { Flex, Form, Segmented, Tooltip } from 'antd';
import { createStyles } from 'antd-style';
import React, { useEffect, useState } from 'react';
import {
  isPDModel,
  PD_CAPABLE_BACKENDS,
  PDEnableValueMap,
  RoleValueMap
} from '../config';
import { useFormContext } from '../config/form-context';
import { FormData, PDMode, RoleFormItem } from '../config/types';
import { backendOptionsMap } from '../constants/backend-parameters';
import useQueryPDModes from '../hooks/use-query-pd-modes';
import { createDefaultRoles } from './roles/transform';

// 1 prefill + 1 decode is the smallest group that can exist, so a cluster with
// fewer usable cards than this cannot run PD at all.
const PD_MIN_GPUS = 2;

// Bordered block whose switch sits in the title row, like the Scheduled Scaling
// and GPU-allocation sections of the same form.
const useStyles = createStyles(({ css }) => ({
  sectionCard: css`
    border: 1px solid var(--ant-color-border);
    border-radius: 6px;
    padding: 16px 12px 12px;
    margin-bottom: 8px;
    .section-title {
      font-size: 14px;
      color: var(--ant-color-text);
    }
    .note {
      font-size: 12px;
      line-height: 1.7;
      color: var(--ant-color-text-tertiary);
    }
    .note-warning {
      color: var(--ant-color-warning);
    }
  `
}));

/**
 * What turning PD on does to the REST of the form.
 *
 * These are effects on sections this component does not own, so they are
 * reported rather than written: the mount site applies them. Every one of them
 * carries its reason, because a control that is disabled or pinned without an
 * explanation is the silent-failure mode this whole feature is trying to beat.
 */
export interface PDEffects {
  // The block is on: the payload carries `disaggregation` and the role section
  // is in play.
  enabled: boolean;
  // The selected pd mode; null while off or not yet picked.
  mode: string | null;
  // The selected mode's catalog entry. The roles section needs it to show what
  // a system-managed router derives — this block already holds the catalog, so
  // resolving it twice would be two sources for one answer.
  modeData?: PDMode;
  // `custom` injects nothing, so the per-role cache dropdowns are illegal under
  // it and the router cannot be system-managed.
  isCustomMode: boolean;
  // Model-level `replicas` is a 0/1 deployment switch under PD, never a group
  // count: pin the field to 1 and make it read-only.
  replicasLocked: boolean;
  replicasLockReason?: string;
  // The backend rejects `roles` + `scaling_schedule`, so the section has to be
  // unavailable rather than reject a filled-in form.
  scalingDisabled: boolean;
  scalingDisabledReason?: string;
  // One-shot instruction, true only on the transition that needs it: clear
  // `extended_kv_cache` — under PD the cache is a per-role choice.
  clearModelKVCache: boolean;
}

interface PDDisaggregationProps {
  /**
   * A precondition this section cannot see (hostNetwork once it becomes a
   * field, a tenant quota, ...). Non-empty disables the whole block and is
   * shown as the reason; it wins over the conditions derived here.
   */
  disabledReason?: string;
  onEffectsChange?: (effects: PDEffects) => void;
}

const PDDisaggregation: React.FC<PDDisaggregationProps> = (props) => {
  const { disabledReason, onEffectsChange } = props;
  const intl = useIntl();
  const { styles } = useStyles();
  const form = Form.useFormInstance<FormData>();
  const { getRuleMessage } = useAppUtils();
  const {
    isGGUF,
    clusterList,
    flatBackendOptions,
    initialValues,
    onValuesChange
  } = useFormContext();
  const { getPDModes, buildOptions, isCustomMode, findMode } =
    useQueryPDModes();

  const backend = Form.useWatch('backend', form);
  const clusterId = Form.useWatch('cluster_id', form);
  const mode = Form.useWatch(['disaggregation', 'mode'], form);
  // Read-only reads of other sections: the role ratio and the model-level cache
  // are owned elsewhere, this block only reflects them.
  // See the note in forms/roles/index.tsx: without `preserve` this reads only
  // registered fields, and `roles` is written straight into the store.
  const roles = Form.useWatch('roles', { form, preserve: true });
  const kvCacheEnabled = Form.useWatch(['extended_kv_cache', 'enabled'], form);

  // The Segmented is deliberately NOT a form field: with `roles` empty the
  // block must leave the form store exactly as it found it, and an off state
  // written anywhere would ride the submit. Everything PD writes is registered
  // below, inside the enabled branch only.
  const [enabled, setEnabled] = useState(
    isPDModel({ roles: initialValues?.roles }) ||
      !!initialValues?.disaggregation?.mode
  );
  const [cacheCleared, setCacheCleared] = useState(false);

  // ---- the disable matrix (§2.1): every entry carries its reason ----------

  // GGUF is served by llama-box, which has no PD recipe at all — so the whole
  // block goes rather than offering a mode that cannot run.
  const ggufBlocked = !!isGGUF || backend === backendOptionsMap.llamaBox;

  // A cluster with no ready worker publishes no usable GPU whatever its
  // inventory says. Unknown (options still loading, or nothing picked yet) is
  // not "too few" — it must not disable the block.
  const cluster = clusterList?.find((item) => item.value === clusterId);
  const usableGpus = cluster
    ? (cluster.ready_workers ?? 0) > 0
      ? (cluster.gpus ?? 0)
      : 0
    : null;
  const gpuLabel = intl.formatMessage({ id: 'menu.resources.gpus' });

  const blockedReason =
    disabledReason ||
    (ggufBlocked
      ? intl.formatMessage({ id: 'models.form.pd.disabled.gguf' })
      : '') ||
    (usableGpus !== null && usableGpus < PD_MIN_GPUS
      ? intl.formatMessage(
          { id: 'models.pd.admission.infeasible' },
          {
            required: `${PD_MIN_GPUS} ${gpuLabel}`,
            available: `${usableGpus} ${gpuLabel}`
          }
        )
      : '');
  const blocked = !!blockedReason;

  // Not a block-level gate: a BYO engine may still run PD, only through the
  // `custom` mode (#5663 — users do want their own engines here). The mode
  // dropdown already disables the recipes that do not target this engine; this
  // note is what tells the user why only Custom is left.
  const selectedBackend = flatBackendOptions?.find(
    (item) => item.value === backend
  );
  const pdCapableBackend =
    !!selectedBackend?.isBuiltIn &&
    PD_CAPABLE_BACKENDS.includes(backend as string);

  // A blocked cluster/engine must not leave a "PD is on" form behind: the
  // fields below unmount with it, so the rendered state is the payload's.
  const active = enabled && !blocked;

  // ---- cross-field effects ------------------------------------------------

  const notifyEffects = (next: {
    enabled: boolean;
    mode: string | null;
    clearModelKVCache: boolean;
  }) => {
    onEffectsChange?.({
      enabled: next.enabled,
      mode: next.enabled ? next.mode : null,
      modeData: next.enabled ? findMode(next.mode) : undefined,
      isCustomMode: next.enabled && isCustomMode(next.mode),
      replicasLocked: next.enabled,
      replicasLockReason: next.enabled
        ? intl.formatMessage({ id: 'models.form.pd.replicas.moved' })
        : undefined,
      scalingDisabled: next.enabled,
      scalingDisabledReason: next.enabled
        ? intl.formatMessage({ id: 'models.form.pd.disabled.schedule' })
        : undefined,
      clearModelKVCache: next.clearModelKVCache
    });
  };

  // Mount is the one transition no handler can report: editing a model that is
  // already disaggregated arrives with its replicas locked and its mode
  // dropdown already open, so the catalog is fetched here too. Mount only (a
  // lifecycle entry point, not a dependency) — every later change comes from a
  // handler below, and a form that opens with PD off fetches nothing.
  useEffect(() => {
    if (active) {
      getPDModes();
    }
    notifyEffects({
      enabled: active,
      mode: form.getFieldValue(['disaggregation', 'mode']) ?? null,
      clearModelKVCache: false
    });
  }, []);

  const handleEnableChange = async (value: string) => {
    const next = value === PDEnableValueMap.Disaggregated;
    // The model-level cache does not survive the switch: its benefit is
    // asymmetric between prefill and decode, so a model-level setting would
    // hand decode a cost it cannot use. The mount site clears it; the notice
    // below is what makes that visible.
    const clearModelKVCache = next && !!kvCacheEnabled;
    if (next) {
      // Opening the branch IS the action, so this is where the catalog request
      // belongs — the drawer's open is not this component's to hook.
      getPDModes();
      // Seed the role set here, not in the roles section's mount effect: that
      // section only mounts when its panel is expanded, so a user who turns PD
      // on and submits without opening it would send `disaggregation` with no
      // roles — which the backend refuses, and rightly so. The value has to
      // exist the moment PD does.
      if (!form.getFieldValue('roles')?.length) {
        form.setFieldValue('roles', createDefaultRoles());
      }
    }
    if (!next) {
      // Off means a plain model again: leave no group behind for the payload
      // to pick up.
      form.setFieldValue('roles', null);
      form.setFieldValue('disaggregation', null);
    }
    setEnabled(next);
    setCacheCleared(clearModelKVCache);
    notifyEffects({
      enabled: next,
      mode: form.getFieldValue(['disaggregation', 'mode']) ?? null,
      clearModelKVCache
    });
    // Let the conditional fields register/unregister first: what the form hands
    // out is what is mounted at that moment.
    await new Promise((resolve) => {
      setTimeout(resolve, 100);
    });
    onValuesChange?.({}, form.getFieldsValue());
  };

  const handleModeChange = (value: string) => {
    notifyEffects({
      enabled: true,
      mode: value ?? null,
      clearModelKVCache: false
    });
  };

  // ---- role-derived reflections -----------------------------------------

  // Different GPU types across prefill and decode is a product-visible
  // capability boundary (no gang admission), so it is flagged in the form
  // rather than waiting for the backend to refuse the group.
  const roleList: RoleFormItem[] = Array.isArray(roles) ? roles : [];
  const gpuTypeOf = (name: string) =>
    roleList.find((item) => item?.name === name)?.gpu_type_selector?.type ??
    null;
  // Only meaningful once both sides have actually chosen a type; two unset
  // roles are not heterogeneous. The roles section renders the same warning
  // beside the fields that cause it — this one is the summary a collapsed
  // roles panel still shows.
  const prefillType = gpuTypeOf(RoleValueMap.Prefill);
  const decodeType = gpuTypeOf(RoleValueMap.Decode);
  const heterogeneous =
    !!prefillType && !!decodeType && prefillType !== decodeType;

  // Options come from the catalog, filtered by engine: a recipe that targets
  // another engine stays visible but disabled, carrying why.
  const modeOptions = buildOptions(backend);
  const modeOptionRender = (option: any) => {
    const reason = option?.data?.reason;
    const label = option?.data?.label ?? option?.label;
    return reason ? (
      <Tooltip title={reason} placement="left">
        <span>{label}</span>
      </Tooltip>
    ) : (
      label
    );
  };

  return (
    <div className={styles.sectionCard} data-field="pdMode">
      <Flex
        className="section-title"
        align="center"
        justify="space-between"
        style={{ marginBottom: active ? 12 : 0 }}
      >
        <LabelInfo
          label={intl.formatMessage({ id: 'models.form.pd.enable' })}
          description={intl.formatMessage({ id: 'models.form.pd.enable.tips' })}
        ></LabelInfo>
        {/* Segmented, not Switch: phase two adds a homogeneous `kv_both` pool
            as a third state, and a Segmented takes that extra cell without
            changing the interaction. Defaults to off — every vendor's own docs
            say to benchmark the aggregated deployment first. */}
        <Tooltip title={blockedReason || false}>
          <span>
            <Segmented
              size="middle"
              type="rounded"
              style={{ fontSize: 12 }}
              disabled={blocked}
              value={
                active ? PDEnableValueMap.Disaggregated : PDEnableValueMap.Off
              }
              onChange={handleEnableChange}
              options={[
                {
                  label: intl.formatMessage({
                    id: 'models.form.pd.enable.off'
                  }),
                  value: PDEnableValueMap.Off
                },
                {
                  label: intl.formatMessage({ id: 'models.form.pd.enable.on' }),
                  value: PDEnableValueMap.Disaggregated
                }
              ]}
            />
          </span>
        </Tooltip>
      </Flex>

      {active && (
        <>
          {/* The Segmented's own state, registered only while on so the off
              path leaves the store untouched. Self-seeding on (re)mount, and
              removed again by the form's `preserve={false}` on unmount. */}
          <Form.Item
            name="pdMode"
            initialValue={PDEnableValueMap.Disaggregated}
            hidden
            noStyle
          >
            <input />
          </Form.Item>
          {/* The single entry point for every connection-state parameter:
              connector, ports and peer addresses are all derived from the
              mode, and none of them is a field. */}
          <Form.Item
            name={['disaggregation', 'mode']}
            rules={[
              {
                required: true,
                message: getRuleMessage('select', 'models.form.pd.mode')
              }
            ]}
          >
            <SealSelect
              required
              label={intl.formatMessage({ id: 'models.form.pd.mode' })}
              placeholder={intl.formatMessage({
                id: 'models.form.pd.mode.holder'
              })}
              description={intl.formatMessage({
                id: 'models.form.pd.mode.tips'
              })}
              options={modeOptions}
              optionRender={modeOptionRender}
              onChange={handleModeChange}
            ></SealSelect>
          </Form.Item>
          <Flex vertical gap={4}>
            {!pdCapableBackend && backend && (
              <div className="note">
                {intl.formatMessage({ id: 'models.form.pd.disabled.backend' })}
              </div>
            )}
            {isCustomMode(mode) && (
              <div className="note">
                {intl.formatMessage({
                  id: 'models.form.pd.mode.custom.tips'
                })}
              </div>
            )}
            {cacheCleared && (
              <div className="note">
                {intl.formatMessage({ id: 'models.form.pd.cache.cleared' })}
              </div>
            )}
            {heterogeneous && (
              <div className="note note-warning">
                {intl.formatMessage({
                  id: 'models.pd.heterogeneous.warning'
                })}
              </div>
            )}
          </Flex>
        </>
      )}
    </div>
  );
};

export default PDDisaggregation;
