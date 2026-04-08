import SealInput from '@/components/seal-form/seal-input';
import SealSelect from '@/components/seal-form/seal-select';
import CollapsePanel from '@/pages/_components/collapse-panel';
import FormDrawer from '@/pages/_components/form-drawer';
import {
  createMockEvaluationRecord,
  evaluationClusters,
  evaluationInstances,
  evaluationSuites,
  taskLabelMap
} from '@/pages/evaluation/config/mock';
import {
  CreateEvaluationFormValues,
  EvaluationRecord
} from '@/pages/evaluation/config/types';
import {
  Button,
  Card,
  Form,
  Space,
  Tag,
  Typography
} from 'antd';
import { useIntl } from '@umijs/max';
import { useEffect, useMemo, useState } from 'react';

type AddEvaluationDrawerProps = {
  open: boolean;
  onCancel: () => void;
  onOk: (record: EvaluationRecord) => void;
  initialValues?: Partial<CreateEvaluationFormValues>;
};

const AddEvaluationDrawer: React.FC<AddEvaluationDrawerProps> = ({
  open,
  onCancel,
  onOk,
  initialValues
}) => {
  const intl = useIntl();
  const [form] = Form.useForm<CreateEvaluationFormValues>();
  const [, setRenderKey] = useState(0);
  const [activeKey, setActiveKey] = useState<string[]>(['config']);

  const selectedClusterId = Form.useWatch('cluster_id', form);
  const selectedInstanceId = Form.useWatch('model_instance_id', form);
  const selectedSuiteId = Form.useWatch('suite_id', form);

  const filteredInstances = useMemo(() => {
    if (!selectedClusterId) {
      return evaluationInstances;
    }
    return evaluationInstances.filter(
      (item) => item.cluster_id === selectedClusterId
    );
  }, [selectedClusterId]);

  const selectedInstance = filteredInstances.find(
    (item) => item.id === selectedInstanceId
  );
  const selectedSuite = evaluationSuites.find(
    (suite) => suite.id === selectedSuiteId
  );

  useEffect(() => {
    if (open) {
      setActiveKey(['config']);
      form.setFieldsValue({
        suite_id: 'general',
        ...initialValues
      });
    }
  }, [form, initialValues, open]);

  const handleSubmit = async () => {
    const values = await form.validateFields();
    onOk(createMockEvaluationRecord(values));
    form.resetFields();
    setRenderKey((prev) => prev + 1);
  };

  const handleClose = () => {
    form.resetFields();
    setActiveKey(['config']);
    setRenderKey((prev) => prev + 1);
    onCancel();
  };

  return (
    <FormDrawer
      title={intl.formatMessage({ id: 'evaluation.button.add' })}
      open={open}
      onCancel={handleClose}
      onSubmit={handleSubmit}
      width={640}
      footer={
        <div
          style={{
            padding: '16px 24px 8px',
            display: 'flex',
            justifyContent: 'space-between',
            gap: 12
          }}
        >
          <div />
          <Space>
            <Button onClick={handleClose}>
              {intl.formatMessage({ id: 'common.button.cancel' })}
            </Button>
            <Button type="primary" onClick={handleSubmit}>
              {intl.formatMessage({ id: 'evaluation.button.run' })}
            </Button>
          </Space>
        </div>
      }
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{ suite_id: 'general' }}
      >
        <Form.Item
          name="name"
          rules={[{ required: true }]}
        >
          <SealInput.Input
            required
            label={intl.formatMessage({ id: 'evaluation.form.name' })}
            placeholder="Qwen3 release candidate evaluation"
          />
        </Form.Item>
        <Form.Item
          name="cluster_id"
          rules={[{ required: true }]}
        >
          <SealSelect
            required
            label={intl.formatMessage({ id: 'clusters.title' })}
            options={evaluationClusters}
            onChange={() => form.setFieldValue('model_instance_id', undefined)}
          />
        </Form.Item>
        <Form.Item
          name="model_instance_id"
          rules={[{ required: true }]}
        >
          <SealSelect
            required
            showSearch
            optionFilterProp="label"
            label={intl.formatMessage({ id: 'evaluation.form.instance' })}
            options={filteredInstances.map((item) => ({
              label: `${item.instance_name} · ${item.model_name}`,
              value: item.id,
              disabled: item.state !== 'RUNNING'
            }))}
          />
        </Form.Item>
        <Form.Item
          name="description"
        >
          <SealInput.TextArea
            scaleSize={true}
            label={intl.formatMessage({ id: 'common.table.description' })}
          />
        </Form.Item>
        <CollapsePanel
          activeKey={activeKey}
          accordion={false}
          onChange={(keys) => setActiveKey(Array.isArray(keys) ? keys : [keys])}
          items={[
            {
              key: 'config',
              label: intl.formatMessage({ id: 'common.title.config' }),
              forceRender: true,
              children: (
                <>
                  <Form.Item
                    name="suite_id"
                    rules={[{ required: true }]}
                  >
                    <SealSelect
                      required
                      label={intl.formatMessage({ id: 'evaluation.form.suite' })}
                      options={evaluationSuites.map((suite) => ({
                        label: suite.name,
                        value: suite.id
                      }))}
                    />
                  </Form.Item>
                  <Form.Item
                    name="limit"
                    extra={intl.formatMessage({
                      id: 'evaluation.form.limit.help'
                    })}
                  >
                    <SealInput.Input
                      label={intl.formatMessage({ id: 'evaluation.form.limit' })}
                      placeholder={intl.formatMessage({
                        id: 'evaluation.form.limit.placeholder'
                      })}
                    />
                  </Form.Item>
                  {selectedSuite && (
                    <Card
                      size="small"
                      style={{
                        marginBottom: 8,
                        background: 'var(--ant-color-fill-quaternary)',
                        borderColor: 'var(--ant-color-border-secondary)'
                      }}
                    >
                      <Space
                        direction="vertical"
                        size={10}
                        style={{ width: '100%' }}
                      >
                        <div>
                          <Typography.Text strong>
                            {selectedSuite.name}
                          </Typography.Text>
                        </div>
                        <div>
                          <Typography.Text type="secondary">
                            {selectedSuite.description}
                          </Typography.Text>
                        </div>
                        <div>
                          <Typography.Text strong>
                            {intl.formatMessage({
                              id: 'evaluation.form.category'
                            })}
                            :{' '}
                          </Typography.Text>
                          <Tag>{selectedSuite.category}</Tag>
                        </div>
                        <div>
                          <Typography.Text strong>
                            {intl.formatMessage({
                              id: 'evaluation.form.tasks'
                            })}
                            :{' '}
                          </Typography.Text>
                          <Space wrap>
                            {selectedSuite.tasks.map((task) => (
                              <Tag key={task}>{taskLabelMap[task] || task}</Tag>
                            ))}
                          </Space>
                        </div>
                        <div>
                          <Typography.Text strong>
                            {intl.formatMessage({
                              id: 'evaluation.form.limit'
                            })}
                            :{' '}
                          </Typography.Text>
                          <Tag>{selectedSuite.limit}</Tag>
                        </div>
                      </Space>
                    </Card>
                  )}
                </>
              )
            }
          ]}
        />
        {selectedInstance && (
          <div style={{ marginTop: 8, color: 'var(--ant-color-text-tertiary)' }}>
            {selectedInstance.model_name} · {selectedInstance.instance_name}
          </div>
        )}
      </Form>
    </FormDrawer>
  );
};

export default AddEvaluationDrawer;
