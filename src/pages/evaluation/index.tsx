import AutoTooltip from '@/components/auto-tooltip';
import DropdownButtons from '@/components/drop-down-buttons';
import { FilterBar } from '@/components/page-tools';
import StatusTag from '@/components/status-tag';
import useTableRowSelection from '@/hooks/use-table-row-selection';
import BenchmarkRightActions from '@/pages/benchmark/components/right-actions';
import {
  BenchmarkStatus,
  BenchmarkStatusLabelMap
} from '@/pages/benchmark/config';
import {
  DeleteOutlined,
  DownOutlined,
  ExportOutlined,
  PauseCircleOutlined,
  RightOutlined,
  SearchOutlined
} from '@ant-design/icons';
import { useIntl, useLocation, useNavigate } from '@umijs/max';
import {
  Button,
  ConfigProvider,
  Input,
  Modal,
  Select,
  Space,
  Table,
  Typography,
  message
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useEffect, useMemo, useState } from 'react';
import NoResult from '../_components/no-result';
import PageBox from '../_components/page-box';
import AddEvaluationDrawer from './components/add-evaluation-drawer';
import './styles.less';
import {
  mockEvaluationList,
  taskLabelMap,
  visibleSuiteTaskMap
} from './config/mock';
import { CreateEvaluationFormValues, EvaluationRecord } from './config/types';

const evaluationStatusMap: Record<string, string> = {
  RUNNING: 'running',
  SUCCESS: 'completed',
  FAILED: 'error',
  STOPPED: 'stopped',
  PENDING: 'pending'
};

const suiteOrder = [
  'general',
  'reasoning',
  'coding',
  'long-context',
  'multilingual'
] as const;

const actionItems = [
  {
    label: 'evaluation.table.logs',
    key: 'logs',
    icon: <RightOutlined />
  },
  {
    label: 'evaluation.table.export',
    key: 'export',
    icon: <ExportOutlined />
  },
  {
    label: 'evaluation.table.stop',
    key: 'stop',
    icon: <PauseCircleOutlined />
  },
  {
    label: 'evaluation.table.delete',
    key: 'delete',
    props: { danger: true },
    icon: <DeleteOutlined />
  }
];

