import {
  BaseText,
  H7,
  H6,
  HeaderTitle,
  Link,
  H2,
} from '../../../components/styled/Text';
import React, {useCallback, useEffect, useLayoutEffect, useState} from 'react';
import {useNavigation, useRoute} from '@react-navigation/native';
import {RouteProp} from '@react-navigation/core';
import {WalletStackParamList} from '../WalletStack';
import {useAppDispatch} from '../../../utils/hooks';
import {
  buildTransactionDetails,
  EditTxNote,
  getDetailsTitle,
  IsMoved,
  IsMultisigEthInfo,
  IsReceived,
  IsSent,
  IsShared,
  NotZeroAmountEth,
} from '../../../store/wallet/effects/transactions/transactions';
import styled from 'styled-components/native';
import {
  ActionContainer,
  ActiveOpacity,
  Column,
  Hr,
  ImportTextInput,
  Row,
  ScreenGutter,
} from '../../../components/styled/Containers';
import {
  GetBlockExplorerUrl,
  IsCustomERCToken,
  IsERCToken,
} from '../../../store/wallet/utils/currency';
import moment from 'moment';
import {TouchableOpacity, View} from 'react-native';
import {TransactionIcons} from '../../../constants/TransactionIcons';
import Button from '../../../components/button/Button';
import {openUrlWithInAppBrowser} from '../../../store/app/app.effects';
import Clipboard from '@react-native-community/clipboard';
import MultipleOutputsTx from '../components/MultipleOutputsTx';
import {URL} from '../../../constants';
import {
  Black,
  LightBlack,
  NeutralSlate,
  SlateDark,
  White,
} from '../../../styles/colors';
import {KeyboardAwareScrollView} from 'react-native-keyboard-aware-scroll-view';
import ErrorSvg from '../../../../assets/img/error-round.svg';
import WarningSvg from '../../../../assets/img/warning.svg';
import InfoSvg from '../../../../assets/img/info-blue.svg';

const TxsDetailsContainer = styled.SafeAreaView`
  flex: 1;
`;

const ScrollView = styled(KeyboardAwareScrollView)`
  margin-top: 20px;
  padding: 0 ${ScreenGutter};
`;

const SubTitle = styled(BaseText)`
  font-size: 14px;
  font-weight: 300;
`;

export const DetailContainer = styled.View`
  min-height: 55px;
  justify-content: center;
  margin: 5px 0;
`;

const MemoContainer = styled.View`
  margin: 10px 0;
`;

const MemoHeader = styled(H7)`
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)}
  margin: 10px 0;
`;

export const DetailRow = styled(Row)`
  align-items: center;
  justify-content: space-between;
`;

const TransactionIdText = styled(H7)`
  max-width: 150px;
`;

export const DetailColumn = styled(Column)`
  align-items: flex-end;
`;

const TimelineContainer = styled.View`
  padding: 15px 0;
`;

const TimelineItem = styled.View`
  padding: 10px 0;
`;

const TimelineDescription = styled.View`
  margin: 0 10px;
`;

const TimelineBorderLeft = styled.View<{isFirst: boolean; isLast: boolean}>`
  background-color: ${({theme: {dark}}) => (dark ? LightBlack : NeutralSlate)};
  position: absolute;
  top: ${({isFirst}) => (isFirst ? '45px' : 0)};
  bottom: ${({isLast}) => (isLast ? '15px' : 0)};
  left: 18px;
  width: 1px;
  z-index: -1;
`;
const TimelineTime = styled(H7)`
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
`;

const IconBackground = styled.View`
  height: 35px;
  width: 35px;
  border-radius: 50px;
  align-items: center;
  justify-content: center;
  background-color: ${({theme: {dark}}) => (dark ? Black : White)};
`;

const NumberIcon = styled(IconBackground)`
  background-color: ${({theme: {dark}}) => (dark ? LightBlack : NeutralSlate)};
`;

const InfoContainer = styled.View`
  background-color: ${({theme: {dark}}) => (dark ? LightBlack : NeutralSlate)};
  border-radius: 10px;
  margin: 15px 0;
  padding: 10px;
`;

const Info = styled.View`
  margin-left: 10px;
`;

const DetailLink = styled(Link)`
  font-size: 16px;
  font-style: normal;
  font-weight: 500;
`;

const InputText = styled(ImportTextInput)`
  height: 75px;
`

const TxsDetailsLabel = ({
  title,
  description,
  type,
  link,
}: {
  title: string;
  description: string;
  type: string;
  link?: {onPress: () => void; text: string};
}) => {
  return (
    <InfoContainer>
      <DetailRow>
        {type === 'error' && <ErrorSvg width={20} height={20} />}
        {type === 'warning' && <WarningSvg width={20} height={20} />}
        {type === 'info' && <InfoSvg width={20} height={20} />}

        <Info>
          <H7 medium={true}>{title}</H7>
          <H7>{description}</H7>
          {link ? (
            <ActionContainer>
              <TouchableOpacity
                activeOpacity={ActiveOpacity}
                onPress={link?.onPress}>
                <Link>{link?.text}</Link>
              </TouchableOpacity>
            </ActionContainer>
          ) : null}
        </Info>
      </DetailRow>
    </InfoContainer>
  );
};

