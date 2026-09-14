import {
  InputNumber,
  LabelSelector,
  LabelSelectorProvider,
  Select as SealSelect,
  useAppUtils
} from '@gpustack/core-ui';
import { useIntl } from '@umijs/max';
import { Flex, Form } from 'antd';
import { createStyles } from 'antd-style';
import React from 'react';
import { ScheduleValueMap } from '../../config';
import { useFormContext } from '../../config/form-context';

const GIB = 1024 ** 3;

/**
 * The built-in label every worker carries (`worker_manager.py` writes it on
 * registration), and therefore the one label that can name a single machine.
 *
 * 🔴 It is also the whole mechanism behind «手动». A CPU-only role has no cards
 * to name, so manual scheduling has nothing to point at except the host — and
 * `worker_selector` already points at hosts. Rather than inventing a second
 * field that means the same thing, «手动» writes exactly one pair here and
 * «自动» writes any number.
 */
const WORKER_NAME_LABEL = 'worker-name';

const useStyles = createStyles(({ css }) => ({
  nested: css`
    border: 1px solid var(--ant-color-border);
    border-radius: 6px;
    padding: 10px 12px 12px;
    .nested-title {
      margin-bottom: 8px;
      font-size: 13px;
      color: var(--ant-color-text-secondary);
    }
  `
}));

interface RouterSchedulingProps {
  /** The router's index in `roles`. */
  index: number;
}

/**
 * CPU and memory for the router's container.
 *
 * Rendered in BOTH branches of the section's switch, which is why it is a
 * `prefix` rather than a child: a router is sized in CPU and RAM whether or
 * not anyone constrains where it goes, and `resources` is not one of the
 * scheduling group's fields, so flipping the switch does not touch it.
 *
 * Placeholders, not values. Left empty the server applies
 * `ROUTER_DEFAULT_CPU` / `ROUTER_DEFAULT_MEMORY` — the same two numbers shown
 * here — and submitting them explicitly would freeze today's defaults into
 * every deployment, so a later change to the floor would not reach them.
 */
export const RouterResources: React.FC<RouterSchedulingProps> = ({ index }) => {
  const intl = useIntl();
  return (
    <Flex gap={12} style={{ marginBottom: 12 }}>
      <Form.Item
        name={['roles', index, 'resources', 'cpu']}
        style={{ flex: 1, marginBottom: 0 }}
      >
        <InputNumber
          min={0.1}
          step={1}
          style={{ width: '100%' }}
          placeholder="2"
          label={intl.formatMessage({ id: 'models.form.roles.resources.cpu' })}
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
  );
};

/**
 * Where the router runs, for an operator who wants a say.
 *
 * Not `ScheduleTypeForm`: everything that form offers under «手动» — the GPU
 * cascader, the vGPU slice picker, «每副本卡数» — names cards, and this role
 * takes none. What is left is the host, so that is all this asks.
 *
 * 🔴 **The mode is derived from the stored value, not stored beside it.**
 * `scheduleType` is UI-only and never reaches the API, so on reopening an edit
 * drawer it has to be recovered from `worker_selector` — and both modes write
 * that one field. The rule: exactly one pair, keyed `worker-name`, is «手动».
 * A selector the user typed in «自动» that happens to be that one pair reopens
 * as «手动», showing the same machine; the label differs, the placement does
 * not. Anything else — two pairs, or one pair keyed something else — is
 * «自动».
 *
 * Switching modes CLEARS the field rather than translating it, the same
 * gesture `ScheduleTypeForm` makes on `gpu_selector`. Carrying a value across
 * would silently reinterpret it: «这台机器» becoming «任何带这个标签的机器»,
 * or a `zone=a` constraint becoming a pin to one host.
 */
