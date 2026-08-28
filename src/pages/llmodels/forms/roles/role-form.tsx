import { InputNumber, LabelSelector } from '@gpustack/core-ui';
import { useIntl } from '@umijs/max';
import { Form, Input } from 'antd';
import React from 'react';
import { OverrideGroupMap } from '../../config';
import BackendFields from '../backend';
import BackendParametersList from '../backend-parameters-list';
import CustomBackend from '../custom-backend';
import ScheduleTypeForm from '../schedule-type';
import SpeculativeDecode from '../speculative-decode';
import OverrideSection, { RoleSection } from './override-section';
import RoleKVCache from './role-kv-cache';

interface RoleFormProps {
  /** The role's index in `roles`. */
  index: number;
  /** Reason this role cannot configure a cache; from the pd mode. */
  cacheDisabledReason?: string;
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
const RoleForm: React.FC<RoleFormProps> = ({ index, cacheDisabledReason }) => {
  const intl = useIntl();

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
      <RoleSection
        label={intl.formatMessage({ id: 'models.form.roles.replicas' })}
      >
        {/* The x and the y of xPyD, and the only scaling truth for a group:
            the model-level replica count is a 0/1 deployment switch. At least
            one, because not wanting a role means removing it — a zero would
            leave `dependencies` pointing at a role that never appears. */}
        <Form.Item
          name={['roles', index, 'replicas']}
          rules={[{ required: true }]}
        >
          <InputNumber
            min={1}
            style={{ width: '100%' }}
            label={intl.formatMessage({ id: 'models.form.roles.replicas' })}
          ></InputNumber>
        </Form.Item>
      </RoleSection>

      <OverrideSection group={OverrideGroupMap.Backend} index={index}>
        <BackendFields namePrefix={['roles', index]}></BackendFields>
        <CustomBackend namePrefix={['roles', index]}></CustomBackend>
      </OverrideSection>

      <OverrideSection group={OverrideGroupMap.Parameters} index={index}>
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
