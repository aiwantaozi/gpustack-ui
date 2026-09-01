import { ThemeTag } from '@gpustack/core-ui';
import { useIntl } from '@umijs/max';
import { Alert, Badge, Form, Segmented } from 'antd';
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

interface RolesProps {
  /** Whether PD is on. Off renders nothing at all — see the note below. */
  enabled: boolean;
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
const Roles: React.FC<RolesProps> = ({ enabled, mode, modeName }) => {
  const intl = useIntl();
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
      label: errorRoles.has(name) ? (
        // The count is on the label too: "which role is how big" is the first
        // thing a reader of a PD form wants, and it should not need a click.
        <Badge dot status="error" offset={[4, -2]}>
          {`${label} ${role?.replicas ?? 1}`}
        </Badge>
      ) : (
        `${label} ${role?.replicas ?? 1}`
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
        label={intl.formatMessage({ id: 'models.form.gather.title' })}
        description={intl.formatMessage({
          id: 'models.form.gather.title.tips'
        })}
        extra={
          <ThemeTag opacity={0.75}>
            {intl.formatMessage({ id: 'models.form.roles.group.wide' })}
          </ThemeTag>
        }
      >
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
            ></RoleForm>
          )}
        </div>
      ))}
    </>
  );
};

export default Roles;
