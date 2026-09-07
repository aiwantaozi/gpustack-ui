import { PageAction } from '@/config';
import {
  InstanceStatusMap,
  InstanceStatusMapValue,
  isModelServable,
  isPDModel,
  modelCategoriesMap
} from '@/pages/llmodels/config';
import { useBenchmarkTargetInstance } from '@/pages/llmodels/hooks/use-run-benchmark';
import { useQueryModelInstancesList } from '@/pages/llmodels/services/use-query-model-instances';
import { useQueryModelList } from '@/pages/llmodels/services/use-query-model-list';
import {
  Cascader as SealCascader,
  TextAttribute,
  useAppUtils
} from '@gpustack/core-ui';
import { useIntl } from '@umijs/max';
import { useMemoizedFn } from 'ahooks';
import { Form, Tooltip } from 'antd';
import React, { useEffect } from 'react';
import { useFormContext } from '../config/form-context';
import { FormData } from '../config/types';

// benchmark.form.nonLlmModel.tips
const InstanceNode = (props: any) => {
  const { data: instance } = props;
  const intl = useIntl();

  // A group is a leaf too, but it is a MODEL leaf: it ends the selection
  // because it has no member to choose, not because it is one.
  if (instance.isLeaf && !instance.pd) {
    return (
      <span className="flex-center">
        {instance.label}
        {instance.disabled && (
          <span className="text-tertiary m-l-4">[{instance.state}]</span>
        )}
      </span>
    );
  }

  if (instance.disabled) {
    return (
      <Tooltip
        title={intl.formatMessage({ id: 'benchmark.form.nonLlmModel.tips' })}
      >
        <span>{instance.label}</span>
      </Tooltip>
    );
  }

  if (instance.pd) {
    // Says why this row does not expand, where the question is asked. Without
    // it a group looks like a model whose instances failed to load.
    return (
      <Tooltip
        title={intl.formatMessage({ id: 'benchmark.form.pdGroup.tips' })}
      >
        <span className="flex-center">
          {instance.label}
          <TextAttribute variant="outlined">PD</TextAttribute>
        </span>
      </Tooltip>
    );
  }

  return <span>{instance.label}</span>;
};

