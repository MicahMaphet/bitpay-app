import AsyncStorage from '@react-native-async-storage/async-storage';
import {Action, applyMiddleware, combineReducers, createStore} from 'redux';
import {composeWithDevTools} from 'redux-devtools-extension';
import {createLogger} from 'redux-logger'; // https://github.com/LogRocket/redux-logger
import {createTransform, persistStore, persistReducer} from 'redux-persist'; // https://github.com/rt2zz/redux-persist
import autoMergeLevel2 from 'redux-persist/lib/stateReconciler/autoMergeLevel2';
import thunkMiddleware, {ThunkAction} from 'redux-thunk'; // https://github.com/reduxjs/redux-thunk
import {Selector} from 'reselect';
import {
  bindWalletClient,
  bindWalletKeys,
  transformContacts,
} from './transforms/transforms';

import {
  appReducer,
  appReduxPersistBlackList,
  AppState,
} from './app/app.reducer';
import {AppActionType} from './app/app.types';
import {
  locationReducer,
  locationReduxPersistBlackList,
  LocationState,
} from './location/location.reducer';
import {LocationActionType} from './location/location.types';
import {
  logReducer,
  logReduxPersistBlackList,
  LogState,
} from './log/log.reducer';
import {LogActionType} from './log/log.types';
import {
  walletReducer,
  walletReduxPersistBlackList,
  WalletState,
} from './wallet/wallet.reducer';
import {WalletActionType} from './wallet/wallet.types';
import {
  contactReducer,
  ContactReduxPersistBlackList,
  ContactState,
} from './contact/contact.reducer';
import {ContactActionType} from './contact/contact.types';
import {
  rateReducer,
  rateReduxPersistBlackList,
  RateState,
} from './rate/rate.reducer';
import {RateActionType} from './rate/rate.types';
import {walletBackupReducer} from './wallet-backup/wallet-backup.reducer';
import {WalletBackupActionType} from './wallet-backup/wallet-backup.types';
import {
  walletConnectV2Reducer,
  walletConnectV2ReduxPersistBlackList,
  WalletConnectV2State,
} from './wallet-connect-v2/wallet-connect-v2.reducer';
import {WalletConnectV2ActionType} from './wallet-connect-v2/wallet-connect-v2.types';
import createSensitiveStorage from 'redux-persist-sensitive-storage';

const sensitiveStorage = createSensitiveStorage({
  keychainService: 'com.bitpay.wallet.macos',
  sharedPreferencesName: 'BitPayWalletSharedPrefs',
  encrypt: true,
});

const basePersistConfig = {
  storage: AsyncStorage,
  stateReconciler: autoMergeLevel2,
};

const reducerPersistBlackLists = {
  APP: appReduxPersistBlackList,
  LOCATION: locationReduxPersistBlackList,
  LOG: logReduxPersistBlackList,
  WALLET_BACKUP: walletReduxPersistBlackList,
  WALLET: walletReduxPersistBlackList,
  RATE: rateReduxPersistBlackList,
  CONTACT: ContactReduxPersistBlackList,
  WALLET_CONNECT_V2: walletConnectV2ReduxPersistBlackList,
};

/*
 * Create a rootReducer using combineReducers
 * Set persist config for each and import blacklist to omit values
 * redux-persist will automatically persist and rehydrate store from async storage during app init
 * */

