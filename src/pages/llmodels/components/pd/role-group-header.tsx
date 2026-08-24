import { ExpandedRowGrid } from '@gpustack/core-ui';
import { useIntl } from '@umijs/max';
import React from 'react';
import { isRoleWaiting, roleLabel, RoleStatusItem } from './role-status';

interface RoleGroupHeaderProps {
  item: RoleStatusItem;
  gridTemplate?: string;
  prefixWidth?: number;
  columnCount: number;
}

/**
 * The `Prefill 1/2` heading above one role's instances.
 *
 * Laid out on the parent table's column grid like every other child row, so
 * the heading spans the full width without knocking the instance rows below it
 * out of alignment with the parent columns.
 */
const RoleGroupHeader: React.FC<RoleGroupHeaderProps> = ({
  item,
  gridTemplate,
  prefixWidth = 0,
  columnCount
}) => {
  const intl = useIntl();

  return (
    <ExpandedRowGrid gridTemplate={gridTemplate} prefixWidth={prefixWidth}>
      <ExpandedRowGrid.Cell
        span={columnCount}
        style={{ minHeight: 32, gap: 8 }}
      >
        <span className="font-500" style={{ color: 'var(--ant-color-text)' }}>
          {roleLabel(intl, item.name)}
        </span>
        <span style={{ color: 'var(--ant-color-text-secondary)' }}>
          {item.ready} / {item.desired}
        </span>
        {isRoleWaiting(item) && (
          <span style={{ color: 'var(--ant-color-warning)' }}>
            {intl.formatMessage({ id: 'models.pd.role.waiting' })}
          </span>
        )}
      </ExpandedRowGrid.Cell>
    </ExpandedRowGrid>
  );
};

export default RoleGroupHeader;
