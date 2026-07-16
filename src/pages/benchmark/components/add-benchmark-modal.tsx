import { PageActionType } from '@/config/types';
import useSubmitLock from '@/hooks/use-submit-lock';
import { FormDrawer } from '@gpustack/core-ui';
import _ from 'lodash';
import React, { useRef } from 'react';
import { DatasetValueMap } from '../config';
import { FormData, BenchmarkListItem as ListItem } from '../config/types';

import BenchmarkForm from '../forms';

type AddModalProps = {
  title: string;
  action: PageActionType;
  open: boolean;
  currentData?: ListItem; // Used when action is EDIT
  clusterList?: Global.BaseOption<number>[];
  profilesOptions?: Global.BaseOption<string>[];
  datasetList?: Global.BaseOption<number | string>[];
  onOk: (values: FormData) => void;
  onCancel: () => void;
};
const AddBenchmark: React.FC<AddModalProps> = ({
  title,
  action,
  open,
  currentData,
  clusterList,
  profilesOptions = [],
  datasetList = [],
  onOk,
  onCancel
}) => {
  const form = useRef<any>(null);
  const { loading, guard, run, release } = useSubmitLock();

  const handleSubmit = () => {
    guard(() => form.current?.submit());
  };

  const handleOk = async (data: FormData) => {
    // `dataset_worker_id` / `dataset_worker_name` are UI-only helpers (used by
    // the custom-dataset picker for co-location); never send them. `dataset_id`
    // only applies to the custom "Dataset" type.
    const payload: any = _.omit(data, [
      'dataset_worker_id',
      'dataset_worker_name'
    ]);
    if (payload.dataset_name !== DatasetValueMap.Custom) {
      delete payload.dataset_id;
    }
    await run(() => onOk(payload));
  };

  const handleCancel = () => {
    form.current?.resetFields();
    onCancel();
  };

  return (
    <FormDrawer
      title={title}
      open={open}
      onCancel={handleCancel}
      onSubmit={handleSubmit}
      width={600}
      loading={loading}
    >
      <BenchmarkForm
        ref={form}
        action={action}
        open={open}
        currentData={currentData}
        clusterList={clusterList}
        profilesOptions={profilesOptions}
        datasetList={datasetList}
        onFinish={handleOk}
        onFinishFailed={release}
      />
    </FormDrawer>
  );
};

export default AddBenchmark;
