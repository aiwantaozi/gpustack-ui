import { queryGatherFeasibility } from '@/pages/cluster-management/apis';
import {
  GatherFeasibility,
  GatherTier,
  NODE_LAYER
} from '@/pages/cluster-management/config/types';
import { IconFont } from '@gpustack/core-ui';
import { useIntl } from '@umijs/max';
import { Button, Flex, Form, Radio, Space, Spin } from 'antd';
import { createStyles } from 'antd-style';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FormData } from '../config/types';

/**
 * Every tier costs one solve against live capacity, so the fetch is deferred
 * until the control is opened and debounced once there. Following the form's
 * keystrokes would re-solve the whole cluster per character typed in an
 * unrelated field.
 */
const FEASIBILITY_DEBOUNCE_MS = 500;

const useStyles = createStyles(({ css }) => ({
  /* Laid out with `Space direction="vertical"`, not with `display: block` on
     the Radio. Blocking the Radio breaks its own `input + label` row and the
     dot ends up on the line above its text — which is exactly what it did. */
  group: css`
    width: 100%;
    .ant-radio-wrapper {
      align-items: baseline;
      margin-inline-end: 0;
    }
    .verdict {
      font-size: 12px;
      margin-left: 8px;
    }
    .ok {
      color: var(--ant-color-success);
    }
    .no {
      color: var(--ant-color-text-tertiary);
    }
    .unknown {
      color: var(--ant-color-warning);
    }
  `,
  hint: css`
    font-size: 12px;
    color: var(--ant-color-text-tertiary);
    margin-top: 6px;
  `
}));

/**
 * "Below what would you rather not deploy" — not "which layer do you want".
 *
 * `MustGather` is a *failure* policy, not a placement one: the group solver
 * already places into the tightest domain that fits, so the only thing this
 * adds is refusing instead of quietly delivering a slower deployment. Asking
 * for a layer directly would be asking a deployer to interpret an operator's
 * private vocabulary ("L2"), while "does it fit" needs no glossary — which is
 * why every option carries a live verdict.
 *
 * The most useful option is free: the leaf layer is built in, so "at least on
 * the same host" exists even in a cluster that declared no topology at all.
 */
