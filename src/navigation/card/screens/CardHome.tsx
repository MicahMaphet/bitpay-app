import {StackScreenProps} from '@react-navigation/stack';
import React, {useMemo} from 'react';
import {useSelector} from 'react-redux';
import {RootState} from '../../../store';
import {CardStackParamList} from '../CardStack';
import CardDashboard from '../components/CardDashboard';
import CardIntro from '../components/CardIntro';

export type CardHomeScreenParamList =
  | {
      id: string | undefined | null;
    }
  | undefined;
type CardHomeScreenProps = StackScreenProps<CardStackParamList, 'Home'>;

const CardHome: React.FC<CardHomeScreenProps> = ({route}) => {
  const {params} = route;
  const isDashboardEnabled = useSelector<RootState, boolean>(
    ({APP, BITPAY_ID, CARD}) => {
      const isPaired = !!BITPAY_ID.apiToken[APP.network];
      const hasCards = CARD.cards[APP.network].length > 0;

      return isPaired && hasCards;
    },
  );

  const DashboardOrIntro = useMemo(() => {
    return isDashboardEnabled ? CardDashboard : CardIntro;
  }, [isDashboardEnabled]);

  return (
    <>
      <DashboardOrIntro id={params?.id} />
    </>
  );
};

export default CardHome;
