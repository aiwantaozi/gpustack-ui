import { ThemeTag } from '@gpustack/core-ui';
import { useIntl } from '@umijs/max';
import { Alert, Flex, Form, Segmented } from 'antd';
import { createStyles } from 'antd-style';
import React from 'react';
import {
  PD_MODE_CUSTOM,
  RoleLabelMap,
  RoleOrder,
  RoleValueMap
} from '../../config';
import { PDMode, RoleFormItem } from '../../config/types';
import GatherLocality from '../gather-locality';
import { RoleSection } from './override-section';
import RoleForm from './role-form';
import RouterForm from './router-form';

const useStyles = createStyles(({ css }) => ({
  count: css`
    padding: 0 5px;
    border-radius: 4px;
    background-color: var(--ant-color-fill-tertiary);
    font-size: 12px;
    line-height: 18px;
    color: var(--ant-color-text-tertiary);
  `,
  errorDot: css`
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background-color: var(--ant-color-error);
  `
}));

interface RolesProps {
  /** Whether PD is on. Off renders nothing at all — see the note below. */
  enabled: boolean;
  /**
   * The PD block's body: transport picker entry, vendor, notes.
   *
   * Mounted here rather than up in Basic because everything in it is
   * group-wide, and «哪条通道» is the question «最紧到哪一档» is a refinement
   * of — putting them in one card is what makes the second read as a
   * refinement instead of an unrelated control two sections away.
   */
  pdBody?: React.ReactNode;
  /** The selected pd mode's catalog entry. */
  mode?: PDMode;
  /** The selected mode's name, for the `custom` exclusions. */
  modeName?: string | null;
}

/**
 * The role tabs.
 *
 * A `Segmented` rather than antd `Tabs`, and that is a capability statement,
 * not a style choice: a tab strip with an add button says "you can add a role",
 * and the backend refuses anything outside prefill / decode / router. Phase two
 * opens up encoder and draft, and that is when this becomes a Tabs.
 *
 * ⚠️ Renders nothing when PD is off, and registers no Form.Item — which is what
 * keeps a role-less model byte-for-byte what it is today. rc-field-form builds
 * its submit value from *registered* fields, so an unregistered `roles` path
 * cannot reach the payload.
 */
