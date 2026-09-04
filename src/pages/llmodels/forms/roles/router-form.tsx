import {
  AutoTooltip,
  CheckboxField,
  InputNumber,
  LabelSelector
} from '@gpustack/core-ui';
import { useIntl } from '@umijs/max';
import { Flex, Form, Input, Segmented, Tooltip } from 'antd';
import { createStyles } from 'antd-style';
import React from 'react';
import { OverrideGroupMap } from '../../config';
import { PDMode } from '../../config/types';
import BackendFields from '../backend';
import BackendParametersList from '../backend-parameters-list';
import CustomBackend from '../custom-backend';
import OverrideSection, { RoleSection } from './override-section';
import RouterTunables from './router-tunables';

const GIB = 1024 ** 3;

const useStyles = createStyles(({ css }) => ({
  derived: css`
    font-size: 12px;
    color: var(--ant-color-text-tertiary);
    .derived-row {
      padding-bottom: 8px;
    }
    .derived-label {
      display: inline-block;
      min-width: 72px;
      flex-shrink: 0;
      color: var(--ant-color-text-quaternary);
    }
  `,
  // The platform's own arguments, shown in the custom branch above the user's.
  // Rendered as disabled-looking rows rather than disabled inputs: they are
  // not fields, and an input the user can focus but not change reads as broken.
  frozen: css`
    margin-bottom: 8px;
    .frozen-group + .frozen-group {
      margin-top: 8px;
    }
    .frozen-title {
      font-size: 12px;
      color: var(--ant-color-text-quaternary);
      margin-bottom: 4px;
    }
    .frozen-args {
      font-size: 12px;
      font-family: var(--ant-font-family-code);
      color: var(--ant-color-text-tertiary);
      background: var(--ant-color-fill-quaternary);
      border-radius: var(--ant-border-radius);
      padding: 6px 10px;
      word-break: break-all;
    }
  `
}));

const RouterModeMap = {
  Managed: 'managed',
  Custom: 'custom'
};

interface RouterFormProps {
  /** The router's index in `roles`. */
  index: number;
  /** The selected pd mode's catalog entry; its `router` block is what a managed router derives from. */
  mode?: PDMode;
  /** Set when the mode cannot derive a router, which forces the custom branch. */
  managedDisabledReason?: string;
}

/**
 * The router role.
 *
 * Different in kind from prefill and decode: its image, invocation, peer
 * addresses and health path all come from the mode catalog, so asking the user
 * to type them is asking them to restate what the system already knows. The
 * default is therefore "managed by the system".
 *
 * What the managed branch shows is deliberately not nothing. The catalog
 * declares the invocation in three classified parts, and the classification is
 * the whole point of showing it:
 *
 * - the **entrypoint** answers the question the image name cannot — the router
 *   runs the same image the model does, and what makes it a router is which
 *   executable inside it starts;
 * - the **connection arguments** are ours, rendered from where the group
 *   landed, and saying so is what makes "you cannot set this" legible rather
 *   than arbitrary;
 * - the **tunable arguments** are the user's to change, and appending one is
 *   how — repeated flags are last-wins in both shipped routers.
 */
