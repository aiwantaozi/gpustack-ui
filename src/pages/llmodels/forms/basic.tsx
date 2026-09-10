import PluginExtraFields from '@/components/plugin-extra-fields';
import { modelNameReg, PageAction } from '@/config';
import { OPENAI_COMPATIBLE } from '@/config/settings';
import {
  ClusterStatusLabelMap,
  ClusterStatusValueMap
} from '@/pages/cluster-management/config';
import {
  AutoTooltip,
  Input as CInput,
  Select as SealSelect,
  useAppUtils
} from '@gpustack/core-ui';
import { useIntl } from '@umijs/max';
import { Flex, Form } from 'antd';
import { createStyles } from 'antd-style';
import { useEffect, useMemo } from 'react';
import {
  DeployFormKeyMap,
  RoleLabelMap,
  RoleOrder,
  sourceOptions
} from '../config';
import { useFormContext } from '../config/form-context';
import { ClusterOption, FormData } from '../config/types';
import styles from '../style/cluster-option.module.less';
import BackendForm from './backend';
import CatalogFrom from './catalog';
import CustomBackend from './custom-backend';
import LocalPathSource from './local-path-source';
import ModeField from './mode-field';
import OnlineSource from './online-source';

/**
 * The replica field, and its PD variant.
 *
 * `createStyles` rather than a `.module.less`, for the reason the first attempt
 * failed on: CSS Modules hash **every** class in the file, so nested literal
 * names (`className="chip"`) never match the compiled selector — the box got
 * its border and nothing inside it got anything. antd-style scopes the parent
 * and leaves nested names literal, which is also what the sibling role
 * sections already do.
 *
 * Both states reuse the Seal field's own vocabulary: `--border-radius-lg`,
 * 12px inline padding, the 12px tertiary floating-label scale. Under PD this is
 * still «副本数» — only its value stops being a number the user types.
 */
const useStyles = createStyles(({ css }) => ({
  replicaField: css`
    position: relative;

    /* One DOM position for the toggle in both states, so flipping PD does not
       remount it — see the note at the call site for what that cost.
       Its VERTICAL placement does differ, and by CSS rather than by moving the
       node: off, the field is a single 54px row and the switch belongs in its
       middle; on, the box grows a chip row and a footer, and the switch has to
       stay on the label line instead of drifting to the centre of a box whose
       lower half it has nothing to do with. */
    .rf-toggle {
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      right: 12px;
      z-index: 2;
    }
    &.pd-on .rf-toggle {
      /* 8px body padding + half of the 22px label line, minus half the
         switch — i.e. centred on «副本数» itself. */
      top: 8px;
      transform: none;
    }

    /* The PD variant of the field. Same border, radius and inline padding as
       the Seal input it replaces: under PD this is still «副本数», only its
       value stops being a number the user types, so it has to read as the same
       field in a different state rather than as a different component. */
    .rf-group {
      border: 1px solid var(--ant-color-border);
      border-radius: var(--border-radius-lg, 8px);
      background-color: var(--ant-color-bg-container);
      overflow: hidden;
      /* The off state is a Form.Item and gets antd's item spacing for free;
         this branch is a plain div, so it has to carry the same gap itself —
         without it the field sits flush against «描述» below. Driven by the
         form token rather than a literal so the two branches cannot drift. */
      margin-bottom: var(--ant-form-item-margin-bottom, 24px);
    }
    .rg-body {
      padding: 8px 12px 10px;
    }
    .rg-label {
      display: block;
      font-size: 12px;
      line-height: 22px;
      color: var(--ant-color-text-tertiary);
    }
    /* Spaced off the label and red — the same required marker every other
       field in this form shows. */
    .rg-required {
      margin-left: 4px;
      color: var(--ant-color-error);
    }
    .rg-chips {
      margin-top: 6px;
    }
    .rg-chip {
      display: inline-flex;
      align-items: baseline;
      gap: 6px;
      padding: 3px 10px;
      border-radius: 6px;
      background-color: var(--ant-color-fill-tertiary);
      font-size: 13px;
      line-height: 20px;
      color: var(--ant-color-text-secondary);
      b {
        font-weight: 600;
        color: var(--ant-color-text);
      }
    }
    /* A filled band rather than a floating hint: it belongs to this field, and
       a grey strip inside the border says so without drawing a divider. */
    .rg-footer {
      padding: 7px 12px 8px;
      background-color: var(--ant-color-fill-quaternary);
      font-size: 12px;
      line-height: 1.7;
      color: var(--ant-color-text-tertiary);
    }
  `
}));

