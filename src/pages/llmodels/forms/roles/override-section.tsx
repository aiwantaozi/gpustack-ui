import { AutoTooltip, LabelInfo } from '@gpustack/core-ui';
import { useIntl } from '@umijs/max';
import { Flex, Form, Segmented, Tooltip } from 'antd';
import { createStyles } from 'antd-style';
import _ from 'lodash';
import React from 'react';
import { OverrideGroupFields, OverrideGroupLabelMap } from '../../config';

// A role's sections reuse the bordered card the Scheduled Scaling and GPU
// Allocation sections already use, with the switch in the title row.
const useStyles = createStyles(({ css }) => ({
  sectionCard: css`
    border: 1px solid var(--ant-color-border);
    border-radius: 6px;
    padding: 12px 12px 0;
    margin-bottom: 12px;
    .section-title {
      margin-bottom: 12px;
      font-size: 14px;
      color: var(--ant-color-text);
    }
    /* the collapsed group's read-only line */
    .section-summary {
      padding-bottom: 12px;
      font-size: 12px;
      color: var(--ant-color-text-tertiary);
    }
  `
}));

// The two states of an override switch. Strings rather than the boolean the
// store holds: a Segmented needs a `string | number` value, and the stored
// shape is fixed by `RoleFormItem.overrides`.
const OverrideModeMap = {
  Inherit: 'inherit',
  Custom: 'custom'
};

// UI-only fields a group has to carry alongside its payload fields. The
// scheduling group's two say which GPU source the section is editing; without
// copying them a role switched to custom would open on "Auto" while holding
// the GPUs it just inherited. The roles transform strips them before submit.
const GroupUIFields: Record<string, string[]> = {
  scheduling: ['scheduleType', 'manualGpuMode']
};

// Flatten a value to the strings worth showing in a one-line summary. Objects
// keep their keys (`FOO=bar` reads as an env var); nested containers drop
// theirs, since the key of a list adds nothing the values do not say.
const flattenLeaves = (value: any): string[] => {
  if (value == null || value === '') {
    return [];
  }
  if (_.isArray(value)) {
    return _.flatMap(value, flattenLeaves);
  }
  if (_.isPlainObject(value)) {
    return Object.entries(value).flatMap(([key, item]) => {
      const leaves = flattenLeaves(item);
      if (!leaves.length) {
        return [];
      }
      return _.isObject(item) ? leaves : [`${key}=${leaves[0]}`];
    });
  }
  return [String(value)];
};

// What identifies an inherited value, per field. The two GPU selectors get
// their own rule because their shape is known and most of it is noise: a
// cascader pair is [worker, gpu] and only the gpu names the choice, and a
// gpu_type_selector is identified by its type rather than by its percentages.
const summarizeField = (field: string, value: any): string => {
  if (field === 'gpu_selector') {
    return _.map(value?.gpu_ids || [], (id: string | string[]) =>
      _.isArray(id) ? _.last(id) : id
    ).join(', ');
  }
  if (field === 'gpu_type_selector') {
    return value?.type || '';
  }
  return flattenLeaves(value).join(' ');
};

interface RoleSectionProps {
  /** Message id for the section's title. */
  label: string;
  /** The title row's right-hand control (an override switch, usually). */
  extra?: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
}

/**
 * The bordered card a role's fields sit in. Separate from the override switch
 * because two of the sections have no switch: the per-role KV cache does not
 * inherit at all, and the router's is a managed/custom choice rather than an
 * override.
 */
export const RoleSection: React.FC<RoleSectionProps> = ({
  label,
  extra,
  description,
  children
}) => {
  const { styles } = useStyles();
  return (
    <div className={styles.sectionCard}>
      <Flex className="section-title" align="center" justify="space-between">
        <LabelInfo label={label} description={description}></LabelInfo>
        {extra}
      </Flex>
      {children}
    </div>
  );
};

interface OverrideSectionProps {
  /** `OverrideGroupMap` value: which fields this section owns. */
  group: string;
  /** The role's index in `roles`, i.e. the Form path this section writes to. */
  index: number;
  /** Reason the group cannot be customized; disables the switch when set. */
  disabledReason?: string;
  /**
   * Replaces the derived "inherited: …" line while the group is collapsed.
   *
   * For the router, whose parameters are inherited from the mode catalog
   * rather than from the Model: summarizing its Model-level fields there would
   * name values it does not run.
   */
  inheritContent?: React.ReactNode;
  /**
   * Whether switching to custom seeds the group from the Model's values.
   *
   * True everywhere it is an override of something. False for the router's
   * parameters, where custom means *appending* to a catalog invocation — and
   * seeding would copy the group's engine parameters onto a `vllm-router`
   * command line that has no such flags, which is the bug the server drops
   * inherited parameters to avoid.
   */
  seedFromModel?: boolean;
  children?: React.ReactNode;
}

