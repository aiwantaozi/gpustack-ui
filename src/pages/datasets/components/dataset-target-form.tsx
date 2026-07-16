import {
  Input as CInput,
  Cascader as SealCascader,
  Select as SealSelect,
  useAppUtils
} from '@gpustack/core-ui';
import { useIntl } from '@umijs/max';
import { Form } from 'antd';
import _ from 'lodash';
import React, { forwardRef, useImperativeHandle } from 'react';
import { datasetSourceMap, datasetSourceOptions } from '../config';
import { DatasetFormData as FormData } from '../config/types';

interface DatasetTargetFormProps {
  ref?: any;
  source: string;
  workerOptions?: any[];
  lockedWorkerId?: number;
  lockedWorkerName?: string;
  onOk: (values: any) => void;
}

// Right column ("Select Target") of the Create-Dataset drawer. Mirrors the
// model download target-form. For HuggingFace & ModelScope the repo/file come
// from the search columns, so this form only carries worker / local dir / name;
// Local Path (no live search) also takes the path here.
const DatasetTargetForm: React.FC<DatasetTargetFormProps> = forwardRef(
  (props, ref) => {
    const {
      onOk,
      source,
      workerOptions = [],
      lockedWorkerId,
      lockedWorkerName
    } = props;
    const { getRuleMessage } = useAppUtils();
    const intl = useIntl();
    const [form] = Form.useForm();
    const isLocked = lockedWorkerId != null;
    const isLocal = source === datasetSourceMap.local_path_value;

    useImperativeHandle(ref, () => ({ form }));

    const handleOk = (values: any) => {
      const data = _.pickBy(
        values,
        (val: any) => val !== undefined && val !== ''
      );
      const worker_id = isLocked ? lockedWorkerId : data.worker_id?.[1];
      onOk({
        ..._.omit(data, ['worker_id']),
        source,
        worker_id
      });
    };

    return (
      <Form
        form={form}
        onFinish={handleOk}
        preserve={false}
        clearOnDestroy
        initialValues={{ source }}
      >
        <Form.Item<FormData> name="source">
          <SealSelect
            disabled
            label={intl.formatMessage({ id: 'datasets.form.source' })}
            options={datasetSourceOptions.map((item) => ({
              label: item.locale
                ? intl.formatMessage({ id: item.label })
                : item.label,
              value: item.value
            }))}
            required
          ></SealSelect>
        </Form.Item>

        {isLocal && (
          <Form.Item<FormData>
            name="local_path"
            rules={[
              {
                required: true,
                message: getRuleMessage('input', 'datasets.form.localPath')
              }
            ]}
          >
            <CInput.Input
              required
              label={intl.formatMessage({ id: 'datasets.form.localPath' })}
            ></CInput.Input>
          </Form.Item>
        )}

        {isLocked ? (
          <Form.Item>
            <CInput.Input
              disabled
              value={lockedWorkerName}
              label={intl.formatMessage({ id: 'resources.worker' })}
            ></CInput.Input>
          </Form.Item>
        ) : (
          <Form.Item
            name="worker_id"
            rules={[
              {
                required: true,
                message: getRuleMessage('select', 'resources.worker')
              }
            ]}
          >
            <SealCascader
              required
              showSearch
              expandTrigger="hover"
              multiple={false}
              classNames={{
                popup: { root: 'cascader-popup-wrapper gpu-selector' }
              }}
              maxTagCount={1}
              label={intl.formatMessage({ id: 'resources.worker' })}
              options={workerOptions}
              showCheckedStrategy="SHOW_CHILD"
              getPopupContainer={(triggerNode: any) => triggerNode.parentNode}
            ></SealCascader>
          </Form.Item>
        )}

        {!isLocal && (
          <Form.Item<FormData> name="local_dir">
            <CInput.Input
              label={intl.formatMessage({ id: 'datasets.form.localDir' })}
            ></CInput.Input>
          </Form.Item>
        )}
      </Form>
    );
  }
);

export default DatasetTargetForm;
