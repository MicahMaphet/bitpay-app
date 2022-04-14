import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {StackScreenProps} from '@react-navigation/stack';
import {
  dismissOnGoingProcessModal,
  showBottomNotificationModal,
  showOnGoingProcessModal,
} from '../../../store/app/app.actions';
import {CoinbaseStackParamList} from '../CoinbaseStack';
import CoinbaseDashboard from '../components/CoinbaseDashboard';
import CoinbaseIntro from '../components/CoinbaseIntro';
import {
  coinbaseParseErrorToString,
  coinbaseLinkAccount,
} from '../../../store/coinbase';
import {useAppDispatch, useAppSelector} from '../../../utils/hooks';
import {CoinbaseErrorsProps} from '../../../api/coinbase/coinbase.types';
import {OnGoingProcessMessages} from '../../../components/modal/ongoing-process/OngoingProcess';
import {COINBASE_ENV} from '../../../api/coinbase/coinbase.constants';

export type CoinbaseRootScreenParamList =
  | {
      code?: string;
      state?: string;
    }
  | undefined;

type CoinbaseRootScreenProps = StackScreenProps<
  CoinbaseStackParamList,
  'CoinbaseRoot'
>;

const CoinbaseRoot: React.FC<CoinbaseRootScreenProps> = ({route}) => {
  const dispatch = useAppDispatch();

  const tokenError = useAppSelector(
    ({COINBASE}) => COINBASE.getAccessTokenError,
  );
  const tokenStatus = useAppSelector(
    ({COINBASE}) => COINBASE.getAccessTokenStatus,
  );
  const token = useAppSelector(({COINBASE}) => COINBASE.token[COINBASE_ENV]);
  const [isDashboardEnabled, setIsDashboardEnabled] = useState(!!token);

  let {code, state} = route.params || {};

  const showError = useCallback(
    (error: CoinbaseErrorsProps) => {
      const errMsg = coinbaseParseErrorToString(error);
      dispatch(
        showBottomNotificationModal({
          type: 'error',
          title: 'Coinbase Error',
          message: errMsg,
          enableBackdropDismiss: true,
          actions: [
            {
              text: 'OK',
              action: () => {},
              primary: true,
            },
          ],
        }),
      );
    },
    [dispatch],
  );

  useEffect(() => {
    if (!token && code && state) {
      dispatch(coinbaseLinkAccount(code, state));
      dispatch(
        showOnGoingProcessModal(OnGoingProcessMessages.CONNECTING_COINBASE),
      );
    }

    if (token || tokenStatus === 'success') {
      dispatch(dismissOnGoingProcessModal());
      setIsDashboardEnabled(true);
    }

    if (tokenError) {
      dispatch(dismissOnGoingProcessModal());
      showError(tokenError);
      setIsDashboardEnabled(false);
    }
  }, [dispatch, code, state, token, tokenError, tokenStatus, showError]);

  const DashboardOrIntro = useMemo(() => {
    return isDashboardEnabled ? CoinbaseDashboard : CoinbaseIntro;
  }, [isDashboardEnabled]);

  return <DashboardOrIntro />;
};

export default CoinbaseRoot;