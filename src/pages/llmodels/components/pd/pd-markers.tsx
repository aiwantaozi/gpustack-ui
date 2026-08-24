import { ClockCircleFilled, ExclamationCircleFilled } from '@ant-design/icons';
import { useIntl } from '@umijs/max';
import { Flex, Tooltip } from 'antd';
import React from 'react';
import { DegradationLabelMap, DegradationValueMap } from '../../config';

type IntlShape = ReturnType<typeof useIntl>;

interface PDMarkersProps {
  // `Model.stale`: the members predate the config they are shown with.
  stale?: boolean | null;
  // `DegradationValueMap` values; a list because they coexist.
  degradations?: string[] | null;
  fontSize?: number;
}

/**
 * The reason text behind one degradation marker.
 *
 * A reason the UI has no wording for still renders — as its raw value. Showing
 * a marker with a name nobody has translated yet is bad; dropping the marker
 * is worse, because "degraded and nobody said so" is the exact failure this
 * view exists to surface.
 */
export const degradationReason = (intl: IntlShape, reason: string) => {
  const id = DegradationLabelMap[reason];
  if (!id) {
    return reason;
  }
  if (reason === DegradationValueMap.BandwidthDegraded) {
    // This message is worded around three metric figures that no endpoint
    // serves yet (see `use-pd-metrics.ts`). Leaving the placeholders unfilled
    // makes react-intl drop the whole sentence, so they read as a dash until
    // the numbers exist — the backend flags the degradation, we just cannot
    // quantify it.
    return intl.formatMessage(
      { id },
      { actual: '—', baseline: '—', delta: '—' }
    );
  }
  return intl.formatMessage({ id });
};

/**
 * `stale` and `degradations` as badges beside a status, never instead of one.
 *
 * Both are orthogonal to `Model.state` by construction: a stale group is
 * usually still serving, and a degraded one is serving worse than it was asked
 * for. So these coexist with the state colour and every one of them carries
 * its reason — a marker without a reason is just another silent failure.
 */
const PDMarkers: React.FC<PDMarkersProps> = ({
  stale,
  degradations,
  fontSize = 13
}) => {
  const intl = useIntl();
  const reasons = degradations || [];

  if (!stale && !reasons.length) {
    return null;
  }

  return (
    <Flex align="center" gap={4}>
      {reasons.map((reason) => (
        <Tooltip key={reason} title={degradationReason(intl, reason)}>
          <ExclamationCircleFilled
            style={{ color: 'var(--ant-color-warning)', fontSize }}
          />
        </Tooltip>
      ))}
      {!!stale && (
        <Tooltip title={intl.formatMessage({ id: 'models.pd.stale' })}>
          <ClockCircleFilled
            style={{ color: 'var(--ant-color-warning)', fontSize }}
          />
        </Tooltip>
      )}
    </Flex>
  );
};

export default PDMarkers;
