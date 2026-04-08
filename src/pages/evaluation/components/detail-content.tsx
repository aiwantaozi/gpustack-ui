import IconFont from '@/components/icon-font';
import { useIntl } from '@umijs/max';
import { Tabs, TabsProps } from 'antd';
import React, { useState } from 'react';
import BenchmarkEnvironment from '../../benchmark/components/environment';
import { EvaluationDetailData } from '../config/types';
import Summary from './summary';

const DetailContent: React.FC<{
  detail: EvaluationDetailData;
  tabBarExtraContent?: {
    right?: React.ReactNode;
  };
}> = ({ detail, tabBarExtraContent }) => {
  const intl = useIntl();
  const [activeKey, setActiveKey] = useState('summary');

  const items: TabsProps['items'] = [
    {
      key: 'summary',
      label: intl.formatMessage({ id: 'benchmark.detail.summary.title' }),
      icon: <IconFont type="icon-basic" />,
      children: <Summary meta={detail.meta} results={detail.results} />
    },
    {
      key: 'environment',
      label: intl.formatMessage({ id: 'benchmark.detail.environment.title' }),
      icon: <IconFont type="icon-server02" />,
      children: <BenchmarkEnvironment />
    }
  ];

  return (
    <Tabs
      size="small"
      type="card"
      activeKey={activeKey}
      onChange={setActiveKey}
      items={items}
      tabBarExtraContent={tabBarExtraContent}
    />
  );
};

export default DetailContent;
