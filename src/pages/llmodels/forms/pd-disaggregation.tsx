import { workerListAtom } from '@/atoms/models';
import {
  LabelInfo,
  Select as SealSelect,
  useAppUtils
} from '@gpustack/core-ui';
import { useIntl } from '@umijs/max';
import { Flex, Form, Switch, Tooltip } from 'antd';
import { createStyles } from 'antd-style';
import { useAtomValue } from 'jotai';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { resolvePDMode } from '../apis';
import { PD_CAPABLE_BACKENDS, PDEnableValueMap, RoleValueMap } from '../config';
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
  /* 🔴 No frame of its own any more. This block used to be a standalone
     section and drew its own card; it is now mounted inside the
     group-settings card, so its border made «传输方案» a box inside a box
     inside a box — the field's own outline being the third. The class stays
     because the `.note` rules below hang off it. */
  sectionCard: css`
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
  // One switch, not two cards. The earlier version was a two-card radio, on
  // the argument that "PD off / on" hides a trade-off two labelled shapes
  // carry in the choice itself. In review that argument lost to a simpler
  // one: the second card only ever restated what every non-PD deployment
  // already is, and it did so at the top of the form where it cost a third of
  // the visible height. The trade-off now lives in the switch's own
  // description plus the notes below it.
  /**
   * The switch row.
   *
   * 🔴 The top gap is `padding`, not `margin`, and that is the whole point.
   * «后端版本» renders a 78px-tall control where every other field is 54 —
   * the extra 24 belongs to the control itself, not to a margin — so its
   * `.ant-form-item` bottom edge sits flush against its content and the
   * `margin-bottom: 24px` it carries produces no space at all against the
   * next element (measured three times: gap 0 here, 24 between every other
   * pair). Margins on *this* row cannot fix that; they collapse into the same
   * nothing. Padding is inside this box and always renders.
   */
  toggleRow: css`
    padding: 22px 2px 0;
    min-height: 32px;
  `,
  modeId: css`
    font-size: 12px;
    font-family: var(--ant-font-family-code);
    color: var(--ant-color-text-tertiary);
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
  // 🆕 Same argument as `clearModelScheduling`, applied to the other pair the
  // role card duplicates: every role carries its own backend parameters and
  // env, so the model-level copies in "Advanced" showed the same two controls
  // a second time. Removed under PD, and *cleared* rather than hidden —
  // `role_effective_model` projects a model-level value onto any role that has
  // none, so a leftover `--tensor-parallel-size` would silently constrain all
  // three members with nothing on screen saying where it came from.
  clearModelParams?: boolean;
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
   * Which half of this block to render.
   *
   * `toggle` is the switch alone, mounted in the replica field's label row;
   * `body` is everything the switch reveals (vendor, transport picker, notes),
   * mounted in the group-settings card down in Roles. Two instances, one truth:
   * `enabled` is derived from `roles`, so neither owns it.
   *
   * Only the `toggle` instance runs the enable sequence and publishes effects —
   * the body would publish the same thing a second time.
   */
  variant?: 'toggle' | 'body';
  /**
   * A precondition this section cannot see (hostNetwork once it becomes a
   * field, a tenant quota, ...). Non-empty disables the whole block and is
   * shown as the reason; it wins over the conditions derived here.
   */
  disabledReason?: string;
  onEffectsChange?: (effects: PDEffects) => void;
  /**
   * The transport choice alone, for the `body` mount point.
   *
   * Deliberately not `onEffectsChange`: see `handleModeChange`. The body knows
   * which recipe was picked and nothing else about the form's PD state.
   */
  onModeChange?: (mode: string | null, data?: PDMode) => void;
}