interface BasicFormProps {
  /**
   * PD is on, so this deployment is a *group* and its size lives in
   * `roles[].replicas`.
   *
   * `Model.replicas` degrades to a 0/1 deployment switch under PD (D20), and
   * the form already forces it back to 1 — which left a number field the user
   * could edit and that silently reverted. A control whose value is
   * overwritten is worse than no control.
   *
   * 🆕 It no longer disappears, though. Hiding the whole field made the shape
   * change look like the form had lost a question: the count still exists (the
   * group has one), it just moved. So the field stays and its *value area*
   * becomes the per-role counts, read-only, pointing at where they are set.
   */
  pdActive?: boolean;
  /**
   * The PD switch, rendered into the replica field's own label row.
   *
   * It belongs there and nowhere else: turning it on is exactly what moves the
   * count from this field to the roles, so the control and the thing it
   * changes are one glance apart. An earlier version put it in a separate card
   * above — two cards, then one switch — and both spent vertical space
   * restating a binary the replica row could carry for free.
   */
  pdToggle?: React.ReactNode;
  sourceDisable?: boolean;
  sourceList?: Global.BaseOption<string>[];
  clusterList: ClusterOption[];
  handleClusterChange: (value: number) => void;
  onClusterSeed: (value: number) => void;
  onSourceChange?: (value: string) => void;
}