const RouterScheduling: React.FC<RouterSchedulingProps> = ({ index }) => {
  const intl = useIntl();
  const { styles } = useStyles();
  const { workerLabelOptions } = useFormContext();
  const { getRuleMessage } = useAppUtils();
  const form = Form.useFormInstance();
  const path = (...field: (string | number)[]) => ['roles', index, ...field];

  const selector = Form.useWatch(path('worker_selector'), form);
  const stored = Form.useWatch(path('scheduleType'), form);

  const keys = Object.keys(selector || {});
  const derivedManual = keys.length === 1 && keys[0] === WORKER_NAME_LABEL;
  const mode =
    stored ?? (derivedManual ? ScheduleValueMap.Manual : ScheduleValueMap.Auto);
  const manual = mode === ScheduleValueMap.Manual;

  // Every worker's name, taken off the label options the form already
  // fetched. Deliberately from the labels rather than from `gpuOptions`: that
  // one is keyed by GPU, so a worker with no cards — a perfectly good host for
  // a proxy — would not be in it.
  const workerOptions = (
    workerLabelOptions.find((option) => option.value === WORKER_NAME_LABEL)
      ?.children || []
  ).map((child: any) => ({ label: child.label, value: child.value }));

  const handleModeChange = () => {
    form.setFieldValue(path('worker_selector'), null);
    form.setFieldValue(path('scheduleWorker'), undefined);
  };

  const handleWorkerChange = (value?: string) => {
    form.setFieldValue(path('scheduleWorker'), value);
    form.setFieldValue(
      path('worker_selector'),
      value ? { [WORKER_NAME_LABEL]: value } : null
    );
  };

  return (
    <>
      <Form.Item
        name={path('scheduleType')}
        getValueProps={() => ({ value: mode })}
      >
        <SealSelect
          onChange={handleModeChange}
          label={intl.formatMessage({ id: 'models.form.scheduletype' })}
          description={intl.formatMessage({
            id: 'models.form.roles.router.scheduletype.tips'
          })}
          options={[
            {
              label: intl.formatMessage({
                id: 'models.form.scheduletype.auto'
              }),
              value: ScheduleValueMap.Auto
            },
            {
              label: intl.formatMessage({
                id: 'models.form.scheduletype.manual'
              }),
              value: ScheduleValueMap.Manual
            }
          ]}
        ></SealSelect>
      </Form.Item>
      {manual ? (
        <div className={styles.nested}>
          <div className="nested-title">
            {intl.formatMessage({
              id: 'models.form.roles.router.workerAllocation'
            })}
          </div>
          {/* Not a `Form.Item` on `worker_selector` itself: the control's value
              is one string and the field's is a map, and a `normalize` pair
              would have to survive the mode switch clearing it. Written by
              hand instead, so the one shape the field may hold in this mode is
              written in one place. */}
          <Form.Item
            name={path('scheduleWorker')}
            getValueProps={() => ({
              value: selector?.[WORKER_NAME_LABEL]
            })}
            // 🔴 Validates `worker_selector`, not this field. `scheduleWorker`
            // is a display shim — the control writes the MAP, and this field's
            // own value exists only so the item has somewhere to hang an
            // error. On reopening an edit drawer the shim is undefined while
            // the selector holds a worker, so `required: true` would fail a
            // form that is perfectly valid.
            rules={[
              {
                validator: () =>
                  selector?.[WORKER_NAME_LABEL]
                    ? Promise.resolve()
                    : Promise.reject(
                        getRuleMessage(
                          'select',
                          'models.form.roles.router.workerSelect'
                        )
                      )
              }
            ]}
          >
            <SealSelect
              allowClear
              showSearch
              onChange={handleWorkerChange}
              label={intl.formatMessage({
                id: 'models.form.roles.router.workerSelect'
              })}
              options={workerOptions}
            ></SealSelect>
          </Form.Item>
        </div>
      ) : (
        <LabelSelectorProvider value={{ options: workerLabelOptions }}>
          <Form.Item
            name={path('worker_selector')}
            style={{ marginBottom: 12 }}
          >
            <LabelSelector
              isAutoComplete
              label={intl.formatMessage({
                id: 'resources.form.workerSelector'
              })}
              description={intl.formatMessage({
                id: 'models.form.roles.router.workerSelector.tips'
              })}
            ></LabelSelector>
          </Form.Item>
        </LabelSelectorProvider>
      )}
    </>
  );
};

export default RouterScheduling;