const GatherLocality: React.FC = () => {
  const intl = useIntl();
  const { styles } = useStyles();
  const form = Form.useFormInstance<FormData>();
  const clusterId = Form.useWatch('cluster_id', form);
  const strategy = Form.useWatch(['gather', 'strategy'], form);
  const layer = Form.useWatch(['gather', 'layer'], form);

  const [feasibility, setFeasibility] = useState<GatherFeasibility | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  /**
   * The server does not have this endpoint.
   *
   * Told apart from a failed check on purpose: a 404 means the feature is not
   * there, which no amount of retrying fixes, and offering a Retry button for
   * it trains people to ignore the one that matters. A UI newer than the
   * server it talks to is the normal case during a rollout, and it should look
   * like "not available here", not like "something went wrong".
   */
  const [unsupported, setUnsupported] = useState(false);
  /** Rotated per fetch so a slow answer cannot paint over a fresher one. */
  const sessionRef = useRef(0);
  const timerRef = useRef<any>(null);

  const fetchFeasibility = useCallback(async () => {
    if (!clusterId) {
      return;
    }
    const session = ++sessionRef.current;
    setLoading(true);
    try {
      const result = await queryGatherFeasibility(
        {
          id: clusterId,
          // The whole form state. Capacity is decided by the resource-fit
          // selectors, which read the backend, the parameters and the per-role
          // overrides — a summary would answer a different question than the
          // one the scheduler will.
          model_spec: form.getFieldsValue(true)
        },
        { skipErrorHandler: true }
      );
      if (sessionRef.current !== session) {
        return;
      }
      setFeasibility(result);
      setUnsupported(false);
    } catch (e: any) {
      if (sessionRef.current !== session) {
        return;
      }
      if (e?.response?.status === 404) {
        setUnsupported(true);
      }
      // 🔴 Never an error state. A feasibility answer we could not get is not
      // a deployment problem — the deployment is still legal and will still
      // schedule. Blocking on it would make this control stricter than the
      // backend it previews.
      setFeasibility(null);
    } finally {
      if (sessionRef.current === session) {
        setLoading(false);
      }
    }
  }, [clusterId, form]);

  useEffect(() => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(fetchFeasibility, FEASIBILITY_DEBOUNCE_MS);
    return () => clearTimeout(timerRef.current);
  }, [fetchFeasibility]);

  const tiers = feasibility?.tiers || [];
  /**
   * Only the leaf when nothing is declared. The coarser choices are what a
   * topology declaration buys, and offering them empty would be offering a
   * setting with no effect.
   */
  const hasDeclaredLayers = tiers.some((tier) => tier.layer !== NODE_LAYER);

  const verdict = (tier?: GatherTier) => {
    if (!tier) {
      return null;
    }
    // Unmeasured first: `available` is a floor when it is non-zero, and
    // presenting a floor as a capacity verdict is what makes an operator stop
    // looking for the misconfiguration that caused it.
    if (tier.unmeasured) {
      return (
        <span className="verdict unknown">
          {intl.formatMessage(
            { id: 'models.form.gather.unknown' },
            { count: tier.unmeasured }
          )}
        </span>
      );
    }
    if (tier.feasible) {
      return (
        <span className="verdict ok">
          {tier.domain
            ? intl.formatMessage(
                { id: 'models.form.gather.fits.domain' },
                { domain: tier.domain }
              )
            : intl.formatMessage({ id: 'models.form.gather.fits' })}
        </span>
      );
    }
    return (
      <span className="verdict no">
        {tier.best_domain
          ? intl.formatMessage(
              { id: 'models.form.gather.short' },
              {
                domain: tier.best_domain,
                needed: tier.needed,
                available: tier.available
              }
            )
          : intl.formatMessage({ id: 'models.form.gather.noRoom' })}
      </span>
    );
  };

  const value = strategy === 'MustGather' ? `must:${layer}` : 'prefer';

  const handleChange = (next: string) => {
    if (next === 'prefer') {
      // Both fields together: a layer without a strategy is refused by the
      // backend, and leaving a stale one behind would make the next save fail
      // on a field the user cannot see.
      form.setFieldValue(['gather', 'strategy'], 'PreferGather');
      form.setFieldValue(['gather', 'layer'], undefined);
      return;
    }
    form.setFieldValue(['gather', 'strategy'], 'MustGather');
    form.setFieldValue(['gather', 'layer'], next.slice('must:'.length));
  };

  return (
    <>
      {/* Registered so the pair reaches the payload; driven by the radio
          group below rather than by fields of their own, because the two
          together are one decision. */}
      <Form.Item name={['gather', 'strategy']} hidden noStyle>
        <input />
      </Form.Item>
      <Form.Item name={['gather', 'layer']} hidden noStyle>
        <input />
      </Form.Item>

      {/* 🔴 Not wrapped in `Spin`. A spinning Spin lays a mask over its
          children, and a mask over a radio group is a control nobody can
          click. The first version compounded it by refetching on mouseenter,
          so moving the pointer in to click re-raised the mask that blocked the
          click. Loading is reported next to the options instead, where it
          cannot intercept anything. */}
      <Radio.Group
        className={styles.group}
        value={value}
        onChange={(e) => handleChange(e.target.value)}
      >
        <Space direction="vertical" size={4} style={{ width: '100%' }}>
          <Radio value="prefer">
            {intl.formatMessage({ id: 'models.form.gather.prefer' })}
            <span className="verdict no">
              {intl.formatMessage({ id: 'models.form.gather.prefer.tips' })}
            </span>
          </Radio>
          {tiers.map((tier) => (
            <Radio key={tier.layer} value={`must:${tier.layer}`}>
              {tier.layer === NODE_LAYER
                ? intl.formatMessage({ id: 'models.form.gather.sameHost' })
                : intl.formatMessage(
                    { id: 'models.form.gather.sameLayer' },
                    { layer: tier.layer }
                  )}
              {verdict(tier)}
            </Radio>
          ))}
        </Space>
      </Radio.Group>

      {/* The stricter options come from the server, so until it answers there
          is exactly one radio on screen — which reads as a broken control
          rather than as a pending one. Saying which it is costs a line. */}
      {loading && !tiers.length && (
        <Flex align="center" gap={6} className={styles.hint}>
          <Spin size="small" />
          <span>
            {intl.formatMessage({ id: 'models.form.gather.checking' })}
          </span>
        </Flex>
      )}
      {/* Nothing at all when the server lacks the endpoint: the control still
          works (the default is the correct answer), and a notice about a
          capability this deployment does not have is noise on every form. */}
      {!loading && !tiers.length && !unsupported && (
        <Flex align="center" gap={6} className={styles.hint}>
          <span>
            {intl.formatMessage({ id: 'models.form.gather.unavailable' })}
          </span>
          <Button size="small" type="link" onClick={fetchFeasibility}>
            {intl.formatMessage({ id: 'models.form.gather.retry' })}
          </Button>
        </Flex>
      )}

      {/* Where the coarser tiers come from, said once and pointing at the
          place that creates them. Without this the absence of "at least in the
          same rack" reads as a missing feature rather than an unset one. */}
      {!hasDeclaredLayers && !!tiers.length && (
        <Flex align="center" gap={6} className={styles.hint}>
          <IconFont type="icon-bulb" />
          <span>
            {intl.formatMessage({ id: 'models.form.gather.declare' })}
          </span>
        </Flex>
      )}
    </>
  );
};

export default GatherLocality;
