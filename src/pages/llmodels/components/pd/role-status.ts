import { RoleLabelMap, RoleOrder, RoleValueMap } from '../../config';
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
  return {
    configured: shaping.map((item) => item.desired).join(':'),
    current: shaping.map((item) => item.ready).join(':'),
    waiting: waiting.map((item) => item.name)
  };
};

/** A role's display name; an unknown role falls back to its raw value. */
export const roleLabel = (intl: IntlLike, name: string) =>
  RoleLabelMap[name] ? intl.formatMessage({ id: RoleLabelMap[name] }) : name;
