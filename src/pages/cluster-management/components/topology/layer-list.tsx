import { MetadataList } from '@gpustack/core-ui';
import { useIntl } from '@umijs/max';
import { Alert, Flex } from 'antd';
import { useMemo } from 'react';
import { TopologyLayer } from '../../config/types';
import LayerItem from './layer-item';

interface LayerListProps {
  layers: TopologyLayer[];
  onChange: (layers: TopologyLayer[]) => void;
}

/**
 * The declaration side: an ordered list of layers, root first.
 *
 * **Ordered in the UI, chained in storage.** The wire form stores each layer's
 * parent rather than an index, because inserting a layer into an indexed list
 * renumbers every layer below it and those names are referenced from saved
 * model configurations. Top-to-bottom is how an operator thinks about it
 * though, so the conversion happens on the way out — `onChange` re-derives
 * `parentLayer` from position, which is the one place the two representations
 * meet.
 *
 * The leaf is not in this list. It is built in, takes the worker's name rather
 * than a label, and is shown below as a locked row with the reason — which is
 * how "a missing label costs resolution, never schedulability" becomes visible
 * instead of being a paragraph in a doc nobody reads.
 */
const LayerList: React.FC<LayerListProps> = ({ layers, onChange }) => {
  const intl = useIntl();

  /** Re-chain from position. The list is root-first, so item N's parent is N-1. */
  const rechain = (list: TopologyLayer[]): TopologyLayer[] =>
    list.map((layer, index) => ({
      ...layer,
      parentLayer: index === 0 ? null : list[index - 1].name || null
    }));

  const handleAdd = () => {
    onChange(rechain([...layers, { name: '', labelKeys: [] }]));
  };

  const handleDelete = (index: number) => {
    onChange(rechain(layers.filter((_, i) => i !== index)));
  };

  const handleItemChange = (index: number, partial: Partial<TopologyLayer>) => {
    const next = layers.map((layer, i) =>
      i === index ? { ...layer, ...partial } : layer
    );
    onChange(rechain(next));
  };

  /**
   * Name collisions, computed once for the whole list rather than per item: a
   * duplicate is a property of the set, and asking each row "am I unique"
   * would make it O(n²) reads of the same array.
   */
  const duplicates = useMemo(() => {
    const counts = new Map<string, number>();
    layers.forEach((layer) => {
      const name = (layer.name || '').trim();
      if (name) {
        counts.set(name, (counts.get(name) ?? 0) + 1);
      }
    });
    return new Set(
      Array.from(counts.entries())
        .filter(([, count]) => count > 1)
        .map(([name]) => name)
    );
  }, [layers]);

  return (
    <Flex vertical gap={12}>
      <MetadataList
        label={intl.formatMessage({ id: 'clusters.topology.layers' })}
        dataList={layers}
        btnText={intl.formatMessage({ id: 'clusters.topology.addLayer' })}
        onAdd={handleAdd}
        onDelete={handleDelete}
      >
        {(item: TopologyLayer, index: number) => (
          <LayerItem
            item={item}
            takenNames={duplicates}
            onChange={(partial) => handleItemChange(index, partial)}
          />
        )}
      </MetadataList>

      {/* The locked leaf. Shown rather than implied: it is the reason a
          cluster that declares nothing still schedules and still offers the
          tightest gather choice, and an operator who cannot see it has no way
          to know that a mistake above only costs resolution. */}
      <Alert
        type="info"
        showIcon
        message={intl.formatMessage({ id: 'clusters.topology.leaf' })}
        description={intl.formatMessage({ id: 'clusters.topology.leaf.tips' })}
      />
    </Flex>
  );
};

export default LayerList;
