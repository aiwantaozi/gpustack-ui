import { IconFont } from '@gpustack/core-ui';
import { useIntl } from '@umijs/max';
import { Tabs, TabsProps } from 'antd';
import React, { useState } from 'react';
import { BenchmarkListItem } from '../config/types';
import Configuration from './configuration';
import Environment from './environment';
import Summary from './summary';

const Details: React.FC<{
  tabBarExtraContent?: {
    right: React.ReactNode;
  };
  // Accepted by the legacy drawer (detail-modal); the page route uses context.
  currentData?: BenchmarkListItem;
}> = ({ tabBarExtraContent }) => {
  const intl = useIntl();
  const [activeKey, setActiveKey] = useState('summary');

  const items: TabsProps['items'] = [
    {
      key: 'summary',
      label: intl.formatMessage({ id: 'benchmark.detail.summary.title' }),
      children: <Summary />,
      icon: <IconFont type="icon-basic" />
    },
    {
      key: 'configuration',
      label: intl.formatMessage({ id: 'benchmark.detail.configure' }),
      children: <Configuration />,
      icon: <IconFont type="icon-settings" />
    },
    {
      key: 'environment',
      label: intl.formatMessage({ id: 'benchmark.detail.environment.title' }),
      children: <Environment />,
      icon: <IconFont type="icon-server02" />
    }
  ];

  const handleChangeTab = (key: string) => {
    setActiveKey(key);
  };

  return (
    <Tabs
      size="small"
      activeKey={activeKey}
      onChange={handleChangeTab}
      items={items}
      type="card"
      tabBarExtraContent={tabBarExtraContent}
    />
  );
};

export default Details;
