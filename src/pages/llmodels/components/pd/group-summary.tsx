import { StatusMaps } from '@/config';
import {
  AutoTooltip,
  CopyButton,
  ExpandedRowGrid,
  StatusTag
} from '@gpustack/core-ui';
import { useIntl } from '@umijs/max';
import { Flex } from 'antd';
import _ from 'lodash';
import React from 'react';
import { ModelStateLabelMap, ModelStateMap, RoleValueMap } from '../../config';
import { ListItem, ModelInstanceListItem } from '../../config/types';
import PDMarkers from './pd-markers';
import {
  isRoleWaiting,
  orderedRoleStatus,
  roleLabel,
  roleRatio
} from './role-status';
import usePDMetrics, { PD_EFFECTIVENESS_FLOOR } from './use-pd-metrics';

interface GroupSummaryProps {
  modelData: ListItem;
  instances: ModelInstanceListItem[];
  gridTemplate?: string;
  prefixWidth?: number;
  columnCount: number;
}

const labelStyle: React.CSSProperties = {
  color: 'var(--ant-color-text-tertiary)'
};

const valueStyle: React.CSSProperties = {
  color: 'var(--ant-color-text-secondary)'
};

/**
 * The bar at the top of a group's expanded row: the three things about a PD
 * deployment that are otherwise invisible.
 *
 * "The group looks fine, and PD has silently degraded to aggregated serving" is
 * the most dangerous failure in this domain — correct answers, zero errors —
 * so the bar's job is to make the group's real shape and health legible without
 * the user having to read four instance rows and infer it.
 *
 * Everything here comes off the model row and the instances already loaded for
 * the expansion. The PD-effectiveness and KV-bandwidth rows need a metrics read
 * endpoint that does not exist yet; `usePDMetrics` is that seam and reports
 * `supported: false`, so those two rows are omitted rather than faked.
 */
const GroupSummary: React.FC<GroupSummaryProps> = ({
  modelData,
  instances,
  gridTemplate,
  prefixWidth = 0,
  columnCount
}) => {
  const intl = useIntl();
  const metrics = usePDMetrics(modelData?.id);
  const items = orderedRoleStatus(modelData?.role_status, modelData?.roles);
  const ratio = roleRatio(items);

  // A group is one generation at a time, so every member shares one group id;
  // the first that carries one is the group's.
  const groupId = _.find(
    instances,
    (item: ModelInstanceListItem) => !!item.group_id
  )?.group_id;
  const router = _.find(
    instances,
    (item: ModelInstanceListItem) =>
      item.role === RoleValueMap.Router && !!item.worker_ip
  );
  const routerAddress = router
    ? [router.worker_ip, router.port].filter(Boolean).join(':')
    : '';

  const state = modelData?.state;
  const effectivenessDegraded =
    metrics.supported &&
    metrics.effectiveness != null &&
    metrics.effectiveness < PD_EFFECTIVENESS_FLOOR;

  return (
    <ExpandedRowGrid gridTemplate={gridTemplate} prefixWidth={prefixWidth}>
      <ExpandedRowGrid.Cell
        span={columnCount}
        style={{ alignItems: 'stretch' }}
      >
        <Flex
          vertical
          gap={4}
          style={{
            width: '100%',
            padding: 'var(--ant-padding-xs) var(--ant-padding-sm)',
            marginBlock: 'var(--ant-margin-xxs)',
            borderRadius: 'var(--ant-border-radius-lg)',
            backgroundColor: 'var(--ant-color-fill-quaternary)'
          }}
        >
          <Flex align="center" gap={12} wrap="wrap">
            {!!state && (
              <StatusTag
                statusValue={{
                  status: ModelStateMap[state] || StatusMaps.inactive,
                  text: ModelStateLabelMap[state]
                    ? intl.formatMessage({ id: ModelStateLabelMap[state] })
                    : state,
                  message: modelData?.state_message || ''
                }}
              />
            )}
            {items.map((item) => (
              <Flex key={item.name} align="center" gap={4}>
                <span style={labelStyle}>{roleLabel(intl, item.name)}</span>
                <span
                  style={
                    isRoleWaiting(item)
                      ? { color: 'var(--ant-color-warning)' }
                      : valueStyle
                  }
                >
                  {item.ready} / {item.desired}
                </span>
              </Flex>
            ))}
            <PDMarkers
              stale={modelData?.stale}
              degradations={modelData?.degradations}
            />
          </Flex>
          {!!ratio && (
            <span style={{ color: 'var(--ant-color-warning)' }}>
              {intl.formatMessage(
                { id: 'models.pd.ratio.waiting' },
                {
                  configured: ratio.configured,
                  current: ratio.current,
                  role: ratio.waiting
                    .map((name) => roleLabel(intl, name))
                    .join(' / ')
                }
              )}
            </span>
          )}
          <Flex align="center" gap={16} wrap="wrap">
            {!!modelData?.disaggregation?.mode && (
              <Flex align="center" gap={4}>
                <span style={labelStyle}>
                  {intl.formatMessage({ id: 'models.form.pd.mode' })}
                </span>
                <span style={valueStyle}>{modelData.disaggregation.mode}</span>
              </Flex>
            )}
            {!!groupId && (
              <Flex align="center" gap={4} style={{ maxWidth: 320 }}>
                <span style={labelStyle}>
                  {intl.formatMessage({ id: 'models.pd.group.id' })}
                </span>
                <AutoTooltip ghost minWidth={20} style={valueStyle}>
                  {groupId}
                </AutoTooltip>
                <CopyButton text={groupId} size="small" type="text" />
              </Flex>
            )}
            {!!routerAddress && (
              // The first place anyone looks when a group answers but answers
              // wrong, so it is copyable rather than only readable.
              <Flex align="center" gap={4}>
                <span style={labelStyle}>
                  {roleLabel(intl, RoleValueMap.Router)}
                </span>
                <span style={valueStyle}>{routerAddress}</span>
                <CopyButton text={routerAddress} size="small" type="text" />
              </Flex>
            )}
          </Flex>
          {effectivenessDegraded && (
            <span style={{ color: 'var(--ant-color-error)' }}>
              {intl.formatMessage({ id: 'models.pd.effectiveness.degraded' })}
            </span>
          )}
          {metrics.supported && !!metrics.bandwidth?.degraded && (
            <span style={{ color: 'var(--ant-color-warning)' }}>
              {intl.formatMessage(
                { id: 'models.pd.bandwidth.degraded' },
                {
                  actual: metrics.bandwidth.actual,
                  baseline: metrics.bandwidth.baseline,
                  delta: metrics.bandwidth.delta
                }
              )}
            </span>
          )}
        </Flex>
      </ExpandedRowGrid.Cell>
    </ExpandedRowGrid>
  );
};

export default GroupSummary;