const RouterForm: React.FC<RouterFormProps> = ({
  index,
  mode,
  managedDisabledReason
}) => {
  const intl = useIntl();
  const { styles } = useStyles();
  const form = Form.useFormInstance();
  const managed = Form.useWatch(['roles', index, 'managed'], form);

  const router = mode?.router;
  const connectionArgs = router?.connection_args || [];
  const tunableArgs = router?.tunable_args || [];
  const entrypoint = (router?.entrypoint || []).join(' ');

  // What the catalog derives, shown read-only. The peers row has no value yet
  // by definition — the addresses are injected once the prefill and decode
  // members exist, which is also why the router is created last.
  const derived: { label: string; value?: string | null }[] = [
    {
      label: intl.formatMessage({ id: 'backend.imageName' }),
      value: intl.formatMessage({ id: 'models.form.roles.inherit' })
    },
    {
      label: intl.formatMessage({ id: 'models.form.roles.router.entrypoint' }),
      value: entrypoint
    },
    {
      label: intl.formatMessage({ id: 'models.form.roles.router.peerslabel' }),
      value: intl.formatMessage({ id: 'models.form.roles.router.peers' })
    },
    {
      label: intl.formatMessage({ id: 'models.form.roles.router.health' }),
      value: router?.health_path
    }
  ];

  const modeSwitch = (
    <Form.Item
      noStyle
      name={['roles', index, 'managed']}
      getValueProps={(value) => ({
        value: value === false ? RouterModeMap.Custom : RouterModeMap.Managed
      })}
      normalize={(value) => value === RouterModeMap.Managed}
    >
      <Segmented
        size="middle"
        type="rounded"
        style={{ fontSize: 12 }}
        options={[
          {
            label: intl.formatMessage({
              id: 'models.form.roles.router.managed'
            }),
            value: RouterModeMap.Managed,
            disabled: !!managedDisabledReason
          },
          {
            label: intl.formatMessage({ id: 'models.form.roles.override' }),
            value: RouterModeMap.Custom
          }
        ]}
      />
    </Form.Item>
  );

  // The platform's own arguments. Read-only in both branches, but for two
  // different reasons: collapsed they are the summary of what the system
  // decided, and expanded they are what the user's own get appended to.
  const connectionArgsBlock = connectionArgs.length > 0 && (
    <div className={styles.frozen}>
      <div className="frozen-group">
        <div className="frozen-title">
          {intl.formatMessage({
            id: 'models.form.roles.router.connectionArgs'
          })}
        </div>
        <div className="frozen-args">{connectionArgs.join(' ')}</div>
      </div>
    </div>
  );

  // The collapsed view: both halves as text, because "same as the system"
  // still has to say what the system chose.
  const frozenArgs = (
    <div className={styles.frozen}>
      {connectionArgs.length > 0 && (
        <div className="frozen-group">
          <div className="frozen-title">
            {intl.formatMessage({
              id: 'models.form.roles.router.connectionArgs'
            })}
          </div>
          <div className="frozen-args">{connectionArgs.join(' ')}</div>
        </div>
      )}
      {tunableArgs.length > 0 && (
        <div className="frozen-group">
          <div className="frozen-title">
            {intl.formatMessage({ id: 'models.form.roles.router.tunableArgs' })}
          </div>
          <div className="frozen-args">
            {tunableArgs
              .map((arg) => [arg.flag, arg.default].filter(Boolean).join('='))
              .join('  ')}
          </div>
        </div>
      )}
    </div>
  );

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
        description={intl.formatMessage({
          id: 'models.form.roles.router.replicas.tips'
        })}
      >
        {/* Fixed at one and disabled: a second router would split the prefix
            cache and give the group two addresses. */}
        <Form.Item name={['roles', index, 'replicas']} initialValue={1}>
          <InputNumber
            disabled
            min={1}
            max={1}
            style={{ width: '100%' }}
            label={intl.formatMessage({ id: 'models.form.roles.replicas' })}
          ></InputNumber>
        </Form.Item>
      </RoleSection>

      <RoleSection
        label={intl.formatMessage({ id: 'models.form.roles.group.backend' })}
        description={intl.formatMessage({
          id: 'models.form.roles.router.order.tips'
        })}
        extra={
          managedDisabledReason ? (
            <Tooltip title={managedDisabledReason}>{modeSwitch}</Tooltip>
          ) : (
            modeSwitch
          )
        }
      >
        {managed === false ? (
          <>
            <BackendFields namePrefix={['roles', index]}></BackendFields>
            <CustomBackend namePrefix={['roles', index]}></CustomBackend>
            {/* Only a hand-written router has a container to place, and it
                takes no GPU. */}
            <Form.Item
              name={['roles', index, 'cpu_only']}
              valuePropName="checked"
              style={{ marginBottom: 8 }}
            >
              <CheckboxField
                label={intl.formatMessage({ id: 'models.form.roles.cpuonly' })}
                description={intl.formatMessage({
                  id: 'models.form.roles.cpuonly.tips'
                })}
              ></CheckboxField>
            </Form.Item>
          </>
        ) : (
          <>
            <div className={styles.derived}>
              {derived.map((item) => (
                <Flex key={item.label} className="derived-row" gap={8}>
                  <span className="derived-label">{item.label}</span>
                  <AutoTooltip ghost maxWidth="100%">
                    {item.value || '-'}
                  </AutoTooltip>
                </Flex>
              ))}
            </div>
            {/* Shown here rather than hidden, for the same reason the
                entrypoint and the health path are: this branch's job is to say
                what the system decided, and a setting that exists on the
                custom branch and simply disappears on this one reads as a
                setting that was lost. Disabled and forced on because that is
                the truth of it — the server derives "takes no accelerator"
                from the absence of an image and a command, so a managed router
                never claims a GPU whatever the stored flag says. */}
            <Form.Item style={{ marginBottom: 0 }}>
              <CheckboxField
                checked
                disabled
                label={intl.formatMessage({ id: 'models.form.roles.cpuonly' })}
                description={intl.formatMessage({
                  id: 'models.form.roles.cpuonly.tips'
                })}
              ></CheckboxField>
            </Form.Item>
          </>
        )}
      </RoleSection>

      {/* Only meaningful under a managed router: the custom branch's whole
          command is the user's already, so there is no platform half to append
          to. */}
      {managed !== false && (
        <OverrideSection
          group={OverrideGroupMap.Parameters}
          index={index}
          // Both branches show the platform's arguments: collapsed they *are*
          // the summary, and expanded they are what the user's own get
          // appended to. The default summary would name the Model's parameters
          // instead, which is the one thing this role does not run.
          inheritContent={frozenArgs}
          seedFromModel={false}
        >
          {connectionArgsBlock}
          {/* The declared knobs, as controls rather than as text: the flag
              names are the platform's vocabulary, and making the user retype
              one to change a routing policy is the part that reads as a
              missing feature. */}
          {tunableArgs.length > 0 && (
            <div className="frozen-title" style={{ marginBottom: 4 }}>
              {intl.formatMessage({
                id: 'models.form.roles.router.tunableArgs'
              })}
            </div>
          )}
          <RouterTunables
            args={tunableArgs}
            namePrefix={['roles', index]}
          ></RouterTunables>
          {/* Appended after the catalog's, which is what makes "append" and
              "override" the same gesture: repeated flags are last-wins in both
              shipped routers, verified against the wheels. The connection
              arguments above are refused at admission instead — `--prefill`
              and `--decode` are `action="append"` there, so a second one adds
              a peer the router cannot reach rather than replacing ours. */}
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
      )}

      {/* A managed router still runs somewhere, so its placement is the one
          thing left to override even in the managed branch. Its CPU and memory
          live here too: they are what this container asks for, and the
          question "how much" belongs next to "placed where". */}
      <OverrideSection
        group={OverrideGroupMap.Scheduling}
        index={index}
      ></OverrideSection>

      <RoleSection
        label={intl.formatMessage({ id: 'models.form.roles.resources' })}
        description={intl.formatMessage({
          id: 'models.form.roles.resources.tips'
        })}
      >
        <Flex gap={12}>
          <Form.Item
            name={['roles', index, 'resources', 'cpu']}
            style={{ flex: 1, marginBottom: 0 }}
          >
            <InputNumber
              min={0.1}
              step={1}
              style={{ width: '100%' }}
              placeholder="2"
              label={intl.formatMessage({
                id: 'models.form.roles.resources.cpu'
              })}
            ></InputNumber>
          </Form.Item>
          <Form.Item
            name={['roles', index, 'resources', 'memory']}
            style={{ flex: 1, marginBottom: 0 }}
            // Bytes on the wire, GiB in the field. The API keeps bytes so it
            // matches every other memory figure in the schema; a user typing
            // "2147483648" would be the alternative.
            getValueProps={(value) => ({
              value: typeof value === 'number' ? value / GIB : value
            })}
            normalize={(value) =>
              typeof value === 'number' ? Math.round(value * GIB) : value
            }
          >
            <InputNumber
              min={0.5}
              step={1}
              style={{ width: '100%' }}
              placeholder="2"
              label={intl.formatMessage({
                id: 'models.form.roles.resources.memory'
              })}
            ></InputNumber>
          </Form.Item>
        </Flex>
      </RoleSection>
    </>
  );
};

export default RouterForm;