const BasicForm: React.FC<BasicFormProps> = (props) => {
  const {
    sourceList,
    clusterList,
    sourceDisable,
    handleClusterChange,
    onClusterSeed,
    onSourceChange
  } = props;
  const intl = useIntl();
  const { styles: replicaStyles } = useStyles();
  const form = Form.useFormInstance();
  const { getRuleMessage } = useAppUtils();
  const { onValuesChange, action, formKey } = useFormContext();

  const handleOnSourceChange = (val: string) => {
    onSourceChange?.(val);
  };

  const handleNameBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    if (action === PageAction.EDIT) {
      const value = e.target.value;
      onValuesChange?.({ name: value }, form.getFieldsValue());
    }
  };

  // `organization_id` is owned by the create-scope picker slot; it only
  // appears when a platform admin is in the "All" view. When set, scope the
  // cluster dropdown to that org's own clusters — the backend derives the
  // deployment's owner from the chosen cluster, so this keeps them aligned.
  const scopeOrgId = Form.useWatch('organization_id', form);
  // `preserve: true` for the same reason as in the roles section: `roles` is
  // written straight into the store, not through a registered Form.Item, so a
  // plain useWatch would read undefined.
  const watchedRoles = Form.useWatch('roles', { form, preserve: true });
  // Ordered so the chips read prefill → decode → router regardless of the
  // order the roles happen to sit in the store. Not memoised: three items,
  // and the repo's guidance is to skip memoisation without a measured need.
  const roles = [...((watchedRoles as any[]) || [])].sort(
    (a, b) => RoleOrder.indexOf(a?.name) - RoleOrder.indexOf(b?.name)
  );

  const clusterOptions = useMemo(() => {
    return clusterList
      ?.filter((item) =>
        scopeOrgId == null ? true : item.owner_principal_id === scopeOrgId
      )
      .map((item) => {
        return {
          label:
            item.state === ClusterStatusValueMap.Ready
              ? item.label
              : `${item.label} [${ClusterStatusLabelMap[item.state as string]}]`,
          value: item.value,
          state: item.state,
          is_default: item.is_default,
          workers: item.workers,
          ready_workers: item.ready_workers,
          gpus: item.gpus
        };
      });
  }, [clusterList, scopeOrgId]);

  // Keep the cluster selection consistent with the available (scoped)
  // options. The modal's open handler seeds a cluster, but that seed can be
  // empty (options not loaded yet) or point outside the current scope (the
  // scope id and the option list both settle after mount, and an org switch
  // re-scopes the list) — leaving the field blank even though a valid option
  // exists. Whenever the scope or the options change, drop an invalid/empty
  // selection and fall back to the scope's default cluster (then a Ready one,
  // then the first) so GPU/backend options refetch for it. A selection that's
  // still valid is left untouched, so a user's (or edit's) choice is kept.
  // Use the seed callback (not handleClusterChange) so this auto-pick refreshes
  // options without firing an evaluate request before a model is selected.
  useEffect(() => {
    // Options derive from clusterList: an empty source list means clusters
    // are still loading — leave the field alone until they arrive.
    if (!clusterList?.length) {
      return;
    }
    // Scope off the live form value, not the `useWatch` snapshot: the scope
    // field's default lands in a child effect that flushes before this one,
    // while the watch still reports the previous render's null — scoping off
    // the watch would seed a cluster from the unscoped list here and only
    // re-scope a render later.
    const liveScopeOrgId = form.getFieldValue('organization_id') ?? null;
    const scoped = clusterList.filter(
      (item) =>
        liveScopeOrgId == null || item.owner_principal_id === liveScopeOrgId
    );
    const current = form.getFieldValue('cluster_id');
    if (!scoped.length) {
      // Clusters are loaded but the picked org owns none. Any leftover
      // selection points at another org's cluster (seeded before the scope
      // settled) and would make requests fail with "Cluster not found" —
      // clear it so the required rule surfaces instead. Create only: an
      // edit's cluster is existing data, not a seed.
      if (action === PageAction.CREATE && current != null) {
        form.setFieldValue('cluster_id', undefined);
      }
      return;
    }
    const stillValid = scoped.some((c) => c.value === current);
    if (current != null && stillValid) {
      return;
    }
    const next =
      scoped.find((c) => c.is_default)?.value ??
      scoped.find((c) => c.state === ClusterStatusValueMap.Ready)?.value ??
      scoped[0]?.value ??
      null;
    if (next == null || next === current) {
      return;
    }
    form.setFieldValue('cluster_id', next);
    onClusterSeed?.(next);
    // `clusterOptions` is the re-run trigger for scope changes: it recomputes
    // whenever the watched org scope or the cluster list settles.
  }, [clusterOptions, clusterList, action, form, onClusterSeed]);

  const clusterOptionRender = (option: any) => {
    const { data } = option;

    return (
      <span className={styles.clusterOption}>
        <span className={styles.label}>
          <AutoTooltip ghost maxWidth={'100%'}>
            {data.label}
          </AutoTooltip>
        </span>
        <span className={styles.meta}>
          <span
            className={`${styles.dot} ${data.ready_workers > 0 ? styles.ready : ''}`}
          ></span>
          <span className="flex-center gap-8">
            <span className="flex-center gap-4 text-tertiary">
              <span>{intl.formatMessage({ id: 'resources.nodes' })}:</span>
              <span>
                {data.ready_workers}/{data.workers}
              </span>
            </span>
            <span className={styles.metaDivider}></span>
            <span className="flex-center gap-4 text-tertiary">
              <span>{intl.formatMessage({ id: 'menu.resources.gpus' })}:</span>
              <span>{data.gpus}</span>
            </span>
          </span>
        </span>
      </span>
    );
  };

  return (
    <>
      <Form.Item<FormData>
        data-field="name"
        name="name"
        rules={[
          {
            required: true,
            message: getRuleMessage('input', 'common.table.name')
          },
          {
            pattern: modelNameReg,
            message: intl.formatMessage({ id: 'models.form.rules.name' })
          }
        ]}
      >
        <CInput.Input
          onBlur={handleNameBlur}
          description={intl.formatMessage({ id: 'models.form.rules.name' })}
          label={intl.formatMessage({
            id: 'common.table.name'
          })}
          required
        ></CInput.Input>
      </Form.Item>
      <PluginExtraFields name="CreateOrgScopeField" context={{ action }} />

      <Form.Item<FormData>
        name="source"
        hidden={formKey === DeployFormKeyMap.CATALOG}
        rules={[
          {
            required: true,
            message: getRuleMessage('select', 'models.form.source')
          }
        ]}
      >
        {
          <SealSelect
            onChange={handleOnSourceChange}
            disabled={sourceDisable}
            label={intl.formatMessage({
              id: 'models.form.source'
            })}
            options={sourceList ?? sourceOptions}
            required
          ></SealSelect>
        }
      </Form.Item>
      <OnlineSource></OnlineSource>
      <LocalPathSource></LocalPathSource>
      <Form.Item<FormData>
        name="cluster_id"
        rules={[
          {
            required: true,
            message: getRuleMessage('select', 'clusters.title')
          }
        ]}
      >
        {
          <SealSelect
            onChange={handleClusterChange}
            label={intl.formatMessage({ id: 'clusters.title' })}
            options={clusterOptions}
            optionRender={clusterOptionRender}
            required
          ></SealSelect>
        }
      </Form.Item>
      <ModeField></ModeField>
      <CatalogFrom></CatalogFrom>
      <BackendForm></BackendForm>
      <CustomBackend></CustomBackend>
      {/* Under PD the field keeps its frame, its label and its switch, and
          swaps only the value area: the model-level number becomes the group's
          per-role counts, read-only. `replicas` stays registered and pinned to
          1 by the PD effects — the payload needs the 0/1 switch — so what is
          gone is the editable control, not the field. */}
      {/* 🔴 The toggle is positioned over the field, not passed into it.
          `CInput.Number` declares `labelExtra` through `SealFormItemProps` but
          its implementation destructures a fixed prop set and never forwards
          it to the wrapper (`input`, `password` and `date-picker` all do) — so
          the slot compiled, type-checked, and rendered nothing. Overlaying it
          on a relative container is the version that actually shows up. */}
      {/* 🔴 One container, one position for the toggle, both states.
          The first version rendered the toggle inside each branch — in the
          header row when PD was on, laid over the Seal input when it was off.
          Two different subtree positions, so flipping the state UNMOUNTED and
          REMOUNTED it, its mount effect fired again, and that effect published
          `enabled` from a first render whose `roles` watch had not resolved
          yet — i.e. `false`. Turning PD on therefore turned itself back off:
          the switch stayed blue (derived from `roles`, which had been seeded)
          while the replica field, the Roles tab and the Roles panel all stayed
          in the off state. Keeping the toggle in one stable position is what
          breaks that loop. */}
      <div
        className={`${replicaStyles.replicaField}${
          props.pdActive ? ' pd-on' : ''
        }`}
      >
        <div className="rf-toggle">{props.pdToggle}</div>
        {props.pdActive ? (
          <div className="rf-group">
            <div className="rg-body">
              <span className="rg-label">
                {intl.formatMessage({ id: 'models.form.replicas' })}
                <span className="rg-required">*</span>
              </span>
              <Flex align="center" gap={8} wrap className="rg-chips">
                {roles.map((role: any) => (
                  <span className="rg-chip" key={role?.name}>
                    {RoleLabelMap[role?.name]
                      ? intl.formatMessage({ id: RoleLabelMap[role.name] })
                      : role?.name}
                    <b>{role?.replicas ?? 1}</b>
                  </span>
                ))}
              </Flex>
            </div>
            <div className="rg-footer">
              {intl.formatMessage({ id: 'models.form.replicas.moved.roles' })}
            </div>
          </div>
        ) : (
          <Form.Item<FormData>
            name="replicas"
            rules={[
              {
                required: true,
                message: getRuleMessage('input', 'models.form.replicas')
              }
            ]}
          >
            <CInput.Number
              style={{ width: '100%' }}
              // No spinner: the arrows sit exactly where the PD switch does,
              // and on hover they overlapped it. A replica count is typed, not
              // nudged one at a time.
              controls={false}
              // The Replicas field keeps its label/description unchanged even
              // when scheduled scaling is on. While scheduling is on this value
              // doubles as the baseline (idle) replica count — that's explained
              // by a note in the Scheduled Scaling section rather than by
              // relabeling this field.
              label={intl.formatMessage({ id: 'models.form.replicas' })}
              required
              description={intl.formatMessage(
                { id: 'models.form.replicas.tips' },
                { api: `${window.location.origin}/${OPENAI_COMPATIBLE}` }
              )}
              min={0}
            ></CInput.Number>
          </Form.Item>
        )}
      </div>
      {/* Still registered while PD is on, so the payload carries the 0/1
          switch the backend expects. Hidden rather than absent: the effects
          pin it to 1 and nothing on screen should invite editing it. */}
      {props.pdActive && (
        <Form.Item<FormData> name="replicas" hidden noStyle>
          <input />
        </Form.Item>
      )}
      <Form.Item<FormData> name="description">
        <CInput.TextArea
          scaleSize={true}
          label={intl.formatMessage({
            id: 'common.table.description'
          })}
        ></CInput.TextArea>
      </Form.Item>
    </>
  );
};

export default BasicForm;
