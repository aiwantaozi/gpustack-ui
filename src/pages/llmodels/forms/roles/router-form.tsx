import { LabelSelector } from '@gpustack/core-ui';
import { useIntl } from '@umijs/max';
import { Form, Input } from 'antd';
import React from 'react';
import { OverrideGroupMap } from '../../config';
import { PDMode } from '../../config/types';
import BackendFields from '../backend';
import BackendParametersList from '../backend-parameters-list';
import CustomBackend from '../custom-backend';
import OverrideSection, { RoleSection } from './override-section';
import RouterScheduling, { RouterResources } from './router-scheduling';
import SystemManaged, { flagLines } from './system-managed';

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

  // 🔴 The connection flags are seeded into the role's own parameter list,
  // the same way a prefill's `--kv-transfer-config` is. They used to be a
  // padlocked band the user could read and nothing else, and admission
  // refused them outright — which made the router the one role whose injected
  // parameters could not be touched.
  //
  // Safe because they are appended AFTER the declared command and every one
  // of them is last-wins, so setting one overrides it. The peer flags are the
  // exception and are NOT seeded: `--prefill` / `--decode` are
  // `action="append"`, so a second one adds a phantom peer rather than
  // replacing ours — admission still refuses those, and they are not in
  // `connection_args` to begin with (they live in `peers`).
  //
  // Seeded, not frozen: a row left untouched is stripped again at submit, so
  // `{{worker_ip}}` and `{{ports.prometheus}}` go on being rendered from
  // where the router actually lands.
  const injectedRouterParams = React.useMemo(
    () => [
      ...flagLines(connectionArgs),
      // Only the ones with a declared default: a tunable with none has nothing
      // to show, and seeding a bare `--flag` would submit a valueless option
      // the router does not take.
      ...tunableArgs
        .filter((arg) => arg.default != null && arg.default !== '')
        .map((arg) => `${arg.flag} ${arg.default}`)
    ],
    [connectionArgs, tunableArgs]
  );

  React.useEffect(() => {
    if (!injectedRouterParams.length) {
      return;
    }
    form.setFieldValue(['roles', index, '__injected'], {
      params: injectedRouterParams
    });
    const params = form.getFieldValue(['roles', index, 'backend_parameters']);
    const missing = injectedRouterParams.filter(
      (line) => !(params || []).includes(line)
    );
    if (missing.length) {
      form.setFieldValue(
        ['roles', index, 'backend_parameters'],
        [...missing, ...(params || [])]
      );
    }
  }, [injectedRouterParams, form, index]);

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
  // Seeded on mount rather than on a switch that no longer exists. Same three
  // fields the switch carried over, and for the same reason: the Backend field
  // is required, and opening it blank on a form whose Model already answers it
  // asks the user to retype what they had.
  //
  // `run_command` stays out, as it did before: the Model's command starts an
  // ENGINE, and copying it here would produce a router that runs one.
  React.useEffect(() => {
    if (!systemAssembled) {
      return;
    }
    ['backend', 'backend_version', 'image_name'].forEach((field) => {
      if (form.getFieldValue(['roles', index, field]) == null) {
        form.setFieldValue(['roles', index, field], form.getFieldValue(field));
      }
    });
  }, []);

  // 🔴 `handleModeChange` / `modeSwitch` / `managedDisabledReason` lived here,
  // driving the engine group's managed-custom switch. All three went with it —
  // see the note on the group below for why `managed` is derived rather than
  // declared now.

  // 🔴 `connectionBand` / `routeArgsGroup` / `managedArgs` lived here, building
  // the three-band read-only view of the route arguments for the collapsed
  // «系统托管» branch. Both the bands and that branch are gone: the arguments
  // are one editable list now, and there is no collapsed state left to
  // summarise.

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
      {/* 🔴 No replica field. A router is structurally one — a second would
          split the prefix cache and give the group two addresses — so there
          was never a question here, only a disabled input showing «1» and a
          «?» explaining why it could not be changed. A control that cannot
          be operated is a control that has to be read past.

          Nothing needs to register it: `roleFormToPayload` writes
          `replicas: isRouter ? 1 : …` outright, `createDefaultRoles` seeds 1,
          and `RoleSpec.replicas` is `Field(default=1, ge=1)` server-side. The
          count was decided in three places already; the field was the only
          one that looked like a decision. */}
      <RoleSection
        label={intl.formatMessage({ id: 'models.form.roles.group.backend' })}
        description={intl.formatMessage({
          id: 'models.form.roles.router.order.tips'
        })}
      >
        {/* 🔴 No managed/custom switch, matching every other engine group and
            a role-less deployment. `managed` is not gone as a concept — it is
            derived instead of declared: a router that carries neither an
            image nor a command is still system-assembled, which is exactly
            what `rolesSpecToForm` already read it back as. Filling either
            field in is what takes the router over, and that is the gesture
            the switch was standing in for.

            `managedDisabledReason` went with it. It disabled the *managed*
            side, i.e. "this deployment cannot have a system-assembled
            router" — a state the user could not act on from here anyway, and
            the deploy path reports it where it is decided. */}
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
        alwaysOpen
        seedFromModel={false}
      >
        <SystemManaged
          groups={[
            {
              // 🔴 One list, exactly as a prefill or a decode gets. It used to
              // be three bands — connection flags padlocked, tunables as
              // typed controls with the catalog default as placeholder, and a
              // third for the user's own — which made the router the only
              // role whose parameters were not simply a list of parameters.
              //
              // Everything the recipe declares is seeded into that one list
              // now (see `injectedRouterParams`) and stripped again at submit
              // if untouched, so the defaults keep coming from the catalog
              // while every row stays editable. Appending is still how an
              // override works: repeated flags are last-wins in both shipped
              // routers, verified against the wheels.
              title: intl.formatMessage({
                id: 'models.form.roles.router.routeArgs'
              }),
              description: intl.formatMessage({
                id: 'models.form.roles.router.routeArgs.tips'
              }),
              footer: (
                <BackendParametersList
                  namePrefix={['roles', index]}
                ></BackendParametersList>
              )
            },
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
        alwaysOpen
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
