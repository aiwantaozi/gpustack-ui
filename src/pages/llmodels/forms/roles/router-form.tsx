import { AutoTooltip, CheckboxField, InputNumber } from '@gpustack/core-ui';
import { useIntl } from '@umijs/max';
import { Flex, Form, Input, Segmented, Tooltip } from 'antd';
import { createStyles } from 'antd-style';
import React from 'react';
import { OverrideGroupMap } from '../../config';
import { PDMode } from '../../config/types';
import BackendFields from '../backend';
import CustomBackend from '../custom-backend';
import OverrideSection, { RoleSection } from './override-section';

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
      color: var(--ant-color-text-quaternary);
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
 * Different in kind from prefill and decode: its image, command, peer
 * addresses and health path are all derived from the catalog, so asking the
 * user to type them is asking them to restate what the system already knows.
 * The default is therefore "managed by the system", and the derived values are
 * shown read-only rather than hidden — for three reasons: the user can see what
 * the system did instead of trusting a black box, an operator can compare
 * against it while diagnosing, and the placeholders in the command are what
 * explain why the router is created last.
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
  // What the catalog derives for a managed router, shown read-only. The peers
  // row has no value yet by definition — the addresses are injected once the
  // prefill and decode members exist, which is also why the router is created
  // last.
  const derived: { label: string; value?: string | null }[] = [
    {
      label: intl.formatMessage({ id: 'backend.runCommand' }),
      value: router?.command
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
            {/* The two halves of a managed router yield to the role
                independently, so the image is overridable without also making
                the user write the invocation. That is not a corner case: the
                engine runner images do not all ship the router binary, and
                when one does not, naming an image that does is the whole fix —
                the catalog still knows how to invoke it. Left empty it stays
                derived, which is why the derived value is the placeholder. */}
            <Form.Item
              name={['roles', index, 'image_name']}
              label={intl.formatMessage({ id: 'backend.imageName' })}
              style={{ marginBottom: 8 }}
              extra={intl.formatMessage({
                id: 'models.form.roles.router.image.tips'
              })}
            >
              <Input
                allowClear
                placeholder={router?.image || ''}
                data-testid="router-image-name"
              />
            </Form.Item>
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
            {/* Shown here rather than hidden, for the same reason the command
                and the health path are: this branch's job is to say what the
                system decided, and a setting that exists on the custom branch
                and simply disappears on this one reads as a setting that was
                lost. Disabled and forced on because that is the truth of it --
                the server derives "takes no accelerator" from the absence of an
                image and a command, so a managed router never claims a GPU
                whatever the stored flag says. */}
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

      {/* A managed router still runs somewhere, so its placement is the one
          thing left to override even in the managed branch. */}
      <OverrideSection
        group={OverrideGroupMap.Scheduling}
        index={index}
      ></OverrideSection>
    </>
  );
};

export default RouterForm;
