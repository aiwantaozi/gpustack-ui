import {
  CheckboxField,
  InputNumber as CInputNumber,
  Select as SealSelect
} from '@gpustack/core-ui';
import { useIntl } from '@umijs/max';
import { Form, Input } from 'antd';
import _ from 'lodash';
import { useEffect, useMemo, useRef } from 'react';
import { useFormContext } from '../config/form-context';
import { FormData } from '../config/types';
import { backendOptionsMap } from '../constants/backend-parameters';
import useQueryCacheServices from '../services/use-query-cache-services';

// Sentinel for the in-process (local) cache in the merged backend dropdown;
// real options carry the cache service's numeric id.
const IN_PROCESS = 'in-process';

// antd batches Form.setFieldsValue; the follow-up onValuesChange must run
// after that internal flush or it reads the pre-update values.
const FORM_FLUSH_DELAY_MS = 100;

interface KVCacheFormProps {
  /**
   * Renders the same fields at a nested Form path (e.g. `['roles', 0]`) so a
   * role can carry its own cache choice. Absent means the model-level path,
   * byte-for-byte what it was.
   */
  namePrefix?: (string | number)[];
}

const KVCacheForm: React.FC<KVCacheFormProps> = ({ namePrefix }) => {
  const intl = useIntl();
  const form = Form.useFormInstance();
  const { onValuesChange, flatBackendOptions } = useFormContext();
  // Every `extended_kv_cache` path goes through this, so the section can move
  // under a role without any field knowing about roles.
  const path = (...field: (string | number)[]) =>
    namePrefix ? [...namePrefix, ...field] : field;
  // `cache` is the object-shaped write target: setFieldsValue takes a nested
  // object at the model level and a `['roles', i, 'extended_kv_cache']` path
  // under a prefix, so the two cannot share one literal.
  const setCache = (value: Record<string, any>) => {
    if (namePrefix) {
      form.setFieldValue(path('extended_kv_cache'), value);
      return;
    }
    form.setFieldsValue({ extended_kv_cache: value } as any);
  };
  const kvCacheEnabled = Form.useWatch(
    path('extended_kv_cache', 'enabled'),
    form
  );
  const kvCacheMode = Form.useWatch(path('extended_kv_cache', 'mode'), form);
  const cacheServiceId = Form.useWatch(
    path('extended_kv_cache', 'cache_service_id'),
    form
  );
  // Model-level on purpose: a role does not pick its own cluster.
  const clusterId = Form.useWatch('cluster_id', form);
  // A role that does not override its engine runs the model's, and which
  // engines can share a cache is a property of the engine.
  const roleBackend = Form.useWatch(path('backend'), form);
  const modelBackend = Form.useWatch('backend', form);
  const backend = namePrefix ? (roleBackend ?? modelBackend) : modelBackend;
  const configCacheRef = useRef<any>({});
  // set when the user enables the checkbox without a stashed shared
  // selection; the options-sync effect resolves it into a default pick
  const autoSelectPendingRef = useRef(false);

  const { cacheServiceOptions, loading, fetchCacheServices } =
    useQueryCacheServices();

  // shared cache services attach to the built-in vLLM and SGLang backends
  // (per the providers' declared integrations); the same predicate gates
  // the extended-KV-cache checkbox
  const sharedSupported = useMemo(() => {
    const currentBackend = flatBackendOptions.find(
      (item) => item.value === backend
    );

    return Boolean(
      currentBackend?.isBuiltIn &&
      [backendOptionsMap.vllm, backendOptionsMap.SGLang].includes(
        backend as string
      )
    );
  }, [backend, flatBackendOptions]);

  const notifyValuesChangeDelayed = async (changedValues: any) => {
    await new Promise((resolve) => {
      setTimeout(resolve, FORM_FLUSH_DELAY_MS);
    });
    // `getFieldsValue()` is the whole store either way, so the compatibility
    // consumer still receives a model-level shape. The changed-values argument
    // is dropped under a prefix: nothing downstream parses a role path, and a
    // role-shaped key would read as an unknown model-level field.
    onValuesChange?.(namePrefix ? {} : changedValues, form.getFieldsValue());
  };

  // in-process defaults, restoring whatever the user had filled before a
  // switch away (the stash) and falling back to the recommended ratio
  const localCacheFields = () => ({
    chunk_size: configCacheRef.current?.chunk_size || null,
    ram_ratio: configCacheRef.current?.ram_ratio || 1.2,
    ram_size: configCacheRef.current?.ram_size || null
  });

  const handleEnableOnChange = async (e: any) => {
    if (e.target.checked) {
      // fall back to in-process when the stashed shared selection is no
      // longer supported
      const mode =
        sharedSupported && configCacheRef.current?.mode === 'shared'
          ? 'shared'
          : 'local';
      if (mode === 'shared') {
        setCache({
          enabled: true,
          mode,
          cache_service_id: configCacheRef.current?.cache_service_id ?? null,
          chunk_size: null,
          ram_ratio: null,
          ram_size: null
        });
      } else {
        setCache({
          enabled: true,
          mode,
          cache_service_id: null,
          ...localCacheFields()
        });
        // Enabling flips kvCacheEnabled, which triggers the service-list
        // sync effect below; the effect consumes this flag to default the
        // selection once the options arrive (a second fetch here would
        // race it).
        autoSelectPendingRef.current = true;
      }
    } else {
      configCacheRef.current = form.getFieldValue(path('extended_kv_cache'));
    }
    await notifyValuesChangeDelayed({
      extended_kv_cache: {
        enabled: e.target.checked
      }
    });
  };

  // Merged backend choice: the in-process cache, or a specific cache service.
  const handleBackendChange = async (value: string | number) => {
    if (value === IN_PROCESS) {
      setCache({
        enabled: true,
        mode: 'local',
        cache_service_id: null,
        ...localCacheFields()
      });
      await notifyValuesChangeDelayed({
        extended_kv_cache: { mode: 'local' }
      });
    } else {
      // stash the local-mode fields so switching back restores them
      const current = form.getFieldValue(path('extended_kv_cache'));
      configCacheRef.current = {
        ...configCacheRef.current,
        ..._.pick(current, ['chunk_size', 'ram_ratio', 'ram_size'])
      };
      setCache({
        enabled: true,
        mode: 'shared',
        cache_service_id: value,
        chunk_size: null,
        ram_ratio: null,
        ram_size: null
      });
      await notifyValuesChangeDelayed({
        extended_kv_cache: { mode: 'shared', cache_service_id: value }
      });
    }
  };

  const handleRamRatioChange = (
    value: number | null | string,
    field: string
  ) => {
    if (!value) {
      form.setFieldValue(path('extended_kv_cache', field), null);
    }
  };

  const handleRamSizeInput = (value: number | null | string) => {
    if (!value) {
      form.setFieldValue(path('extended_kv_cache', 'ram_size'), null);
    } else {
      form.setFieldValue(path('extended_kv_cache', 'ram_size'), _.round(value));
    }
    onValuesChange?.(
      {
        extended_kv_cache: {
          ram_size: value
        }
      },
      form.getFieldsValue()
    );
  };

  // keep the service options in sync with the cluster / backend and drop a
  // selection that is no longer listed (falling back to in-process); a
  // failed fetch (null) proves nothing about the saved selection
  useEffect(() => {
    if (!kvCacheEnabled || !sharedSupported || !clusterId) {
      return;
    }
    fetchCacheServices({ clusterId, backend })
      .then(async (options) => {
        // null = failure or cancellation: prove nothing, and keep the
        // auto-select flag — a canceled request must not eat the marker
        // its superseding request will consume
        if (!options) {
          return;
        }
        const current = form.getFieldValue(
          path('extended_kv_cache', 'cache_service_id')
        );
        if (
          current != null &&
          !options.some((item) => item.value === current)
        ) {
          setCache({
            mode: 'local',
            cache_service_id: null,
            ...localCacheFields()
          });
          // setFieldsValue does not fire onValuesChange: tell the parent
          // explicitly so compatibility checks see the fallback
          await notifyValuesChangeDelayed({
            extended_kv_cache: { mode: 'local', cache_service_id: null }
          });
        }
        if (!autoSelectPendingRef.current) {
          return;
        }
        autoSelectPendingRef.current = false;
        // A sole running compatible cache service becomes the default
        // backend: its existence signals the cluster was provisioned for
        // shared caching, and in-process is the fallback for clusters
        // without one. Ambiguity (several services) stays with the user.
        const eligible = options.filter((item) => !item.disabled);
        const untouched =
          form.getFieldValue(path('extended_kv_cache', 'enabled')) &&
          form.getFieldValue(path('extended_kv_cache', 'mode')) !== 'shared' &&
          form.getFieldValue(path('extended_kv_cache', 'cache_service_id')) ==
            null;
        if (eligible.length === 1 && untouched) {
          const currentConfig = form.getFieldValue(path('extended_kv_cache'));
          configCacheRef.current = {
            ...configCacheRef.current,
            ..._.pick(currentConfig, ['chunk_size', 'ram_ratio', 'ram_size'])
          };
          setCache({
            enabled: true,
            mode: 'shared',
            cache_service_id: eligible[0].value,
            chunk_size: null,
            ram_ratio: null,
            ram_size: null
          });
          await notifyValuesChangeDelayed({
            extended_kv_cache: {
              mode: 'shared',
              cache_service_id: eligible[0].value
            }
          });
        }
      })
      .catch(() => {
        // cancellation rejects the underlying request; nothing to do
      });
  }, [kvCacheEnabled, sharedSupported, clusterId, backend]);

  // a backend that cannot share forces the in-process cache. Until the
  // backend options load, sharedSupported is indeterminate (false) — a
  // saved shared selection must not be rewritten on an empty list.
  useEffect(() => {
    if (
      flatBackendOptions.length > 0 &&
      kvCacheEnabled &&
      !sharedSupported &&
      kvCacheMode === 'shared'
    ) {
      setCache({
        mode: 'local',
        cache_service_id: null,
        ...localCacheFields()
      });
      // setFieldsValue does not fire onValuesChange: tell the parent
      // explicitly so compatibility checks see the fallback
      void notifyValuesChangeDelayed({
        extended_kv_cache: { mode: 'local', cache_service_id: null }
      });
    }
  }, [flatBackendOptions, kvCacheEnabled, sharedSupported, kvCacheMode]);

  const isLocal = (kvCacheMode ?? 'local') !== 'shared';

  // in-process first, then each compatible cache service as "name (provider)"
  const backendOptions = useMemo(() => {
    const inProcess = {
      label: intl.formatMessage({ id: 'models.form.kvCache.local' }),
      value: IN_PROCESS
    };
    if (!sharedSupported) {
      return [inProcess];
    }
    return [
      inProcess,
      ...cacheServiceOptions.map((option) => ({
        ...option,
        label: `${option.label} (${option.provider_name})`
      }))
    ];
  }, [sharedSupported, cacheServiceOptions, intl]);

  // A saved shared selection is an id; its name only exists in the fetched
  // service list. Two windows have the id but no option for it, and antd
  // renders an unmatched value as the raw value — so the field shows a bare
  // "4", which reads as a name the user picked rather than as "still
  // loading".
  //
  // The second window is the one that lasts long enough to be seen and
  // clicked: `sharedSupported` is false while `flatBackendOptions` is still
  // empty because the answer is *unknown*, not because sharing is
  // unsupported — the same indeterminacy the effect above guards the rewrite
  // against. While it is unknown the service list is never fetched, so
  // `loading` is false too and the field looks settled.
  const backendsResolved = flatBackendOptions.length > 0;
  const resolvingShared = !isLocal && (!backendsResolved || loading);
  // Withheld rather than shown unresolved: undefined leaves the placeholder,
  // and the value is display-only (the submitted mode and id live in the two
  // hidden fields above), so nothing is lost by not naming it yet.
  const backendValue = isLocal
    ? IN_PROCESS
    : backendOptions.some((option) => option.value === cacheServiceId)
      ? cacheServiceId
      : undefined;

  const backendOptionRender = (option: any) => {
    const { data } = option;
    return (
      <span className="flex-center gap-8">
        <span>{data.label}</span>
        {data.disabled && <span className="text-tertiary">[{data.state}]</span>}
      </span>
    );
  };

  return (
    <>
      <Form.Item<FormData>
        data-field="extended_kv_cache.enabled"
        name={path('extended_kv_cache', 'enabled')}
        valuePropName="checked"
        style={{ marginBottom: 8 }}
      >
        <CheckboxField
          description={intl.formatMessage({
            id: 'models.form.kvCache.tips2'
          })}
          disabled={!sharedSupported}
          onChange={handleEnableOnChange}
          label={intl.formatMessage({ id: 'models.form.extendedkvcache' })}
        ></CheckboxField>
      </Form.Item>
      {kvCacheEnabled && (
        <>
          {/* mode + service persist through these registered fields; the
              merged Select below drives them */}
          <Form.Item<FormData>
            name={path('extended_kv_cache', 'mode')}
            hidden
            getValueProps={(value) => ({ value: value ?? 'local' })}
          >
            <Input />
          </Form.Item>
          <Form.Item<FormData>
            name={path('extended_kv_cache', 'cache_service_id')}
            hidden
            getValueProps={(value) => ({ value: value ?? '' })}
          >
            <Input />
          </Form.Item>
          <Form.Item>
            <SealSelect
              loading={loading || resolvingShared}
              value={backendValue}
              options={backendOptions}
              optionRender={backendOptionRender}
              onChange={handleBackendChange}
              label={intl.formatMessage({ id: 'models.form.kvCache.backend' })}
              description={intl.formatMessage({
                id: sharedSupported
                  ? 'models.form.kvCache.service.tips'
                  : 'models.form.kvCache.shared.builtinBackends'
              })}
            ></SealSelect>
          </Form.Item>
          {isLocal && (
            <>
              <Form.Item<FormData>
                name={path('extended_kv_cache', 'ram_ratio')}
              >
                <CInputNumber
                  onChange={(value) => handleRamRatioChange(value, 'ram_ratio')}
                  label={intl.formatMessage({ id: 'models.form.ramRatio' })}
                  description={intl.formatMessage({
                    id: 'models.form.ramRatio.tips'
                  })}
                  min={0}
                  step={0.1}
                  precision={1}
                />
              </Form.Item>
              <Form.Item<FormData> name={path('extended_kv_cache', 'ram_size')}>
                <CInputNumber
                  onInput={(value) => handleRamSizeInput(value)}
                  label={intl.formatMessage({ id: 'models.form.ramSize' })}
                  description={intl.formatMessage(
                    {
                      id: 'models.form.ramSize.tips'
                    },
                    {
                      content: intl.formatMessage({
                        id: 'models.form.ramRatio'
                      })
                    }
                  )}
                  min={0}
                  step={1}
                  precision={0}
                />
              </Form.Item>
              <Form.Item<FormData>
                name={path('extended_kv_cache', 'chunk_size')}
              >
                <CInputNumber
                  onChange={(value) =>
                    handleRamRatioChange(value, 'chunk_size')
                  }
                  label={intl.formatMessage({ id: 'models.form.chunkSize' })}
                  description={intl.formatMessage({
                    id: 'models.form.chunkSize.tips'
                  })}
                  min={0}
                  step={1}
                />
              </Form.Item>
            </>
          )}
        </>
      )}
    </>
  );
};

export default KVCacheForm;
