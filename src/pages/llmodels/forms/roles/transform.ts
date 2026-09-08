import _ from 'lodash';
import {
  ManualGPUModeMap,
  OverrideGroupFields,
  OverrideGroupMap,
  RoleOrder,
  RoleValueMap,
  ScheduleValueMap
} from '../../config';
import { RoleFormItem, RoleSpec } from '../../config/types';
import { generateGPUIds, generateGPUSelector } from '../../utils';

// The keys a role carries only so the form can render it. None of them exists
// on `RoleSpec`, so all of them have to come off before submit — the same job
// `handleOk` does for the model-level `scheduleType` / `manualGpuMode` pair.
const UI_ONLY_KEYS = [
  'overrides',
  'managed',
  'scheduleType',
  'manualGpuMode',
  // `RoleSpec` has no `placement_strategy`; a role always runs the model's.
  'placement_strategy'
];

// Every field the payload may carry, in `RoleSpec` order. Anything outside
// this list is dropped rather than passed through, which is what keeps the
// transform total: a field added to the form by mistake cannot reach the API.
const PAYLOAD_FIELDS = _.flatten(Object.values(OverrideGroupFields));

/**
 * Whether an override group is switched on for a role, derived from the spec.
 *
 * A group is "custom" exactly when at least one of its fields carries a value:
 * `null` is the wire's word for inherit, so a group of nulls is a group left
 * on "same as model" and the switch must come back off.
 */
const isGroupOverridden = (role: RoleSpec, group: string) =>
  OverrideGroupFields[group].some((field) => {
    const value = (role as Record<string, any>)[field];
    if (value == null) {
      return false;
    }
    // An empty array/object round-trips as "nothing set". Treating `[]` as an
    // override would turn an untouched role into a custom one that submits an
    // empty parameter list, i.e. it would erase the model's parameters.
    if (_.isArray(value) || _.isPlainObject(value)) {
      return !_.isEmpty(value);
    }
    return true;
  });

/**
 * `RoleSpec[]` (the wire) → `RoleFormItem[]` (the form).
 *
 * Adds the UI-only keys the role tabs need and nothing else: the override
 * switches (derived, never stored), the router's managed flag, and the same
 * `scheduleType` / `manualGpuMode` pair `generateFormValues` derives for the
 * model level — without them a stored per-role GPU selection would render as
 * "Auto" and be submitted away.
 *
 * `gpuOptions` is the cascader's option tree. When it has entries, each role's
 * stored flat GPU ids are lifted back into the `[worker, gpu]` pairs the
 * cascader shows, mirroring what `update-modal` does for the model level. An
 * EMPTY tree means the inventory has not loaded yet, and the ids are left flat
 * for `rehydrateRoleGpuIds` to lift once it has — the caller that opens the
 * edit drawer passes `[]` on purpose, because the options are fetched after
 * the drawer is open.
 *
 * 🔴 The emptiness check is the whole of a bug this had: `[]` is truthy, so an
 * empty tree took the lifting branch, every id failed to find its parent and
 * was dropped, and the role opened with its GPU selector blank while the
 * `gpus_per_replica` beside it still showed. Submitting then wrote that
 * emptiness back.
 */
