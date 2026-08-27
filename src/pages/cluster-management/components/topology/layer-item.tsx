import { Input as CInput, ListInput } from '@gpustack/core-ui';
import { useIntl } from '@umijs/max';
import { Flex } from 'antd';
import { TopologyLayer } from '../../config/types';

interface LayerItemProps {
  item: TopologyLayer;
  /** Names already taken by other layers, so a duplicate is visible as typed. */
  takenNames: Set<string>;
  onChange: (partial: Partial<TopologyLayer>) => void;
}

/**
 * One declared layer: its operator-facing name, and the label keys that place
 * a worker in it.
 *
 * The name doubles as the display name — it reaches the deployment form's "at
 * least in the same ___" choices verbatim, and there is no second field for a
 * prettier version. That is a deliberate constraint rather than a saving: it
 * forces the name to be a word an operator recognises ("Rack") instead of a
 * schema-ish one ("L2"), because the person choosing it in the deployment form
 * is not the person who declared it here.
 */
const LayerItem: React.FC<LayerItemProps> = ({
  item,
  takenNames,
  onChange
}) => {
  const intl = useIntl();
  const name = (item.name || '').trim();
  const duplicate = !!name && takenNames.has(name);

  return (
    <Flex vertical gap={12} style={{ width: '100%' }}>
      <CInput.Input
        label={intl.formatMessage({ id: 'clusters.topology.layer.name' })}
        value={item.name}
        onChange={(e: any) => onChange({ name: e.target.value })}
        status={duplicate ? 'error' : undefined}
        description={
          duplicate
            ? intl.formatMessage({
                id: 'clusters.topology.layer.name.duplicate'
              })
            : intl.formatMessage({ id: 'clusters.topology.layer.name.tips' })
        }
      ></CInput.Input>
      {/* any-of, and the order matters: the first key present on a worker
          wins. A string array, so `ListInput` is the field the schema asks
          for. */}
      <ListInput
        label={intl.formatMessage({ id: 'clusters.topology.layer.labelKeys' })}
        value={item.labelKeys || []}
        btnText={intl.formatMessage({ id: 'clusters.topology.layer.addKey' })}
        placeholder="topology.kubernetes.io/zone"
        description={intl.formatMessage({
          id: 'clusters.topology.layer.labelKeys.tips'
        })}
        onChange={(keys: string[]) =>
          // Blanks dropped on the way out, not on the way in: a key being
          // typed is briefly empty, and filtering as the operator types would
          // delete the row out from under the cursor.
          onChange({ labelKeys: (keys || []).map((k) => k.trim()) })
        }
      ></ListInput>
    </Flex>
  );
};

export default LayerItem;
