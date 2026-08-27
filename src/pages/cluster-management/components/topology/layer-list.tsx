import { DownOutlined, ReloadOutlined } from '@ant-design/icons';
import { MetadataList } from '@gpustack/core-ui';
import { useIntl } from '@umijs/max';
import { Alert, Button, Dropdown, Flex, Tooltip } from 'antd';
import { useMemo } from 'react';
import { TopologyLayer } from '../../config/types';
import LayerChain from './layer-chain';
import LayerItem from './layer-item';
import { LAYER_PRESETS } from './presets';

interface LayerListProps {
  layers: TopologyLayer[];
  onChange: (layers: TopologyLayer[]) => void;
  onReset: () => void;
}

/**
 * The declaration side: an ordered list of layers, root first.
 *
 * **Ordered in the UI, chained in storage.** The wire form stores each layer's
 * parent rather than an index, because inserting a layer into an indexed list
 * renumbers every layer below it and those names are referenced from saved
 * model configurations. Top-to-bottom is how an operator thinks about it, so
 * the conversion happens on the way out: `rechain` re-derives `parentLayer`
 * from position, and it is the one place the two representations meet.
 *
 * The leaf is not in this list. It is built in, takes the worker's name rather
 * than a label, and is shown below as a locked row with the reason — which is
 * how "a missing label costs resolution, never schedulability" becomes visible
 * instead of a paragraph in a doc nobody reads.
 */
const LayerList: React.FC<LayerListProps> = ({ layers, onChange, onReset }) => {
  const intl = useIntl();

  /**
   * Re-chain from position: the list is root-first, so item N's parent is
   * N-1's *name*. Called after every structural edit — add, delete, move and
   * rename all change who is whose parent, and deriving it in one place is
   * what keeps a rename from orphaning the layer below.
   */
  const rechain = (list: TopologyLayer[]): TopologyLayer[] =>
    list.map((layer, index) => ({
      ...layer,
      parentLayer: index === 0 ? null : list[index - 1].name || null
    }));

  const handleAdd = () => {
    onChange(rechain([...layers, { name: '', labelKeys: [] }]));
  };

  const handleInsertPreset = (presetKey: string) => {
    const preset = LAYER_PRESETS.find((p) => p.key === presetKey);
    if (!preset) {
      return;
    }
    // Inserted at its natural coarseness, not appended. Appending turned
    // "Region, Rack, Row" picked in menu order into a chain saying a row lives
    // inside a rack — backwards, silently valid, and left for the operator to
    // notice and fix. A layer the operator typed by hand has no rank and keeps
    // its position, so this only ever reorders against other presets.
    const ranked = LAYER_PRESETS.reduce<Record<string, number>>(
      (acc, p) => ({ ...acc, [p.layer.name]: p.rank }),
      {}
    );
    const next = [...layers];
    const at = next.findIndex((layer) => {
      const rank = ranked[(layer.name || '').trim()];
      return rank !== undefined && rank > preset.rank;
    });
    next.splice(at === -1 ? next.length : at, 0, { ...preset.layer });
    onChange(rechain(next));
  };

  const handleDelete = (index: number) => {
    onChange(rechain(layers.filter((_, i) => i !== index)));
  };

  const handleMove = (from: number, to: number) => {
    if (to < 0 || to >= layers.length) {
      return;
    }
    const next = [...layers];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(rechain(next));
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

  /** Already-used preset names are disabled rather than hidden, so the menu
   *  keeps a stable shape and says *why* an entry is unavailable. */
  const presetItems = LAYER_PRESETS.map((preset) => {
    const used = layers.some(
      (layer) => (layer.name || '').trim() === preset.layer.name
    );
    return {
      key: preset.key,
      disabled: used,
      label: (
        <Flex vertical>
          <span>{preset.layer.name}</span>
          <span className="text-tertiary" style={{ fontSize: 12 }}>
            {intl.formatMessage({ id: preset.descriptionId })}
          </span>
        </Flex>
      )
    };
  });

  const listLabel = (
    <Flex align="center" justify="space-between" style={{ width: '100%' }}>
      <span>{intl.formatMessage({ id: 'clusters.topology.layers' })}</span>
      <Flex gap={4}>
        {/* The keys are the part nobody remembers, and a wrong one produces a
            silently unclassified fleet rather than an error — so they come
            from a list rather than from recall. */}
        <Dropdown
          menu={{
            items: presetItems,
            onClick: ({ key }) => handleInsertPreset(key)
          }}
          trigger={['click']}
        >
          <Button size="small" type="text">
            {intl.formatMessage({ id: 'clusters.topology.insertPreset' })}
            <DownOutlined />
          </Button>
        </Dropdown>
        <Tooltip
          title={intl.formatMessage({ id: 'clusters.topology.reset.tips' })}
        >
          <Button
            size="small"
            type="text"
            icon={<ReloadOutlined />}
            onClick={onReset}
          >
            {intl.formatMessage({ id: 'clusters.topology.reset' })}
          </Button>
        </Tooltip>
      </Flex>
    </Flex>
  );

  return (
    <Flex vertical gap={12}>
      {/* The shape, on one line. Per-card captions state each edge correctly
          and still leave the whole unreadable — an edge at a time is not a
          chain, and a wrong order only looks wrong when the order is visible
          all at once. */}
      <LayerChain layers={layers} />
      <MetadataList
        label={listLabel}
        dataList={layers}
        btnText={intl.formatMessage({ id: 'clusters.topology.addLayer' })}
        onAdd={handleAdd}
        onDelete={handleDelete}
      >
        {(item: TopologyLayer, index: number) => (
          <LayerItem
            item={item}
            index={index}
            parentName={index === 0 ? null : layers[index - 1]?.name || null}
            takenNames={duplicates}
            canMoveUp={index > 0}
            canMoveDown={index < layers.length - 1}
            onMove={handleMove}
            onChange={(partial) => handleItemChange(index, partial)}
          />
        )}
      </MetadataList>

      {/* The locked leaf, and where it sits. Shown rather than implied: it is
          why a cluster that declares nothing still schedules and still offers
          the tightest gather choice, and an operator who cannot see it has no
          way to know that a mistake above only costs resolution. */}
      <Alert
        type="info"
        showIcon
        message={
          layers.length
            ? intl.formatMessage(
                { id: 'clusters.topology.leaf.under' },
                { parent: layers[layers.length - 1]?.name || '—' }
              )
            : intl.formatMessage({ id: 'clusters.topology.leaf' })
        }
        description={intl.formatMessage({ id: 'clusters.topology.leaf.tips' })}
      />
    </Flex>
  );
};

export default LayerList;
