import DropdownButtons from '@/components/drop-down-buttons';
import BaseSelect from '@/components/seal-form/base/select';
import { useIntl, useLocation, useNavigate, useSearchParams } from '@umijs/max';
import { ExportOutlined, PauseCircleOutlined, RightOutlined } from '@ant-design/icons';
import { Modal, Typography, message } from 'antd';
import React, { useEffect, useMemo } from 'react';
import BenchmarkDetailContext from '../benchmark/config/detail-context';
import DetailContent from './components/detail-content';
import {
  buildMockEvaluationDetailFromRecord,
  getMockEvaluationDetail,
  mockEvaluationList
} from './config/mock';
import { EvaluationRecord } from './config/types';

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
  }
];

const EvaluationDetails: React.FC = () => {
  const intl = useIntl();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const id = searchParams.get('id') || '';
  const name = searchParams.get('name') || '';

  const stateRecord = (location.state as { record?: EvaluationRecord } | undefined)
    ?.record;

  const detail = useMemo(
    () => getMockEvaluationDetail(id) || (stateRecord ? buildMockEvaluationDetailFromRecord(stateRecord) : undefined),
    [id, stateRecord]
  );

  const listOptions = useMemo(
    () =>
      mockEvaluationList.map((item) => ({
        label: item.name,
        value: item.id
      })),
    []
  );

  const handleChange = (_value: string, option: any) => {
    navigate(`/models/evaluation/detail?id=${option.value}&name=${option.label}`, {
      replace: true
    });
  };

  const handleAction = (action: string) => {
    if (!detail) {
      return;
    }
    if (action === 'logs') {
      Modal.info({
        title: `${detail.name} Logs`,
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
              {`[10:00:01] Evaluation started for ${detail.detailData.model_instance_name}
[10:12:18] Running suite ${stateRecord?.suiteId || 'general'}
[10:48:44] Collecting summary metrics
[12:00:00] Placeholder detail logs rendered from local mock data`}
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
      message.success(intl.formatMessage({ id: 'evaluation.placeholder.stop' }));
    }
  };

  useEffect(() => {
    document.title = `${intl.formatMessage({ id: 'evaluation.title' })} - ${
      detail?.name || name
    }`;
  }, [detail?.name, intl, name]);

  if (!detail) {
    return null;
  }

  return (
    <>
      <BenchmarkDetailContext.Provider
        value={{
          detailData: detail.detailData,
          clusterList: [],
          loading: false,
          id: Number(id.replace(/\D/g, '')) || 0,
          profilesOptions: [
            {
              label: 'throughput-balanced',
              value: 'throughput-balanced'
            }
          ]
        }}
      >
        <DetailContent
          detail={detail}
          tabBarExtraContent={{
            right: (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <BaseSelect
                  size="small"
                  variant="borderless"
                  options={listOptions}
                  value={detail?.id || id}
                  style={{ minWidth: 140 }}
                  popupMatchSelectWidth={false}
                  onChange={handleChange}
                />
                <DropdownButtons
                  items={actionItems}
                  onSelect={(value) => handleAction(value)}
                />
              </div>
            )
          }}
        />
      </BenchmarkDetailContext.Provider>
    </>
  );
};

export default EvaluationDetails;
