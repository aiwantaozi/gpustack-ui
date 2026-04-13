import styled from 'styled-components';

const Wrapper = styled.div`
  border-radius: var(--border-radius-small);
  background-color: var(--ant-color-bg-container);
  box-shadow: none;
  padding: 10px 16px;
  border: 1px solid var(--ant-color-border);
`;

const CardWrapper = (props: any) => {
  const { children, style, className } = props;
  return (
    <Wrapper className={className} style={{ ...style }}>
      {children}
    </Wrapper>
  );
};

export default CardWrapper;
