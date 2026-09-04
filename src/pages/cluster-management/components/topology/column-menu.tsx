import { MoreOutlined } from '@ant-design/icons';
import { useIntl } from '@umijs/max';
import { Button, Dropdown } from 'antd';
import { LocationField } from './location';

interface ColumnMenuProps {
  field: LocationField;
  unfilledCount: number;
  /** Groups of unfilled-rack hosts that share an access switch; rack column only. */
  switchGroups?: number;
  onFillUnfilled: () => void;
  onFillBySwitch?: () => void;
}

/**
 * [M1] What a column header offers: only the batch fills. "Fill the N
 * unfilled…" is the most common step after a batch of new machines lands; the
 * rack adds "by access switch", where the system has already grouped the hosts
 * and the operator only names each group.
 */
const ColumnMenu: React.FC<ColumnMenuProps> = ({
  field,
  unfilledCount,
  switchGroups,
  onFillUnfilled,
  onFillBySwitch
}) => {
  const intl = useIntl();

  const items: any[] = [
    {
      key: 'fill',
      disabled: !unfilledCount,
      label: intl.formatMessage(
        { id: 'clusters.topology.column.fillUnfilled' },
        { count: unfilledCount }
      )
    }
  ];
  if (onFillBySwitch && switchGroups) {
    items.push({
      key: 'fillBySwitch',
      label: intl.formatMessage(
        { id: 'clusters.topology.column.fillBySwitch' },
        { count: switchGroups }
      )
    });
  }

  const handlers: Record<string, (() => void) | undefined> = {
    fill: onFillUnfilled,
    fillBySwitch: onFillBySwitch
  };

  return (
    <Dropdown
      trigger={['click']}
      menu={{ items, onClick: ({ key }) => handlers[key]?.() }}
    >
      <Button
        type="text"
        size="small"
        icon={<MoreOutlined />}
        aria-label={intl.formatMessage(
          { id: 'clusters.topology.column.menu' },
          { field: field.label }
        )}
        onClick={(e) => e.stopPropagation()}
      />
    </Dropdown>
  );
};

export default ColumnMenu;
