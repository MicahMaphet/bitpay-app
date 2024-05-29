import {SUPPORTED_COINS} from '../../../constants/currencies';

export const chainSuffixMap: {[suffix: string]: string} = {
  e: 'eth',
  m: 'matic',
  arb: 'arb',
  base: 'base',
  op: 'op',
};
export function getCoinAndChainFromCurrencyCode(currencyCode: string): {
  coin: string;
  chain: string;
} {
  const [coin, suffix] = currencyCode
    .split('_')
    .map(item => item.toLowerCase());
  if (suffix) {
    // Special handling for usdc.e and usdc
    if (coin.toLowerCase() === 'usdc' && chainSuffixMap[suffix] === 'matic') {
      return {coin: 'usdc.e', chain: chainSuffixMap[suffix]};
    } else if (
      coin.toLowerCase() === 'usdcn' &&
      chainSuffixMap[suffix] === 'matic'
    ) {
      return {coin: 'usdc', chain: chainSuffixMap[suffix]};
    }
    return {coin, chain: chainSuffixMap[suffix]};
  }
  if (SUPPORTED_COINS.includes(coin)) {
    return {coin, chain: coin};
  }
  return {coin, chain: 'eth'};
}

export function getCurrencyCodeFromCoinAndChain(
  coin: string,
  chain: string,
): string {
  if (coin.toLowerCase() === chain.toLowerCase()) {
    return coin.toUpperCase();
  }
  const matchingSuffixEntry = Object.entries(chainSuffixMap).find(
    ([_, chainCode]) => chain.toLowerCase() === chainCode,
  ) as [string, string];
  const suffix = matchingSuffixEntry && matchingSuffixEntry[0];
  const coinIsAnotherChain = Object.values(chainSuffixMap).find(
    chainCode => chainCode === coin.toLowerCase(),
  );
  if (suffix && (coinIsAnotherChain || chain.toLowerCase() !== 'eth')) {
    // Special handling for usdc.e and usdc
    if (coin.toLowerCase() === 'usdc.e' && chain.toLowerCase() === 'matic') {
      return 'USDC_m';
    } else if (
      coin.toLowerCase() === 'usdc' &&
      chain.toLowerCase() === 'matic'
    ) {
      return 'USDCn_m';
    }
    return `${coin.toUpperCase()}_${suffix}`;
  }
  return coin.toUpperCase();
}
