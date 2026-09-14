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
import SystemManaged, {
  LockedRow,
  flagLines,
  useEngineRows
} from './system-managed';

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
  const form = Form.useFormInstance();
  const { getRuleMessage } = useAppUtils();

  // What the mode writes into this role, grouped by the field of the form the
  // user would otherwise have typed it into — NOT by the route it arrives by.
  //
  // 🔴 That is the change. These used to be four blocks named after the
  // mechanism («KV 连接器», «引擎参数», «环境变量», «宿主机挂载») sitting above
  // an unrelated pair of inputs, so the same concept appeared twice under two
  // different names and nothing said the two lists were one list. Now the
  // injected backend parameters sit under «后端参数» and the injected env under
  // «环境变量», directly above the user's own — which is how the engine
  // receives them.
  //
  // The connector is one row, not a flattened key tree: it reaches the engine
  // as a single `--kv-transfer-config` JSON blob, and showing it as
  // `kv_connector=…` plus six dotted siblings invited the reader to look for
  // six flags that do not exist.
  //
  // Port bands are deliberately not a group of their own. Every band is
  // referenced by an arg or an env entry as `{{ports.<name>}}`, which is where
  // a reader meets it in the form the engine actually sees.
  //
  // Not conditional on the parameters override switch. The injection happens
  // either way — `_pd_injection()` keys off the role alone — so a block that
  // disappeared on "custom" would say the user had taken these over, and the
  // first thing they would do is re-add flags the engine already has.
  const connector = injection?.connector || {};
  const paramRows: LockedRow[] = [
    ...(Object.keys(connector).length
      ? [
          {
            kind: 'flag' as const,
            text: '--kv-transfer-config',
            detail: JSON.stringify(connector)
          }
        ]
      : []),
    ...flagLines(injection?.args || []).map((text) => ({
      kind: 'flag' as const,
      text
    }))
  ];

  const lockHint = (
    <span className="managed-hint">
      {intl.formatMessage({ id: 'models.form.roles.managed.locked' })}
    </span>
  );

  // Which half of the group the user owns. Watched here as well as inside
  // `OverrideSection` because the editable lists no longer live in that
  // section's children — they are footers of the cards below, so this is where
  // "does the user get one" has to be answered.
  const overridden = Form.useWatch(
    ['roles', index, 'overrides', OverrideGroupMap.Parameters],
    form
  );

  const managedGroups = [
    {
      title: intl.formatMessage({ id: 'models.form.backend_parameters' }),
      description: intl.formatMessage({
        id: 'models.form.roles.managed.params.tips'
      }),
      titleExtra: lockHint,
      rows: paramRows,
      footer: overridden ? (
        /* Measured on Ascend 910B2: prefill and decode differ in nearly every
           performance-related parameter, down to HCCL_CONNECT_TIMEOUT and
           HCCL_BUFFSIZE — which is why the override surface is the whole of
           both lists rather than a PD-specific subset. */
        <BackendParametersList
          namePrefix={['roles', index]}
        ></BackendParametersList>
      ) : null
    },
    {
      title: intl.formatMessage({ id: 'models.form.env' }),
      description: intl.formatMessage({
        id: 'models.form.roles.managed.env.tips'
      }),
      rows: Object.entries(injection?.env || {}).map(([key, value]) => ({
        kind: 'pair' as const,
        label: key,
        value: String(value)
      })),
      footer: overridden ? (
        <Form.Item name={['roles', index, 'env']}>
          <LabelSelector
            label={intl.formatMessage({ id: 'models.form.env' })}
            btnText={intl.formatMessage({ id: 'common.button.vars' })}
          ></LabelSelector>
        </Form.Item>
      ) : null
    },
    {
      // A group like the other two, and with no footer in either branch: a
      // bind-mount is the one thing here the platform cannot let the user add.
      // The rows carry the path alone — a «宿主机挂载» label on a row inside a
      // «宿主机挂载» card is the word twice.
      title: intl.formatMessage({ id: 'models.form.roles.managed.mounts' }),
      description: intl.formatMessage({
        id: 'models.form.roles.managed.mounts.tips'
      }),
      rows: (injection?.host_mounts || []).map((path) => ({
        kind: 'flag' as const,
        text: path
      }))
    }
  ];

  const engineRows = useEngineRows();

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

      {/* 🔴 Named, not summarized. This used to collapse to «继承: vLLM 0.23.0
          <image> <command>» — a run-on of four fields where only the first two
          answer the question the section asks, and the engine's own name was
          buried in the middle of it. One labelled row instead. */}
      <OverrideSection
        group={OverrideGroupMap.Backend}
        index={index}
        inheritContent={
          <SystemManaged groups={[{ rows: engineRows }]}></SystemManaged>
        }
      >
        <BackendFields namePrefix={['roles', index]}></BackendFields>
        <CustomBackend namePrefix={['roles', index]}></CustomBackend>
      </OverrideSection>

      {/* `inheritContent={null}` rather than the derived summary: the prefix
          above already lists what runs, row by row and in the engine's own
          vocabulary. A second line reading «继承: …» under it would be the same
          facts a third time, in the shape the rows were built to replace. */}
      <OverrideSection
        group={OverrideGroupMap.Parameters}
        index={index}
        inheritContent={null}
        prefix={<SystemManaged groups={managedGroups}></SystemManaged>}
      >
        {/* Nothing. Both editable lists are footers of the group cards in
            `prefix` above — they have to be, because each one belongs under
            the heading its locked rows already sit under. */}
      </OverrideSection>

      {/* `gpu_type_selector` lives in here, and it is the only way to express a
          heterogeneous group — which is also the precondition for gang
          admission, so this group is load-bearing rather than a convenience.

          Managed says what the system will do, not what it inherited: with no
          selectors set there is nothing to inherit, and the old summary printed
          «继承: -» — a dash where the answer «the scheduler picks, using the
          affinity you set above» belonged. */}
      <OverrideSection
        group={OverrideGroupMap.Scheduling}
        index={index}
        inheritContent={
          <div className="section-summary">
            {intl.formatMessage({ id: 'models.form.roles.scheduling.managed' })}
          </div>
        }
      >
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
