import { useIntl } from '@umijs/max';
import { Flex } from 'antd';
import React from 'react';
import {
  ModelInstanceListItem,
  RoleSpec,
  RoleStatus
} from '../../config/types';
import {
  isRoleWaiting,
  orderedRoleStatus,
  roleInstanceState,
  roleLabel,
  roleRatio
} from './role-status';

interface RoleStatusDetailProps {
  roleStatus?: Record<string, RoleStatus> | null;
  roles?: Pick<RoleSpec, 'name' | 'replicas'>[] | null;
  /**
   * The group's members, when the row is expanded and they have been loaded.
   *
   * Optional on purpose: `role_status` stays the backbone. The list response
   * carries no instances, so this is an *enrichment* — with it a short role
   * says what its members are doing, without it the count still renders.
   */
  instances?: ModelInstanceListItem[] | null;
  // Rendered under the per-role rows — the replica cell uses it to say why the
  // number is not editable there.
  footer?: React.ReactNode;
}

/**
 * Per-role `ready / desired`, plus the declared ratio when the group is short
 * of it.
 *
 * `role_status` is the backbone: it is the only per-role detail a *list* row
 * has, so every row renders from it and nothing here may *require* the
 * expanded row to have loaded.
 *
 * ⚠️ `instances` refines that when they happen to be there. The asymmetry is
 * deliberate but it is a real limitation, not a free win: an expanded row
 * reads «Starting», the same row collapsed reads «Waiting», because collapsing
 * it takes the instances away. Removing the asymmetry means putting a state on
 * `RoleStatus` server-side, which is the other half of this fix and is not
 * done.
 *
 * Styled for a tooltip surface (light text on the dark container), which is the
 * only place it is used.
 */
const RoleStatusDetail: React.FC<RoleStatusDetailProps> = ({
  roleStatus,
  roles,
  instances,
  footer
}) => {
  const intl = useIntl();
  const items = orderedRoleStatus(roleStatus, roles);
  const ratio = roleRatio(items);

  if (!items.length) {
    return null;
  }

  return (
    <Flex
      vertical
      gap={4}
      style={{ color: 'var(--ant-color-text-light-solid)' }}
    >
      {items.map((item) => (
        <Flex key={item.name} align="center" justify="space-between" gap={16}>
          <span>{roleLabel(intl, item.name)}</span>
          <Flex align="center" gap={8}>
            <span>
              {item.ready} / {item.desired}
            </span>
            {isRoleWaiting(item) && (
              <span style={{ color: 'var(--ant-color-warning)' }}>
                {/* The members' own word for it, falling back to `Pending`
                    when they cannot answer — same vocabulary either way, so
                    this line and the expanded row never disagree. */}
                {roleInstanceState(item.name, instances)}
              </span>
            )}
          </Flex>
        </Flex>
      ))}
      {!!ratio && (
        <span style={{ color: 'var(--ant-color-warning)' }}>
          {intl.formatMessage(
            { id: 'models.pd.ratio.waiting' },
            {
              configured: ratio.configured,
              current: ratio.current,
              role: ratio.waiting
                .map((name) => roleLabel(intl, name))
                .join(' / ')
            }
          )}
        </span>
      )}
      {footer}
    </Flex>
  );
};

export default RoleStatusDetail;
