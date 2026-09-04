import { workerListAtom } from '@/atoms/models';
import { Select as SealSelect, ThemeTag, useAppUtils } from '@gpustack/core-ui';
import { useIntl } from '@umijs/max';
import { Button, Flex, Form, Radio, Tooltip } from 'antd';
import { createStyles } from 'antd-style';
import { useAtomValue } from 'jotai';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { resolvePDMode } from '../apis';
import {
  isPDModel,
  PD_CAPABLE_BACKENDS,
  PDEnableValueMap,
  RoleValueMap
} from '../config';
import { useFormContext } from '../config/form-context';
import {
  FormData,
  PDMode,
  PDModeResolution,
  RoleFormItem
} from '../config/types';
import { backendOptionsMap } from '../constants/backend-parameters';
import useQueryPDModes, { transportLabel } from '../hooks/use-query-pd-modes';
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
  `,
  // Two cards rather than a switch. A binary toggle is right where the two
  // states are "this feature off / on"; here they are two deployment shapes
  // with different consequences, and the control now sits at the top of the
  // form where no PD context exists yet. A bare switch labelled "PD" asks the
  // reader to already know what it costs; two labelled options carry the
  // trade-off in the choice itself.
  shapes: css`
    display: grid;
    /* Falls back to one column when the drawer is narrow: two cards at 1fr
       each squeeze the description into four-word lines long before the
       drawer is unusably small. */
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 12px;
    /* The block below is a labelled field; without this its label sits flush
       against the card border and reads as part of the card. */
    margin-bottom: 16px;
    .shape {
      border: 1px solid var(--ant-color-border);
      border-radius: 8px;
      padding: 12px 14px;
      cursor: pointer;
      transition: all 0.2s;
      &:hover:not(.disabled) {
        border-color: var(--ant-color-primary-border-hover);
      }
      &.active {
        border-color: var(--ant-color-primary);
        background-color: var(--ant-color-primary-bg);
      }
      &.disabled {
        cursor: not-allowed;
        opacity: 0.6;
      }
      .shape-title {
        font-size: 14px;
        font-weight: 500;
        color: var(--ant-color-text);
      }
      .shape-desc {
        margin-top: 4px;
        font-size: 12px;
        line-height: 1.6;
        color: var(--ant-color-text-tertiary);
      }
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
  // 🆕 Every GPU-bearing role has its own "Resources and scheduling" override,
  // so the model-level card would show the same two fields a second time — and
  // the role card's "Same as model" would point at it. Removed under PD, and
  // the fields *cleared* rather than only hidden: a hidden value that still
  // projects onto every role is worse than a cluttered form, because nothing
  // on screen explains why all three members landed on the same labelled
  // workers.
  clearModelScheduling?: boolean;
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
  const workerList = useAtomValue(workerListAtom);

  // The shape as it is deployed right now, read from what the drawer opened
  // with rather than from the live form — the whole point of the badge is to
  // survive the user changing their selection. `roles` is the signal because
  // it is the field that actually makes a deployment disaggregated; `pdMode`
  // is a UI-only flag that a saved model does not carry.
  const currentShape = useMemo(() => {
    if (!initialValues) {
      return null;
    }
    return (initialValues as any)?.roles?.length
      ? PDEnableValueMap.Disaggregated
      : PDEnableValueMap.Off;
  }, [initialValues]);

  const backend = Form.useWatch('backend', form);
  const clusterId = Form.useWatch('cluster_id', form);
  const mode = Form.useWatch(['disaggregation', 'mode'], form);
  // Read-only reads of other sections: the role ratio and the model-level cache
  // are owned elsewhere, this block only reflects them.
  // See the note in forms/roles/index.tsx: without `preserve` this reads only
  // registered fields, and `roles` is written straight into the store.
  const roles = Form.useWatch('roles', { form, preserve: true });
  const kvCacheEnabled = Form.useWatch(['extended_kv_cache', 'enabled'], form);

  // The toggle is deliberately NOT a form field: with `roles` empty the
  // block must leave the form store exactly as it found it, and an off state
  // written anywhere would ride the submit. Everything PD writes is registered
  // below, inside the enabled branch only.
  const [enabled, setEnabled] = useState(
    isPDModel({ roles: initialValues?.roles }) ||
      !!initialValues?.disaggregation?.mode
  );
  const [cacheCleared, setCacheCleared] = useState(false);
  // Turning PD off drops `disaggregation` entirely, mode included. Coming back
  // in therefore lands on an empty required field with nothing to explain it,
  // which reads as the form having lost the value by accident. Remembered on
  // the way out so the way in can say so.
  const [modeCleared, setModeCleared] = useState(false);

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
    clearModelScheduling?: boolean;
    /**
     * The catalog to resolve `modeData` against, when the caller has just
     * fetched it.
     *
     * Needed because `findMode` closes over `pdModes` state: awaiting the
     * fetch does not re-render inside the same tick, so a caller that awaits
     * and then notifies would still resolve against the empty list it started
     * with — and `modeData` would stay undefined for the life of the form.
     */
    modes?: PDMode[];
  }) => {
    const resolve = (name: string | null) =>
      next.modes
        ? next.modes.find((mode) => mode.name === name)
        : findMode(name);
    onEffectsChange?.({
      enabled: next.enabled,
      mode: next.enabled ? next.mode : null,
      modeData: next.enabled ? resolve(next.mode) : undefined,
      isCustomMode: next.enabled && isCustomMode(next.mode),
      replicasLocked: next.enabled,
      replicasLockReason: next.enabled
        ? intl.formatMessage({ id: 'models.form.pd.replicas.moved' })
        : undefined,
      scalingDisabled: next.enabled,
      scalingDisabledReason: next.enabled
        ? intl.formatMessage({ id: 'models.form.pd.disabled.schedule' })
        : undefined,
      clearModelKVCache: next.clearModelKVCache,
      clearModelScheduling: next.clearModelScheduling
    });
  };

  /**
   * The server's derived answer, and whether the user has opened the picker.
   *
   * Grouped: they always change together, and the picker's visibility is a
   * function of the answer (no answer ⇒ the picker is the only way forward).
   */
  const [derived, setDerived] = useState<{
    resolution: PDModeResolution | null;
    pickerOpen: boolean;
  }>({ resolution: null, pickerOpen: false });

  // A resolve in flight is invalidated by any later change to its inputs.
  // Without this a slow answer for the previous engine lands after the fast
  // answer for the current one and silently overwrites the mode field.
  const resolveSession = useRef(0);

  /**
   * One atomic write: local state, the form field, and the published effects.
   *
   * 🔑 **No fallback.** When the server derives nothing the field is left
   * empty and the picker opens — never quietly set to `custom`. Choosing
   * `custom` means "I will supply the connection parameters myself", which is
   * not a decision the platform can make on the user's behalf.
   */
  const applyResolution = (resolution: PDModeResolution, modes?: PDMode[]) => {
    setDerived({ resolution, pickerOpen: !resolution.mode });
    if (!resolution.mode) {
      return;
    }
    form.setFieldsValue({
      disaggregation: {
        ...(form.getFieldValue('disaggregation') || {}),
        mode: resolution.mode,
        vendor: resolution.vendor ?? undefined
      }
    });
    notifyEffects({
      enabled: true,
      mode: resolution.mode,
      clearModelKVCache: false,
      modes
    });
  };

  /**
   * Show the picker unless there is an answer to show instead.
   *
   * Derived rather than stored: the stored flag alone left the field hidden
   * whenever `resolution` was null — which is every render before the first
   * answer lands, and every render after a failed one. A required field that
   * renders nothing is worse than one that asks a question.
   */
  const pickerVisible = derived.pickerOpen || !derived.resolution?.mode;

  const runResolve = async (overrides?: { vendor?: string }) => {
    const session = ++resolveSession.current;
    try {
      const resolution = await resolvePDMode({
        cluster_id: clusterId,
        backend,
        vendor:
          overrides?.vendor ?? form.getFieldValue(['disaggregation', 'vendor'])
      });
      if (resolveSession.current !== session) {
        return;
      }
      applyResolution(resolution);
    } catch (error) {
      // An older server has no /resolve. Fall back to the full picker rather
      // than to a field that renders nothing: the catalog is already loaded,
      // so the dropdown still works — only the derivation is missing.
      if (resolveSession.current === session) {
        setDerived({ resolution: null, pickerOpen: true });
      }
    }
  };

  // The inputs the answer is a function of. Not a request-function
  // dependency (which the repo's conventions forbid) — these are the values
  // whose change *is* the action, and this component only watches them
  // because the engine and cluster fields belong to a sibling section.
  useEffect(() => {
    if (!active) {
      resolveSession.current += 1;
      setDerived({ resolution: null, pickerOpen: false });
      return;
    }
    runResolve();
  }, [active, backend, clusterId]);

  // Mount is the one transition no handler can report: editing a model that is
  // already disaggregated arrives with its replicas locked and its mode
  // dropdown already open, so the catalog is fetched here too. Mount only (a
  // lifecycle entry point, not a dependency) — every later change comes from a
  // handler below, and a form that opens with PD off fetches nothing.
  useEffect(() => {
    // The catalog has to land *before* the effects that read it are published:
    // an edit drawer opens with the mode already chosen, so `modeData` is
    // resolved exactly once here. Notifying first and fetching after left the
    // managed router with no derived image, command or health path — rendered
    // as "-", which reads as "the system derived nothing" rather than as
    // "the catalog has not arrived".
    const seed = async () => {
      const modes = active ? await getPDModes() : undefined;
      notifyEffects({
        enabled: active,
        mode: form.getFieldValue(['disaggregation', 'mode']) ?? null,
        clearModelKVCache: false,
        modes
      });
    };
    seed();
  }, []);

  const handleEnableChange = async (value: string) => {
    const next = value === PDEnableValueMap.Disaggregated;
    // The model-level cache does not survive the switch: its benefit is
    // asymmetric between prefill and decode, so a model-level setting would
    // hand decode a cost it cannot use. The mount site clears it; the notice
    // below is what makes that visible.
    const clearModelKVCache = next && !!kvCacheEnabled;
    // Only on the way in. Turning PD off leaves the roles behind too, so
    // re-clearing would wipe values the user is about to see again.
    const clearModelScheduling = next;
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
      setModeCleared(!!form.getFieldValue(['disaggregation', 'mode']));
      form.setFieldValue('roles', null);
      form.setFieldValue('disaggregation', null);
    }
    setEnabled(next);
    setCacheCleared(clearModelKVCache);
    notifyEffects({
      enabled: next,
      mode: form.getFieldValue(['disaggregation', 'mode']) ?? null,
      clearModelKVCache,
      clearModelScheduling
    });
    // Let the conditional fields register/unregister first: what the form hands
    // out is what is mounted at that moment.
    await new Promise((resolve) => {
      setTimeout(resolve, 100);
    });
    onValuesChange?.({}, form.getFieldsValue());
  };

  const handleModeChange = (value: string) => {
    // The notice has done its job once a mode is chosen again.
    setModeCleared(false);
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

  /**
   * The share of requests whose prefill and decode land on the same host, as a
   * percentage — or null when the group is small enough that nobody is
   * surprised.
   *
   * `P(same host) = 1/x` where x is the prefill count, and it depends on
   * neither the topology nor the gather choice: the router pairs a request with
   * some prefill and some decode, and only one of x prefills is the one sitting
   * next to the chosen decode. So a perfectly declared fabric still pairs
   * on-host 1/8 of the time at 8P8D. Surfaced above the threshold only, because
   * at 1P1D or 2P2D the number is high enough to need no comment and a notice
   * on every deployment is a notice nobody reads.
   */
  const largeGroupPairing = (() => {
    const prefillReplicas = Number(
      (roles || []).find((r: RoleFormItem) => r.name === RoleValueMap.Prefill)
        ?.replicas ?? 0
    );
    if (!prefillReplicas || prefillReplicas < 4) {
      return null;
    }
    return Math.round((1 / prefillReplicas) * 100);
  })();

  // Options come from the catalog, gated by engine *and* by the accelerators
  // the picked cluster actually has: a recipe that targets another engine or
  // another accelerator stays visible but disabled, carrying why.
  const clusterVendors = Array.from(
    new Set(
      workerList
        .filter((worker) => worker.cluster_id === clusterId)
        .flatMap((worker) => worker.vendors || [])
    )
  );
  const modeOptions = buildOptions(backend, clusterVendors);

  // Every built-in recipe is unavailable for this engine × accelerator pair,
  // leaving only Custom. The per-option reasons already say *why* each one is
  // out; this is the summary that tells the user the DIY path is still open —
  // without it the dropdown reads as "PD is broken here".
  //
  // 🔑 Deliberately NOT a block-level gate: an unsupported pair means "no
  // built-in recipe", not "no PD". Custom injects nothing, so writing the
  // connector, ports and handshake variables by hand stays available on any
  // accelerator (see the note on `custom` in the mode catalog).
  /**
   * What the picker actually lists.
   *
   * Ineligible recipes are hidden rather than shown disabled. They used to be
   * kept visible on the reasoning that an unpickable option still tells you
   * the capability exists — but once the mode is *derived*, the picker is an
   * escape hatch, and three greyed rows with explanations are noise in it.
   * The one case that reasoning was protecting is covered by the summary note
   * below: when nothing built-in fits, it says so and points at Custom.
   *
   * 🔑 **The selected value is never hidden.** Editing a model deployed on
   * Ascend from a context whose cluster is NVIDIA would otherwise drop its
   * mode from the list, leaving the Select empty and silently discarding what
   * is actually deployed. Kept — and it is exactly the row where the
   * ineligible reason is worth reading.
   */
  const visibleModeOptions = modeOptions.filter(
    (option) => !option.disabled || option.value === mode
  );

  const onlyCustomLeft =
    modeOptions.length > 0 &&
    modeOptions
      .filter((option) => !isCustomMode(option.value))
      .every((option) => option.disabled);
  /**
   * The reason renders *inline*, not in a Tooltip.
   *
   * A disabled antd option carries `pointer-events: none`, so it never
   * receives the hover a Tooltip needs — the reason would exist in the tree
   * and be unreachable, which reads to the user exactly like the greying-out
   * having no explanation at all. Inline also matches what the reason is for:
   * "kept visible but disabled, carrying why" only pays off if the why is
   * visible without a discovery step.
   */
  const modeOptionRender = (option: any) => {
    const reason = option?.data?.reason;
    const label = option?.data?.label ?? option?.label;
    if (!reason) {
      return label;
    }
    return (
      <Flex vertical gap={2}>
        <span>{label}</span>
        <span
          style={{
            fontSize: 12,
            lineHeight: 1.4,
            color: 'var(--ant-color-text-tertiary)',
            whiteSpace: 'normal'
          }}
        >
          {reason}
        </span>
      </Flex>
    );
  };

  return (
    <div className={styles.sectionCard} data-field="pdMode">
      {/* Which shape is deployed today, so an edit that switches away still
          says what it is switching away from. Absent on create, where there is
          nothing current yet. */}
      <div className={styles.shapes}>
        {[
          {
            value: PDEnableValueMap.Off,
            title: intl.formatMessage({ id: 'models.form.pd.shape.mono' }),
            desc: intl.formatMessage({ id: 'models.form.pd.shape.mono.tips' })
          },
          {
            value: PDEnableValueMap.Disaggregated,
            title: intl.formatMessage({ id: 'models.form.pd.shape.pd' }),
            desc: intl.formatMessage({ id: 'models.form.pd.shape.pd.tips' })
          }
        ].map((shape) => {
          const selected =
            (active ? PDEnableValueMap.Disaggregated : PDEnableValueMap.Off) ===
            shape.value;
          // Only the disaggregated card can be blocked; the plain shape is
          // always available, and greying out the way back would trap a
          // deployment in a state its backend cannot serve.
          const unavailable =
            blocked && shape.value === PDEnableValueMap.Disaggregated;
          const card = (
            <div
              key={shape.value}
              className={`shape${selected ? ' active' : ''}${
                unavailable ? ' disabled' : ''
              }`}
              role="radio"
              aria-checked={selected}
              tabIndex={unavailable ? -1 : 0}
              onClick={() => !unavailable && handleEnableChange(shape.value)}
              onKeyDown={(e) => {
                if (!unavailable && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault();
                  handleEnableChange(shape.value);
                }
              }}
            >
              <Flex align="center" gap={8}>
                <Radio checked={selected} disabled={unavailable}></Radio>
                <span className="shape-title">{shape.title}</span>
                {currentShape === shape.value && (
                  <ThemeTag opacity={0.75}>
                    {intl.formatMessage({ id: 'models.form.pd.shape.current' })}
                  </ThemeTag>
                )}
              </Flex>
              <div className="shape-desc">{shape.desc}</div>
            </div>
          );
          return unavailable ? (
            <Tooltip key={shape.value} title={blockedReason || false}>
              {card}
            </Tooltip>
          ) : (
            card
          );
        })}
      </div>

      {active && (
        <>
          {/* The toggle's own state, registered only while on so the off
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
          {/* The vendor is a *placement* constraint, not a preference: a PD
              group cannot span accelerator vendors, so a mixed cluster has to
              be told which partition to use. Kept out of sight in the common
              single-vendor case, where the server derives it. */}
          <Form.Item name={['disaggregation', 'vendor']} hidden noStyle>
            <input />
          </Form.Item>
          {derived.resolution &&
            derived.resolution.candidate_vendors.length > 1 && (
              <Form.Item>
                <SealSelect
                  required
                  label={intl.formatMessage({
                    id: 'models.form.pd.vendor'
                  })}
                  description={intl.formatMessage({
                    id: 'models.form.pd.vendor.tips'
                  })}
                  value={form.getFieldValue(['disaggregation', 'vendor'])}
                  options={derived.resolution.candidate_vendors.map(
                    (vendor) => ({ label: vendor, value: vendor })
                  )}
                  onChange={(vendor: string) => {
                    form.setFieldsValue({
                      disaggregation: {
                        ...(form.getFieldValue('disaggregation') || {}),
                        vendor
                      }
                    });
                    runResolve({ vendor });
                  }}
                ></SealSelect>
              </Form.Item>
            )}
          {/* The derived answer, shown as a conclusion rather than asked as a
              question. Phase 1 ships recipes for three engine × accelerator
              cells; two have a single candidate and the third has a declared
              preference, so none of them needs the user to choose. The picker
              below stays one click away — and opens by itself when the server
              derives nothing. */}
          {!pickerVisible && derived.resolution?.mode && (
            <Flex align="center" gap={8} style={{ marginBottom: 16 }}>
              <span>
                {intl.formatMessage(
                  { id: 'models.form.pd.mode.derived' },
                  {
                    mode:
                      transportLabel(findMode(derived.resolution.mode)) ||
                      derived.resolution.mode,
                    vendor: derived.resolution.vendor
                  }
                )}
              </span>
              <Button
                type="link"
                size="small"
                onClick={() =>
                  setDerived((prev) => ({ ...prev, pickerOpen: true }))
                }
              >
                {intl.formatMessage({ id: 'common.button.edit' })}
              </Button>
            </Flex>
          )}
          {derived.resolution?.unresolved_reason && (
            <div className="note note-warning" style={{ marginBottom: 8 }}>
              {derived.resolution.unresolved_reason}
            </div>
          )}
          {/* The single entry point for every connection-state parameter:
              connector, ports and peer addresses are all derived from the
              mode, and none of them is a field. Registered even while
              collapsed: the field carries the derived value, so unmounting it
              would drop what `applyResolution` just wrote. */}
          <Form.Item
            name={['disaggregation', 'mode']}
            hidden={!pickerVisible}
            rules={[
              {
                required: true,
                message: getRuleMessage('select', 'models.form.pd.mode')
              }
            ]}
          >
            <SealSelect
              required
              // No placeholder: this field's label floats *inside* the input,
              // so an empty value renders the label and the placeholder on
              // top of each other. Every other SealSelect in this form passes
              // label alone for the same reason.
              label={intl.formatMessage({ id: 'models.form.pd.mode' })}
              description={intl.formatMessage({
                id: 'models.form.pd.mode.tips'
              })}
              options={visibleModeOptions}
              optionRender={modeOptionRender}
              onChange={handleModeChange}
            ></SealSelect>
          </Form.Item>
          <Flex vertical gap={4}>
            {/* §2.5.4: P(same host) = 1/x, and it depends on neither the
                topology nor the gather choice — so at 8P8D even a perfectly
                declared fabric pairs on-host about 12% of the time. Told here
                because the alternative is finding out from a latency graph a
                week later. Non-blocking on purpose: the deployment is fine,
                it is the expectation that needs correcting. */}
            {largeGroupPairing !== null && (
              <div className="note">
                {intl.formatMessage(
                  { id: 'models.form.gather.largeGroup' },
                  { percent: largeGroupPairing }
                )}
              </div>
            )}
            {!pdCapableBackend && backend && (
              <div className="note">
                {intl.formatMessage({ id: 'models.form.pd.disabled.backend' })}
              </div>
            )}
            {pdCapableBackend && onlyCustomLeft && (
              <div className="note">
                {intl.formatMessage({ id: 'models.form.pd.mode.only.custom' })}
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
            {modeCleared && !mode && (
              <div className="note">
                {intl.formatMessage({ id: 'models.form.pd.mode.cleared' })}
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
