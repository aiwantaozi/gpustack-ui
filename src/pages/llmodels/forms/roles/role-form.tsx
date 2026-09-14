import { InputNumber, LabelSelector, useAppUtils } from '@gpustack/core-ui';
import { useIntl } from '@umijs/max';
import { Form, Input } from 'antd';
import React from 'react';
import { OverrideGroupMap } from '../../config';
import { PDRoleInjection } from '../../config/types';
import BackendFields from '../backend';
import BackendParametersList from '../backend-parameters-list';
import CustomBackend from '../custom-backend';
import ScheduleTypeForm from '../schedule-type';
import SpeculativeDecode from '../speculative-decode';
import OverrideSection from './override-section';
import RoleKVCache from './role-kv-cache';
import SystemManaged, { flagLines, kvLines } from './system-managed';

interface RoleFormProps {
  /** The role's index in `roles`. */
  index: number;
  /** Reason this role cannot configure a cache; from the pd mode. */
  cacheDisabledReason?: string;
  /** What the mode injects into this role — `mode.roles[<name>]`. Read-only. */
  injection?: PDRoleInjection;
}

/**
 * One prefill or decode role.
 *
 * Nothing here is a new field: every group renders the same sub-form the model
 * level does, at the role's Form path. That is what makes a homogeneous 1P1D
 * cost "flip a switch and type two numbers" — the groups all start on "same as
 * model", so a role that overrides nothing has nothing to fill in — and it is
 * also why a heterogeneous group is not a special case: it is the engine group
 * of one role switched on.
 */
const RoleForm: React.FC<RoleFormProps> = ({
  index,
  cacheDisabledReason,
  injection
}) => {
  const intl = useIntl();
  const { getRuleMessage } = useAppUtils();

  // What the mode writes into this role, as the engine will see it. Grouped by
  // the route each one arrives by, because a reader debugging one needs to know
  // which: the connector descriptor becomes a single `--kv-transfer-config`
  // blob, the args are appended to the command line, the env is set on the
  // container, and the host mounts are bind-mounts only the platform can add.
  //
  // Port bands are deliberately not a group of their own. Every band is
  // referenced by an arg or an env entry as `{{ports.<name>}}`, which is where
  // a reader meets it in the form the engine actually sees.
  //
  // Not conditional on the parameters override switch. The injection happens
  // either way — `_pd_injection()` keys off the role alone — so a block that
  // disappeared on "custom" would say the user had taken these over, and the
  // first thing they would do is re-add flags the engine already has.
  const managedGroups = [
    {
      title: intl.formatMessage({ id: 'models.form.roles.managed.connector' }),
      lines: kvLines(injection?.connector || {})
    },
    {
      title: intl.formatMessage({ id: 'models.form.roles.managed.args' }),
      lines: flagLines(injection?.args || [])
    },
    {
      title: intl.formatMessage({ id: 'models.form.env' }),
      lines: Object.entries(injection?.env || {}).map(
        ([key, value]) => `${key}=${value}`
      )
    },
    {
      title: intl.formatMessage({ id: 'models.form.roles.managed.mounts' }),
      lines: injection?.host_mounts || []
    }
  ];

  return (
    <>
      {/* The role's identity has no visible control, so nothing would register
          it — and `onFinish` rebuilds its value from REGISTERED fields only,
          the same rule that makes `useWatch` need `preserve`. Without this the
          submitted role is an anonymous bag of overrides and the API refuses
          it. Same trick `kv-cache.tsx` uses to keep `mode` alive. */}
      <Form.Item name={['roles', index, 'name']} hidden>
        <Input />
      </Form.Item>
      {/* The x and the y of xPyD, and the only scaling truth for a group: the
          model-level replica count is a 0/1 deployment switch. At least one,
          because not wanting a role means removing it — a zero would leave
          `dependencies` pointing at a role that never appears.

          🔴 No `RoleSection` wrapper. It put the section's label above a field
          whose own floating label says the same word, so «副本数» rendered
          twice, one above the other. */}
      <Form.Item
        name={['roles', index, 'replicas']}
        rules={[
          {
            required: true,
            // Explicit, because antd's default builds the message from the
            // field PATH — an empty role replica count read «请输入
            // roles,0,replicas».
            message: getRuleMessage('input', 'models.form.roles.replicas')
          }
        ]}
      >
        <InputNumber
          min={1}
          controls={false}
          style={{ width: '100%' }}
          label={intl.formatMessage({ id: 'models.form.roles.replicas' })}
        ></InputNumber>
      </Form.Item>

      <OverrideSection group={OverrideGroupMap.Backend} index={index}>
        <BackendFields namePrefix={['roles', index]}></BackendFields>
        <CustomBackend namePrefix={['roles', index]}></CustomBackend>
      </OverrideSection>

      <OverrideSection
        group={OverrideGroupMap.Parameters}
        index={index}
        prefix={<SystemManaged groups={managedGroups}></SystemManaged>}
      >
        {/* Measured on Ascend 910B2: prefill and decode differ in nearly every
            performance-related parameter, down to HCCL_CONNECT_TIMEOUT and
            HCCL_BUFFSIZE — which is why the override surface is the whole of
            both lists rather than a PD-specific subset. */}
        <BackendParametersList
          namePrefix={['roles', index]}
        ></BackendParametersList>
        <Form.Item name={['roles', index, 'env']}>
          <LabelSelector
            label={intl.formatMessage({ id: 'models.form.env' })}
            btnText={intl.formatMessage({ id: 'common.button.vars' })}
          ></LabelSelector>
        </Form.Item>
      </OverrideSection>

      {/* `gpu_type_selector` lives in here, and it is the only way to express a
          heterogeneous group — which is also the precondition for gang
          admission, so this group is load-bearing rather than a convenience. */}
      <OverrideSection group={OverrideGroupMap.Scheduling} index={index}>
        <ScheduleTypeForm namePrefix={['roles', index]}></ScheduleTypeForm>
      </OverrideSection>

      <RoleKVCache
        index={index}
        disabledReason={cacheDisabledReason}
      ></RoleKVCache>

      {/* Per role because prefill and decode need different values — upstream
          runs prefill at 1 draft token and decode at 3+, and a prefill that
          skips an MTP draft head fails the NIXL compatibility check outright
          (open-questions F17). Not an override group: there is no "same as
          model" story worth offering when the whole point is that the two
          sides differ.

          After the KV cache and shaped like it: both are optional capabilities
          the role either has or does not, gated by the same "built-in backends
          only" rule and refused with the same sentence. A bare checkbox above
          the scheduling card read as a stray option rather than as the gate
          for the fields under it. */}
      <SpeculativeDecode
        namePrefix={['roles', index]}
        section={{
          label: intl.formatMessage({ id: 'models.form.speculativeDecoding' })
        }}
      ></SpeculativeDecode>
    </>
  );
};

export default RoleForm;
