// columns.ts
import { systemConfigAtom } from '@/atoms/system';
import { StatusMaps } from '@/config';
import { OPENAI_COMPATIBLE, tableSorter } from '@/config/settings';
import { TargetStatusValueMap } from '@/pages/model-routes/config';
import { usePluginListColumns } from '@/plugins/list-extra-columns';
import { InfoCircleOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import {
  AutoTooltip,
  DropdownButtons,
  GrafanaIcon,
  icons,
  StatusTag,
  ThemeTag,
  type TableColumnProps
} from '@gpustack/core-ui';
import { useIntl } from '@umijs/max';
import { useMemoizedFn } from 'ahooks';
import { Flex, Tooltip } from 'antd';
import { createStyles } from 'antd-style';
import dayjs from 'dayjs';
import { useAtomValue } from 'jotai';
import _ from 'lodash';
import { useMemo } from 'react';
import ModelTag from '../../_components/model-tag';
import PDMarkers from '../components/pd/pd-markers';
import RoleStatusDetail from '../components/pd/role-status-detail';
import {
  isModelServable,
  isPDModel,
  modelReplicaCounts,
  ModelStateLabelMap,
  ModelStateMap,
  ModelStateValueMap,
  MyModelsStatusLabelMap,
  MyModelsStatusValueMap
} from '../config';
import { generateSource } from '../config/button-actions';
import { ListItem } from '../config/types';
interface ActionItem {
  label: string;
  key: string;
  icon: React.ReactNode;
  props?: {
    danger?: boolean;
  };
}

const useStyles = createStyles(({ css }) => ({
  // Suppressing the inline editor on one row only.
  //
  // core-ui's editable cell renders its pencil as the *next sibling* of
  // whatever the column's `render` returned, and `editable` is a column-level
  // prop with no per-row form — so `render` is the only per-row hook there is.
  // A PD row uses it to take the pencil away, since its replica counts live on
  // the roles and are edited in the drawer. Every other row is untouched,
  // which is what keeps a role-less model's replica cell exactly what it is
  // today.
  readonlyReplicas: css`
    & + span {
      display: none;
    }
  `
}));

const ActionList: ActionItem[] = [
  {
    label: 'common.button.edit',
    key: 'edit',
    icon: icons.EditOutlined
  },
  {
    label: 'models.openinplayground',
    key: 'chat',
    icon: icons.ExperimentOutlined
  },
  {
    label: 'common.button.start',
    key: 'start',
    icon: icons.Play
  },
  {
    label: 'common.button.stop',
    key: 'stop',
    icon: icons.Stop
  },
  {
    label: 'resources.metrics.details',
    key: 'metrics',
    icon: (
      <span className="flex-center">
        <GrafanaIcon style={{ width: 14, height: 14 }}></GrafanaIcon>
      </span>
    )
  },
  {
    key: 'copy',
    label: 'common.button.clone',
    icon: icons.CopyOutlined
  },
  {
    label: 'common.button.delete',
    key: 'delete',
    props: {
      danger: true
    },
    icon: icons.DeleteOutlined
  }
];

interface ModelsColumnsHookProps {
  handleSelect: (val: string, record: ListItem) => void;
  sortOrder: string[];
  clusterList: Global.BaseOption<
    number,
    { provider: string; state: string | number }
  >[];
}

const useModelsColumns = ({
  handleSelect,
  clusterList,
  sortOrder,
  targetList
}: ModelsColumnsHookProps & { targetList: any[] }): TableColumnProps[] => {
  const intl = useIntl();
  const systemConfig = useAtomValue(systemConfigAtom);
  const pluginCols = usePluginListColumns('llmodels');
  const { styles } = useStyles();

  const setModelActionList = useMemoizedFn((record: any) => {
    return _.filter(ActionList, (action: any) => {
      if (action.key === 'chat') {
        // `isModelServable` is the whole servability half of this gate: under
        // PD a running-instance count no longer implies the model can answer
        // (a 3P1D with its router down is four RUNNING instances and zero
        // service), so the counter is not it. The route-target half stays —
        // it is a different question, "is there a live route to send the
        // playground at", and the playground is opened by route name.
        return (
          isModelServable(record) &&
          targetList?.find(
            (target) =>
              target.model_id === record.id &&
              target.state === TargetStatusValueMap.Active
          )
        );
      }

      if (action.key === 'start') {
        return record.replicas === 0;
      }

      if (action.key === 'stop') {
        return record.replicas > 0;
      }
      if (action.key === 'metrics') {
        return systemConfig?.showMonitoring;
      }

      return true;
    });
  });

  // The replica cell's status, straight off `Model.state` — the UI never
  // recomputes that judgement, because a second implementation of it would
  // drift from the backend's.
  //
  // Two reads around it, neither of them a judgement:
  //  - `state` is NULL between a model's creation and the first reconcile
  //    pass over it. `isModelServable` handles that window by reading the
  //    counter; the same fallback here keeps the cell from going blank.
  //  - `replicas === 0` with nothing left running is the deployment switch
  //    being off, which the lifecycle has no value for — it reports PENDING.
  //    That is the one case today's cell greys out, and it stays grey.
  const replicaStatus = useMemoizedFn((record: ListItem, ready: number) => {
    if (!record.replicas && !ready) {
      return {
        status: StatusMaps.inactive,
        text: intl.formatMessage({
          id: MyModelsStatusLabelMap[MyModelsStatusValueMap.Stopped]
        }),
        message: ''
      };
    }
    const state =
      record.state ||
      (ready > 0 ? ModelStateValueMap.Running : ModelStateValueMap.Pending);
    return {
      status: ModelStateMap[state] || StatusMaps.inactive,
      text: ModelStateLabelMap[state]
        ? intl.formatMessage({ id: ModelStateLabelMap[state] })
        : state,
      message: record.state_message || ''
    };
  });

  return useMemo(() => {
    // Two prebuilt span maps for the 24-unit SealTable grid: one for
    // the default layout, one for when a plugin contributes an extra
    // column (currently always the 4-span Organization cell). Width
    // absorbed comes from the widest non-name columns (`source`,
    // `replicas`, `created_at`). See the matching map in
    // `use-cluster-columns.tsx` for rationale.
    const SPANS_DEFAULT = {
      source: 5,
      replicas: 4,
      createTime: 4
    };
    const SPANS_WITH_PLUGIN = {
      source: 3,
      replicas: 3,
      createTime: 3
    };
    const spans = pluginCols.length > 0 ? SPANS_WITH_PLUGIN : SPANS_DEFAULT;
    const pluginRendered = pluginCols.map((c) => ({
      title: intl.formatMessage({ id: c.titleId }),
      dataIndex: c.key,
      key: c.key,
      span: c.span ?? 4,
      render: (_text: any, record: ListItem) => c.render(record)
    }));
    return [
      {
        title: intl.formatMessage({ id: 'common.table.name' }),
        dataIndex: 'name',
        key: 'name',
        sorter: tableSorter(1),
        span: 5,
        render: (text: string, record: ListItem) => (
          <Flex align="center" gap={4} style={{ maxWidth: '100%' }}>
            <AutoTooltip
              ghost
              title={
                <span style={{ color: 'var(--ant-color-text-light-solid)' }}>
                  {text}
                </span>
              }
            >
              <span className="text-primary font-400">{text}</span>
            </AutoTooltip>
            <ModelTag categoryKey={record.categories?.[0] || ''} />
            {/* Gated on the mode, not on `roles`: roles alone are plain
                multi-role orchestration, and only a mode makes it PD. The
                mode itself goes in the tooltip — the catalog's display names
                come from an endpoint the list does not call, and the column
                has no room for a slug beside the category tag. */}
            {!!record.disaggregation?.mode && (
              <Tooltip
                title={`${intl.formatMessage({
                  id: 'models.form.pd.mode'
                })}: ${record.disaggregation.mode}`}
              >
                <ThemeTag>
                  {intl.formatMessage({ id: 'models.pd.tag' })}
                </ThemeTag>
              </Tooltip>
            )}
          </Flex>
        )
      },
      ...pluginRendered,
      {
        title: intl.formatMessage({ id: 'clusters.title' }),
        dataIndex: 'cluster_id',
        key: 'cluster_id',
        sorter: tableSorter(2),
        span: 3,
        render: (text: string, record: ListItem) => (
          <span className="flex flex-column" style={{ width: '100%' }}>
            {
              clusterList.find((item) => item.value === record.cluster_id)
                ?.label
            }
          </span>
        )
      },
      {
        title: intl.formatMessage({ id: 'models.form.source' }),
        dataIndex: 'source',
        key: 'source',
        sorter: tableSorter(3),
        span: spans.source,
        render: (text: string, record: ListItem) => (
          <span className="flex flex-column" style={{ width: '100%' }}>
            <AutoTooltip ghost>{generateSource(record)}</AutoTooltip>
          </span>
        )
      },
      {
        title: (
          <Tooltip
            title={intl.formatMessage(
              { id: 'models.form.replicas.tips' },
              { api: `${window.location.origin}/${OPENAI_COMPATIBLE}` }
            )}
          >
            <span>{intl.formatMessage({ id: 'models.form.replicas' })}</span>
            <QuestionCircleOutlined className="m-l-5" />
          </Tooltip>
        ),
        dataIndex: 'replicas',
        key: 'replicas',
        align: 'left',
        sorter: tableSorter(4),
        span: spans.replicas,
        editable: {
          valueType: 'number',
          title: intl.formatMessage({ id: 'models.table.replicas.edit' })
        },
        render: (text: number, record: ListItem) => {
          // Not `ready_replicas / replicas`: under PD `Model.replicas` is a
          // 0/1 deployment switch, so a 4P1D would render "5 / 1". The
          // declared size of a group is the sum of its roles' counts, which is
          // what `modelReplicaCounts` returns — and it degenerates to
          // `replicas` for a model without roles, leaving that cell's numbers
          // unchanged.
          const { ready, total } = modelReplicaCounts(record);
          const isPD = isPDModel(record);
          const cell = (
            <Flex
              component="span"
              align="center"
              gap={8}
              className={isPD ? styles.readonlyReplicas : undefined}
              style={{
                minWidth: 23,
                color: 'var(--ant-color-text)',
                cursor: isPD ? 'default' : undefined
              }}
            >
              <StatusTag statusValue={replicaStatus(record, ready)} />
              <span style={{ flexShrink: 0 }}>
                {ready} / {total}
              </span>
              {isPD && (
                <>
                  {/* Markers, never a replacement for the colour above:
                      a stale group is usually still serving and a degraded one
                      is serving worse than asked for. Both carry their
                      reason. */}
                  <PDMarkers
                    stale={record.stale}
                    degradations={record.degradations}
                  />
                  <InfoCircleOutlined
                    style={{
                      flexShrink: 0,
                      color: 'var(--ant-color-text-tertiary)'
                    }}
                  />
                </>
              )}
            </Flex>
          );
          if (!isPD) {
            return cell;
          }
          // The per-role breakdown has to work on the list response, which
          // carries no instances — hence `role_status` rather than a count of
          // the expanded row's children. The footer is where the missing
          // pencil is accounted for.
          return (
            <Tooltip
              title={
                <RoleStatusDetail
                  roleStatus={record.role_status}
                  roles={record.roles}
                  footer={
                    <span
                      style={{
                        marginTop: 4,
                        color: 'var(--ant-color-text-light-solid)',
                        opacity: 0.75
                      }}
                    >
                      {intl.formatMessage({
                        id: 'models.pd.replicas.readonly'
                      })}
                    </span>
                  }
                ></RoleStatusDetail>
              }
            >
              {cell}
            </Tooltip>
          );
        }
      },
      {
        title: intl.formatMessage({ id: 'common.table.createTime' }),
        dataIndex: 'created_at',
        key: 'created_at',
        sorter: tableSorter(5),
        width: 180,
        render: (text: number) => (
          <AutoTooltip ghost>
            {dayjs(text).format('YYYY-MM-DD HH:mm:ss')}
          </AutoTooltip>
        )
      },
      {
        title: intl.formatMessage({ id: 'common.table.operation' }),
        key: 'operation',
        dataIndex: 'operation',
        span: 3,
        render: (text: any, record: ListItem) => (
          <DropdownButtons
            items={setModelActionList(record)}
            onSelect={(val) => handleSelect(val, record)}
          />
        )
      }
    ];
  }, [
    sortOrder,
    clusterList,
    intl,
    handleSelect,
    setModelActionList,
    replicaStatus,
    pluginCols,
    styles.readonlyReplicas
  ]);
};

export default useModelsColumns;
