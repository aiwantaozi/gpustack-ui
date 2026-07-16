import { PageAction } from '@/config';
import { PageActionType } from '@/config/types';
import { IconFont, ScrollSpyTabs, useWrapperContext } from '@gpustack/core-ui';
import { useIntl } from '@umijs/max';
import { Form } from 'antd';
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState
} from 'react';
import {
  AUTO_TUNE_DEFAULTS,
  DatasetValueMap,
  genBenchmarkName,
  LoadTypeValueMap
} from '../config';
import FormContext from '../config/form-context';
import { FormData, BenchmarkListItem as ListItem } from '../config/types';
import Basic from './basic';
import DatasetForm from './dataset';

interface ProviderFormProps {
  ref?: any;
  action: PageActionType;
  currentData?: ListItem; // Used when action is EDIT
  open?: boolean;
  clusterList?: Global.BaseOption<number>[];
  datasetList: Global.BaseOption<number | string>[];
  profilesOptions: Global.BaseOption<string>[];
  onFinish: (values: FormData) => Promise<void>;
  onFinishFailed?: (errorInfo: any) => void;
}

const ProviderForm: React.FC<ProviderFormProps> = forwardRef((props, ref) => {
  const {
    action,
    currentData,
    onFinish,
    onFinishFailed,
    open,
    clusterList,
    profilesOptions,
    datasetList
  } = props;
  const intl = useIntl();
  const [form] = Form.useForm();
  const loadType = Form.useWatch('load_type', form);
  const { getScrollElementScrollableHeight } = useWrapperContext();
  const [activeKey, setActiveKey] = useState<string[]>(['name']);
  const scrollTabsRef = useRef<any>(null);

  // The nav jumps to each real section instead of a single "Configuration": Basic
  // + Dataset / SLA (concurrency only) / Load / Execution Limits / Advanced. Each
  // `field` matches the section header's data-field anchor (see random-settings).
  const showSLA = loadType === LoadTypeValueMap.Concurrency;
  const segmentOptions = [
    {
      value: 'name',
      label: intl.formatMessage({ id: 'common.title.basicInfo' }),
      icon: <IconFont type="icon-basic" />,
      field: 'name'
    },
    {
      value: 'dataset',
      label: intl.formatMessage({ id: 'benchmark.form.group.dataset' }),
      icon: <IconFont type="icon-settings" />,
      field: 'dataset'
    },
    ...(showSLA
      ? [
          {
            value: 'sla',
            label: intl.formatMessage({ id: 'benchmark.form.group.sla' }),
            icon: <IconFont type="icon-settings" />,
            field: 'sla'
          }
        ]
      : []),
    {
      value: 'load',
      label: intl.formatMessage({ id: 'benchmark.form.group.load' }),
      icon: <IconFont type="icon-settings" />,
      field: 'load'
    },
    {
      value: 'execution',
      label: intl.formatMessage({ id: 'benchmark.form.group.execution' }),
      icon: <IconFont type="icon-settings" />,
      field: 'execution'
    },
    {
      value: 'advanced',
      label: intl.formatMessage({ id: 'benchmark.form.group.advanced' }),
      icon: <IconFont type="icon-settings" />,
      field: 'advanced'
    }
  ];

  const handleActiveChange = (key: string[]) => {
    setActiveKey(key);
  };

  // Auto default name = {model}-{profile}-{time}-{rand}. We only overwrite it
  // while the user hasn't customized it — tracked by comparing the current name
  // to the last value we generated (no extra input listeners needed).
  const lastAutoNameRef = useRef<string>('');
  const applyAutoName = () => {
    const cur = form.getFieldValue('name');
    if (cur && cur !== lastAutoNameRef.current) {
      return; // user typed their own name — leave it alone
    }
    const name = genBenchmarkName(
      form.getFieldValue('model_name'),
      form.getFieldValue('profile')
    );
    form.setFieldValue('name', name);
    lastAutoNameRef.current = name;
  };

  useImperativeHandle(ref, () => ({
    submit: () => {
      form.submit();
    },
    resetFields: () => {
      form.resetFields();
    }
  }));

  // EDIT and CLONE both pre-fill from currentData. EDIT keeps the source name;
  // CLONE (action CREATE) arrives with a freshly generated name and stays
  // editable. A plain CREATE has no currentData and uses initialValues.
  useEffect(() => {
    if (!currentData) {
      // Plain create: seed an auto default name (refreshes on model/profile
      // change until the user types their own).
      lastAutoNameRef.current = '';
      if (action === PageAction.CREATE && open) {
        applyAutoName();
      }
      return;
    }
    // Defensive normalization of the dataset TYPE selector. `dataset_name` must
    // be one of the type values (Random / ShareGPT / Dataset). Older rows may
    // still hold a source string there; a custom benchmark is identified by
    // `dataset_id` being present (or `dataset_name` not being a known type).
    const validTypes = [
      DatasetValueMap.Random,
      DatasetValueMap.ShareGPT,
      DatasetValueMap.Custom
    ];
    const datasetName =
      currentData.dataset_id != null ||
      !validTypes.includes(currentData.dataset_name)
        ? DatasetValueMap.Custom
        : currentData.dataset_name;
    form.setFieldsValue({
      ...currentData,
      dataset_name: datasetName,
      model_instance: [currentData.model_name, currentData.model_instance_name]
    });
    // Treat a clone's generated name as "auto" so switching profile/model still
    // refreshes it; an edit's existing name is left as user-owned.
    lastAutoNameRef.current =
      action === PageAction.CREATE ? currentData.name : '';
  }, [form, currentData, action, open]);

  // Plain CREATE: once the profiles config is fetched from the backend, seed the
  // auto-tune budget fields from the DEFAULT preset (source of truth), preferring
  // the preset value and falling back to the UI default. This keeps the effective
  // values visible/editable instead of silently applied at runtime. Clone/edit
  // use `currentData`, so they are skipped.
  const budgetSeededRef = useRef(false);
  useEffect(() => {
    if (!open) {
      budgetSeededRef.current = false;
      return;
    }
    if (currentData || action !== PageAction.CREATE) return;
    if (budgetSeededRef.current || !(profilesOptions as any[])?.length) return;
    const profile = form.getFieldValue('profile');
    const cfg =
      (profilesOptions as any[]).find((o) => o.value === profile)?.config || {};
    form.setFieldsValue({
      lower_bound: cfg.lower_bound ?? AUTO_TUNE_DEFAULTS.lower_bound,
      upper_bound: cfg.upper_bound ?? AUTO_TUNE_DEFAULTS.upper_bound,
      max_points: cfg.max_points ?? AUTO_TUNE_DEFAULTS.max_points,
      max_total_seconds:
        cfg.max_total_seconds ?? AUTO_TUNE_DEFAULTS.max_total_seconds
    });
    budgetSeededRef.current = true;
  }, [open, action, currentData, profilesOptions, form]);

  return (
    <ScrollSpyTabs
      ref={scrollTabsRef}
      defaultTarget="name"
      segmentOptions={segmentOptions}
      activeKey={activeKey}
      setActiveKey={handleActiveChange}
      segmentedTop={{
        top: 0,
        offsetTop: 96
      }}
      getScrollElementScrollableHeight={getScrollElementScrollableHeight}
    >
      <FormContext.Provider
        value={{
          action,
          open,
          clusterList: clusterList,
          profilesOptions: profilesOptions,
          datasetList: datasetList,
          currentData,
          applyAutoName
        }}
      >
        <Form
          form={form}
          onFinish={onFinish}
          onFinishFailed={onFinishFailed}
          initialValues={{
            // Default to the Max Throughput preset: adaptive auto-tune on the
            // rate axis (ramps request rate to the throughput peak).
            dataset_name: 'Random',
            dataset_input_tokens: 1024,
            dataset_output_tokens: 128,
            profile: 'Max Throughput',
            load_type: 'fixed_rate',
            auto_tune: true,
            lower_bound: AUTO_TUNE_DEFAULTS.lower_bound,
            upper_bound: AUTO_TUNE_DEFAULTS.upper_bound,
            max_points: AUTO_TUNE_DEFAULTS.max_points,
            max_total_seconds: AUTO_TUNE_DEFAULTS.max_total_seconds,
            request_rate: -1,
            stages: [],
            total_requests: null,
            max_seconds: null,
            prefix_buckets: [],
            turns: null,
            warmup: null,
            cooldown: null,
            max_errors: null,
            max_error_rate: null,
            stop_on_saturation: false,
            dataset_seed: 42,
            dataset_seed_increment: true
          }}
        >
          <Basic />
          {/* Configuration is the section (labeled by the top segment nav); its
              fields — Profile + Dataset/SLA/Load/… groups — render directly, with
              no redundant outer "Configuration" collapse wrapping them. */}
          <DatasetForm />
        </Form>
      </FormContext.Provider>
    </ScrollSpyTabs>
  );
});

export default ProviderForm;
