import { CaretDownOutlined } from '@ant-design/icons';
import { ExpandedRowGrid } from '@gpustack/core-ui';
import { useIntl } from '@umijs/max';
import React from 'react';
import { roleLabel, RoleStatusItem } from './role-status';

interface RoleGroupHeaderProps {
  item: RoleStatusItem;
  gridTemplate?: string;
  prefixWidth?: number;
  columnCount: number;
  // Absent when the role has no members to hide — see `collapsible` below.
  collapsed?: boolean;
  onToggle?: () => void;
}

/**
 * The `Prefill 1/2` heading above one role's instances.
 *
 * Laid out on the parent table's column grid like every other child row, so
 * the heading spans the full width without knocking the instance rows below it
 * out of alignment with the parent columns.
 *
 * Doubles as the collapse control for its group: a 4P4D group is eight
 * instance rows under four headings, and the whole point of reading this view
 * is comparing roles, which you cannot do when one role fills the screen.
 */
const RoleGroupHeader: React.FC<RoleGroupHeaderProps> = ({
  item,
  gridTemplate,
  prefixWidth = 0,
  columnCount,
  collapsed,
  onToggle
}) => {
  const intl = useIntl();

  // A role with no members has nothing to collapse, and a control that hides
  // nothing is a control that looks broken when you click it.
  const collapsible = !!onToggle;
  const label = roleLabel(intl, item.name);

  return (
    <ExpandedRowGrid gridTemplate={gridTemplate} prefixWidth={prefixWidth}>
      <ExpandedRowGrid.Cell
        span={columnCount}
        style={{ minHeight: 32, gap: 8 }}
      >
        <span
          role={collapsible ? 'button' : undefined}
          tabIndex={collapsible ? 0 : undefined}
          aria-expanded={collapsible ? !collapsed : undefined}
          aria-label={collapsible ? label : undefined}
          onClick={collapsible ? onToggle : undefined}
          onKeyDown={
            collapsible
              ? (e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onToggle?.();
                  }
                }
              : undefined
          }
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            cursor: collapsible ? 'pointer' : 'default',
            userSelect: 'none'
          }}
        >
          {collapsible && (
            <CaretDownOutlined
              rotate={collapsed ? -90 : 0}
              style={{
                fontSize: 12,
                color: 'var(--ant-color-text-tertiary)',
                transition: 'transform 0.2s'
              }}
            />
          )}
          <span className="font-500" style={{ color: 'var(--ant-color-text)' }}>
            {label}
          </span>
          <span style={{ color: 'var(--ant-color-text-secondary)' }}>
            {item.ready} / {item.desired}
          </span>
        </span>
      </ExpandedRowGrid.Cell>
    </ExpandedRowGrid>
  );
};

export default RoleGroupHeader;
