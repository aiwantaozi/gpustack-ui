import {
  Input as CInput,
  LabelSelector,
  ModalFooter,
  ScrollerModal
} from '@gpustack/core-ui';
import { useIntl } from '@umijs/max';
import { Form } from 'antd';
import _ from 'lodash';
import React from 'react';
import 'simplebar-react/dist/simplebar.min.css';

type ViewModalProps = {
  open: boolean;
  onCancel: () => void;
  onOk: (values: FormData) => Promise<void>;
  data: {
    name: string;
    labels: object;
  };
  /**
   * How many workers this write will land on, when it is a batch.
   *
   * Absent or 1 keeps the single-worker form byte-for-byte. Above 1 the name
   * field becomes a count and the labels start empty, because there is no
   * single "current" value to prefill from — and prefilling from the first
   * selected worker would silently copy its labels onto the other thirty-nine.
   */
  count?: number;
};
interface FormData {
  labels: object;
  name: string;
}

const UpdateLabels: React.FC<ViewModalProps> = (props) => {
  const { open, onCancel, data, onOk, count } = props || {};
  const intl = useIntl();
  const [form] = Form.useForm();
  const batch = (count ?? 1) > 1;

  const handleSumit = () => {
    form.submit();
  };

  return (
    <ScrollerModal
      title={intl.formatMessage({ id: 'resources.button.edit' })}
      open={open}
      centered={true}
      onCancel={onCancel}
      destroyOnHidden={true}
      closeIcon={true}
      mask={{
        closable: false
      }}
      keyboard={false}
      width={600}
      maxContentHeight={'max(calc(100vh - 300px), 500px)'}
      footer={
        <ModalFooter onOk={handleSumit} onCancel={onCancel}></ModalFooter>
      }
    >
      <Form
        name="deployModel"
        form={form}
        onFinish={onOk}
        preserve={false}
        clearOnDestroy={true}
        initialValues={{
          name: batch
            ? intl.formatMessage(
                { id: 'resources.worker.setLabels.count' },
                { count }
              )
            : data.name,
          // Empty on a batch: see `count`. The labels entered here are what
          // every selected worker ends up with, so starting from one of them
          // would be a silent overwrite of the rest.
          labels: batch ? {} : data.labels
        }}
      >
        <Form.Item<FormData> name="name">
          <CInput.Input
            label={intl.formatMessage({
              id: 'common.table.name'
            })}
            disabled
          />
        </Form.Item>
        <Form.Item<FormData>
          name="labels"
          rules={[
            () => ({
              validator(rule, value) {
                if (_.keys(value).length > 0) {
                  if (_.some(_.keys(value), (k: string) => !value[k])) {
                    return Promise.reject(
                      intl.formatMessage(
                        {
                          id: 'common.validate.value'
                        },
                        {
                          name: intl.formatMessage({
                            id: 'resources.form.label'
                          })
                        }
                      )
                    );
                  }
                }
                return Promise.resolve();
              }
            })
          ]}
        >
          <LabelSelector
            label={intl.formatMessage({
              id: 'resources.table.labels'
            })}
            btnText={intl.formatMessage({ id: 'common.button.addLabel' })}
          ></LabelSelector>
        </Form.Item>
      </Form>
    </ScrollerModal>
  );
};

export default UpdateLabels;
