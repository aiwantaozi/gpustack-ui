import { queryClusterTopology } from '@/pages/cluster-management/apis';
import { topologyLayerLabel } from '@/pages/cluster-management/config';
import {
  NODE_LAYER,
  TopologyLayerView,
  TopologyView
} from '@/pages/cluster-management/config/types';
import { IconFont, Select as SealSelect } from '@gpustack/core-ui';
import { useIntl } from '@umijs/max';
import { Button, Flex, Form } from 'antd';
import { createStyles } from 'antd-style';
import { useEffect, useRef, useState } from 'react';
import { FormData } from '../config/types';

const openTopologyDrawer = (clusterId: number) => {
  window.open(
    `${window.location.origin}${window.location.pathname}#/resources/clusters/list?topology=${clusterId}`,
    '_blank'
  );
};

const useStyles = createStyles(({ css }) => ({
  explain: css`
    font-size: 12px;
    color: var(--ant-color-text-tertiary);
  `,
  hint: css`
    margin-top: 6px;
    font-size: 12px;
    color: var(--ant-color-text-tertiary);
  `
}));

/**
 * «至少在同一 ___，否则不部署» — the group's placement floor.
 *
 * 🔑 The question is «低于什么档次宁可不部署», never «你想要哪一层». The solver
 * already places into the tightest domain that fits, so the only thing this
 * control adds is a floor to refuse below.
 *
 * 🔴 **The options come from the cluster's declared topology, not from a
 * capacity probe.** An earlier version asked `gather-feasibility` for the
 * tiers and rendered each one with a live «放得下 / 放不下» verdict. Two things
 * killed it. On a healthy fleet every tier answers «放得下», so five identical
 * green strings bought nothing and cost the whole right half of the control.
 * And when the probe could not answer — which it could not here, because it
 * solves against a form that is still half-filled — the tier LIST came back
 * empty too, leaving «尽量靠近» as the only option on a cluster that had racks
 * declared. Feasibility is a verdict about a finished configuration; asking
 * for it while the user is still typing conflated «这一档放不下» with «我还不
 * 知道». So the list is now a fact about the cluster, always available, and
 * the fit check belongs to the final review before submit.
 *
 * The most useful option is free: the leaf layer is built in, so «至少同机»
 * exists even in a cluster that declared no topology at all.
 */
