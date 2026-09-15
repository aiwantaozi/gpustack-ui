import {
  InstanceStatusMap,
  InstanceStatusMapValue,
  RoleLabelMap,
  RoleOrder,
  RoleValueMap
} from '../../config';
import { RoleSpec, RoleStatus } from '../../config/types';

// Only what these helpers actually call, so they stay pure and testable and do
// not drag react-intl's types into a transform module.
type IntlLike = {
  formatMessage: (
    descriptor: { id: string },
    values?: Record<string, any>
  ) => string;
};

export interface RoleStatusItem extends RoleStatus {
  name: string;
}

/**
 * Per-role readiness, in the order the roles run in.
 *
 * `role_status` first: it is the only source carrying a `ready` count, and the
 * only one the *list* response carries at all — the list endpoint returns
 * models without their instances, which is exactly why the field exists.
 * The spec is the fallback, so a group that has never been reconciled shows
 * the shape it declared rather than a column of zeros.
 *
 * A role name the UI does not know is appended rather than dropped: the data
 * model allows any name, and silently hiding a member is the failure mode this
 * whole view exists to defeat.
 */
export const orderedRoleStatus = (
  roleStatus?: Record<string, RoleStatus> | null,
  roles?: Pick<RoleSpec, 'name' | 'replicas'>[] | null
): RoleStatusItem[] => {
  const source: Record<string, RoleStatus> =
    roleStatus && Object.keys(roleStatus).length
      ? roleStatus
      : (roles || []).reduce<Record<string, RoleStatus>>((acc, role) => {
          acc[role.name] = { desired: role.replicas ?? 0, ready: 0 };
          return acc;
        }, {});

  const names = Object.keys(source);
  return [
    ...RoleOrder.filter((name) => names.includes(name)),
    ...names.filter((name) => !RoleOrder.includes(name))
  ].map((name) => ({
    name,
    desired: source[name]?.desired ?? 0,
    ready: source[name]?.ready ?? 0
  }));
};

/** A role short of the members it was asked for. */
export const isRoleWaiting = (item: RoleStatusItem) =>
  item.ready < item.desired;

/**
 * How far along the lifecycle a member is, lowest first.
 *
 * Used to pick which of a role's unready members speaks for the role: the
 * least advanced one does, because the role is ready only once all of them
 * are, so the slowest member is what the role is actually waiting on.
 */
const LIFECYCLE_ORDER = [
  InstanceStatusMap.Pending,
  InstanceStatusMap.Analyzing,
  InstanceStatusMap.Scheduled,
  InstanceStatusMap.Initializing,
  InstanceStatusMap.Downloading,
  InstanceStatusMap.Starting
];

/** States that will not advance on their own, so they outrank the order above. */
const STUCK = [InstanceStatusMap.Error, InstanceStatusMap.Unreachable];

interface RoleInstanceLike {
  role?: string | null;
  state?: string | null;
}

/**
 * What a role short of its members is doing, in the exact words the expanded
 * row uses for the members themselves.
 *
 * 🔴 **Why this exists.** `role_status` carries `{desired, ready}` and nothing
 * else, so `ready < desired` was the only thing the tooltip could say — and it
 * said «Waiting» for a member that was busy starting. Two rows apart, the same
 * member read «Waiting» above and «Starting» below, which reads as a bug and
 * points at the wrong problem: «Waiting» suggests it is stuck in scheduling.
 *
 * Falls back to `Pending` in the two cases where the members cannot answer,
 * and that is the honest word for both rather than a third vocabulary:
 *
 * - **The role has no members yet.** Its rows have not been created — a
 *   router waits for prefill and decode to be ready before it exists at all —
 *   and `pending` is the state those rows will be created in.
 * - **No instances loaded.** The list response carries none, so a collapsed
 *   row genuinely does not know. See the caller for the consequence.
 *
 * Reuses `InstanceStatusMapValue`, the same map `instance-status-cell` renders
 * from. Sharing the map rather than the wording is the point: the two cannot
 * drift into different spellings of one state.
 */
export const roleInstanceState = (
  name: string,
  instances?: RoleInstanceLike[] | null
): string => {
  const pending = InstanceStatusMapValue[InstanceStatusMap.Pending];
  if (!instances?.length) {
    return pending;
  }
  const unready = instances.filter(
    (item) => item.role === name && item.state !== InstanceStatusMap.Running
  );
  if (!unready.length) {
    return pending;
  }

  const stuck = unready.find(
    (item) => item.state && STUCK.includes(item.state)
  );
  const speaker =
    stuck ??
    unready.reduce((slowest, item) => {
      const rank = (entry: RoleInstanceLike) => {
        const index = LIFECYCLE_ORDER.indexOf(entry.state || '');
        // An unknown state sorts last rather than first: it is not evidence
        // that the role is further behind than a member we can place.
        return index === -1 ? LIFECYCLE_ORDER.length : index;
      };
      return rank(item) < rank(slowest) ? item : slowest;
    });

  return speaker.state
    ? (InstanceStatusMapValue[speaker.state] ?? speaker.state)
    : pending;
};

export interface RoleRatio {
  configured: string;
  current: string;
  waiting: string[];
}

/**
 * The group's declared ratio against the one it is actually running.
 *
 * Read off the non-router roles: the ratio is what makes a group a 3P1D rather
 * than a 4P4D, and the router is always one, so including it would only append
 * a meaningless `:1`. Null when there is nothing to say — fewer than two
 * shaping roles, or a group already at the shape it asked for.
 */
export const roleRatio = (items: RoleStatusItem[]): RoleRatio | null => {
  const shaping = items.filter((item) => item.name !== RoleValueMap.Router);
  if (shaping.length < 2) {
    return null;
  }
  const waiting = shaping.filter(isRoleWaiting);
  if (!waiting.length) {
    return null;
  }
  // Nothing running yet is not a ratio. `0:0` is not a shape the group is
  // holding, it is the absence of one, and the role headings below already say
  // which roles are still waiting -- so on a group that has just been created
  // this line said, in a third place and in alarm colour, what two other
  // places said plainly. The comparison only becomes information once the
  // group is running a shape other than the one it asked for: a 3P1D serving
  // as 1P1D.
  if (!shaping.some((item) => item.ready > 0)) {
    return null;
  }
  return {
    configured: shaping.map((item) => item.desired).join(':'),
    current: shaping.map((item) => item.ready).join(':'),
    waiting: waiting.map((item) => item.name)
  };
};

/** A role's display name; an unknown role falls back to its raw value. */
export const roleLabel = (intl: IntlLike, name: string) =>
  RoleLabelMap[name] ? intl.formatMessage({ id: RoleLabelMap[name] }) : name;
