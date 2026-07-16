import { PageAction } from '@/config';
import { queryDatasetsList } from '@/pages/datasets/apis';
import {
  DatasetStateMap,
  DatasetStateMapValue,
  getDatasetSourceLabel
} from '@/pages/datasets/config';
import { Dataset } from '@/pages/datasets/config/types';
import { PlusOutlined } from '@ant-design/icons';
import { Select as SealSelect } from '@gpustack/core-ui';
import { useIntl } from '@umijs/max';
import { Button, Form, Tooltip } from 'antd';
import React, { useEffect, useMemo, useState } from 'react';
import { DatasetValueMap } from '../config';
import { useFormContext } from '../config/form-context';
import { FormData } from '../config/types';
import DatasetOverlay from './dataset-overlay';

// Custom-dataset picker: shown when the dataset TYPE is "Dataset". Lists the
// downloaded Dataset resources filtered to state=ready AND the selected model
// instance's worker (co-location), and offers a "+ New" nested drawer to create
// one on the fly.
const CustomDatasetPicker: React.FC = () => {
  const intl = useIntl();
  const form = Form.useFormInstance();
  const { action } = useFormContext();
  const disabled = action === PageAction.EDIT;

  const workerId = Form.useWatch('dataset_worker_id', form);
  const workerName = Form.useWatch('dataset_worker_name', form);
  const datasetId = Form.useWatch('dataset_id', form);

  const [resources, setResources] = useState<Dataset[]>([]);
  const [overlayOpen, setOverlayOpen] = useState(false);

  const fetchResources = async () => {
    try {
      const res = await queryDatasetsList({ page: -1 });
      setResources(res.items || []);
      return res.items || [];
    } catch (error) {
      setResources([]);
      return [];
    }
  };

  useEffect(() => {
    fetchResources();
  }, []);

  // Co-located datasets on the selected instance's worker. NOT filtered to
  // `ready` — a benchmark may reference a still-downloading dataset (the backend
  // lifecycle gate holds it in PENDING until READY), and filtering to
  // ready would hide a just-created "+ New" dataset and make the Select fall back
  // to showing the raw id. Non-ready options carry a state suffix; errored ones
  // are shown disabled.
  const stateRank = (s?: string) =>
    s === DatasetStateMap.Ready ? 0 : s === DatasetStateMap.Downloading ? 1 : 2;
  const options = useMemo(() => {
    return resources
      .filter((item) => workerId == null || item.worker_id === workerId)
      .slice()
      .sort((a, b) => stateRank(a.state) - stateRank(b.state))
      .map((item) => ({
        label:
          item.state === DatasetStateMap.Ready
            ? getDatasetSourceLabel(item)
            : `${getDatasetSourceLabel(item)} · ${
                DatasetStateMapValue[item.state] || item.state
              }`,
        value: item.id,
        disabled: item.state === DatasetStateMap.Error
      }));
  }, [resources, workerId]);

  const selected = useMemo(
    () => resources.find((item) => item.id === datasetId),
    [resources, datasetId]
  );

  const mappingSummary = useMemo(() => {
    const mapping = selected?.column_mapping;
    if (!mapping || !Object.keys(mapping).length) return '';
    return Object.entries(mapping)
      .map(([k, v]) => `${k}: ${v}`)
      .join(', ');
  }, [selected]);

  const handleCreated = async (created: Dataset) => {
    await fetchResources();
    form.setFieldsValue({
      dataset_name: DatasetValueMap.Custom,
      dataset_id: created.id
    });
    setOverlayOpen(false);
  };

  return (
    <>
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <Form.Item<FormData>
            name="dataset_id"
            rules={[
              {
                required: true,
                message: intl.formatMessage({
                  id: 'datasets.form.selectDataset'
                })
              }
            ]}
          >
            <SealSelect
              disabled={disabled}
              options={options}
              label={intl.formatMessage({ id: 'datasets.picker.label' })}
              required
              description={mappingSummary || undefined}
            ></SealSelect>
          </Form.Item>
        </div>
        {/* Always clickable (except in EDIT). When no instance is selected the
            drawer lets the user pick the worker; when one is, the worker is
            locked to it. The hint is soft — it never blocks the click. */}
        <Tooltip
          title={intl.formatMessage({ id: 'datasets.picker.selectInstance' })}
        >
          <Button
            style={{ height: 46 }}
            icon={<PlusOutlined />}
            disabled={disabled}
            onClick={() => setOverlayOpen(true)}
          >
            {intl.formatMessage({ id: 'datasets.button.new' })}
          </Button>
        </Tooltip>
      </div>
      <DatasetOverlay
        open={overlayOpen}
        lockedWorkerId={workerId}
        lockedWorkerName={workerName}
        onCancel={() => setOverlayOpen(false)}
        onSubmit={handleCreated}
      ></DatasetOverlay>
    </>
  );
};

export default CustomDatasetPicker;
