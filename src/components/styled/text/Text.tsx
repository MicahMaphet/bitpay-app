import styled, {css} from 'styled-components/native';
import {StyledComponentBase} from 'styled-components';
import {Action} from '../../../styles/colors';

export const BaseText: StyledComponentBase<any, any> = styled.Text`
  font-family: 'Heebo';
`;

export const H3 = styled(BaseText)`
  font-size: 25px;
  font-style: normal;
  font-weight: 700;
  line-height: 34px;
  letter-spacing: 0;
`;

export const Paragraph = styled(BaseText)`
  font-size: 16px;
  font-style: normal;
  font-weight: 400;
  line-height: 25px;
  letter-spacing: 0;
`;

export const Disclaimer = styled(BaseText)`
  font-size: 14px;
  font-style: normal;
  font-weight: 400;
  line-height: 19px;
  letter-spacing: 0;
`;

interface TextAlignProps {
  align: 'center' | 'left' | 'end';
}

export const TextAlign = styled.Text<TextAlignProps>`
  ${props =>
    css`
      text-align: ${props.align};
    `}
`;

export const Link = styled(BaseText)`
  font-size: 16px;
  line-height: 25px;
  font-weight: 400;
  color: ${Action};
`;