export const rolesSpecToForm = (
  roles?: RoleSpec[] | null,
  gpuOptions?: any[]
): RoleFormItem[] => {
  if (!roles?.length) {
    return [];
  }
  return roles.map((role) => {
    const overrides = Object.values(OverrideGroupMap).reduce(
      (acc: Record<string, boolean>, group) => {
        // The cache group has no switch, so its flag is never read back; keep
        // it out rather than seeding a control that does not exist.
        if (group !== OverrideGroupMap.Cache) {
          acc[group] = isGroupOverridden(role, group);
        }
        return acc;
      },
      {}
    );

    const isVGPU = !!role.gpu_type_selector?.type;
    const hasGPUSelection = isVGPU || !!role.gpu_selector;
    const gpuSelector = gpuOptions?.length
      ? {
          ...generateGPUSelector(role, gpuOptions).gpu_selector,
          // `generateGPUSelector` only rebuilds the ids; keep the replica
          // width beside them or an edit would silently drop it.
          gpus_per_replica: role.gpu_selector?.gpus_per_replica ?? null
        }
      : role.gpu_selector;

    return {
      ...role,
      gpu_selector: role.gpu_selector
        ? (gpuSelector as any)
        : role.gpu_selector,
      overrides,
      // The router is system-managed unless it carries an image or a command
      // of its own — those two are the whole of what the catalog derives, so
      // their presence IS the user having taken it over.
      ...(role.name === RoleValueMap.Router
        ? { managed: !role.image_name && !role.run_command }
        : {}),
      scheduleType: hasGPUSelection
        ? ScheduleValueMap.Manual
        : ScheduleValueMap.Auto,
      manualGpuMode: isVGPU ? ManualGPUModeMap.VGPU : ManualGPUModeMap.FullGPU
    } as RoleFormItem;
  });
};

/**
 * One role, form shape → wire shape.
 *
 * A group left on "same as model" writes `null` into every field it owns —
 * that null IS the inherit instruction, so the form and the payload are the
 * same shape and no caller has to guess which fields to drop. A group switched
 * to custom passes its fields through the same normalizers the model level
 * uses, so a role's GPU selection serializes exactly like a model's.
 */
const roleFormToPayload = (role: RoleFormItem): RoleSpec => {
  const isRouter = role.name === RoleValueMap.Router;
  const overrides = role.overrides || {};
  // A managed router derives its image and command from the catalog, so it
  // owns none of the engine group; asking for custom is what turns it on.
  const isGroupOn = (group: string) => {
    // A managed router derives its image and command from the catalog, so it
    // owns none of the engine group; asking for custom is what turns it on.
    if (isRouter && group === OverrideGroupMap.Backend) {
      return role.managed === false;
    }
    // The cache group is the one that does not inherit (see role-kv-cache):
    // there is no "same as model" switch for it, so nothing writes an override
    // flag and reading one would null a value the user did fill in.
    if (group === OverrideGroupMap.Cache) {
      return true;
    }
    return !!overrides[group];
  };

  // Normalized once for the whole role: the scheduling group's three fields
  // are mutually exclusive (whole cards vs an InstanceType pool), so they can
  // only be resolved together.
  const scheduling = generateGPUIds(role as any);

  const payload: Record<string, any> = {
    name: role.name,
    // The router is single-replica in this release; everything else is the x
    // and the y of xPyD.
    replicas: isRouter ? 1 : (role.replicas ?? 1)
  };

  Object.entries(OverrideGroupFields).forEach(([group, fields]) => {
    const on = isGroupOn(group);
    fields.forEach((field) => {
      if (!on) {
        payload[field] = null;
        return;
      }
      const value = _.has(scheduling, field)
        ? (scheduling as Record<string, any>)[field]
        : (role as Record<string, any>)[field];
      payload[field] = value === undefined ? null : value;
    });
  });

  // Carried for every router, not only the hand-written one. The checkbox is
  // rendered on the custom branch alone, and emitting the field only where it
  // is rendered meant a managed router's stored value vanished the first time
  // anyone opened the drawer and pressed Save -- a value the form could
  // neither show nor keep. What the user configured has to survive an edit
  // that never touched it, so the stored flag rides through untouched.
  if (isRouter) {
    payload.cpu_only = !!role.cpu_only;
    // Role-own, so it is not in any override group and the loop above never
    // reaches it — and this transform is total by construction, which means a
    // field nobody adds here is a field that silently never leaves the form.
    // Emitted only when something was typed: an object of nulls would read as
    // "declared, and both zero" rather than "take the floor".
    const resources = _.omitBy(role.resources || {}, (v: unknown) => v == null);
    payload.resources = _.isEmpty(resources) ? null : resources;
  }
  if (role.dependencies) {
    payload.dependencies = role.dependencies;
  }

  return payload as RoleSpec;
};