const Roles: React.FC<RolesProps> = ({ enabled, mode, modeName, pdBody }) => {
  const intl = useIntl();
  const { styles } = useStyles();
  const form = Form.useFormInstance();
  // `preserve: true` is load-bearing, not defensive. Without it `useWatch`
  // reads `getFieldsValue()`, which returns only REGISTERED fields — and
  // `roles` is written with `setFieldValue`, registered by nothing but the
  // very tabs below. That is a cycle: the value stays invisible, the tabs
  // never render, so nothing ever registers it. `preserve` switches the read
  // to `getFieldsValue(true)`, the whole store.
  const roles: RoleFormItem[] =
    Form.useWatch('roles', { form, preserve: true }) || [];
  const [active, setActive] = React.useState<string>(RoleValueMap.Prefill);

  // Seeding lives in the PD block's enable handler, not here: this component
  // only mounts when its panel is open, and a value that appears on expand is
  // a value that is missing from a submit that never expanded it.
  if (!enabled || !roles.length) {
    return null;
  }

  const isCustom = modeName === PD_MODE_CUSTOM;
  const cacheDisabledReason = isCustom
    ? intl.formatMessage({ id: 'models.form.roles.cache.custom.conflict' })
    : undefined;
  // The custom mode injects nothing, so there is no router for the system to
  // derive — the managed branch has nothing to show and nothing to run.
  const managedDisabledReason = isCustom
    ? intl.formatMessage({ id: 'models.form.roles.router.custom.forced' })
    : undefined;

  // Which roles have a validation error, so the user can see it without
  // switching tabs. `getFieldsError` on the role subtree rather than a watch:
  // the errors are not form values and do not move on every keystroke.
  const errorRoles = new Set(
    form
      .getFieldsError()
      .filter((item) => item.errors.length && item.name[0] === 'roles')
      .map((item) => {
        const index = Number(item.name[1]);
        return roles[index]?.name;
      })
      .filter(Boolean)
  );

  const options = RoleOrder.filter((name) =>
    roles.some((role) => role.name === name)
  ).map((name) => {
    const role = roles.find((item) => item.name === name);
    const label = intl.formatMessage({ id: RoleLabelMap[name] });
    return {
      value: name,
      // The count rides the tab as a «×N» tag rather than a bare number:
      // "which role is how big" is the first thing a reader of a PD form
      // wants and it should not need a click, but «Prefill 1» read as an
      // index — «Prefill ×1» reads as a quantity.
      /* 🔴 The error marker is a dot we draw, not `Badge dot`.
         Badge positions its dot against its child's box, and the child stopped
         being a plain string when the count became a tag — so the dot landed
         above the tab's centre, floating between the label and the count with
         nothing under it. An inline dot after the count sits where the eye
         already is. */
      label: (
        <Flex align="center" justify="center" gap={6}>
          <span>{label}</span>
          <span className={styles.count}>{`×${role?.replicas ?? 1}`}</span>
          {errorRoles.has(name) && <span className={styles.errorDot} />}
        </Flex>
      )
    };
  });

  // Two roles on different card types cannot be admitted atomically, and the
  // user has to learn that here rather than from a half-started group.
  const cardTypes = roles
    .filter((role) => role.name !== RoleValueMap.Router)
    .map((role) => role.gpu_type_selector?.type)
    .filter(Boolean);
  const heterogeneous = new Set(cardTypes).size > 1;

  return (
    <>
      {/* Above the role picker, and outside every role card, because its
          subject is a *pair* rather than a workload. Every other scheduling
          control here answers "where does THIS go"; this one answers "how far
          apart may THESE be", which belongs to no single role — the card below
          is badged "this role only" and a group-wide control inside it would
          contradict its own label, besides showing four copies of one
          model-level value that all move together.

          Kept in this tab rather than back in the PD block so scheduling
          stays one topic in one place, and read before the per-role panels
          because that is the order the decisions happen in: how close they
          must be, then where each one goes. */}
      <RoleSection
        label={intl.formatMessage({ id: 'models.form.roles.group.settings' })}
        description={intl.formatMessage({
          id: 'models.form.roles.group.settings.tips'
        })}
        extra={
          <ThemeTag opacity={0.75}>
            {intl.formatMessage({ id: 'models.form.roles.group.wide' })}
          </ThemeTag>
        }
      >
        {pdBody}
        {/* 🔴 No wrapper, and no label of its own. It used to have both — a
            `LabelInfo` reading «拓扑亲和性» above a nested box — which put two
            labels on one field: the section's, and then the select's own
            floating one inside the border. The result read as a field inside
            a field, and sat beside «传输方案» looking like a different kind of
            control when it is the same kind.

            The select carries «拓扑亲和性» as its own floating label now, so
            the two group-level fields are structurally identical. */}
        <GatherLocality></GatherLocality>
      </RoleSection>
      <Segmented
        block
        value={active}
        onChange={(value) => setActive(value as string)}
        options={options}
        style={{ marginBottom: 12 }}
      />
      {heterogeneous && (
        <Alert
          type="warning"
          showIcon
          message={intl.formatMessage({
            id: 'models.pd.heterogeneous.warning'
          })}
          style={{ marginBottom: 12 }}
        ></Alert>
      )}
      {/* Every role is rendered; the inactive ones are hidden rather than
          unmounted. The form is `preserve={false}`, so unmounting a role's
          fields deletes their values — switching tabs would quietly discard
          whatever the user had just typed into the previous one. Hidden is
          cheap here because a collapsed override group renders a summary line,
          not its sub-forms, so nothing fetches for a role nobody opened. */}
      {roles.map((role, index) => (
        <div
          key={role.name}
          style={{ display: role.name === active ? undefined : 'none' }}
        >
          {role.name === RoleValueMap.Router ? (
            <RouterForm
              index={index}
              mode={mode}
              managedDisabledReason={managedDisabledReason}
            ></RouterForm>
          ) : (
            <RoleForm
              index={index}
              cacheDisabledReason={cacheDisabledReason}
              injection={mode?.roles?.[role.name]}
            ></RoleForm>
          )}
        </div>
      ))}
    </>
  );
};

export default Roles;
