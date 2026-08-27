import { RightOutlined } from '@ant-design/icons';
import { useIntl } from '@umijs/max';
import { Flex } from 'antd';
import { createStyles } from 'antd-style';
import { TopologyLayer } from '../../config/types';

interface LayerChainProps {
  layers: TopologyLayer[];
}

const useStyles = createStyles(({ css }) => ({
  chain: css`
    padding: 8px 12px;
    border-radius: 6px;
    background: var(--ant-color-fill-quaternary);
    font-size: 12px;
    line-height: 20px;
    flex-wrap: wrap;
    .node {
      color: var(--ant-color-text);
    }
    .fixed {
      color: var(--ant-color-text-tertiary);
    }
    .unnamed {
      color: var(--ant-color-text-quaternary);
      font-style: italic;
    }
    .sep {
      color: var(--ant-color-text-quaternary);
      font-size: 10px;
    }
  `
}));

/**
 * The whole hierarchy on one line: `Cluster › Region › Rack › Host`.
 *
 * The per-card "under X" caption states each edge correctly and still left the
 * shape unreadable — an edge at a time is not a chain, and with three cards on
 * screen the operator was reconstructing the order by scrolling. This is the
 * view that answers "what did I just declare" without reading anything else,
 * and it is also where a wrong order becomes obvious: `Region › Rack › Row`
 * reads wrong at a glance in a way that three separate captions never did.
 *
 * Both ends are rendered greyed because neither is editable: the root is
 * implicit and the leaf is built in. Showing them anyway is what makes the
 * chain a complete statement — without them it looks like a fragment and the
 * operator cannot tell that the leaf is already handled.
 */
const LayerChain: React.FC<LayerChainProps> = ({ layers }) => {
  const intl = useIntl();
  const { styles } = useStyles();

  const named = layers.map(
    (layer, index) =>
      (layer.name || '').trim() ||
      intl.formatMessage(
        { id: 'clusters.topology.chain.unnamed' },
        { index: index + 1 }
      )
  );

  const nodes = [
    {
      text: intl.formatMessage({ id: 'clusters.topology.cluster' }),
      fixed: true
    },
    ...layers.map((layer, index) => ({
      text: named[index],
      fixed: false,
      unnamed: !(layer.name || '').trim()
    })),
    {
      text: intl.formatMessage({ id: 'clusters.topology.chain.host' }),
      fixed: true
    }
  ];

  return (
    <Flex align="center" gap={6} className={styles.chain}>
      {nodes.map((node, index) => (
        <Flex align="center" gap={6} key={`${node.text}-${index}`}>
          {index > 0 && <RightOutlined className="sep" />}
          <span
            className={
              node.fixed ? 'fixed' : (node as any).unnamed ? 'unnamed' : 'node'
            }
          >
            {node.text}
          </span>
        </Flex>
      ))}
    </Flex>
  );
};

export default LayerChain;