const reducers = {
  APP: persistReducer<AppState, AppActionType>(
    {
      ...basePersistConfig,
      key: 'APP',
      blacklist: appReduxPersistBlackList,
    },
    appReducer,
  ),
  LOCATION: persistReducer<LocationState, LocationActionType>(
    {
      ...basePersistConfig,
      key: 'LOCATION',
      blacklist: locationReduxPersistBlackList,
    },
    locationReducer,
  ),
  LOG: persistReducer<LogState, LogActionType>(
    {
      ...basePersistConfig,
      key: 'LOG',
      blacklist: logReduxPersistBlackList,
    },
    logReducer,
  ),
  WALLET: persistReducer<WalletState, WalletActionType>(
    {
      storage: sensitiveStorage,
      transforms: [bindWalletClient, bindWalletKeys],
      key: 'WALLET',
      blacklist: walletReduxPersistBlackList,
    },
    walletReducer,
  ),
  WALLET_BACKUP: persistReducer<WalletState, WalletBackupActionType>(
    {
      storage: sensitiveStorage,
      key: 'WALLET_BACKUP',
      blacklist: walletReduxPersistBlackList,
    },
    walletBackupReducer,
  ),
  RATE: persistReducer<RateState, RateActionType>(
    {
      ...basePersistConfig,
      key: 'RATE',
      blacklist: rateReduxPersistBlackList,
    },
    rateReducer,
  ),
  CONTACT: persistReducer<ContactState, ContactActionType>(
    {
      ...basePersistConfig,
      key: 'CONTACT',
      transforms: [transformContacts],
      blacklist: ContactReduxPersistBlackList,
    },
    contactReducer,
  ),
  WALLET_CONNECT_V2: persistReducer<
    WalletConnectV2State,
    WalletConnectV2ActionType
  >(
    {
      ...basePersistConfig,
      key: 'WALLET_CONNECT_V2',
      blacklist: walletConnectV2ReduxPersistBlackList,
    },
    walletConnectV2Reducer,
  ),
};

const rootReducer = combineReducers(reducers);

const logger = createLogger({
  predicate: (_getState, action) =>
    ![
      'LOG/ADD_LOG',
      'APP/SET_CURRENT_ROUTE',
      'persist/REHYDRATE',
      'persist/PERSIST',
    ].includes(action.type),
  stateTransformer: state => {
    return {
      ...state,
      WALLET: {
        ...state.WALLET,
        tokenOptions: null,
        balanceCacheKey: null,
      },
    };
  },
});

const getStore = () => {
  const middlewares = [thunkMiddleware];
  if (__DEV__) {
    // @ts-ignore
    //middlewares.push(logger); //TODO: uncomment to see LOGs
  }

  let middlewareEnhancers = applyMiddleware(...middlewares);

  if (__DEV__) {
    middlewareEnhancers = composeWithDevTools({trace: true, traceLimit: 25})(
      middlewareEnhancers,
    );
  }

  const rootPersistConfig = {
    storage: sensitiveStorage,
    key: 'root',
    transforms: [
      createTransform(
        (inboundState: any, key: keyof typeof reducerPersistBlackLists) => {
          // Clear out nested blacklisted fields before encrypting and persisting
          if (Object.keys(reducerPersistBlackLists).includes(key)) {
            const reducerPersistBlackList = reducerPersistBlackLists[key];
            const fieldOverrides = (reducerPersistBlackList as string[]).reduce(
              (allFields, field) => ({...allFields, ...{[field]: undefined}}),
              {},
            );
            return {...inboundState, ...fieldOverrides};
          }
          return inboundState;
        },
      ),
    ],
  };

  // @ts-ignore
  const persistedReducer = persistReducer(rootPersistConfig, rootReducer);
  const store = createStore(persistedReducer, undefined, middlewareEnhancers);
  const persistor = persistStore(store);

  if (__DEV__) {
    // persistor.purge().then(() => console.log('purged persistence'));
  }

  return {
    store,
    persistor,
  };
};

export type RootState = ReturnType<typeof rootReducer>;

export type AppSelector<T = any> = Selector<RootState, T>;

export type Effect<ReturnType = void> = ThunkAction<
  ReturnType,
  RootState,
  unknown,
  Action<string>
>;

export default getStore;

export function configureTestStore(initialState: any) {
  const middlewares = [thunkMiddleware];
  const middlewareEnhancers = composeWithDevTools({
    trace: true,
    traceLimit: 25,
  })(applyMiddleware(...middlewares));
  return createStore(rootReducer, initialState, middlewareEnhancers);
}
