import { FormOutlined, WarningOutlined } from '@ant-design/icons';
import { useIntl } from '@umijs/max';
import { Button, Flex, InputNumber, Popover, Tooltip } from 'antd';
import React from 'react';
import { RoleValueMap } from '../../config';
import { ListItem, ModelInstanceListItem, RoleSpec } from '../../config/types';
import { MarkerReasons } from './pd-markers';
import { orderedRoleStatus, roleLabel } from './role-status';
import RoleStatusDetail from './role-status-detail';

interface PDReplicasCellProps {
  record: ListItem;
  markers: string[];
  /** The state dot, built by the column so the colour logic stays in one place. */
  dot: React.ReactNode;
  /** `ready / total` across the group's roles — the same text a role-less
   *  row shows, so the column reads the same way on every kind of row. */
  value: string;
  /** The disaggregation transport (`vllm-nixl`, …), for the tooltip. Came
   *  here with the shape when both left the name column. */
  mode?: string;
  /** The group's members, when the row is expanded. Forwarded to the tooltip
      so a short role can say what its members are doing. */
  instances?: ModelInstanceListItem[] | null;
  className?: string;
  onSave: (roles: RoleSpec[]) => Promise<void>;
}

/**
 * The replica cell of a PD row: how much of the group is up, and the control
 * that changes how much there should be.
 *
 * 🔴 Briefly showed the shape («1P1D») instead of the counts. That put the
 * declared size in two places on one row — the name already carries an
 * «xPyD» tag — and cost the column the one thing only it could say, which is
 * how much of that declared size is actually serving. A reader scanning the
 * list for trouble is asking "is anything short", and «1P1D» answers a
 * different question. It reads «2 / 3» now, exactly like a role-less row,
 * with the per-role split on hover.
 *
 * 🔑 Editing per-role counts here is safe because the server treats them as a
 * scale, not a shape: `replicas` sits in `_DIGEST_EXCLUDED_SPEC_FIELDS`
 * precisely so that 1P1D -> 2P1D converges role by role instead of restarting
 * the group. The router is displayed but not editable — every group has
 * exactly one, and a second one is not a thing the shape notation can express.
 */
const PDReplicasCell: React.FC<PDReplicasCellProps> = ({
  record,
  markers,
  dot,
  value,
  mode,
  instances,
  className,
  onSave
}) => {
  const intl = useIntl();
  const [editing, setEditing] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [draft, setDraft] = React.useState<Record<string, number>>({});

  const roles: RoleSpec[] = record.roles || [];
  // Role order, not `roles` order: the shape reads P before D and the editor
  // has to agree with the label above it.
  const ordered = orderedRoleStatus(record.role_status, roles).filter((item) =>
    roles.some((role) => role.name === item.name)
  );

  const openEditor = (open: boolean) => {
    if (open) {
      setDraft(
        roles.reduce<Record<string, number>>((acc, role) => {
          acc[role.name] = role.replicas ?? 0;
          return acc;
        }, {})
      );
    }
    setEditing(open);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(
        roles.map((role) => ({
          ...role,
          replicas: draft[role.name] ?? role.replicas
        }))
      );
      setEditing(false);
    } catch (error) {
      // The request layer surfaces the failure; keep the editor open so the
      // numbers the user typed are not thrown away with it.
    } finally {
      setSaving(false);
    }
  };

  const dirty = roles.some(
    (role) => (draft[role.name] ?? role.replicas) !== role.replicas
  );

  const editor = (
    <Flex vertical gap={12} style={{ minWidth: 200 }}>
      <Flex vertical gap={8}>
        {ordered.map((item) => {
          const editable = item.name !== RoleValueMap.Router;
          return (
            <Flex
              key={item.name}
              align="center"
              justify="space-between"
              gap={16}
            >
              <span>{roleLabel(intl, item.name)}</span>
              {editable ? (
                <InputNumber
                  size="small"
                  min={0}
                  precision={0}
                  style={{ width: 80 }}
                  value={draft[item.name]}
                  onChange={(value) =>
                    setDraft((prev) => ({
                      ...prev,
                      [item.name]: (value as number) ?? 0
                    }))
                  }
                />
              ) : (
                <span style={{ width: 80, textAlign: 'center', opacity: 0.65 }}>
                  {item.desired}
                </span>
              )}
            </Flex>
          );
        })}
      </Flex>
      <Flex justify="flex-end" gap={8}>
        <Button size="small" onClick={() => setEditing(false)}>
          {intl.formatMessage({ id: 'common.button.cancel' })}
        </Button>
        <Button
          size="small"
          type="primary"
          loading={saving}
          disabled={!dirty}
          onClick={handleSave}
        >
          {intl.formatMessage({ id: 'common.button.save' })}
        </Button>
      </Flex>
    </Flex>
  );

  return (
    <Flex
      component="span"
      align="center"
      className={className}
      style={{ minWidth: 23, color: 'var(--ant-color-text)' }}
    >
      {dot}
      {/* The number carries the tooltip, so the thing you hover is the thing
          it explains — the group's total expands to the per-role counts it is
          the sum of. It used to hang off a separate ⓘ glyph after the number,
          which made the breakdown reachable only by finding a 14px target and
          put an icon on every PD row whether or not it had anything to
          report. The warning below is the only glyph left, and it appears
          solely when there is a reason for it. */}
      <Tooltip
        title={
          <RoleStatusDetail
            roleStatus={record.role_status}
            roles={record.roles}
            instances={instances}
            footer={
              <>
                <MarkerReasons texts={markers} />
                {!!mode && (
                  <span style={{ opacity: 0.75 }}>
                    {intl.formatMessage({ id: 'models.form.pd.mode' })}: {mode}
                  </span>
                )}
              </>
            }
          ></RoleStatusDetail>
        }
      >
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            marginInlineStart: 8,
            flexShrink: 0,
            cursor: 'help'
          }}
        >
          {value}
          {markers.length > 0 && (
            <WarningOutlined style={{ color: 'var(--ant-color-warning)' }} />
          )}
        </span>
      </Tooltip>
      {/* Deliberately the same control a role-less row gets from the column's
          `editable` hook — antd `Button type="text" size="small"` around
          `FormOutlined`, `m-l-10`. That editor is one number and cannot
          express a shape, so this row hides it (see `pdReplicas`) and puts an
          identical-looking one here that opens the per-role editor instead.
          Matching it exactly is the point: from the reader's side the two
          kinds of row offer the same affordance in the same place. */}
      <Popover
        trigger="click"
        open={editing}
        onOpenChange={openEditor}
        placement="bottomLeft"
        title={intl.formatMessage({ id: 'models.table.replicas.edit' })}
        content={editor}
      >
        <Button
          type="text"
          size="small"
          className="m-l-10"
          icon={<FormOutlined />}
          aria-label={intl.formatMessage({ id: 'models.table.replicas.edit' })}
        />
      </Popover>
    </Flex>
  );
};

export default PDReplicasCell;
