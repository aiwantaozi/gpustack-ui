import {
  AutoComplete,
  ColumnWrapper,
  GSDrawer,
  ModalFooter,
  useAppUtils
} from '@gpustack/core-ui';
import { useIntl } from '@umijs/max';
import { Alert, Empty, Form, Table } from 'antd';
import _ from 'lodash';
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { updateDataset } from '../apis';
import { DATASET_LOGICAL_COLUMNS } from '../config';
import { Dataset } from '../config/types';

interface ColumnMappingDrawerProps {
  open: boolean;
  dataset?: Dataset;
  width?: number | string;
  onOk: () => void;
  onCancel: () => void;
}

// Cell content clamped to 3 lines (HF dataset-viewer style): wraps text and
// hides the overflow; a Details/Collapse link toggles the full stored value.
const ClampedText = styled.div<{ $expanded: boolean }>`
  word-break: break-word;
  white-space: pre-wrap;
  font-size: 12px;
  line-height: 1.5;
  ${({ $expanded }) =>
    $expanded
      ? ''
      : `
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  `}
`;

const PreviewCell: React.FC<{ value: any }> = ({ value }) => {
  const intl = useIntl();
  const text =
    value == null
      ? ''
      : typeof value === 'object'
        ? JSON.stringify(value)
        : String(value);
  const ref = useRef<HTMLDivElement>(null);
  const [overflow, setOverflow] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useLayoutEffect(() => {
    const el = ref.current;
    if (el) {
      setOverflow(el.scrollHeight > el.clientHeight + 1);
    }
  }, [text]);

  return (
    <div>
      <ClampedText ref={ref} $expanded={expanded}>
        {text}
      </ClampedText>
      {(overflow || expanded) && (
        <a
          style={{ fontSize: 12 }}
          onClick={(e) => {
            e.stopPropagation();
            setExpanded((v) => !v);
          }}
        >
          {intl.formatMessage({
            id: expanded
              ? 'datasets.columnMapping.collapse'
              : 'datasets.columnMapping.details'
          })}
        </a>
      )}
    </div>
  );
};

const ColumnMappingDrawer: React.FC<ColumnMappingDrawerProps> = ({
  open,
  dataset,
  width = 800,
  onOk,
  onCancel
}) => {
  const intl = useIntl();
  const { showSuccess } = useAppUtils();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const columns = dataset?.columns || [];
  const sampleRows = dataset?.sample_rows || [];
  // When inspection failed or no columns were detected, we can't offer a
  // dropdown of real columns — let the user type the column names manually.
  const freeText = !!dataset?.inspect_error || columns.length === 0;

  useEffect(() => {
    if (open) {
      form.setFieldsValue({ ...(dataset?.column_mapping || {}) });
    }
  }, [open, dataset]);

  const handleOk = async () => {
    if (!dataset) return;
    setLoading(true);
    try {
      const values = await form.validateFields();
      const column_mapping = _.pickBy(values, (v: any) => v);
      // PUT the full row merged with the edited mapping (mirrors model-files
      // update, which sends the fetched row shape).
      await updateDataset(dataset.id, {
        ...dataset,
        column_mapping
      });
      showSuccess();
      onOk();
    } catch (error) {
      // validation / request error
    } finally {
      setLoading(false);
    }
  };

  const columnOptions = columns.map((c) => ({ label: c, value: c }));

  // HF dataset-viewer-style preview: header = detected columns, one row per
  // sample; each cell wraps + clamps to 3 lines with a Details toggle.
  const previewColumns = columns.map((c) => ({
    title: c,
    dataIndex: c,
    key: c,
    width: 240,
    render: (val: any) => <PreviewCell value={val} />
  }));

  return (
    <GSDrawer
      title={intl.formatMessage({ id: 'datasets.columnMapping.title' })}
      open={open}
      onClose={onCancel}
      destroyOnHidden={true}
      closeIcon={false}
      mask={{ closable: false }}
      keyboard={false}
      zIndex={2000}
      styles={{ wrapper: { width } }}
      footer={false}
    >
      <ColumnWrapper
        footer={
          <ModalFooter
            onCancel={onCancel}
            onOk={handleOk}
            okBtnProps={{ loading }}
            style={{
              padding: '16px 24px 24px',
              display: 'flex',
              justifyContent: 'flex-end'
            }}
          ></ModalFooter>
        }
      >
        {freeText && (
          <Alert
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
            message={
              dataset?.inspect_error
                ? intl.formatMessage(
                    { id: 'datasets.columnMapping.inspectError' },
                    { error: dataset.inspect_error }
                  )
                : intl.formatMessage({ id: 'datasets.columnMapping.noColumns' })
            }
          ></Alert>
        )}
        <Form form={form} preserve={false} clearOnDestroy>
          {DATASET_LOGICAL_COLUMNS.map((col) => {
            // Auto-map + multi-turn hint shown as a `?` tooltip on the label
            // (core-ui `description`), matching the app-wide field-hint style.
            const hint = `${intl.formatMessage({
              id: 'datasets.columnMapping.autoDetect'
            })} ${col.autoDetect.join(', ')} · ${intl.formatMessage({
              id: 'datasets.columnMapping.multiTurn'
            })}`;
            return (
              <Form.Item name={col.key} key={col.key}>
                {/* AutoComplete = single-value combobox: pick a detected column
                    from the dropdown OR type a custom/base name (multi-turn base
                    like "prompt" that guidellm expands to prompt_0, prompt_1, …). */}
                <AutoComplete
                  allowClear
                  options={columnOptions}
                  filterOption={(input: string, option: any) =>
                    (option?.value ?? '')
                      .toLowerCase()
                      .includes((input || '').toLowerCase())
                  }
                  label={intl.formatMessage({ id: col.labelId })}
                  description={hint}
                ></AutoComplete>
              </Form.Item>
            );
          })}
        </Form>
        <div style={{ marginTop: 16 }}>
          <div style={{ fontWeight: 500, marginBottom: 8 }}>
            {intl.formatMessage({ id: 'datasets.columnMapping.preview' })}
          </div>
          {sampleRows.length > 0 ? (
            <Table
              size="small"
              tableLayout="fixed"
              rowKey={(_row, index) => `${index}`}
              columns={previewColumns}
              dataSource={sampleRows}
              pagination={false}
              scroll={{ x: 'max-content', y: 400 }}
            ></Table>
          ) : (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={intl.formatMessage({
                id: 'datasets.columnMapping.noPreview'
              })}
            ></Empty>
          )}
        </div>
      </ColumnWrapper>
    </GSDrawer>
  );
};

export default ColumnMappingDrawer;
