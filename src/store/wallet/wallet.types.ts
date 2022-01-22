import {ExchangeRate, Key, PriceHistory} from './wallet.models';

export enum WalletActionTypes {
  SUCCESS_WALLET_STORE_INIT = 'WALLET/SUCCESS_WALLET_STORE_INIT',
  FAILED_WALLET_STORE_INIT = 'WALLET/FAILED_WALLET_STORE_INIT',
  SUCCESS_CREATE_KEY = 'WALLET/SUCCESS_CREATE_KEY',
  FAILED_CREATE_KEY = 'WALLET/FAILED_CREATE_KEY',
  SET_BACKUP_COMPLETE = 'WALLET/SET_BACKUP_COMPLETE',
  SUCCESS_GET_RATES = 'WALLET/SUCCESS_GET_RATES',
  FAILED_GET_RATES = 'WALLET/FAILED_GET_RATES',
  SUCCESS_GET_PRICE_HISTORY = 'WALLET/SUCCESS_GET_PRICE_HISTORY',
  FAILED_GET_PRICE_HISTORY = 'WALLET/FAILED_GET_PRICE_HISTORY',
  UPDATE_WALLET_BALANCE = 'WALLET/UPDATE_WALLET_BALANCE',
  SUCCESS_ENCRYPT_PASSWORD = 'WALLET/SUCCESS_ENCRYPT_PASSWORD',
  DELETE_KEY = 'WALLET/DELETE_KEY',
  SUCCESS_ENCRYPT_OR_DECRYPT_PASSWORD = 'WALLET/SUCCESS_ENCRYPT_OR_DECRYPT_PASSWORD',
}

interface successWalletStoreInit {
  type: typeof WalletActionTypes.SUCCESS_WALLET_STORE_INIT;
}

interface failedWalletStoreInit {
  type: typeof WalletActionTypes.FAILED_WALLET_STORE_INIT;
}

interface successCreateKey {
  type: typeof WalletActionTypes.SUCCESS_CREATE_KEY;
  payload: {
    key: Key;
  };
}

interface failedCreateKey {
  type: typeof WalletActionTypes.FAILED_CREATE_KEY;
}

interface setBackupComplete {
  type: typeof WalletActionTypes.SET_BACKUP_COMPLETE;
  payload: string;
}

interface successGetRates {
  type: typeof WalletActionTypes.SUCCESS_GET_RATES;
  payload: {
    rates: {[key in string]: Array<ExchangeRate>};
  };
}

interface failedGetRates {
  type: typeof WalletActionTypes.FAILED_GET_RATES;
}

interface successGetPriceHistory {
  type: typeof WalletActionTypes.SUCCESS_GET_PRICE_HISTORY;
  payload: Array<PriceHistory>;
}

interface failedGetPriceHistory {
  type: typeof WalletActionTypes.FAILED_GET_PRICE_HISTORY;
}

interface updateWalletBalance {
  type: typeof WalletActionTypes.UPDATE_WALLET_BALANCE;
  payload: {
    keyId: string;
    walletId: string;
    balance: number;
  };
}

interface successEncryptOrDecryptPassword {
  type: typeof WalletActionTypes.SUCCESS_ENCRYPT_OR_DECRYPT_PASSWORD;
  payload: {
    key: Key;
  };
}

interface deleteKey {
  type: typeof WalletActionTypes.DELETE_KEY;
  payload: {
    keyId: string;
  };
}

export type WalletActionType =
  | successWalletStoreInit
  | failedWalletStoreInit
  | successCreateKey
  | failedCreateKey
  | setBackupComplete
  | successGetRates
  | failedGetRates
  | successGetPriceHistory
  | failedGetPriceHistory
  | updateWalletBalance
  | successEncryptPassword
  | deleteKey;
  | successEncryptOrDecryptPassword;