const ModelInstanceForm: React.FC = () => {
  const intl = useIntl();
  const form = Form.useFormInstance();
  const { getRuleMessage } = useAppUtils();
  const { action, open, applyAutoName } = useFormContext();
  const clusterId = Form.useWatch('cluster_id', form);
  const [modelList, setModelList] = React.useState<any[]>([]);
  const {
    loading: modelLoading,
    fetchData: fetchModelList,
    cancelRequest: cancelModelRequest
  } = useQueryModelList();
  const {
    loading: instanceLoading,
    fetchInstanceList,
    cancelRequest: cancelInstanceRequest
  } = useQueryModelInstancesList();
  const { benchmarkTargetInstance, clearBenchmarkTargetInstance } =
    useBenchmarkTargetInstance();

  const handleOnChange = async (value: any, selectedOptions: any) => {
    // Clearing the Cascader fires this with both arguments undefined, so nothing
    // here may index blind — the whole selection has to null out together.
    const options = selectedOptions || [];
    // A group stops at the model: it has no second level, so the last option is
    // the model itself and there is no member to name. The server resolves the
    // endpoint (the router) and the worker the run is placed on.
    const instanceOption =
      value?.length > 1 ? options[options.length - 1] : null;
    form.setFieldsValue({
      model_name: value?.[0],
      model_id: options[0]?.id,
      model_instance_name: value?.[1],
      model_instance: value,
      // The selected instance's worker — used to co-locate the custom benchmark
      // dataset (the picker filters datasets to this worker). Not part of the
      // benchmark payload; stripped before submit.
      dataset_worker_id: instanceOption?.worker_id,
      dataset_worker_name: instanceOption?.worker_name
    });
    applyAutoName?.();
  };

  const renderInstance = (instance: any) => {
    return {
      label: instance.name,
      value: instance.name,
      id: instance.id,
      worker_id: instance.worker_id,
      worker_name: instance.worker_name,
      isLeaf: true,
      disabled: instance.state !== InstanceStatusMap.Running,
      state: InstanceStatusMapValue[instance.state]
    };
  };

  const clearModelInstance = () => {
    setModelList([]);
    form.setFieldsValue({
      model_name: '',
      model_id: '',
      model_instance_name: '',
      model_instance: ''
    });
  };

  const loadInstances = async (selectedOptions: any[]) => {
    const targetOption = selectedOptions[selectedOptions.length - 1];
    if (targetOption && targetOption.children.length === 0) {
      const list = await fetchInstanceList({ id: targetOption.id });
      const instanceOptions = list.map((instance: any) =>
        renderInstance(instance)
      );
      targetOption.children = [...instanceOptions];

      setModelList((prevModelList) => {
        const newModelList = prevModelList.map((model) => {
          if (model.id === targetOption.id) {
            return {
              ...model,
              children: [...instanceOptions]
            };
          }
          return model;
        });
        return newModelList;
      });
    }
  };
  const initModelInstance = useMemoizedFn(async () => {
    if (!clusterId) {
      return;
    }
    // fetch model list when dropdown is opened
    const list = await fetchModelList({ page: -1, cluster_id: clusterId });
    const modelOptions = list
      .filter((model: any) => model.replicas > 0)
      .map((model: any) => ({
        label: model.name,
        value: model.name,
        disabled: modelCategoriesMap.llm !== model.categories?.[0],
        id: model.id,
        // A group has no second level. Every member serves an OpenAI-shaped API
        // on its own port, so offering them would offer three wrong answers
        // that all return 200: a prefill stops after one token and a decode
        // runs without the prefix its KV was meant to carry. A group is
        // measured through its router, which is not a choice the user makes —
        // it is the only way in.
        isLeaf: isPDModel(model),
        pd: isPDModel(model),
        // Whether the model can actually answer, which under PD is no longer
        // implied by a running-instance count: a group whose router is down
        // has RUNNING members and serves nothing, and benchmarking it would
        // measure a connection error.
        servable: isModelServable(model),
        children: []
      }));

    if (modelOptions.length === 0) {
      clearModelInstance();
      return;
    }

    // preload instances for the first model
    const selectedllmModel = modelOptions.find(
      (model) => !model.disabled && model.servable
    );
    if (!selectedllmModel) {
      setModelList(modelOptions);
      form.setFieldsValue({
        model_name: '',
        model_id: '',
        model_instance_name: '',
        model_instance: ''
      });
      return;
    }
    // A group is selected whole, so there are no members to preload and the
    // initial value is one level deep.
    const instanceOptions = selectedllmModel.pd
      ? []
      : (await fetchInstanceList({ id: selectedllmModel.id })).map(
          (instance: any) => renderInstance(instance)
        );
    if (selectedllmModel && !selectedllmModel.pd) {
      selectedllmModel.children = [...instanceOptions] as never[];
    }

    // init form value for model instance
    if (benchmarkTargetInstance.model_name) {
      form.setFieldsValue({
        ...benchmarkTargetInstance
      });
    } else if (selectedllmModel.pd) {
      handleOnChange([selectedllmModel.value], [selectedllmModel]);
    } else {
      handleOnChange(
        [selectedllmModel.value, instanceOptions[0]?.value],
        [selectedllmModel, instanceOptions[0]]
      );
    }

    setModelList(modelOptions);
  });

  useEffect(() => {
    if (open && action === PageAction.CREATE) {
      initModelInstance();
    }
    if (!open) {
      cancelModelRequest();
      cancelInstanceRequest();
      clearBenchmarkTargetInstance();
    }
  }, [open, action, clusterId]);

  return (
    <Form.Item<FormData>
      name={'model_instance'}
      rules={[
        {
          required: true,
          // Not "select an instance": a group is selected at the model
          // level, because it has no member a client can name correctly.
          message: getRuleMessage('select', 'benchmark.form.target')
        }
      ]}
    >
      <SealCascader
        required
        showSearch
        disabled={action === PageAction.EDIT}
        loading={modelLoading || instanceLoading}
        changeOnSelect={false}
        expandTrigger="hover"
        multiple={false}
        classNames={{
          popup: {
            root: 'cascader-popup-wrapper gpu-selector'
          }
        }}
        maxTagCount={1}
        label={intl.formatMessage({ id: 'benchmark.form.target' })}
        options={modelList}
        getPopupContainer={(triggerNode) => triggerNode.parentNode}
        optionNode={InstanceNode}
        loadData={loadInstances}
        onChange={handleOnChange}
      ></SealCascader>
    </Form.Item>
  );
};

export default ModelInstanceForm;