const GatherLocality: React.FC = () => {
  const intl = useIntl();
  const { styles } = useStyles();
  const form = Form.useFormInstance<FormData>();
  const clusterId = Form.useWatch('cluster_id', form);
  const strategy = Form.useWatch(['gather', 'strategy'], form);
  const layer = Form.useWatch(['gather', 'layer'], form);

  const [topology, setTopology] = useState<TopologyView | null>(null);
  const [failed, setFailed] = useState(false);
  /** Rotated per fetch so a slow answer cannot paint over a fresher one. */
  const sessionRef = useRef(0);

  /**
   * Fetched when the cluster changes — that IS the action, and it is the only
   * input the answer depends on. Cheap and cacheable, unlike the capacity
   * solve it replaces: a cluster's declared layers do not move while a form is
   * being filled in, so there is nothing to debounce.
   */
  const fetchTopology = async (id: number) => {
    const session = ++sessionRef.current;
    try {
      const result = await queryClusterTopology(
        { id },
        { skipErrorHandler: true }
      );
      if (sessionRef.current !== session) {
        return;
      }
      setTopology(result);
      setFailed(false);
    } catch (e) {
      if (sessionRef.current !== session) {
        return;
      }
      // 🔴 Never an error state. Without the declaration the control still
      // works — «尽量靠近» and «至少同机» need no topology at all — so this
      // degrades to fewer options rather than to a broken field.
      setTopology(null);
      setFailed(true);
    }
  };

  useEffect(() => {
    if (!clusterId) {
      setTopology(null);
      return;
    }
    fetchTopology(clusterId);
  }, [clusterId]);

  /**
   * Root-to-leaf, and only the layers that mean something here:
   *
   * - the built-in host layer is offered as «至少同机», always, even for a
   *   cluster that declared no topology at all;
   * - a declared layer is offered once at least one worker resolves a value
   *   there. An `active: false` layer is a name with nothing behind it, and
   *   refusing to deploy below a tier no machine belongs to would refuse
   *   everything.
   *
   * 🔴 There is no «至少同一加速器域» special tier any more, and no per-chain
   * grouping around it. The domain used to be its own candidate set, offered
   * beside the layers with a warning that the two could not be compared. It is
   * now whatever rung the operator declared it as — if they named a layer
   * `accelerator_domain`, it appears here as «至少同一加速器域» through the very
   * same code path as «至少同一机柜», and it sorts into the chain where they put
   * it. The unanswerable «同超节点 vs 同机柜，哪个更紧» is gone because the chain
   * now answers it.
   */
  const treeLayers = (topology?.layers || []).filter(
    (item) => item.active && item.id !== NODE_LAYER
  );

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

  const tierLabel = (item: TopologyLayerView) =>
    intl.formatMessage(
      { id: 'models.form.gather.sameLayer' },
      { layer: topologyLayerLabel(intl, item) }
    );

  const options: any[] = [
    // 🔴 Stays first and stays the default. The solver finds the tightest fit
    // itself, which is where the overwhelming majority should stop.
    {
      value: 'prefer',
      label: intl.formatMessage({ id: 'models.form.gather.prefer' }),
      desc: intl.formatMessage({ id: 'models.form.gather.prefer.tips' })
    },
    // The built-in leaf, below every declared layer.
    {
      value: `must:${NODE_LAYER}`,
      label: intl.formatMessage({ id: 'models.form.gather.sameHost' })
    },
    // Flat, in chain order. The list was briefly grouped under «层级» /
    // «加速器域» headings; with one chain a heading would name a distinction
    // that no longer exists, and chain order already says which rung is wider.
    ...treeLayers.map((item) => ({
      value: `must:${item.id}`,
      label: tierLabel(item),
      desc: intl.formatMessage({ id: 'models.form.gather.tree.tips' })
    }))
  ];

  /**
   * 🔴 Which way a tier gives way, said where the tier is chosen. It is judged
   * at the chosen rung only: not fitting refuses the deployment rather than
   * quietly widening. The top of the chain and the host leaf each get their
   * own wording, because for them "widen" has no meaning at all.
   */
  const retreat = (() => {
    if (strategy !== 'MustGather' || !layer) {
      return null;
    }
    if (layer === NODE_LAYER) {
      return intl.formatMessage(
        { id: 'models.form.gather.retreat.host' },
        { tier: intl.formatMessage({ id: 'models.form.gather.sameHost' }) }
      );
    }
    const index = treeLayers.findIndex((item) => item.id === layer);
    if (index < 0) {
      return null;
    }
    const tier = tierLabel(treeLayers[index]);
    // Root-to-leaf: index 0 is the widest rung the chain has.
    return index === 0
      ? intl.formatMessage({ id: 'models.form.gather.retreat.top' }, { tier })
      : intl.formatMessage(
          { id: 'models.form.gather.retreat' },
          { tier, top: tierLabel(treeLayers[0]) }
        );
  })();

  // Assigned to consts rather than written inline: an inline arrow in JSX is a
  // new component type on every render, which antd's Select rebuilds the whole
  // dropdown for.
  const optionRender = (option: any) => (
    <Flex vertical gap={2}>
      <span>{option?.data?.label}</span>
      {option?.data?.desc && (
        <span className={styles.explain}>{option.data.desc}</span>
      )}
    </Flex>
  );

  // The default's «放不下就摊开» belongs on the closed control: it is the one
  // option whose meaning is not in its name.
  const labelRender = (option: any) => (
    <Flex align="center" gap={6}>
      <span>{option?.label}</span>
      {option?.value === 'prefer' && (
        <span className={styles.explain}>
          {intl.formatMessage({ id: 'models.form.gather.prefer.tips' })}
        </span>
      )}
    </Flex>
  );

  return (
    <>
      {/* Registered so the pair reaches the payload; driven by the select
          below rather than by fields of their own, because the two together
          are one decision. */}
      <Form.Item name={['gather', 'strategy']} hidden noStyle>
        <input />
      </Form.Item>
      <Form.Item name={['gather', 'layer']} hidden noStyle>
        <input />
      </Form.Item>

      <SealSelect
        value={value}
        onChange={handleChange}
        options={options}
        optionRender={optionRender}
        labelRender={labelRender}
      ></SealSelect>

      {retreat && (
        <Flex align="flex-start" gap={6} className={styles.hint}>
          <IconFont type="icon-bulb" />
          <span>{retreat}</span>
        </Flex>
      )}

      {/* Where the coarser tiers come from, said once and pointing at the
          place that creates them. Without this the absence of «至少在同一机柜»
          reads as a missing feature rather than an unset one. */}
      {!treeLayers.length && !failed && (
        <Flex align="center" gap={6} className={styles.hint}>
          <IconFont type="icon-bulb" />
          <span>
            {intl.formatMessage({ id: 'models.form.gather.declare' })}
          </span>
          {!!clusterId && (
            <Button
              size="small"
              type="link"
              style={{ padding: 0 }}
              onClick={() => openTopologyDrawer(clusterId)}
            >
              {intl.formatMessage({ id: 'models.form.gather.goFill' })}
            </Button>
          )}
        </Flex>
      )}
    </>
  );
};

export default GatherLocality;