/**
 * `RoleFormItem[]` (the form) → `RoleSpec[] | null` (the payload).
 *
 * `null` for an empty list rather than `[]`: an empty array is a group with no
 * members, while `null` is the plain single-role deployment every model is
 * today — and that path has to stay exactly what it is.
 *
 * Total by construction: the output is assembled from `PAYLOAD_FIELDS`, never
 * spread from the form value, so no UI-only key can leak and no field can be
 * forgotten. Feeding the result back through `rolesSpecToForm` and out again
 * returns the same payload.
 */
export const rolesFormToPayload = (
  roles?: RoleFormItem[] | null
): RoleSpec[] | null => {
  if (!roles?.length) {
    return null;
  }
  return _.sortBy(roles, (role: RoleFormItem) => {
    const index = RoleOrder.indexOf(role.name);
    return index === -1 ? RoleOrder.length : index;
  }).map(roleFormToPayload);
};

/**
 * The role set PD starts from: a homogeneous 1P1D plus its router, every
 * override switch off. This is the "flip a switch and type two numbers" path —
 * the roles inherit the engine, the parameters and the resources from the
 * model, so nothing below is a duplicate of a model-level field.
 */
export const createDefaultRoles = (): RoleFormItem[] =>
  RoleOrder.map((name) => ({
    name,
    replicas: 1,
    overrides: {
      [OverrideGroupMap.Backend]: false,
      [OverrideGroupMap.Parameters]: false,
      [OverrideGroupMap.Scheduling]: false,
      [OverrideGroupMap.Cache]: false
    },
    ...(name === RoleValueMap.Router ? { managed: true } : {}),
    scheduleType: ScheduleValueMap.Auto,
    manualGpuMode: ManualGPUModeMap.FullGPU
  })) as RoleFormItem[];

/**
 * The keys the roles module owns inside a role value. Exported for the mount
 * site's submit path, which strips them from anything it forwards outside this
 * transform.
 */
export const ROLE_UI_ONLY_KEYS = UI_ONLY_KEYS;

/**
 * The fields a role may carry on the wire. Exported for the same reason.
 */
export const ROLE_PAYLOAD_FIELDS = PAYLOAD_FIELDS;

/**
 * Lift each role's flat GPU ids into the cascader's `[worker, gpu]` pairs,
 * once the inventory has actually loaded.
 *
 * The edit drawer opens before the GPU inventory is fetched, so the initial
 * values are built with no options and the ids stay flat (see
 * `rolesSpecToForm`). The model level is re-hydrated when the fetch returns;
 * this is the same step for the roles, which otherwise keep ids the cascader
 * cannot match and render an empty selector over a selection that is really
 * there.
 *
 * Idempotent by shape: an id already lifted is an array, and only strings are
 * looked up — so running this over already-hydrated roles changes nothing.
 * Returns `null` when there is nothing to do, which the caller reads as "no
 * write", so a plain model's form is never touched.
 */
export const rehydrateRoleGpuIds = (
  roles?: RoleFormItem[] | null,
  gpuOptions?: any[]
): RoleFormItem[] | null => {
  if (!roles?.length || !gpuOptions?.length) {
    return null;
  }
  let changed = false;
  const hydrated = roles.map((role) => {
    const ids = role.gpu_selector?.gpu_ids;
    if (!ids?.length || !ids.some((id: any) => typeof id === 'string')) {
      return role;
    }
    changed = true;
    return {
      ...role,
      gpu_selector: {
        ...role.gpu_selector,
        ...generateGPUSelector(role, gpuOptions).gpu_selector,
        // Rebuilding the ids must not drop the width beside them.
        gpus_per_replica: role.gpu_selector?.gpus_per_replica ?? null
      }
    };
  });
  return changed ? (hydrated as RoleFormItem[]) : null;
};
