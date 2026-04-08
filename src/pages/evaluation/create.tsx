import { evaluationTargetInstanceAtom } from '@/atoms/evaluation';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { history, useIntl } from '@umijs/max';
import {
  Alert,
  Button,
  Card,
  Col,
  Form,
  Input,
  Row,
  Select,
  Space,
  Steps,
  Tag,
  Typography,
  message
} from 'antd';
import { useAtom } from 'jotai';
import { useEffect, useMemo, useState } from 'react';
import PageBox from '../_components/page-box';
import {
  createMockEvaluationRecord,
  evaluationClusters,
  evaluationInstances,
  evaluationSuites,
  taskLabelMap
} from './config/mock';
import { CreateEvaluationFormValues } from './config/types';

const CreateEvaluation: React.FC = () => {
  const intl = useIntl();
  const [form] = Form.useForm<CreateEvaluationFormValues>();
  const [currentStep, setCurrentStep] = useState(0);
  const [evaluationTargetInstance, setEvaluationTargetInstance] = useAtom(
    evaluationTargetInstanceAtom
  );

  const selectedClusterId = Form.useWatch('cluster_id', form);
  const selectedSuiteId = Form.useWatch('suite_id', form);
  const selectedInstanceId = Form.useWatch('model_instance_id', form);
  const nameValue = Form.useWatch('name', form);

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
    if (evaluationTargetInstance.cluster_id) {
      const matchedInstance = evaluationInstances.find(
        (item) =>
          item.cluster_id === evaluationTargetInstance.cluster_id &&
          item.instance_name === evaluationTargetInstance.model_instance_name
      );

      form.setFieldsValue({
        cluster_id: evaluationTargetInstance.cluster_id || undefined,
        model_instance_id: matchedInstance?.id,
        name: matchedInstance
          ? `${matchedInstance.model_name} General`
          : undefined,
        suite_id: 'general'
      });
    }
  }, [evaluationTargetInstance, form]);

  const stepFields: Record<number, Array<keyof CreateEvaluationFormValues>> = {
    0: ['name', 'cluster_id'],
    1: ['model_instance_id'],
    2: ['suite_id']
  };

  const handleNext = async () => {
    await form.validateFields(stepFields[currentStep]);
    setCurrentStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setCurrentStep((prev) => prev - 1);
  };

  const handleFinish = async () => {
    const values = await form.validateFields();
    const createdEvaluation = createMockEvaluationRecord(values);

    setEvaluationTargetInstance({
      cluster_id: null,
      model_name: '',
      model_id: null,
      model_instance_name: '',
      model_instance: []
    });

    message.success(intl.formatMessage({ id: 'evaluation.placeholder.created' }));
    history.push('/models/evaluation', { createdEvaluation });
  };

  return (
    <>
      <div style={{ marginBottom: 16 }}>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => history.push('/models/evaluation')}
        >
          {intl.formatMessage({ id: 'evaluation.title' })}
        </Button>
      </div>
      <PageBox>
        <Row gutter={24}>
          <Col xs={24} xl={16}>
            <Card>
              <Steps
                current={currentStep}
                items={[
                  { title: intl.formatMessage({ id: 'evaluation.form.step.basic' }) },
                  {
                    title: intl.formatMessage({ id: 'evaluation.form.step.instance' })
                  },
                  { title: intl.formatMessage({ id: 'evaluation.form.step.suite' }) }
                ]}
                style={{ marginBottom: 32 }}
              />
              <Form
                form={form}
                layout="vertical"
                initialValues={{ suite_id: 'general' }}
              >
                {currentStep === 0 && (
                  <Row gutter={16}>
                    <Col span={24}>
                      <Form.Item
                        name="name"
                        label={intl.formatMessage({ id: 'evaluation.form.name' })}
                        rules={[{ required: true }]}
                      >
                        <Input placeholder="Qwen3 release candidate evaluation" />
                      </Form.Item>
                    </Col>
                    <Col span={24}>
                      <Form.Item
                        name="cluster_id"
                        label={intl.formatMessage({ id: 'evaluation.form.cluster' })}
                        rules={[{ required: true }]}
                      >
                        <Select
                          options={evaluationClusters}
                          onChange={() => form.setFieldValue('model_instance_id', undefined)}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={24}>
                      <Form.Item
                        name="description"
                        label={intl.formatMessage({
                          id: 'evaluation.form.description'
                        })}
                      >
                        <Input.TextArea rows={4} />
                      </Form.Item>
                    </Col>
                  </Row>
                )}

                {currentStep === 1 && (
                  <>
                    <Alert
                      type="info"
                      showIcon
                      message="Only RUNNING model instances can be selected."
                      style={{ marginBottom: 20 }}
                    />
                    <Form.Item
                      name="model_instance_id"
                      label={intl.formatMessage({ id: 'evaluation.form.instance' })}
                      rules={[{ required: true }]}
                    >
                      <Select
                        optionFilterProp="label"
                        showSearch
                        options={filteredInstances.map((item) => ({
                          label: `${item.instance_name} · ${item.model_name}`,
                          value: item.id,
                          disabled: item.state !== 'RUNNING'
                        }))}
                      />
                    </Form.Item>
                    <Row gutter={[16, 16]}>
                      {filteredInstances.map((item) => {
                        const selected = item.id === selectedInstanceId;
                        return (
                          <Col xs={24} md={12} key={item.id}>
                            <Card
                              hoverable={item.state === 'RUNNING'}
                              onClick={() => {
                                if (item.state === 'RUNNING') {
                                  form.setFieldValue('model_instance_id', item.id);
                                }
                              }}
                              style={{
                                borderColor: selected
                                  ? 'var(--ant-color-primary)'
                                  : undefined,
                                opacity: item.state === 'RUNNING' ? 1 : 0.55
                              }}
                            >
                              <Space
                                direction="vertical"
                                size={8}
                                style={{ width: '100%' }}
                              >
                                <Typography.Text strong>
                                  {item.instance_name}
                                </Typography.Text>
                                <Typography.Text type="secondary">
                                  {item.model_name}
                                </Typography.Text>
                                <div>
                                  <Tag
                                    color={
                                      item.state === 'RUNNING' ? 'success' : 'default'
                                    }
                                  >
                                    {item.state}
                                  </Tag>
                                  <Tag>{item.cluster_name}</Tag>
                                </div>
                              </Space>
                            </Card>
                          </Col>
                        );
                      })}
                    </Row>
                  </>
                )}

                {currentStep === 2 && (
                  <>
                    <Form.Item
                      name="suite_id"
                      label={intl.formatMessage({ id: 'evaluation.form.suite' })}
                      rules={[{ required: true }]}
                    >
                      <Select
                        options={evaluationSuites.map((suite) => ({
                          label: suite.name,
                          value: suite.id
                        }))}
                      />
                    </Form.Item>
                    <Row gutter={[16, 16]}>
                      {evaluationSuites.map((suite) => {
                        const selected = suite.id === selectedSuiteId;
                        return (
                          <Col xs={24} md={12} key={suite.id}>
                            <Card
                              hoverable
                              onClick={() => form.setFieldValue('suite_id', suite.id)}
                              style={{
                                borderColor: selected
                                  ? 'var(--ant-color-primary)'
                                  : undefined,
                                height: '100%'
                              }}
                            >
                              <Space
                                direction="vertical"
                                size={10}
                                style={{ width: '100%' }}
                              >
                                <div>
                                  <Typography.Title level={5} style={{ margin: 0 }}>
                                    {suite.name}
                                  </Typography.Title>
                                  <Typography.Text type="secondary">
                                    {suite.description}
                                  </Typography.Text>
                                </div>
                                <div>
                                  <Typography.Text strong>
                                    {intl.formatMessage({
                                      id: 'evaluation.form.category'
                                    })}
                                    :{' '}
                                  </Typography.Text>
                                  <Tag>{suite.category}</Tag>
                                </div>
                                <div>
                                  <Typography.Text strong>
                                    {intl.formatMessage({
                                      id: 'evaluation.form.tasks'
                                    })}
                                    :{' '}
                                  </Typography.Text>
                                  <Space wrap>
                                    {suite.tasks.map((task) => (
                                      <Tag key={task}>{taskLabelMap[task] || task}</Tag>
                                    ))}
                                  </Space>
                                </div>
                              </Space>
                            </Card>
                          </Col>
                        );
                      })}
                    </Row>
                  </>
                )}
              </Form>
              <div style={{ marginTop: 32, display: 'flex', gap: 12 }}>
                {currentStep > 0 && <Button onClick={handleBack}>Back</Button>}
                {currentStep < 2 ? (
                  <Button type="primary" onClick={handleNext}>
                    Next
                  </Button>
                ) : (
                  <Button type="primary" onClick={handleFinish}>
                    {intl.formatMessage({ id: 'evaluation.button.run' })}
                  </Button>
                )}
              </div>
            </Card>
          </Col>
          <Col xs={24} xl={8}>
            <Card title={intl.formatMessage({ id: 'evaluation.form.review' })}>
              <Space direction="vertical" size={16} style={{ width: '100%' }}>
                <div>
                  <Typography.Text type="secondary">
                    {intl.formatMessage({ id: 'evaluation.form.name' })}
                  </Typography.Text>
                  <div>{nameValue || '-'}</div>
                </div>
                <div>
                  <Typography.Text type="secondary">
                    {intl.formatMessage({ id: 'evaluation.form.cluster' })}
                  </Typography.Text>
                  <div>
                    {evaluationClusters.find(
                      (item) => item.value === selectedClusterId
                    )?.label || '-'}
                  </div>
                </div>
                <div>
                  <Typography.Text type="secondary">
                    {intl.formatMessage({ id: 'evaluation.form.instance' })}
                  </Typography.Text>
                  <div>{selectedInstance?.instance_name || '-'}</div>
                  <Typography.Text type="secondary">
                    {selectedInstance?.model_name || ''}
                  </Typography.Text>
                </div>
                <div>
                  <Typography.Text type="secondary">
                    {intl.formatMessage({ id: 'evaluation.form.suite' })}
                  </Typography.Text>
                  <div>{selectedSuite?.name || '-'}</div>
                </div>
                {selectedSuite && (
                  <>
                    <div>
                      <Typography.Text type="secondary">
                        {intl.formatMessage({
                          id: 'evaluation.form.runtime'
                        })}
                      </Typography.Text>
                      <div>
                        <Tag>{selectedSuite.estimated_runtime_level}</Tag>
                      </div>
                    </div>
                    <div>
                      <Typography.Text type="secondary">
                        {intl.formatMessage({
                          id: 'evaluation.form.recommendedFor'
                        })}
                      </Typography.Text>
                      <Space wrap style={{ marginTop: 8 }}>
                        {selectedSuite.recommended_for.map((item) => (
                          <Tag key={item}>{item}</Tag>
                        ))}
                      </Space>
                    </div>
                  </>
                )}
              </Space>
            </Card>
          </Col>
        </Row>
      </PageBox>
    </>
  );
};

export default CreateEvaluation;
