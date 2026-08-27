import { ArrowDownOutlined, ArrowUpOutlined } from '@ant-design/icons';
import { Input as CInput, ListInput } from '@gpustack/core-ui';
import { useIntl } from '@umijs/max';
import { Button, Flex, Tooltip } from 'antd';
import { createStyles } from 'antd-style';
import { TopologyLayer } from '../../config/types';

interface LayerItemProps {
  item: TopologyLayer;
  index: number;
  /** The layer this one hangs under, or null for the cluster root. */
  parentName: string | null;
  /** Names already taken by another layer, so a duplicate is visible as typed. */
  takenNames: Set<string>;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMove: (from: number, to: number) => void;
  onChange: (partial: Partial<TopologyLayer>) => void;
}

/** How far each step of the chain steps in. Small on purpose — see below. */
const INDENT_STEP = 14;
/**
 * Indentation stops here. Past three or four layers the stagger would eat the
 * field width without adding information the chain line above does not already
 * carry, and the fields are the part the operator is actually typing into.
 */
const MAX_INDENT_STEPS = 3;

const useStyles = createStyles(({ css }) => ({
  header: css`
    /* A tinted bar rather than a caption. The first version put "under
       Region" in small grey text floating above the card, which read as a
       footnote and was routinely missed — the hierarchy has to look like
       structure, not like an annotation. */
    background: var(--ant-color-fill-quaternary);
    border-radius: 6px;
    padding: 4px 8px 4px 6px;
    .ordinal {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 20px;
      height: 20px;
      border-radius: 10px;
      background: var(--ant-color-fill-secondary);
      color: var(--ant-color-text-secondary);
      font-size: 12px;
      font-variant-numeric: tabular-nums;
    }
    .parent {
      color: var(--ant-color-text-tertiary);
      font-size: 12px;
    }
  `,
  /* The rail is what turns a stack of equal cards into a nesting. It is drawn
     rather than implied by margin alone, because whitespace on its own reads
     as spacing. */
  rail: css`
    border-left: 1px solid var(--ant-color-border-secondary);
    padding-left: 10px;
  `
}));

/**
 * One declared layer: where it sits, its operator-facing name, and the label
 * keys that place a worker in it.
 *
 * **The parent is the row above, and this card shows it three ways** — an
 * ordinal, a step of indentation with a rail, and the parent's name in the
 * header bar. That redundancy is deliberate: the chain is stored as a parent
 * pointer and edited as list order, so an operator who misreads the order
 * declares a hierarchy that is silently upside down. There is no error state
 * for "your rack contains your rows"; it just resolves badly forever.
 *
 * The name doubles as the display name — it reaches the deployment form's "at
 * least in the same ___" choices verbatim, and there is no second field for a
 * prettier version. A constraint rather than a saving: it pushes the name
 * towards a word an operator recognises ("Rack") instead of a schema-ish one
 * ("L2"), because whoever picks it in the deployment form is not whoever
 * declared it here.
 */
const LayerItem: React.FC<LayerItemProps> = ({
  item,
  index,
  parentName,
  takenNames,
  canMoveUp,
  canMoveDown,
  onMove,
  onChange
}) => {
  const intl = useIntl();
  const { styles } = useStyles();
  const name = (item.name || '').trim();
  const duplicate = !!name && takenNames.has(name);
  const indent = Math.min(index, MAX_INDENT_STEPS) * INDENT_STEP;

  return (
    <div style={{ marginLeft: indent, width: `calc(100% - ${indent}px)` }}>
      <Flex vertical gap={12} className={index > 0 ? styles.rail : undefined}>
        <Flex align="center" justify="space-between" className={styles.header}>
          <Flex align="center" gap={8}>
            <span className="ordinal">{index + 1}</span>
            <span className="parent">
              {parentName
                ? intl.formatMessage(
                    { id: 'clusters.topology.layer.under' },
                    { parent: parentName }
                  )
                : intl.formatMessage({
                    id: 'clusters.topology.layer.underCluster'
                  })}
            </span>
          </Flex>
          {/* Arrows rather than drag: reordering here is a two-or-three item
              operation, a keyboard-reachable button beats a drag target that
              needs a mouse, and moving a layer re-derives every parent below
              it. */}
          <Flex gap={0}>
            <Tooltip
              title={intl.formatMessage({
                id: 'clusters.topology.layer.moveUp'
              })}
            >
              <Button
                size="small"
                type="text"
                icon={<ArrowUpOutlined />}
                disabled={!canMoveUp}
                onClick={() => onMove(index, index - 1)}
              />
            </Tooltip>
            <Tooltip
              title={intl.formatMessage({
                id: 'clusters.topology.layer.moveDown'
              })}
            >
              <Button
                size="small"
                type="text"
                icon={<ArrowDownOutlined />}
                disabled={!canMoveDown}
                onClick={() => onMove(index, index + 1)}
              />
            </Tooltip>
          </Flex>
        </Flex>

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
          label={intl.formatMessage({
            id: 'clusters.topology.layer.labelKeys'
          })}
          value={item.labelKeys || []}
          btnText={intl.formatMessage({ id: 'clusters.topology.layer.addKey' })}
          placeholder="topology.kubernetes.io/zone"
          description={intl.formatMessage({
            id: 'clusters.topology.layer.labelKeys.tips'
          })}
          onChange={(keys: string[]) =>
            // Blanks dropped on the way out, not on the way in: a key being
            // typed is briefly empty, and filtering as the operator types
            // would delete the row out from under the cursor.
            onChange({ labelKeys: (keys || []).map((k) => k.trim()) })
          }
        ></ListInput>
      </Flex>
    </div>
  );
};

export default LayerItem;