const PDDisaggregation: React.FC<PDDisaggregationProps> = (props) => {
  const {
    disabledReason,
    onEffectsChange,
    onModeChange,
    variant = 'toggle'
  } = props;
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
  const { pdModes, getPDModes, buildOptions, isCustomMode, findMode } =
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

  /**
   * On/off is DERIVED from `roles`, not held in local state.
   *
   * The earlier version kept a `useState`, on the argument that the toggle must
   * not write anything to the form store while off. That argument still holds
   * — and `roles` already satisfies it: turning PD on seeds it, turning PD off
   * sets it back to `null`, and a plain model never had it. So the store is
   * untouched either way and there is nothing to keep in sync.
   *
   * 🔑 What forced the change: the switch now lives in the replica field's
   * label row (`basic.tsx`) while the transport picker lives down in the group
   * settings card, so «PD 开着吗» is asked from two places. Two components
   * cannot share one `useState`, but they can read one field.
   */
  const enabled =
    // The watch, for re-renders...
    !!(roles as RoleFormItem[] | undefined)?.length ||
    // ...and a synchronous store read, for the FIRST render. `useWatch`
    // subscribes after the initial render, so on that render it answers
    // `undefined` even when the store holds a seeded group. Deriving from the
    // watch alone therefore reported «PD off» once, and the mount effect
    // published that — which is what made an edit drawer on an existing group
    // open with its roles tab missing.
    !!form.getFieldValue('roles')?.length ||
    !!form.getFieldValue(['disaggregation', 'mode']);
  // 🔴 `isPDModel({ roles: initialValues?.roles })` used to be a third clause
  // here, as a further fallback for that first render. It made the switch
  // impossible to turn OFF while editing an existing group: `initialValues`
  // never changes, so however thoroughly `handleEnableChange` cleared the
  // store, this clause answered "still on" and the switch snapped back. The
  // symptom was exactly the contradiction the comment above `active`
  // describes — blue switch, everything else in the off state — but reached
  // from the other direction, and only on edit, which is why turning PD *on*
  // during a create always looked fine.
  //
  // It was redundant as well as wrong: `roles` reaches the form through
  // `use-form-initial-values`, so the store read one line up already answers
  // for an edit on the first render.
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

  /**
   * Reasons PD *cannot* run at all, which is the only thing that may disable
   * the switch. Both are statements about capability, not about today's
   * occupancy: llama-box has no PD recipe in existence, and `disabledReason`
   * is passed in by a caller that knows the form cannot offer it.
   */
  const blockedReason =
    disabledReason ||
    (ggufBlocked
      ? intl.formatMessage({ id: 'models.form.pd.disabled.gguf' })
      : '');
  const blocked = !!blockedReason;

  /**
   * Not enough free accelerators for the smallest group — a warning, never a
   * gate.
   *
   * 🔴 It used to disable the switch, and that was wrong twice over. It
   * contradicted this very form, where every other capacity shortfall is
   * non-blocking: pick a gather tier nothing can hold and it saves, with
   * «保存后组会一直等待，直到有空位». And it was self-defeating — the message
   * tells the operator to reduce replicas or change the card type, and both
   * of those live *behind* the switch it was holding shut.
   *
   * Capacity is also the most temporary fact on this screen: a group
   * configured now and admitted when a node frees up is an ordinary
   * workflow, not a mistake to be prevented.
   */
  const capacityShortfall =
    usableGpus !== null && usableGpus < PD_MIN_GPUS
      ? intl.formatMessage(
          { id: 'models.pd.admission.infeasible' },
          {
            required: `${PD_MIN_GPUS} ${gpuLabel}`,
            available: `${usableGpus} ${gpuLabel}`
          }
        )
      : '';

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

  /**
   * 🔴 `blocked` no longer un-sets the displayed state.
   *
   * It used to: `active = enabled && !blocked`, on the argument that a blocked
   * cluster must not leave a «PD is on» form behind. That conflates two
   * different things — «你不能打开它» and «它没有打开» — and the edit path is
   * where the difference shows. A cluster whose workers are all offline
   * reports zero usable GPUs, so opening an existing 1P1D group on it rendered
   * every piece of PD config (role chips, the Roles tab, the group settings
   * card) with the switch showing OFF. The form contradicted itself, and the
   * half that was wrong was the one control the user would reach for.
   *
   * So the displayed state is the truth, and `blocked` only governs what the
   * user may *do*: it disables turning PD ON, never turning it off (greying
   * out the way back would trap a deployment in a state its backend cannot
   * serve), and it carries its reason next to the switch.
   */
  const active = enabled;

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
      clearModelParams: next.enabled,
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
  }>({ resolution: null });

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
    setDerived({ resolution });
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
      // The derived truth, not a literal. Hardcoding `true` here was the other
      // half of the contradiction above: the resolve path published «PD is on»
      // while the switch, gated on `blocked`, rendered OFF — so the config
      // below appeared for a group whose own toggle denied it.
      enabled: active,
      mode: resolution.mode,
      clearModelKVCache: false,
      modes
    });
  };

  /**
   * @param modes The catalog the caller has just fetched, when it has.
   *
   * 🔴 Load-bearing, and its absence was a silent defect. `applyResolution`
   * resolves the recipe name it publishes into the catalog ENTRY, and without
   * this it falls back to `findMode`, which closes over the `pdModes` state of
   * the render it was created in. `resolveWithCatalog` awaits `getPDModes()`
   * and then calls this — but awaiting does not re-render inside the same
   * tick, so that closure still saw the empty list it started with. Result:
   * `modeData` published as `undefined` on every path, and every consumer of
   * it rendered nothing — the roles' system-managed rows most visibly, which
   * showed an empty «引擎参数与环境变量» card for a mode that injects six
   * things.
   */
  const runResolve = async (
    overrides?: { vendor?: string },
    modes?: PDMode[]
  ) => {
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
      applyResolution(resolution, modes);
    } catch (error) {
      // An older server has no /resolve. Fall back to the full picker rather
      // than to a field that renders nothing: the catalog is already loaded,
      // so the dropdown still works — only the derivation is missing.
      if (resolveSession.current === session) {
        setDerived({ resolution: null });
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
      setDerived({ resolution: null });
      return;
    }
    /**
     * 🔴 The catalog is fetched HERE, not only on mount.
     *
     * The mount-only fetch below was written for one instance of this block.
     * With the switch and the body split across two mount points, the body
     * mounts inside Roles — and on its first render `Form.useWatch('roles')`
     * has not subscribed yet, so `active` is still false and the mount-only
     * fetch skips. It never re-runs, so `pdModes` stayed empty for the life of
     * the form: the transport line fell back to the raw recipe name
     * («vllm-ascend-mooncake» instead of «Mooncake») and the picker had no
     * options at all — `custom` included.
     *
     * `active` flipping false→true IS the action here, which is why this
     * belongs on this effect rather than on a fetch-function dependency.
     */
    const resolveWithCatalog = async () => {
      // Held in a local, not read back off state: the fetch below does not
      // re-render before the next line runs.
      const modes = pdModes.length ? pdModes : await getPDModes();
      await runResolve(undefined, modes);
    };
    resolveWithCatalog();
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
    let modes: PDMode[] | undefined;
    if (next) {
      // Opening the branch IS the action, so this is where the catalog request
      // belongs — the drawer's open is not this component's to hook. Awaited
      // and carried, for the same reason `runResolve` carries it: the
      // notification below resolves a recipe name against it.
      modes = await getPDModes();
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
    // No `setEnabled`: `roles` above IS the state, and the watch re-renders
    // both the switch and this body from it.
    setCacheCleared(clearModelKVCache);
    notifyEffects({
      enabled: next,
      mode: form.getFieldValue(['disaggregation', 'mode']) ?? null,
      clearModelKVCache,
      clearModelScheduling,
      modes
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
    /**
     * 🔴 The picker lives in the BODY, and the body is mounted without
     * `onEffectsChange` — so the line above reaches nobody and choosing a
     * transport published nothing at all.
     *
     * Wiring the full callback here is what one reaches for and it is wrong:
     * the body's mount effect publishes `enabled` too, and on its first render
     * `Form.useWatch('roles')` has not subscribed yet, so it would publish
     * `enabled: false` — unmounting the panel it lives in. This narrow one
     * carries only the choice that was just made, which is the only thing this
     * mount point knows better than the switch does.
     */
    onModeChange?.(value ?? null, findMode(value));
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
  /**
   * The closed control: the transport, then the recipe id as an annotation.
   *
   * The transport is what the reader is choosing between — «Mooncake» vs
   * «NIXL» is the decision. The recipe id (`vllm-ascend-mooncake`) is the
   * platform's identifier for the whole injected bundle, and it earns its
   * place only as a subordinate note: two recipes can share a transport, so
   * without it «Mooncake» alone would not say which one is deployed. Grey and
   * monospaced so it reads as an id rather than as a second label.
   */
  const modeLabelRender = (option: any) => {
    const mode = findMode(option?.value);
    const transport = transportLabel(mode);
    return (
      <Flex align="baseline" gap={8}>
        <span>{transport || option?.value}</span>
        {!!transport && option?.value !== transport && (
          <span className={styles.modeId}>{option.value}</span>
        )}
      </Flex>
    );
  };

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

  /**
   * The switch, and nothing else.
   *
   * Rendered as the first row of the «PD 分离配置» panel, above everything it
   * turns on. Sized for that row: no title, no card, the label carrying the
   * name of the decision.
   *
   * ⚠️ The caller must keep this mounted across a flip — in practice, an
   * unconditional collapse item with `forceRender`. Its mount effect
   * publishes `enabled` from a first render whose `roles` watch has not
   * resolved (i.e. `false`), so a toggle that remounts when PD turns on
   * immediately turns it back off, leaving the switch blue and the rest of
   * the form in the off state.
   */
  if (variant === 'toggle') {
    const toggle = (
      // A row of its own, label left and switch right, like every other
      // full-width field around it. It used to be an inline pair overlaid on
      // the replica input's label line — that read as a property *of* the
      // replica count rather than as the deployment-shape decision it is.
      <Flex
        align="center"
        justify="space-between"
        gap={8}
        className={styles.toggleRow}
        data-field="pdMode"
      >
        <LabelInfo
          label={intl.formatMessage({ id: 'models.form.pd.shape.pd' })}
          description={intl.formatMessage({ id: 'models.form.pd.enable.tips' })}
        ></LabelInfo>
        <Switch
          checked={active}
          // Blocked only bars the way IN. An existing group must always be
          // able to turn itself off.
          disabled={blocked && !enabled}
          onChange={(next) =>
            handleEnableChange(
              next ? PDEnableValueMap.Disaggregated : PDEnableValueMap.Off
            )
          }
        />
      </Flex>
    );
    /* The reason has to be reachable, and a disabled Switch never receives
       hover on touch — so the tooltip wraps the label too, which is not
       disabled.

       Carries the capacity shortfall as well, which no longer disables
       anything: the operator can turn PD on regardless, and this is where
       they find out the group will wait for room. Once it is on, the body
       repeats it as a standing note — a tooltip is for the moment before the
       decision, not for living with its consequence. */
    const hint = blockedReason || capacityShortfall;
    const withHint = hint ? <Tooltip title={hint}>{toggle}</Tooltip> : toggle;
    /* Wrapped in a `Form.Item` with no `name`, purely for layout.
     *
     * 🔴 Hand-written margins did not work here. Every neighbour is a
     * `Form.Item` spacing itself with `margin-bottom: 24px`, and that worked
     * between any two of them — but «后端版本» renders 24px taller than the
     * rest and its bottom margin produced *no* space against a plain `div`
     * (measured: gap 0 above this row, while every other gap was exactly 24).
     * Rather than chase which margin was being eaten, this row became the
     * same kind of box as its neighbours, which is the only way it cannot
     * drift from them again.
     *
     * ⚠️ Unconditional, like the row it wraps. A wrapper that appeared and
     * disappeared would remount the switch and refire its mount effect —
     * see `pdToggle` in `basic.tsx` for what that costs. */
    return <Form.Item style={{ marginBottom: 3 }}>{withHint}</Form.Item>;
  }

  return (
    <div className={styles.sectionCard} data-field="pdMode">
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
          {/* 🔴 The read-only line and the «更换传输方案» link are gone.
              They existed to keep a derived answer from looking like a
              question: a Select on a value the platform decided invites
              second-guessing. But it cost two controls where the form has one
              everywhere else, and the affinity field right below it — the same
              kind of choice at a finer grain — was already a Select. Two
              controls for one topic, in two different shapes, read as two
              topics. The Select IS the picker now. */}
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
              labelRender={modeLabelRender}
              onChange={handleModeChange}
            ></SealSelect>
          </Form.Item>
          <Flex vertical gap={4}>
            {/* The capacity shortfall, repeated here as a standing note.
                The switch's tooltip said it once, before the decision; this
                is what the operator lives with afterwards, and it is the
                only place that survives a reopened drawer. Warning-coloured
                but non-blocking — the group saves and waits for room, the
                same as every other capacity shortfall in this form. */}
            {capacityShortfall && (
              <div className="note note-warning">{capacityShortfall}</div>
            )}
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