/**
 * One override group of one role.
 *
 * "Same as model" is not "nothing here": the group collapses to a read-only
 * line naming what it is inheriting, so the user can see the effective
 * configuration without opening every group. Turning the switch on seeds the
 * group from those same model-level values (a custom group that opens empty
 * would make the user retype what they already had); turning it off nulls
 * exactly the fields the group owns, which is the wire's word for inherit.
 */
const OverrideSection: React.FC<OverrideSectionProps> = ({
  group,
  index,
  disabledReason,
  inheritContent,
  seedFromModel = true,
  children
}) => {
  const intl = useIntl();
  const form = Form.useFormInstance();
  const fields = OverrideGroupFields[group] || [];
  const uiFields = GroupUIFields[group] || [];
  const overridden = Form.useWatch(['roles', index, 'overrides', group], form);

  const handleModeChange = (value: string | number) => {
    if (value === OverrideModeMap.Custom) {
      if (!seedFromModel) {
        return;
      }
      // Start from what the group was inheriting, so "custom" is an edit of
      // the effective configuration rather than a blank form.
      [...fields, ...uiFields].forEach((field) => {
        form.setFieldValue(
          ['roles', index, field],
          _.cloneDeep(form.getFieldValue(field))
        );
      });
      return;
    }
    // Null, not delete: null is what the backend reads as "inherit", and it
    // keeps the form's shape and the payload's shape the same.
    fields.forEach((field) => {
      form.setFieldValue(['roles', index, field], null);
    });
    uiFields.forEach((field) => {
      form.setFieldValue(['roles', index, field], undefined);
    });
  };

  const segmented = (
    <Form.Item
      noStyle
      name={['roles', index, 'overrides', group]}
      getValueProps={(value) => ({
        value: value ? OverrideModeMap.Custom : OverrideModeMap.Inherit
      })}
      normalize={(value) => value === OverrideModeMap.Custom}
    >
      <Segmented
        size="middle"
        type="rounded"
        style={{ fontSize: 12 }}
        disabled={!!disabledReason}
        onChange={handleModeChange}
        options={[
          {
            label: intl.formatMessage({ id: 'models.form.roles.inherit' }),
            value: OverrideModeMap.Inherit
          },
          {
            label: intl.formatMessage({ id: 'models.form.roles.override' }),
            value: OverrideModeMap.Custom
          }
        ]}
      />
    </Form.Item>
  );

  // A custom group that ends up with nothing in it is stored as inherit: `null`
  // is the wire's only word for "no value", and `overrides` is UI-only and
  // stripped before submit — so the group would come back as Inherit next time
  // the drawer opens, having silently dropped the choice. Said here, where the
  // choice is made, rather than discovered on the next edit.
  const emptyOverride =
    !!overridden &&
    !disabledReason &&
    fields.every((field) => {
      const value = form.getFieldValue(['roles', index, field]);
      return (
        value === undefined ||
        value === null ||
        (Array.isArray(value) && !value.length) ||
        value === ''
      );
    });

  return (
    <RoleSection
      label={intl.formatMessage({ id: OverrideGroupLabelMap[group] })}
      extra={
        disabledReason ? (
          <Tooltip title={disabledReason}>{segmented}</Tooltip>
        ) : (
          segmented
        )
      }
    >
      {overridden ? (
        <>
          {emptyOverride && (
            <div className="note">
              {intl.formatMessage({ id: 'models.form.roles.override.empty' })}
            </div>
          )}
          {children}
        </>
      ) : inheritContent !== undefined ? (
        inheritContent
      ) : (
        // `shouldUpdate` rather than a watch per field: the summary reads
        // several model-level fields and only exists while collapsed, so
        // scoping the re-render to this one line is cheaper than subscribing
        // the whole section to the store.
        <Form.Item noStyle shouldUpdate>
          {(formInstance) => {
            const summary = fields
              .map((field) =>
                summarizeField(field, formInstance.getFieldValue(field))
              )
              .filter(Boolean)
              .join(' · ');
            return (
              <div className="section-summary">
                <AutoTooltip ghost maxWidth="100%">
                  {`${intl.formatMessage({ id: 'models.form.roles.inherited' })}: ${summary || '-'}`}
                </AutoTooltip>
              </div>
            );
          }}
        </Form.Item>
      )}
    </RoleSection>
  );
};

export default OverrideSection;
