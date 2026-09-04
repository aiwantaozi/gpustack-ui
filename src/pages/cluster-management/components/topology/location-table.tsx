import { useIntl } from '@umijs/max';
import { Flex, Table, Tooltip } from 'antd';
import { createStyles } from 'antd-style';
import { useEffect, useRef, useState } from 'react';
import { TopologyWorker } from '../../config/types';
import ColumnMenu from './column-menu';
import {
  LocationField,
  isDiscovered,
  isFilled,
  valueOptions
} from './location';
import LocationCell from './location-cell';

/** Past this many rows the table renders only what is on screen. */
const VIRTUAL_THRESHOLD = 50;
const HOST_WIDTH = 180;
const FIELD_WIDTH = 180;
const GPUS_WIDTH = 100;
const SOURCE_WIDTH = 220;
const SELECT_WIDTH = 40;

const useStyles = createStyles(({ css }) => ({
  table: css`
    .ant-table-cell {
      padding-block: 6px !important;
    }
    .host {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      max-width: 100%;
      .dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        flex-shrink: 0;
        background: var(--ant-color-success);
      }
      .dot.offline {
        background: transparent;
        border: 1px solid var(--ant-color-text-quaternary);
      }
      .name {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    }
  `,
  /* A tint that fades rather than a border: the row was pointed at from the
     tree or the Workers list, and the eye needs a moment to find it, not a
     permanent mark. */
  highlight: css`
    > td {
      animation: topology-row-highlight 3s ease-out forwards;
    }
    @keyframes topology-row-highlight {
      0%,
      60% {
        background-color: var(--ant-color-primary-bg);
      }
      100% {
        background-color: transparent;
      }
    }
  `
}));

interface EditingCell {
  id: number;
  field: string;
}

interface LocationTableProps {
  /** Filtered by the toolbar; sorted here. */
  workers: TopologyWorker[];
  /** Every worker, for value ranking — the dropdown must not shrink with a filter. */
  allWorkers: TopologyWorker[];
  fields: LocationField[];
  showGpus: boolean;
  showSource: boolean;
  selectedIds: number[];
  onSelectionChange: (ids: number[]) => void;
  highlightId?: number | null;
  /** Body height in px; the virtual list needs a number. */
  height: number;
  onAssign: (
    field: LocationField,
    workers: TopologyWorker[],
    value: string | null
  ) => Promise<void>;
  onBusy: (busy: boolean) => void;
  onFillUnfilled: (field: LocationField, workers: TopologyWorker[]) => void;
  onFillBySwitch: (field: LocationField) => void;
}

const sourceLabelId: Record<string, string> = {
  user: 'clusters.topology.source.user',
  discovered: 'clusters.topology.source.discovered',
  node: 'clusters.topology.source.node'
};

/**
 * [S1a] One row per worker, one column per location field, every cell
 * editable in place. Unfilled rows sort first because they are the work.
 */
