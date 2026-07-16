import useRequestToken from '@/hooks/use-request-token';
import TitleWrapper from '@/pages/llmodels/components/title-wrapper';
import '@/pages/llmodels/style/model-card.less';
import {
  DownOutlined,
  FileMarkdownOutlined,
  RightOutlined
} from '@ant-design/icons';
import { IconFont, SimpleOverlay, ThemeTag } from '@gpustack/core-ui';
import { MarkdownViewer } from '@gpustack/core-ui/markdown';
import { useIntl } from '@umijs/max';
import { Button, Empty, Spin, Tooltip } from 'antd';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import {
  downloadHuggingfaceDatasetFile,
  queryHuggingfaceDatasetDetail,
  queryModelScopeDatasetDetail
} from '../apis';
import { datasetSourceMap } from '../config';

const MkdTitle = styled.span`
  cursor: pointer;
  background-color: var(--ant-color-fill-tertiary);
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  height: 36px;
`;

// Collapsed README row (mirrors the model card): a `README.md` bar with a
// chevron that expands the rendered README. Starts collapsed.
const MarkDownTitle: React.FC<{
  expanded: boolean;
  loading: boolean;
  onToggle: () => void;
}> = ({ expanded, loading, onToggle }) => {
  return (
    <MkdTitle onClick={onToggle}>
      <span>
        <FileMarkdownOutlined className="m-r-2 text-tertiary" /> README.md
      </span>
      <span>
        {expanded ? (
          <DownOutlined />
        ) : loading ? (
          <Spin spinning={true} size="small"></Spin>
        ) : (
          <RightOutlined />
        )}
      </span>
    </MkdTitle>
  );
};

// Middle-column card: selected dataset overview (title + link-out, tag chips,
// and a collapsed-by-default README) for BOTH HuggingFace and ModelScope.
// Mirrors the model download ModelCard.
const DatasetCard: React.FC<{
  selectedDataset: any;
  modelSource: string;
}> = (props) => {
  const { selectedDataset, modelSource } = props;
  const intl = useIntl();
  const requestSource = useRequestToken();
  const [cardData, setCardData] = useState<any>(null);
  const [readmeText, setReadmeText] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<boolean>(false);
  const requestToken = useRef<any>(null);
  const axiosTokenRef = useRef<any>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const isHF = modelSource === datasetSourceMap.huggingface_value;
  const tags = selectedDataset?.tags?.slice?.(0, 6) || [];

  const removeMetadata = useCallback((str: string) => {
    const indexes = [];
    let index = str.indexOf('---');
    while (index !== -1) {
      indexes.push(index);
      if (indexes.length >= 2) break;
      index = str.indexOf('---', index + 1);
    }
    if (indexes.length >= 2) {
      return str.slice(indexes[1] + 3);
    }
    return str;
  }, []);

  const loadReadme = useCallback(async (repo: string) => {
    try {
      axiosTokenRef.current?.abort?.();
      axiosTokenRef.current = new AbortController();
      const res = await downloadHuggingfaceDatasetFile(
        { repo, revision: 'main', path: 'README.md' },
        { signal: axiosTokenRef.current.signal }
      );
      return res || '';
    } catch (error) {
      return '';
    }
  }, []);

  const getHuggingfaceDetail = async () => {
    const [detail, readme] = await Promise.all([
      queryHuggingfaceDatasetDetail(
        { repo: selectedDataset.name },
        { token: requestToken.current.token }
      ),
      loadReadme(selectedDataset.name)
    ]);
    setCardData(detail);
    setReadmeText(removeMetadata(readme));
  };

  const getModelScopeDetail = async () => {
    // README may already be on the search row; otherwise fetch the detail.
    if (selectedDataset.readmeContent) {
      setCardData({ id: selectedDataset.name, name: selectedDataset.name });
      setReadmeText(selectedDataset.readmeContent);
      return;
    }
    const data: any = await queryModelScopeDatasetDetail(
      { name: selectedDataset.name },
      { token: requestToken.current.token }
    );
    setCardData({ ...data?.Data, id: selectedDataset.name });
    setReadmeText(data?.Data?.ReadmeContent || data?.Data?.ReadMeContent || '');
  };

  const getDatasetDetail = async () => {
    if (!selectedDataset?.name) {
      setCardData(null);
      setReadmeText(null);
      return;
    }
    requestToken.current?.cancel?.();
    requestToken.current = requestSource();
    setLoading(true);
    try {
      if (isHF) {
        await getHuggingfaceDetail();
      } else {
        await getModelScopeDetail();
      }
    } catch (error) {
      setCardData(null);
      setReadmeText(null);
    }
    setLoading(false);
  };

  const generateImgLink = useCallback(
    (imgSrc: string) => {
      if (!imgSrc) return '';
      if (isHF) {
        return `https://huggingface.co/datasets/${cardData?.id}/resolve/main/${imgSrc}`;
      }
      return `https://modelscope.cn/api/v1/datasets/${cardData?.id}/repo?Revision=master&FilePath=${imgSrc}`;
    },
    [cardData?.id, isHF]
  );

  useEffect(() => {
    // reset the README disclosure whenever the selected dataset changes.
    setExpanded(false);
    if (!selectedDataset?.name) {
      setCardData(null);
      setReadmeText(null);
      return;
    }
    getDatasetDetail();
    return () => {
      requestToken.current?.cancel?.();
      axiosTokenRef.current?.abort?.();
    };
  }, [selectedDataset?.name]);

  return (
    <>
      <TitleWrapper style={{ paddingInline: 24 }}>
        <div className="title">{selectedDataset?.name}</div>
        {selectedDataset?.name && (
          <Tooltip
            title={intl.formatMessage({
              id: isHF ? 'models.viewin.hf' : 'models.viewin.modelscope'
            })}
          >
            <Button
              size="small"
              type="link"
              target="_blank"
              href={
                isHF
                  ? `https://huggingface.co/datasets/${selectedDataset?.name}`
                  : `https://modelscope.cn/datasets/${selectedDataset?.name}`
              }
            >
              <IconFont
                type="icon-external-link"
                className="font-size-14"
              ></IconFont>
            </Button>
          </Tooltip>
        )}
      </TitleWrapper>
      <div className="card-wrapper">
        {selectedDataset?.name ? (
          <div className="model-card-wrap">
            {!!tags.length && (
              <div className="flex-center flex-wrap gap-8">
                {tags.map((tag: string, index: number) => (
                  <ThemeTag
                    className="tag-item"
                    color="geekblue"
                    key={index}
                    opacity={0.65}
                  >
                    {tag}
                  </ThemeTag>
                ))}
              </div>
            )}
            {readmeText && (
              <div
                style={{ borderRadius: 4, marginTop: 16, overflow: 'hidden' }}
              >
                <MarkDownTitle
                  expanded={expanded}
                  loading={loading}
                  onToggle={() => setExpanded((v) => !v)}
                ></MarkDownTitle>
                <Spin spinning={loading && expanded} size="middle">
                  <SimpleOverlay
                    style={{
                      paddingTop: expanded ? 12 : 0,
                      maxHeight: expanded ? 300 : 0
                    }}
                  >
                    <MarkdownViewer
                      generateImgLink={generateImgLink}
                      content={readmeText}
                      theme="light"
                    ></MarkdownViewer>
                  </SimpleOverlay>
                </Spin>
              </div>
            )}
          </div>
        ) : (
          !loading && (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              style={{ marginBlock: 20 }}
            ></Empty>
          )
        )}
      </div>
    </>
  );
};

export default DatasetCard;
