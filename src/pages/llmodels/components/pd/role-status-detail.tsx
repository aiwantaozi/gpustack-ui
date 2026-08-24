import { useIntl } from '@umijs/max';
import { Flex } from 'antd';
import React from 'react';
import { RoleSpec, RoleStatus } from '../../config/types';
import {
  isRoleWaiting,
  orderedRoleStatus,
  roleLabel,
  roleRatio
} from './role-status';

interface RoleStatusDetailProps {
  roleStatus?: Record<string, RoleStatus> | null;
  roles?: Pick<RoleSpec, 'name' | 'replicas'>[] | null;
  // Rendered under the per-role rows — the replica cell uses it to say why the
  // number is not editable there.
  footer?: React.ReactNode;
}

/**
 * Per-role `ready / desired`, plus the declared ratio when the group is short
 * of it.
 *
 * Built from `role_status` alone, because this is what a *list* row hovers out:
 * the list response carries no instances, so nothing here may depend on the
 * expanded row having been loaded.
 *
 * Styled for a tooltip surface (light text on the dark container), which is the
 * only place it is used.
 */
const RoleStatusDetail: React.FC<RoleStatusDetailProps> = ({
  roleStatus,
  roles,
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
                {intl.formatMessage({ id: 'models.pd.role.waiting' })}
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