const EvaluationList: React.FC = () => {
  const intl = useIntl();
  const navigate = useNavigate();
  const location = useLocation();
  const rowSelection = useTableRowSelection();
  const [dataSource, setDataSource] = useState<EvaluationRecord[]>(
    mockEvaluationList
  );
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerInitialValues, setDrawerInitialValues] = useState<
    Partial<CreateEvaluationFormValues>
  >({});
  const [nameFilter, setNameFilter] = useState('');
  const [modelFilter, setModelFilter] = useState<string>();
  const [stateFilter, setStateFilter] = useState<string>();
  const [expandedSuites, setExpandedSuites] = useState<Record<string, boolean>>({
    general: true,
    reasoning: false,
    coding: false,
    'long-context': false,
    multilingual: false
  });

  useEffect(() => {
    const state = location.state as
      | {
          createdEvaluation?: EvaluationRecord;
          draftValues?: Partial<CreateEvaluationFormValues>;
          openCreate?: boolean;
        }
      | undefined;
    if (state?.createdEvaluation) {
      setDataSource((prev) => [state.createdEvaluation!, ...prev]);
      navigate(location.pathname, { replace: true, state: {} });
      return;
    }
    if (state?.openCreate) {
      setDrawerInitialValues(state.draftValues || {});
      setDrawerOpen(true);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.pathname, location.state, navigate]);

  const modelOptions = useMemo(() => {
    return Array.from(new Set(dataSource.map((item) => item.model))).map(
      (model) => ({
        label: model,
        value: model
      })
    );
  }, [dataSource]);

  const filteredData = useMemo(() => {
    return dataSource.filter((item) => {
      const matchedName =
        !nameFilter ||
        item.name.toLowerCase().includes(nameFilter.toLowerCase()) ||
        item.modelInstance.toLowerCase().includes(nameFilter.toLowerCase());
      const matchedModel = !modelFilter || item.model === modelFilter;
      const matchedState = !stateFilter || item.status === stateFilter;
      return matchedName && matchedModel && matchedState;
    });
  }, [dataSource, modelFilter, nameFilter, stateFilter]);

  const handleToggleSuite = (suiteId: string) => {
    setExpandedSuites((prev) => ({
      ...prev,
      [suiteId]: !prev[suiteId]
    }));
  };

  const handleSelectAction = (action: string, record: EvaluationRecord) => {
    if (action === 'logs') {
      Modal.info({
        title: `${record.name} Logs`,
        width: 640,
        content: (
          <div style={{ marginTop: 12 }}>
            <Typography.Paragraph type="secondary">
              {intl.formatMessage({ id: 'evaluation.placeholder.logs' })}
            </Typography.Paragraph>
            <pre
              style={{
                padding: 16,
                borderRadius: 12,
                background: 'var(--ant-color-fill-quaternary)',
                overflow: 'auto'
              }}
            >
              {`[09:00:01] Booting evaluation runner for ${record.modelInstance}
[09:00:08] Suite: ${record.suiteId}
[09:00:12] Current status: ${record.status}
[09:00:20] Placeholder logs rendered from local mock data`}
            </pre>
          </div>
        )
      });
      return;
    }

    if (action === 'export') {
      message.info(intl.formatMessage({ id: 'evaluation.placeholder.export' }));
      return;
    }

    if (action === 'stop') {
      setDataSource((prev) =>
        prev.map((item) =>
          item.id === record.id ? { ...item, status: 'STOPPED' } : item
        )
      );
      message.success(intl.formatMessage({ id: 'evaluation.placeholder.stop' }));
      return;
    }

    if (action === 'delete') {
      Modal.confirm({
        title: `Delete ${record.name}?`,
        onOk: () => {
          setDataSource((prev) => prev.filter((item) => item.id !== record.id));
          rowSelection.removeSelectedKey(record.id);
          message.success(
            intl.formatMessage({ id: 'evaluation.placeholder.delete' })
          );
        }
      });
    }
  };

  const handleDeleteBatch = () => {
    Modal.confirm({
      title: intl.formatMessage(
        { id: 'common.delete.confirm' },
        { type: intl.formatMessage({ id: 'evaluation.title' }) }
      ),
      onOk: () => {
        const selectedKeys = rowSelection.selectedRowKeys;
        setDataSource((prev) =>
          prev.filter((item) => !selectedKeys.includes(item.id))
        );
        rowSelection.clearSelections();
        message.success(intl.formatMessage({ id: 'evaluation.placeholder.delete' }));
      }
    });
  };

  const handleExportBatch = () => {
    message.info(intl.formatMessage({ id: 'evaluation.placeholder.export' }));
  };

  const columns = useMemo<ColumnsType<EvaluationRecord>>(() => {
    const fixedColumns: ColumnsType<EvaluationRecord> = [
      {
        title: (
          <AutoTooltip ghost minWidth={20}>
            {intl.formatMessage({ id: 'common.table.name' })}
          </AutoTooltip>
        ),
        dataIndex: 'name',
        key: 'name',
        fixed: 'left',
        width: 150,
        render: (text: string, record) => (
          <AutoTooltip ghost minWidth={20}>
            <Typography.Link
              onClick={() =>
                navigate(
                  `/models/evaluation/detail?id=${record.id}&name=${encodeURIComponent(
                    record.name
                  )}`,
                  {
                    state: { record }
                  }
                )
              }
            >
              {text}
            </Typography.Link>
          </AutoTooltip>
        )
      },
      {
        title: intl.formatMessage({ id: 'evaluation.table.model' }),
        dataIndex: 'model',
        key: 'model',
        fixed: 'left',
        width: 135,
        render: (_, record) => (
          <div style={{ minWidth: 0 }}>
            <AutoTooltip ghost minWidth={20}>
              {record.model}
            </AutoTooltip>
            <div
              style={{
                color: 'var(--ant-color-text-tertiary)',
                fontSize: 12,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
              title={record.modelInstance}
            >
              {record.modelInstance}
            </div>
          </div>
        )
      },
      {
        title: (
          <AutoTooltip ghost minWidth={20}>
            {intl.formatMessage({ id: 'common.table.status' })}
          </AutoTooltip>
        ),
        dataIndex: 'status',
        key: 'status',
        fixed: 'left',
        width: 96,
        render: (_, record) => (
          <StatusTag
            statusValue={{
              status: BenchmarkStatus[evaluationStatusMap[record.status]],
              text: BenchmarkStatusLabelMap[evaluationStatusMap[record.status]],
              message: ''
            }}
          />
        )
      }
    ];

    const groupedColumns = suiteOrder.map((suiteId) => {
      const visibleTasks = expandedSuites[suiteId]
        ? visibleSuiteTaskMap[suiteId]
        : visibleSuiteTaskMap[suiteId].slice(0, 1);
      const suiteLabel =
        suiteId === 'long-context'
          ? 'Long Context'
          : suiteId.charAt(0).toUpperCase() + suiteId.slice(1);

      return {
        title: (
          <Button
            type="text"
            size="small"
            onClick={() => handleToggleSuite(suiteId)}
            style={{
              paddingInline: 0,
              fontWeight: 600,
              width: '100%',
              justifyContent: 'flex-start'
            }}
          >
            {expandedSuites[suiteId] ? <DownOutlined /> : <RightOutlined />}
            <span>{suiteLabel}</span>
          </Button>
        ),
        children: visibleTasks.map((taskId) => ({
          title: taskLabelMap[taskId] || taskId,
          dataIndex: ['scores', taskId],
          key: taskId,
          width: 90,
          align: 'center' as const,
          render: (value: number | null) =>
            value === null ? (
              <span style={{ color: 'var(--ant-color-text-tertiary)' }}>-</span>
            ) : (
              <AutoTooltip ghost minWidth={20}>
                {value.toFixed(1)}
              </AutoTooltip>
            )
        }))
      };
    });

    const operationColumn: ColumnsType<EvaluationRecord>[number] = {
      title: intl.formatMessage({ id: 'evaluation.table.operations' }),
      dataIndex: 'operations',
      key: 'operations',
      fixed: 'right',
      width: 88,
      render: (_, record) => (
        <DropdownButtons
          items={actionItems}
          onSelect={(value) => handleSelectAction(value, record)}
        />
      )
    };

    return [
      {
        title: '',
        children: fixedColumns
      },
      ...groupedColumns,
      {
        title: '',
        children: [operationColumn]
      }
    ];
  }, [expandedSuites, intl, navigate]);

  const renderEmpty = (type?: string) => {
    if (type !== 'Table') return;
    return (
      <NoResult
        loading={false}
        loadend={true}
        dataSource={[]}
        title={intl.formatMessage({ id: 'common.nodata.created' }, {
          type: intl.formatMessage({ id: 'evaluation.title' })
        })}
        subTitle={intl.formatMessage({ id: 'common.result.nodata.subtitle' })}
      />
    );
  };

  return (
    <>
      <PageBox>
        <FilterBar
          marginBottom={18}
          rowSelection={rowSelection}
          handleInputChange={(e) => setNameFilter(e.target.value)}
          handleSearch={() => {}}
          left={
            <Space wrap size={12}>
              <Input
                allowClear
                placeholder={intl.formatMessage({ id: 'evaluation.filters.name' })}
                prefix={<SearchOutlined />}
                style={{ width: 260 }}
                value={nameFilter}
                onChange={(e) => setNameFilter(e.target.value)}
              />
              <Select
                allowClear
                placeholder={intl.formatMessage({ id: 'evaluation.filters.model' })}
                style={{ width: 220 }}
                value={modelFilter}
                options={modelOptions}
                onChange={setModelFilter}
              />
              <Select
                allowClear
                placeholder={intl.formatMessage({ id: 'evaluation.filters.state' })}
                style={{ width: 180 }}
                value={stateFilter}
                options={[
                  'RUNNING',
                  'SUCCESS',
                  'FAILED',
                  'STOPPED',
                  'PENDING'
                ].map((status) => ({
                  label: intl.formatMessage({
                    id: `evaluation.state.${status.toLowerCase()}`
                  }),
                  value: status
                }))}
                onChange={setStateFilter}
              />
            </Space>
          }
          right={
            <BenchmarkRightActions
              handleDeleteByBatch={handleDeleteBatch}
              handleClickPrimary={() => {
                setDrawerInitialValues({});
                setDrawerOpen(true);
              }}
              handleExport={handleExportBatch}
              buttonText={intl.formatMessage({
                id: 'evaluation.button.add'
              })}
              rowSelection={rowSelection}
            />
          }
        />
        <ConfigProvider renderEmpty={renderEmpty}>
          <Table
            rowKey="id"
            tableLayout="fixed"
            size="small"
            className="evaluation-table scroll-table"
            columns={columns}
            dataSource={filteredData}
            rowSelection={rowSelection}
            pagination={{ pageSize: 8 }}
            scroll={{ x: 920 }}
          />
        </ConfigProvider>
        <AddEvaluationDrawer
          open={drawerOpen}
          initialValues={drawerInitialValues}
          onCancel={() => {
            setDrawerOpen(false);
            setDrawerInitialValues({});
          }}
          onOk={(record) => {
            setDataSource((prev) => [record, ...prev]);
            setDrawerOpen(false);
            setDrawerInitialValues({});
            message.success(
              intl.formatMessage({ id: 'evaluation.placeholder.created' })
            );
          }}
        />
      </PageBox>
    </>
  );
};

export default EvaluationList;
