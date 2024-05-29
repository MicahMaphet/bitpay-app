import {Network} from '.';
export const WALLETCONNECT_V2_METADATA = {
  name: 'BitPay Wallet',
  description: 'BitPay Wallet',
  url: '#',
  icons: ['https://bitpay.com/resources/content/images/2019/10/bitpay.png'],
};

export const CHAIN_NAME_MAPPING: {[key: string]: string} = {
  // ETHEREUM
  '1': 'Ethereum Mainnet',
  '11155111': 'Ethereum Sepolia',
  // POLYGON
  '137': 'Polygon Mainnet',
  '80002': 'Polygon Amoy',
  // ARBITRUM
  '42161': 'Arbitrum Mainnet',
  '421614': 'Arbitrum Sepolia',
  // OPTIMISM
  '10': 'Optimism Mainnet',
  '11155420': 'Optimism Sepolia',
  // BASE
  '8453': 'Base Mainnet',
  '84532': 'Base Sepolia',

  // MISC
  '42': 'LUKSO Mainnet',
  '100': 'xDai',
  '42220': 'Celo Mainnet',
  '44787': 'Celo Alfajores',
  // Add more mappings for other chain codes as needed
};

export const EIP155_MAINNET_CHAINS: {[key in string]: any} = {
  'eip155:1': {
    chainId: 1,
    name: 'Ethereum',
    chainName: 'eth',
    rpc: 'https://cloudflare-eth.com/',
    network: Network.mainnet,
  },
  'eip155:137': {
    chainId: 137,
    name: 'Polygon',
    chainName: 'matic',
    rpc: 'https://polygon-rpc.com/',
    network: Network.mainnet,
  },
};

export const EIP155_TEST_CHAINS = {
  'eip155:11155111': {
    chainId: 11155111,
    name: 'Ethereum Sepolia',
    chainName: 'eth',
    rpc: 'https://sepolia.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161',
    network: Network.testnet,
  },
  'eip155:80002': {
    chainId: 80002,
    name: 'Polygon Amoy',
    chainName: 'matic',
    rpc: 'https://polygon-amoy.core.chainstack.com',
    network: Network.testnet,
  },
};

export const EIP155_SIGNING_METHODS = {
  PERSONAL_SIGN: 'personal_sign',
  ETH_SIGN: 'eth_sign',
  ETH_SIGN_TRANSACTION: 'eth_signTransaction',
  ETH_SIGN_TYPED_DATA: 'eth_signTypedData',
  ETH_SIGN_TYPED_DATA_V3: 'eth_signTypedData_v3',
  ETH_SIGN_TYPED_DATA_V4: 'eth_signTypedData_v4',
  ETH_SEND_RAW_TRANSACTION: 'eth_sendRawTransaction',
  ETH_SEND_TRANSACTION: 'eth_sendTransaction',
  WALLET_ADD_ETHEREUM_CHAIN: 'wallet_addEthereumChain',
};

export const EIP155_METHODS_NOT_INTERACTION_NEEDED = [
  'wallet_addEthereumChain',
];

export const WALLET_CONNECT_SUPPORTED_CHAINS: {
  [key in string]: {chain: string; network: string};
} = {
  'eip155:1': {chain: 'eth', network: Network.mainnet},
  'eip155:137': {chain: 'matic', network: Network.mainnet},
  'eip155:11155111': {chain: 'eth', network: Network.testnet},
  'eip155:80002': {chain: 'matic', network: Network.testnet},
};
export type TEIP155Chain = keyof typeof EIP155_CHAINS;

export const EIP155_CHAINS: {[key in string]: any} = {
  ...EIP155_MAINNET_CHAINS,
  ...EIP155_TEST_CHAINS,
};