const LocationTable: React.FC<LocationTableProps> = ({
  workers,
  allWorkers,
  fields,
  showGpus,
  showSource,
  selectedIds,
  onSelectionChange,
  highlightId,
  height,
  onAssign,
  onBusy,
  onFillUnfilled,
  onFillBySwitch
}) => {
  const intl = useIntl();
  const { styles } = useStyles();
  const [editing, setEditing] = useState<EditingCell | null>(null);
  const tableRef = useRef<any>(null);

  const fieldIds = fields.map((field) => field.id);
  const unfilledAny = (worker: TopologyWorker) =>
    fieldIds.some((id) => !isFilled(worker, id));

  // Unfilled first, then by rack, then by name.
  const rows = [...workers].sort((a, b) => {
    const au = unfilledAny(a);
    const bu = unfilledAny(b);
    if (au !== bu) {
      return au ? -1 : 1;
    }
    const ar = a.location?.rack?.value || '';
    const br = b.location?.rack?.value || '';
    return ar.localeCompare(br) || a.name.localeCompare(b.name);
  });

  useEffect(() => {
    if (highlightId && rows.some((row) => row.id === highlightId)) {
      tableRef.current?.scrollTo?.({ key: highlightId });
    }
  }, [highlightId]);

  const optionsByField = Object.fromEntries(
    fields.map((field) => [field.id, valueOptions(allWorkers, field.id)])
  );

  /**
   * Tab lands on the next *unfilled* cell of the same column, wrapping past
   * filled ones: the operator is filling a column, not touring it. With no
   * unfilled cell left it steps to the next row so Tab never dead-ends.
   */
  const moveEditing = (from: EditingCell, shift: boolean) => {
    const index = rows.findIndex((row) => row.id === from.id);
    const step = shift ? -1 : 1;
    let fallback: TopologyWorker | null = null;
    for (let i = index + step; i >= 0 && i < rows.length; i += step) {
      fallback = fallback || rows[i];
      if (!isFilled(rows[i], from.field)) {
        setEditing({ id: rows[i].id, field: from.field });
        return;
      }
    }
    setEditing(fallback ? { id: fallback.id, field: from.field } : null);
  };

  const switchGroups = (field: LocationField) => {
    if (field.id !== 'rack') {
      return 0;
    }
    const groups = new Set(
      allWorkers
        .filter(
          (worker) => !isFilled(worker, 'rack') && isFilled(worker, 'switch')
        )
        .map((worker) => worker.location.switch.value)
    );
    return groups.size;
  };

  const columns: any[] = [
    {
      title: intl.formatMessage({ id: 'clusters.topology.field.host' }),
      dataIndex: 'name',
      key: 'name',
      fixed: 'left',
      width: HOST_WIDTH,
      render: (name: string, worker: TopologyWorker) => (
        <Tooltip
          title={
            worker.state === 'ready'
              ? intl.formatMessage({ id: 'clusters.topology.host.online' })
              : intl.formatMessage({ id: 'clusters.topology.host.offline' })
          }
        >
          {/* Plain text: the open-source edition has no worker detail page
              to send anyone to. */}
          <span className="host">
            <span
              className={worker.state === 'ready' ? 'dot' : 'dot offline'}
            />
            <span className="name">{name}</span>
          </span>
        </Tooltip>
      )
    },
    ...fields.map((field) => {
      const unfilled = allWorkers.filter(
        (worker) => !isFilled(worker, field.id)
      );
      return {
        title: (
          <Flex align="center" justify="space-between" gap={4}>
            <span>{field.label}</span>
            <ColumnMenu
              field={field}
              unfilledCount={unfilled.length}
              switchGroups={switchGroups(field)}
              onFillUnfilled={() => onFillUnfilled(field, unfilled)}
              onFillBySwitch={
                field.id === 'rack' ? () => onFillBySwitch(field) : undefined
              }
            />
          </Flex>
        ),
        dataIndex: ['location', field.id],
        key: field.id,
        width: FIELD_WIDTH,
        render: (_: any, worker: TopologyWorker) => (
          <LocationCell
            worker={worker}
            field={field}
            options={optionsByField[field.id] || []}
            editing={editing?.id === worker.id && editing.field === field.id}
            onStartEdit={() => setEditing({ id: worker.id, field: field.id })}
            onStopEdit={() =>
              setEditing((cur) =>
                cur?.id === worker.id && cur.field === field.id ? null : cur
              )
            }
            onSave={(value) => onAssign(field, [worker], value)}
            onTab={(shift) =>
              moveEditing({ id: worker.id, field: field.id }, shift)
            }
            onBusy={onBusy}
          />
        )
      };
    })
  ];
  if (showGpus) {
    columns.push({
      title: intl.formatMessage({ id: 'clusters.topology.column.gpus' }),
      dataIndex: 'gpus',
      key: 'gpus',
      width: GPUS_WIDTH,
      render: (_: any, worker: TopologyWorker) => (
        <span>
          {worker.gpus} / {worker.free_gpus}
        </span>
      )
    });
  }
  if (showSource) {
    columns.push({
      title: intl.formatMessage({ id: 'clusters.topology.column.source' }),
      dataIndex: 'source',
      key: 'source',
      width: SOURCE_WIDTH,
      render: (_: any, worker: TopologyWorker) => {
        const filled = fields.filter((field) => isFilled(worker, field.id));
        if (!filled.length) {
          return null;
        }
        const summary = filled
          .map((field) => {
            const location = worker.location[field.id];
            return `${field.label} ${intl.formatMessage({
              id: sourceLabelId[location.source] || sourceLabelId.user
            })}`;
          })
          .join(' · ');
        return (
          <Tooltip
            title={
              <Flex orientation="vertical" gap={2}>
                {filled.map((field) => {
                  const location = worker.location[field.id];
                  return (
                    <span key={field.id}>
                      {field.label}: {location.key}
                      {isDiscovered(location) &&
                        location.display &&
                        ` (${location.value})`}
                    </span>
                  );
                })}
              </Flex>
            }
          >
            <span className="text-tertiary" style={{ fontSize: 12 }}>
              {summary}
            </span>
          </Tooltip>
        );
      }
    });
  }

  const totalWidth =
    SELECT_WIDTH +
    HOST_WIDTH +
    FIELD_WIDTH * fields.length +
    (showGpus ? GPUS_WIDTH : 0) +
    (showSource ? SOURCE_WIDTH : 0);

  return (
    <Table
      ref={tableRef}
      className={styles.table}
      size="small"
      rowKey="id"
      tableLayout="fixed"
      columns={columns}
      dataSource={rows}
      pagination={false}
      virtual={rows.length > VIRTUAL_THRESHOLD}
      scroll={{ x: totalWidth, y: height }}
      rowClassName={(row: TopologyWorker) =>
        row.id === highlightId ? styles.highlight : ''
      }
      rowSelection={{
        selectedRowKeys: selectedIds,
        columnWidth: SELECT_WIDTH,
        onChange: (keys) => onSelectionChange(keys as number[])
      }}
      onRow={(row: TopologyWorker) => ({
        tabIndex: 0,
        onKeyDown: (e: React.KeyboardEvent) => {
          // Space on the row itself toggles it; inside a cell it types.
          if (e.key === ' ' && e.target === e.currentTarget) {
            e.preventDefault();
            onSelectionChange(
              selectedIds.includes(row.id)
                ? selectedIds.filter((id) => id !== row.id)
                : [...selectedIds, row.id]
            );
          }
        }
      })}
      locale={{
        emptyText: intl.formatMessage({
          id: 'clusters.topology.preview.noWorkers'
        })
      }}
    />
  );
};

export default LocationTable;
