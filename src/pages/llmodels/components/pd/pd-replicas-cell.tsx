import { StatusMaps } from '@/config';
import type { StatusType } from '@/config/types';
import {
  CheckOutlined,
  FormOutlined,
  UndoOutlined,
  WarningOutlined
} from '@ant-design/icons';
import { StatusDot } from '@gpustack/core-ui';
import { useIntl } from '@umijs/max';
import { Button, Flex, InputNumber, Tooltip } from 'antd';
import { createStyles } from 'antd-style';
import React from 'react';
import { RoleValueMap } from '../../config';
import { ListItem, ModelInstanceListItem, RoleSpec } from '../../config/types';
import { MarkerReasons } from './pd-markers';
import {
  isRoleWaiting,
  orderedRoleStatus,
  roleLabel,
  type RoleStatusItem
} from './role-status';
import RoleStatusDetail from './role-status-detail';

/** The role line's own metrics, from the design: 14px on a 22px line, so the
 *  block stacks to the same rhythm as the rest of the table's text. */
const ROLE_LINE: React.CSSProperties = {
  fontSize: 14,
  gap: 8,
  lineHeight: '22px'
};

/**
 * In the editor every line is as tall as the number box it holds, including
 * the router's, which has none — otherwise the router line would ride up.
 *
 * 🔴 The design specified the 32px box the aggregate row uses, for consistency
 * down the column. It cost more than it bought: three of them turned a 66px
 * block into a 112px one, so opening the editor shoved every row below this
 * one down the page and closing it pulled them back. A control that moves the
 * table to be used is worse than one that is a size off from its neighbour.
 * `small` is 24px — the smallest antd height that is still a real input — and
 * it holds the shift to ~14px, which reads as the row staying put.
 */
const EDIT_LINE_HEIGHT = 24;

const ROLE_LINE_EDITING: React.CSSProperties = {
  ...ROLE_LINE,
  minHeight: EDIT_LINE_HEIGHT
};

const useStyles = createStyles(({ css }) => ({
  // A grid, not a stack of flex rows: the counts have to line up under each
  // other across roles, and only a shared track can promise that when one role
  // reads «1 / 1» and the next «10 / 12». The track list is set by the caller,
  // because the editor adds one.
  roles: css`
    display: grid;
    column-gap: 12px;
    align-items: center;
    font-variant-numeric: tabular-nums;
  `,
  count: css`
    text-align: right;
    white-space: nowrap;
    color: var(--ant-color-text);
    font-size: 14px;
    line-height: 22px;
  `,
  // Matches the number box's own text inset, so the router's fixed count sits
  // on the same vertical as the editable ones beside it.
  fixed: css`
    padding-inline-start: 12px;
    color: var(--ant-color-text);
    font-size: 14px;
    line-height: 22px;
  `
}));

