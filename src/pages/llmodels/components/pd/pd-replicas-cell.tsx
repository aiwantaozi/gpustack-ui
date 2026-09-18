import { StatusColorMap, StatusMaps } from '@/config';
import type { StatusType } from '@/config/types';
import {
  CheckOutlined,
  FormOutlined,
  SyncOutlined,
  UndoOutlined,
  WarningOutlined
} from '@ant-design/icons';
import { StatusDot } from '@gpustack/core-ui';
import { useIntl } from '@umijs/max';
import { Button, Flex, InputNumber, Tooltip } from 'antd';
import { createStyles } from 'antd-style';
import React from 'react';
import { modelReplicaCounts, RoleValueMap } from '../../config';
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

/**
 * How long a `restarting_since` is believed, mirroring the server's own
 * `RESTART_IN_FLIGHT_LAPSE_SECONDS` (15 minutes).
 *
 * 🔴 The field is only ever cleared on reaching RUNNING (`sync_model_status`),
 * so a group whose rebuild never converges carries it forever — and a banner
 * that says «rebuilding» forever about a group that is in fact dead is a worse
 * lie than the ambiguity this banner exists to remove. Past the lapse the
 * server itself stops treating the restart as in flight (it will accept a new
 * one), so this is the UI agreeing with the server rather than inventing a
 * timeout: the cell falls back to the deployment's own state, which for a
 * wedged group is the red the operator needs to see.
 *
 * Hard-coded against a server-side env var, deliberately: nothing exposes it,
 * and the cost of a mismatch is bounded — the banner lapses a little early or
 * a little late, and only the wording changes, never a count.
 */
const RESTART_LAPSE_MS = 15 * 60 * 1000;

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

  /**
   * A restart the server is still carrying out, off the same `restarting_since`
   * the row's ⋮ menu reads to disable a second one — until now its only
   * consumer, which is why an operator could tell a rebuild from a death only
   * by opening that menu.
   *
   * The lapse needs a re-render to take effect and a wedged group produces no
   * events to bring one, so the one moment it changes is scheduled. Only while
   * a restart is actually believed: an idle row keeps no timer.
   */
  const [now, setNow] = React.useState(() => Date.now());
  const since = record.restarting_since
    ? Date.parse(record.restarting_since)
    : NaN;
  const restarting = Number.isFinite(since) && now - since < RESTART_LAPSE_MS;
  React.useEffect(() => {
    if (!restarting) return;
    const timer = setTimeout(
      () => setNow(Date.now()),
      Math.max(since + RESTART_LAPSE_MS - Date.now(), 0)
    );
    return () => clearTimeout(timer);
  }, [restarting, since]);

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
   *
   * 🔴 The one case where the deployment's own state is not borrowed is a
   * restart in flight. Its members were torn down on purpose, so every role
   * reads «0 / n» in the deployment's failure colour — pixel-identical to the
   * group having died, which is the confusion this cell was measured making.
   * A short role under a restart is transitioning, and says so in the colour
   * before anything has to be read.
   */
  const roleStatus = (item: RoleStatusItem): StatusType => {
    if (status === StatusMaps.inactive) {
      return StatusMaps.inactive;
    }
    if (!isRoleWaiting(item)) {
      return StatusMaps.success;
    }
    return restarting ? StatusMaps.transitioning : status;
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

  /**
   * The restart banner. Permanent while it lasts rather than hover-only: the
   * ⋮ menu already said this on hover and nobody found it, because a reader
   * looking at «0 / 1» three times over has no reason to suspect the menu
   * knows something the cell does not.
   *
   * One word, and the numbers stay in the role lines below. This column's
   * floor is 280px and a worded progress line wraps to two or three of them in
   * every Latin locale — a restarting row would stand half again as tall as
   * its neighbours, and the fraction it bought is the sum of the three lines
   * directly underneath it. The same fact twice is what the `Dot` above this
   * cell was restored to avoid. The count the reader might still want is one
   * hover away.
   *
   * ⚠️ The hover says `{ready}/{total}` and not how many are *stopped*,
   * because that number is not knowable here. The list response carries no
   * member count — `role_status` counts ready members, not existing ones — so
   * it could only come from `instances`, and those arrive only for an expanded
   * row *and* are deliberately kept, stale, after it closes (`table-list`
   * prunes nothing on collapse). Nothing distinguishes «this row is open, the
   * list is current» from «this row was open a minute ago», so a `stopped`
   * rendered from it would read `0` on exactly the group that had just been
   * torn down. A figure that is most wrong when it matters most is worse than
   * one that is absent, and `{ready}` alone already answers the question the
   * banner is here for — how far along the rebuild is.
   */
  const { ready, total } = modelReplicaCounts(record);
  const restartingNotice = restarting ? (
    <Tooltip
      title={intl.formatMessage(
        { id: 'models.pd.group.restarting.progress' },
        { ready, total }
      )}
    >
      <Flex
        align="center"
        gap={6}
        style={{
          alignSelf: 'flex-start',
          cursor: 'help',
          fontSize: 12,
          lineHeight: '18px',
          color: StatusColorMap[StatusMaps.transitioning].text
        }}
      >
        <SyncOutlined spin style={{ flexShrink: 0 }} />
        <span>
          {intl.formatMessage({ id: 'models.pd.group.restarting.brief' })}
        </span>
      </Flex>
    </Tooltip>
  ) : null;

  return (
    <Flex vertical gap={4} className={className}>
      {restartingNotice}
      <Flex align="flex-start" gap={12}>
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
            <Tooltip
              title={intl.formatMessage({ id: 'common.button.confirm' })}
            >
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
    </Flex>
  );
};

export default PDReplicasCell;
