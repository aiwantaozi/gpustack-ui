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
import RoleForm from './role-form';
import RouterForm from './router-form';
import { createDefaultRoles } from './transform';

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
  const roles: RoleFormItem[] = Form.useWatch('roles', form) || [];
  const [active, setActive] = React.useState<string>(RoleValueMap.Prefill);

  // Seed the role set the first time PD turns on. Doing it here rather than in
  // the PD block keeps one owner for the `roles` value, and doing it on the
  // transition rather than in an effect keeps the write attached to the action
  // that caused it.
  React.useEffect(() => {
    if (enabled && !roles.length) {
      form.setFieldValue('roles', createDefaultRoles());
    }
  }, [enabled, roles.length, form]);

  if (!enabled) {
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

  const activeIndex = roles.findIndex((role) => role.name === active);
  if (activeIndex === -1) {
    return null;
  }

  // Two roles on different card types cannot be admitted atomically, and the
  // user has to learn that here rather than from a half-started group.
  const cardTypes = roles
    .filter((role) => role.name !== RoleValueMap.Router)
    .map((role) => role.gpu_type_selector?.type)
    .filter(Boolean);
  const heterogeneous = new Set(cardTypes).size > 1;

  return (
    <>
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
      {active === RoleValueMap.Router ? (
        <RouterForm
          index={activeIndex}
          mode={mode}
          managedDisabledReason={managedDisabledReason}
        ></RouterForm>
      ) : (
        <RoleForm
          index={activeIndex}
          cacheDisabledReason={cacheDisabledReason}
        ></RoleForm>
      )}
    </>
  );
};

export default Roles;