const TransactionDetails = () => {
  const {
    params: {transaction, wallet},
  } = useRoute<RouteProp<WalletStackParamList, 'TransactionDetails'>>();

  const dispatch = useAppDispatch();
  const navigation = useNavigation();
  const [txs, setTxs] = useState<any>();
  const [memo, setMemo] = useState<string>();
  const title = getDetailsTitle(transaction, wallet);
  let {
    currencyAbbreviation,
    credentials: {network},
  } = wallet;
  currencyAbbreviation = currencyAbbreviation.toLowerCase();
  const isTestnet = network !== 'testnet';

  useLayoutEffect(() => {
    navigation.setOptions({
      gestureEnabled: false,
      headerTitle: () => <HeaderTitle>{title}</HeaderTitle>,
    });
  }, [title]);

  const init = async () => {
    try {
      const _transaction = await dispatch(
        buildTransactionDetails({transaction, wallet}),
      );
      setTxs(_transaction);
      setMemo(_transaction.detailsMemo);
    } catch (e) {
      console.log(e);
    }
  };

  useEffect(() => {
    init();
  }, []);

  const speedUp = () => {
    //  TODO: speed up transaction
  };

  const getFormattedDate = (time: number) => {
    return moment(time).format('MM/DD/YYYY hh:mm a');
  };

  const copyText = (text: string) => {
    Clipboard.setString(text);
  };

  const goToBlockchain = () => {
    let url = GetBlockExplorerUrl(currencyAbbreviation, network);
    switch (currencyAbbreviation) {
      case 'doge':
        url =
          network === 'livenet'
            ? `https://${url}dogecoin/transaction/${txs.txid}`
            : `https://${url}tx/DOGETEST/${txs.txid}`;
        break;
      default:
        url = `https://${url}tx/${txs.txid}`;
    }

    dispatch(openUrlWithInAppBrowser(url));
  };

  const saveMemo = async () => {
    if (memo) {
      try {
        await EditTxNote(wallet, {txid: txs.txid, body: memo});
        transaction.note = {
          body: memo,
        };
        transaction.uiDescription = memo;
      } catch (e) {
        console.log('Edit note err: ', e);
      }
    }
  };

  return (
    <TxsDetailsContainer>
      {txs ? (
        <ScrollView>
          <>
            {NotZeroAmountEth(txs.amount, currencyAbbreviation) ? (
              <H2 medium={true}>{txs.amountStr}</H2>
            ) : null}

            {!IsCustomERCToken(currencyAbbreviation) ? (
              <SubTitle>
                {!txs.fiatRateStr
                  ? '...'
                  : isTestnet
                  ? 'Test Only - No Value'
                  : txs.fiatRateStr}
              </SubTitle>
            ) : null}

            {!NotZeroAmountEth(txs.amount, currencyAbbreviation) ? (
              <SubTitle>Interaction with contract</SubTitle>
            ) : null}
          </>

          {(currencyAbbreviation === 'eth' ||
            IsERCToken(currencyAbbreviation)) &&
          txs.error ? (
            <TxsDetailsLabel
              type={'error'}
              title={'Waning!'}
              description={`Error encountered during contract execution (${txs.error})`}
            />
          ) : null}

          {currencyAbbreviation === 'btc' &&
          IsReceived(txs.action) &&
          txs.lowAmount ? (
            <TxsDetailsLabel
              type={'warning'}
              title={'Amount Too Low To Spend'}
              description={
                'This transaction amount is too small compared to current Bitcoin network fees.'
              }
              link={{
                text: 'Learn More',
                onPress: () => {
                  dispatch(openUrlWithInAppBrowser(URL.HELP_LOW_AMOUNT));
                },
              }}
            />
          ) : null}

          {currencyAbbreviation === 'btc' &&
          txs.isRBF &&
          (IsSent(txs.action) || IsMoved(txs.action)) ? (
            <TxsDetailsLabel
              type={'info'}
              title={'RBF transaction'}
              description={
                'This transaction can be accelerated using a higher fee.'
              }
              link={{
                text: 'Speed Up',
                onPress: speedUp,
              }}
            />
          ) : null}

          <DetailContainer>
            <H6>DETAILS</H6>
          </DetailContainer>
          <Hr />

          {txs.feeStr && !IsReceived(txs.action) ? (
            <>
              <DetailContainer>
                <DetailRow>
                  <H7>Miner fee</H7>
                  <DetailColumn>
                    <H6>{txs.feeStr}</H6>
                    {!isTestnet ? (
                      <H7>
                        {txs.feeFiatStr}{' '}
                        {txs.feeRateStr
                          ? '(' + txs.feeRateStr + ' of total amount)'
                          : null}
                      </H7>
                    ) : null}
                    {isTestnet ? (
                      <SubTitle>Test Only - No Value</SubTitle>
                    ) : null}
                  </DetailColumn>

                  {IsReceived(txs.action) && txs.lowFee ? (
                    <TxsDetailsLabel
                      type={'error'}
                      title={'Low Fee'}
                      description={
                        'This transaction could take a long time to confirm or could be dropped due to the low fees set by the sender.'
                      }
                    />
                  ) : null}
                </DetailRow>
              </DetailContainer>
              <Hr />
            </>
          ) : null}

          {IsSent(txs.action) ? <MultipleOutputsTx tx={txs} /> : null}

          {txs.creatorName && IsShared(wallet) ? (
            <>
              <DetailContainer>
                <DetailRow>
                  <H7>Created by</H7>

                  <H7>{txs.creatorName}</H7>
                </DetailRow>
              </DetailContainer>
              <Hr />
            </>
          ) : null}

          <DetailContainer>
            <DetailRow>
              <H7>Date</H7>
              <H7>
                {getFormattedDate((txs.ts || txs.createdOn || txs.time) * 1000)}
              </H7>
            </DetailRow>
          </DetailContainer>

          <Hr />

          {txs.nonce ? (
            <>
              <DetailContainer>
                <DetailRow>
                  <H7>Nonce</H7>
                  <H7>{txs.nonce}</H7>
                </DetailRow>
              </DetailContainer>
              <Hr />
            </>
          ) : null}

          <DetailContainer>
            <DetailRow>
              <H7>Confirmations</H7>
              <DetailColumn>
                {!txs.confirmations ? <TouchableOpacity activeOpacity={ActiveOpacity} onPress={() => {
                  dispatch(openUrlWithInAppBrowser(URL.HELP_TXS_UNCONFIRMED))
                }}>
                  <DetailLink>
                   Unconfirmed?
                  </DetailLink>
                </TouchableOpacity> : null}
                {txs.feeRate ? (
                  <SubTitle>Fee rate: {txs.feeRate}</SubTitle>
                ) : null}
                {!!txs.confirmations && !txs.safeConfirmed ? (
                  <H7>{txs.conformations}</H7>
                ) : null}
                {txs.safeConfirmed ? <H7>{txs.safeConfirmed}</H7> : null}
              </DetailColumn>
            </DetailRow>
          </DetailContainer>

          <Hr />

          <MemoContainer>
            <MemoHeader>MEMO</MemoHeader>

            <InputText
              multiline
              numberOfLines={3}
              value={memo}
              onChangeText={text => setMemo(text)}
              onEndEditing={saveMemo}
            />
          </MemoContainer>

          <Hr />

          <DetailContainer>
            <DetailRow>
              <H7>Transaction ID</H7>

              <TouchableOpacity onPress={() => copyText(txs.txid)}>
                <TransactionIdText numberOfLines={1} ellipsizeMode={'tail'}>
                  {txs.txid}
                </TransactionIdText>
              </TouchableOpacity>
            </DetailRow>
          </DetailContainer>

          <Hr />

          {/*  TODO: Add Notify unconfirmed transaction  row*/}

          {!IsMultisigEthInfo(wallet) && txs.actionsList?.length ? (
            <>
              <TimelineContainer>
                <H7>Timeline</H7>

                {txs.actionsList.map((a: any, index: number) => {
                  return (
                    <DetailRow key={index}>
                      <TimelineBorderLeft
                        isFirst={index === 0}
                        isLast={index === txs.actionsList.length - 1}
                      />
                      <TimelineItem>
                        <DetailRow>
                          {a.type === 'rejected' ? (
                            <IconBackground>
                              <ErrorSvg width={35} height={35} />
                            </IconBackground>
                          ) : null}

                          {a.type === 'broadcasted' ? (
                            <IconBackground>
                              {TransactionIcons.broadcast}
                            </IconBackground>
                          ) : null}

                          {a.type !== 'broadcasted' && a.type !== 'rejected' ? (
                            <NumberIcon>
                              <H7>{txs.actionsList.length - index}</H7>
                            </NumberIcon>
                          ) : null}

                          <TimelineDescription>
                            <H7>{a.description}</H7>
                            {a.by ? <H7>{a.by}</H7> : null}
                          </TimelineDescription>
                        </DetailRow>
                      </TimelineItem>

                      <TimelineTime>
                        {getFormattedDate(a.time * 1000)}
                      </TimelineTime>
                    </DetailRow>
                  );
                })}
              </TimelineContainer>

              <Hr />
            </>
          ) : null}

          <ActionContainer>
            <Button buttonStyle={'secondary'} onPress={goToBlockchain}>
              View On Blockchain
            </Button>
          </ActionContainer>
        </ScrollView>
      ) : null}
    </TxsDetailsContainer>
  );
};

export default TransactionDetails;
