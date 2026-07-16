import '@/pages/llmodels/style/hf-model-file.less';
import { convertFileSize } from '@/utils';
import { ThemeTag } from '@gpustack/core-ui';
import classNames from 'classnames';
import _ from 'lodash';
import React from 'react';
import { getDatasetFileFormat } from '../config';

interface DatasetFileItemProps {
  data: Record<string, any>;
  active: boolean;
  onSelect: (item: any) => void;
}

// Mirrors the model download GGUF file card, but shows the dataset file format
// (jsonl / parquet / …) instead of the quantization tag.
const DatasetFileItem: React.FC<DatasetFileItemProps> = (props) => {
  const { data: item, active, onSelect } = props;
  const format = getDatasetFileFormat(item.path);

  return (
    <div
      className={classNames('hf-model-file', { active })}
      onClick={() => onSelect(item)}
    >
      <div className="title">{item.path}</div>
      <div className="tags flex-between">
        <span className="flex-center gap-8">
          <ThemeTag
            opacity={0.7}
            className="tag-item"
            color="green"
            style={{ marginRight: 0 }}
          >
            {convertFileSize(item.size)}
          </ThemeTag>
          {format && (
            <ThemeTag
              opacity={0.7}
              className="tag-item"
              color="cyan"
              style={{ marginRight: 0 }}
            >
              {_.toUpper(format)}
            </ThemeTag>
          )}
        </span>
      </div>
    </div>
  );
};

export default DatasetFileItem;