interface PDReplicasCellProps {
  record: ListItem;
  markers: string[];
  /** The deployment's own state, as the column already computed it from
   *  `Model.state`. A role that is short of its members borrows it, so the
   *  colour of a gap says what kind of gap it is — scaling or broken — without
   *  the cell second-guessing the backend's judgement. */
  status: StatusType;
  /** `state_message`. It used to hang off the single row-level dot; with that
   *  dot gone it moves onto the tooltip rather than disappearing. */
  statusMessage?: string;
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
 * The replica cell of a PD row: one line per role, and the control that changes
 * how many members each role should have.
 *
 * 🔴 Went through «2P2D · 5 / 5» — the declared shape beside the group total —
 * before landing here. That line was compact but it made the reader do the
 * arithmetic the row exists to spare them: «5 / 5» is silent about *which*
 * role is short, and on «4 / 5» the only way to find out was to hover. A
 * group's roles fail independently, so the column now prints them
 * independently, one per line, and the shape is no longer stated at all — the
 * desired counts down the right-hand track *are* the 1P3D.
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
  status,
  statusMessage,
  mode,
  instances,
  className,
  onSave
}) => {
  const intl = useIntl();
  const { styles } = useStyles();
  const [editing, setEditing] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [draft, setDraft] = React.useState<Record<string, number>>({});

  const roles: RoleSpec[] = record.roles || [];
  // Role order, not `roles` order: a reader scans P before D, and the editor
  // has to agree with the list it opened from.
  const ordered = orderedRoleStatus(record.role_status, roles);

  /**
   * A role's dot.
   *
   * Only two things are decided here, and neither is a diagnosis:
   *  - A role with all its members up is green, whatever the rest of the group
   *    is doing. That is the whole point of splitting the line per role.
   *  - A role that is short borrows the deployment's status, so «starting» and
   *    «failed» stay the two colours the backend already distinguishes instead
   *    of collapsing into one generic «not ready» orange.
   *
   * A stopped deployment greys out entirely: with `replicas` at 0 no role is
   * «ready», it is simply switched off, and green on every line would read as
   * a healthy group.
   */
  const roleStatus = (item: RoleStatusItem): StatusType => {
    if (status === StatusMaps.inactive) {
      return StatusMaps.inactive;
    }
    return isRoleWaiting(item) ? status : StatusMaps.success;
  };

  const openEditor = () => {
    setDraft(
      roles.reduce<Record<string, number>>((acc, role) => {
        acc[role.name] = role.replicas ?? 0;
        return acc;
      }, {})
    );
    setEditing(true);
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

  const roleLines = ordered.map((item) => {
    // Only roles the spec actually declares can be scaled — `role_status` may
    // carry a name the group no longer has, and there is nothing to write to.
    const editable =
      item.name !== RoleValueMap.Router &&
      roles.some((role) => role.name === item.name);
    return (
      <React.Fragment key={item.name}>
        <StatusDot
          statusValue={{
            status: roleStatus(item),
            text: roleLabel(intl, item.name)
          }}
          style={editing ? ROLE_LINE_EDITING : ROLE_LINE}
        />
        <span className={styles.count}>
          {editing ? `${item.ready} /` : `${item.ready} / ${item.desired}`}
        </span>
        {editing &&
          (editable ? (
            <InputNumber
              size="small"
              min={0}
              precision={0}
              style={{ width: 64 }}
              value={draft[item.name]}
              aria-label={roleLabel(intl, item.name)}
              onChange={(value) =>
                setDraft((prev) => ({
                  ...prev,
                  [item.name]: (value as number) ?? 0
                }))
              }
            />
          ) : (
            <span className={styles.fixed}>{item.desired}</span>
          ))}
      </React.Fragment>
    );
  });

  const rolesBlock = (
    <div
      className={styles.roles}
      // The editor adds a third track for the input, leaving the first two
      // exactly where the reader last saw them. Inline rather than a second
      // class, so the override does not depend on emitted rule order.
      //
      // Reading rows stack flush, as drawn: they are text on a 22px line and
      // the leading is the separation. Editing rows cannot — two boxes with a
      // row gap of zero meet border to border and read as one control with a
      // line through it. The design drew them flush because its boxes were
      // borderless blocks; a real bordered input needs the gap to stay a
      // discrete field. Kept to 4px because every pixel here is a pixel the
      // rows below move when the editor opens.
      style={{
        gridTemplateColumns: editing ? 'auto auto auto' : 'auto auto',
        rowGap: editing ? 4 : 0,
        cursor: editing ? undefined : 'help'
      }}
    >
      {roleLines}
    </div>
  );

  return (
    <Flex align="flex-start" gap={12} className={className}>
      {/* The lines carry the tooltip, so the thing you hover is the thing it
          explains. It is no longer where the per-role counts live — they are
          printed now — but it is still the only place that can say what a
          short role is *doing*, how far the running ratio has drifted from the
          declared one, why a marker is up, and which transport the group uses.
          Suppressed while editing: a tooltip over the inputs would cover the
          numbers being typed. */}
      {editing ? (
        rolesBlock
      ) : (
        <Tooltip
          title={
            <RoleStatusDetail
              roleStatus={record.role_status}
              roles={record.roles}
              instances={instances}
              footer={
                <>
                  <MarkerReasons texts={markers} />
                  {!!statusMessage && (
                    <span style={{ opacity: 0.75 }}>{statusMessage}</span>
                  )}
                  {!!mode && (
                    <span style={{ opacity: 0.75 }}>
                      {intl.formatMessage({ id: 'models.form.pd.mode' })}:{' '}
                      {mode}
                    </span>
                  )}
                </>
              }
            ></RoleStatusDetail>
          }
        >
          {rolesBlock}
        </Tooltip>
      )}

      {/* Deliberately the same controls a role-less row gets from the column's
          `editable` hook — antd `Button type="text" size="small"` around
          `FormOutlined`, then `CheckOutlined` / `UndoOutlined` once open. That
          editor is one number and cannot express a shape, so this row hides it
          (see `pdReplicas`) and puts identical-looking ones here that drive one
          input per role instead. Matching the control is the point: from the
          reader's side the two kinds of row offer the same affordance in the
          same place. Only the spacing is the cell's own, because here the
          buttons sit beside a block rather than trailing a single number, and
          they hold the first line of it. */}
      {editing ? (
        <Flex
          align="center"
          gap={2}
          style={{ height: EDIT_LINE_HEIGHT, flexShrink: 0 }}
        >
          <Tooltip title={intl.formatMessage({ id: 'common.button.confirm' })}>
            <Button
              type="text"
              size="small"
              loading={saving}
              disabled={!dirty}
              icon={<CheckOutlined />}
              onClick={handleSave}
              aria-label={intl.formatMessage({ id: 'common.button.confirm' })}
            />
          </Tooltip>
          <Tooltip title={intl.formatMessage({ id: 'common.button.cancel' })}>
            <Button
              type="text"
              size="small"
              icon={<UndoOutlined />}
              onClick={() => setEditing(false)}
              aria-label={intl.formatMessage({ id: 'common.button.cancel' })}
            />
          </Tooltip>
        </Flex>
      ) : (
        <Flex align="center" gap={2} style={{ height: 22, flexShrink: 0 }}>
          {/* 🔴 The reasons ride the glyph, not only the role lines to its
              left. They are in that tooltip too — as its footer, beside what
              each role is doing — but this is the thing that says something is
              wrong, so it is the thing a reader hovers, and hovering it used
              to produce nothing at all. A role-less row already does this
              (`use-models-columns`); the group row is the one that did not,
              which is exactly the rule `pd-markers` states about itself: a
              marker without a reason is just another silent failure. */}
          {markers.length > 0 && (
            <Tooltip title={<MarkerReasons texts={markers} />}>
              <WarningOutlined
                style={{ flexShrink: 0, color: 'var(--ant-color-warning)' }}
              />
            </Tooltip>
          )}
          <Tooltip
            title={intl.formatMessage({ id: 'models.table.replicas.edit' })}
          >
            <Button
              type="text"
              size="small"
              icon={<FormOutlined />}
              onClick={openEditor}
              aria-label={intl.formatMessage({
                id: 'models.table.replicas.edit'
              })}
            />
          </Tooltip>
        </Flex>
      )}
    </Flex>
  );
};

export default PDReplicasCell;
