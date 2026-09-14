import { InputNumber, LabelSelector } from '@gpustack/core-ui';
import { useIntl } from '@umijs/max';
import { Form, Input, Segmented, Tooltip } from 'antd';
import React from 'react';
import { OverrideGroupMap } from '../../config';
import { PDMode } from '../../config/types';
import BackendFields from '../backend';
import BackendParametersList from '../backend-parameters-list';
import CustomBackend from '../custom-backend';
import OverrideSection, { RoleSection } from './override-section';
import RouterScheduling, { RouterResources } from './router-scheduling';
import RouterTunables from './router-tunables';
import SystemManaged, { flagPairs, useEngineRows } from './system-managed';

const GIB = 1024 ** 3;

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
  const form = Form.useFormInstance();
  const managed = Form.useWatch(['roles', index, 'managed'], form);
  const roleImage = Form.useWatch(['roles', index, 'image_name'], form);
  const roleCommand = Form.useWatch(['roles', index, 'run_command'], form);

  // The server's own rule, verbatim (`is_managed_router`): the platform keeps
  // assembling the router's invocation until the role carries BOTH an image
  // and a command of its own — only both opt out.
  //
  // Deliberately not `managed !== false`. That switch and this rule disagree
  // in the case the switch itself creates: going Custom seeds an image from
  // the Model and no command, which is still a router the platform assembles
  // and still gets the connection arguments. Gating the block on the switch
  // therefore hid flags the router does receive, and the user's only reading
  // of that was "they are gone, I must add them" — which admission then
  // refuses, `--prefill` being `action="append"` in both shipped routers.
  const systemAssembled = !(roleImage && roleCommand);

  const router = mode?.router;
  const connectionArgs = router?.connection_args || [];
  const tunableArgs = router?.tunable_args || [];
  const entrypoint = (router?.entrypoint || []).join(' ');
  const hasManagedArgs = connectionArgs.length > 0 || tunableArgs.length > 0;

  /**
   * What the managed branch shows for «引擎与镜像»: one row, and the SAME row
   * prefill and decode show — see `useEngineRows`.
   *
   * 🔴 It used to show four — image, entrypoint, peers, health path — on the
   * theory that a branch whose job is "say what the system decided" should say
   * all of it. Three of those earned nothing. The peers row had no value *by
   * definition* (the addresses are injected once the members exist, which is
   * why the router is created last), so it printed a sentence where a value
   * goes; the health path is an implementation detail nobody tunes; and the
   * entrypoint's real content — what makes this container a router rather than
   * an engine — is now visible as the actual flags under «路由参数 › 连接»,
   * which is both concrete and the thing a reader would otherwise go looking
   * for.
   *
   * The fourth, the image, then said «与模型相同» where prefill said
   * «vLLM · 0.23.0-…»: one tab deferring the answer the next tab gave. Both
   * read the same helper now.
   */
  const engineRows = useEngineRows();

  // Taking the router over by hand should start from what the system was
  // already going to run, the way every other role's "custom" does — an
  // OverrideSection seeds the group from the Model on the same gesture. This
  // switch is hand-rolled (managed/custom is not an inherit/override pair), so
  // the seeding has to be too, and without it the required Backend field
  // opened blank on a form whose Model already answers that question.
  //
  // `run_command` is deliberately NOT seeded, unlike the other roles': the
  // Model's command starts an ENGINE, and copying it here would produce a
  // router that runs one. What a managed router derives is the runner image
  // plus its own entrypoint, so the image and the two fields that resolve it
  // are the ones worth carrying over.
  const handleModeChange = (value: string | number) => {
    const custom = value === RouterModeMap.Custom;
    ['backend', 'backend_version', 'image_name'].forEach((field) => {
      form.setFieldValue(
        ['roles', index, field],
        custom ? form.getFieldValue(field) : null
      );
    });
    if (!custom) {
      // Null rather than left behind: `managed` is derived back from the
      // absence of an image and a command when the form reloads, so a
      // leftover command would reopen the role on the custom branch.
      form.setFieldValue(['roles', index, 'run_command'], null);
    }
  };

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
        onChange={handleModeChange}
        options={[
          {
            // Same control, same word as every other role's switch.
            label: intl.formatMessage({ id: 'models.form.roles.managed' }),
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

  const lockHint = (
    <span className="managed-hint">
      {intl.formatMessage({ id: 'models.form.roles.managed.locked' })}
    </span>
  );

  const connectionBand = {
    label: intl.formatMessage({
      id: 'models.form.roles.router.band.connection'
    }),
    rows: flagPairs(connectionArgs)
  };

  /**
   * One card, three bands, and the bands are the point.
   *
   * Every row here ends up on the same command line, so one list is the honest
   * shape — but they differ in exactly the way a reader cares about: the
   * connection flags are rendered from where the group landed and cannot be
   * argued with, the policy knobs are defaults the user may take over, and the
   * last band is theirs outright. Three cards would have said they were three
   * settings; one undivided list would have said the padlocks were arbitrary.
   */
  const routeArgsGroup = (bands: any[]) => ({
    title: intl.formatMessage({ id: 'models.form.roles.router.routeArgs' }),
    description: intl.formatMessage({
      id: 'models.form.roles.router.routeArgs.tips'
    }),
    titleExtra: lockHint,
    bands
  });

  // Collapsed: both halves as read-only rows, because "managed by the system"
  // still has to say what the system chose.
  const managedArgs = (
    <SystemManaged
      groups={[
        routeArgsGroup([
          connectionBand,
          {
            label: intl.formatMessage({
              id: 'models.form.roles.router.tunableArgs'
            }),
            hint: intl.formatMessage({
              id: 'models.form.roles.router.tunable.managed'
            }),
            rows: tunableArgs.map((arg) => ({
              kind: 'pair' as const,
              label: arg.flag,
              value: arg.default == null ? '' : String(arg.default)
            }))
          }
        ])
      ]}
    ></SystemManaged>
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
      {/* 🔴 No `RoleSection` wrapper, the same correction prefill and decode
          already carry. The card's title sat above a field whose own floating
          label says the same word, so «副本数» rendered twice, one above the
          other — and the router's was the last copy still doing it.

          Still fixed at one and disabled: a second router would split the
          prefix cache and give the group two addresses. The reason rides on
          the field's own «?» now instead of on the card's. */}
      <Form.Item name={['roles', index, 'replicas']} initialValue={1}>
        <InputNumber
          disabled
          min={1}
          max={1}
          style={{ width: '100%' }}
          label={intl.formatMessage({ id: 'models.form.roles.replicas' })}
          description={intl.formatMessage({
            id: 'models.form.roles.router.replicas.tips'
          })}
        ></InputNumber>
      </Form.Item>

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
            {/* 🔴 No «CPU only» checkbox. A router takes no accelerator in
                every branch — the server derives it from the role's name now,
                not from a flag — so the box had nothing left to decide. It
                never really did: its unticked state meant "size this proxy
                from the model's weights", the only sizing that path could
                reach, which is 164 GiB for a 72B model. The «资源» section
                below is where a router is sized, in CPU and RAM. */}
          </>
        ) : (
          <SystemManaged groups={[{ rows: engineRows }]}></SystemManaged>
        )}
      </RoleSection>

      {/* Shown on BOTH branches, and so is the platform half inside it. A
          hand-written router still takes arguments and still needs environment
          variables — Ascend's is the standing example, where the router cannot
          start without `TORCH_DEVICE_BACKEND_AUTOLOAD=0` (V11) — and the
          platform keeps injecting its own until the role carries both an image
          and a command, which is what `systemAssembled` reads. */}
      <OverrideSection
        group={OverrideGroupMap.Parameters}
        index={index}
        // Both branches show the platform's arguments while it is the one
        // assembling: collapsed they *are* the summary, and expanded they are
        // what the user's own get appended to. A fully hand-written router has
        // no platform half, so it falls back to the generic summary.
        inheritContent={
          systemAssembled && hasManagedArgs ? managedArgs : undefined
        }
        seedFromModel={false}
      >
        <SystemManaged
          groups={[
            routeArgsGroup([
              ...(systemAssembled ? [connectionBand] : []),
              ...(systemAssembled && tunableArgs.length
                ? [
                    {
                      label: intl.formatMessage({
                        id: 'models.form.roles.router.tunableArgs'
                      }),
                      // 🔴 Says what empty MEANS, which the field cannot. Each
                      // control's placeholder is the catalog's default, so an
                      // untouched knob already shows what will run — but a
                      // reader who wants the default back has to be told that
                      // clearing the box is how, rather than guessing that it
                      // saves a zero.
                      hint: intl.formatMessage({
                        id: 'models.form.roles.router.tunable.custom'
                      }),
                      content: (
                        <RouterTunables
                          args={tunableArgs}
                          namePrefix={['roles', index]}
                        ></RouterTunables>
                      )
                    }
                  ]
                : []),
              {
                // Appended after the catalog's, which is what makes "append"
                // and "override" the same gesture: repeated flags are
                // last-wins in both shipped routers, verified against the
                // wheels. The connection band above is refused at admission
                // instead — `--prefill` and `--decode` are `action="append"`
                // there, so a second one adds a peer the router cannot reach
                // rather than replacing ours.
                label: intl.formatMessage({
                  id: 'models.form.roles.router.band.extra'
                }),
                content: (
                  <BackendParametersList
                    namePrefix={['roles', index]}
                  ></BackendParametersList>
                )
              }
            ]),
            {
              title: intl.formatMessage({ id: 'models.form.env' }),
              description: intl.formatMessage({
                id: 'models.form.roles.managed.env.tips'
              }),
              footer: (
                <Form.Item name={['roles', index, 'env']}>
                  <LabelSelector
                    label={intl.formatMessage({ id: 'models.form.env' })}
                    btnText={intl.formatMessage({ id: 'common.button.vars' })}
                  ></LabelSelector>
                </Form.Item>
              )
            }
          ]}
        ></SystemManaged>
      </OverrideSection>

      {/* 🔴 Sizing and placement in ONE section, and the switch is over the
          placement half alone.
          
          They used to be two cards: «资源» always visible, and a «资源与调度»
          whose «自定义» branch rendered no children at all — a switch the user
          could click that had nothing behind it. Merging them is what makes
          the switch mean something: «系统托管» is «anywhere that fits, as near
          the group as possible», «自定义» is «and here is my constraint».

          `resources` is not one of the scheduling group's fields, so the
          switch does not touch CPU and memory — which is why they render in
          both branches, as a `prefix`. */}
      <OverrideSection
        group={OverrideGroupMap.Scheduling}
        index={index}
        // Nothing to seed. The three scheduling fields are model-level ones a
        // PD deployment already cleared, and copying a GPU selector onto a
        // role that takes no GPU is the one thing this section must not do.
        seedFromModel={false}
        prefix={<RouterResources index={index}></RouterResources>}
        inheritContent={
          <div className="section-summary">
            {intl.formatMessage({ id: 'models.form.roles.router.locality' })}
          </div>
        }
      >
        <RouterScheduling index={index}></RouterScheduling>
      </OverrideSection>
    </>
  );
};

export default RouterForm;
