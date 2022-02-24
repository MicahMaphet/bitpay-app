import {
  WalletConnectActionType,
  WalletConnectActionTypes,
} from './wallet-connect.types';
import WalletConnect from '@walletconnect/client';

import {IJsonRpcRequest} from '@walletconnect/types';
import {IWalletConnectSessionDict, wcConnector} from './wallet-connect.models';

export const walletConnectReduxPersistBlackList: (keyof WalletConnectState)[] =
  [];

export interface IWalletConnectRequest {
  peerId: string;
  payload: IJsonRpcRequest;
}

export interface WalletConnectState {
  connectors: wcConnector[];
  pending: WalletConnect[];
  requests: IWalletConnectRequest[];
  sessions: IWalletConnectSessionDict[];
}

const initialState: WalletConnectState = {
  connectors: [],
  pending: [],
  requests: [],
  sessions: [],
};

export const walletConnectReducer = (
  state: WalletConnectState = initialState,
  action: WalletConnectActionType,
): WalletConnectState => {
  switch (action.type) {
    case WalletConnectActionTypes.INIT_REQUEST:
      return {
        ...state,
      };
    case WalletConnectActionTypes.INIT_SUCCESS:
      return {
        ...state,
        connectors: action.payload.connectors,
      };
    case WalletConnectActionTypes.INIT_FAILURE:
      return {
        ...state,
      };
    case WalletConnectActionTypes.SESSION_REQUEST:
      return {
        ...state,
        pending: action.payload.pending,
      };
    case WalletConnectActionTypes.SESSION_REJECTION:
      return {
        ...state,
        pending: action.payload.pending,
      };
    case WalletConnectActionTypes.SESSION_APPROVAL:
      return {
        ...state,
        connectors: action.payload.connectors,
        pending: action.payload.pending,
        sessions: action.payload.sessions,
      };
    case WalletConnectActionTypes.SESSION_DISCONNECTED:
      return {
        ...state,
        connectors: action.payload.connectors,
        sessions: action.payload.sessions,
        requests: action.payload.requests,
      };
    case WalletConnectActionTypes.CALL_REQUEST:
    case WalletConnectActionTypes.CALL_APPROVAL:
    case WalletConnectActionTypes.CALL_REJECTION:
      return {
        ...state,
        requests: action.payload.requests,
      };
    default:
      return state;
  }
};
