import { Chain } from "@defillama/sdk/build/general";
import { FetchOptions, SimpleAdapter } from "../adapters/types";
import { CHAIN } from "../helpers/chains";
import { httpGet } from "../utils/fetchURL";

type TChainAddress = {
  [s: Chain | string]: string[];
}

const lpTokenAddresses: TChainAddress = {
  [CHAIN.ETHEREUM]: [
    '0xa7062bbA94c91d565Ae33B893Ab5dFAF1Fc57C4d',
    '0x7DBF07Ad92Ed4e26D5511b4F285508eBF174135D'
  ],
  [CHAIN.BSC]: [
    '0x8033d5b454Ee4758E4bD1D37a49009c1a81D8B10',
    '0xf833afA46fCD100e62365a0fDb0734b7c4537811'
  ],
  [CHAIN.POLYGON]: [
    '0x58Cc621c62b0aa9bABfae5651202A932279437DA',
    '0x0394c4f17738A10096510832beaB89a9DD090791',
    '0x4C42DfDBb8Ad654b42F66E0bD4dbdC71B52EB0A6',
  ],
  [CHAIN.ARBITRUM]: [
    '0x690e66fc0F8be8964d40e55EdE6aEBdfcB8A21Df'
  ],
  [CHAIN.AVAX]: [
    '0xe827352A0552fFC835c181ab5Bf1D7794038eC9f'
  ],
  [CHAIN.OPTIMISM]: [
    '0x3B96F88b2b9EB87964b852874D41B633e0f1f68F'
  ],
  [CHAIN.TRON]: [
    'TAC21biCBL9agjuUyzd4gZr356zRgJq61b'
  ]
}

const event_swap_fromUSD = 'event SwappedFromVUsd(address recipient,address token,uint256 vUsdAmount,uint256 amount,uint256 fee)';
const event_swap_toUSD = 'event SwappedToVUsd(address sender,address token,uint256 amount,uint256 vUsdAmount,uint256 fee)';

const fetchFees = async ({ getLogs, createBalances, chain, api }: FetchOptions): Promise<number> => {
  const balances = createBalances();
  const pools = lpTokenAddresses[chain]
  const logs_fromUSD = await getLogs({ targets: pools, eventAbi: event_swap_fromUSD, flatten: false, })
  const logs_toUSD = await getLogs({ targets: pools, eventAbi: event_swap_toUSD, flatten: false, })
  const tokens = await api.multiCall({ abi: "address:token", calls: pools });

  logs_fromUSD.forEach(addLogs)
  logs_toUSD.forEach(addLogs)

  function addLogs(logs: any, index: number) {
    const token = tokens[index]
    logs.forEach((log: any) => balances.add(token, log.fee))
  }
  return balances.getUSDValue();
};

const fetchFeesTron = async ({ chain, createBalances, toTimestamp, fromTimestamp, api, }: FetchOptions): Promise<number> => {
  const balances = createBalances();
  const pools = lpTokenAddresses[chain]
  const minBlockTimestampMs = fromTimestamp * 1000;
  const maxBlockTimestampMs = toTimestamp * 1000;

  const logs_fromUSD = (await Promise.all(pools.map(async (lpTokenAddress: string) => {
    return getTronLogs(lpTokenAddress, 'SwappedFromVUsd', minBlockTimestampMs, maxBlockTimestampMs);
  })))
  const logs_toUSD = (await Promise.all(pools.map(async (lpTokenAddress: string) => {
    return getTronLogs(lpTokenAddress, 'SwappedToVUsd', minBlockTimestampMs, maxBlockTimestampMs);
  })))
  const tokens = await api.multiCall({ abi: "address:token", calls: pools });

  logs_fromUSD.forEach(addLogs)
  logs_toUSD.forEach(addLogs)

  function addLogs(logs: any, index: number) {
    const token = tokens[index]
    logs.forEach((log: any) => balances.add(token, log.result.fee))
  }
  return balances.getUSDValue()
};

const tronRpc = `https://api.trongrid.io`
const getTronLogs = async (address: string, eventName: string, minBlockTimestamp: number, maxBlockTimestamp: number) => {
  const url = `${tronRpc}/v1/contracts/${address}/events?event_name=${eventName}&min_block_timestamp=${minBlockTimestamp}&max_block_timestamp=${maxBlockTimestamp}&limit=200`;
  const res = await httpGet(url);
  return res.data;
}

const fetch: any = async (timestamp: number, _: any, options: FetchOptions) => {
  let dailyFees = await (options.chain === CHAIN.TRON ? fetchFeesTron(options) : fetchFees(options));
  const dailyRevenue = dailyFees * 0.2;
  const dailySupplySideRevenue = dailyFees * 0.8;
  return {
    dailyFees,
    dailyRevenue: dailyRevenue,
    dailySupplySideRevenue: dailySupplySideRevenue,
    timestamp,
  };
};

const meta = {
  methodology: {
    Fees: "A 0.3% fee is charged for token swaps",
    SupplySideRevenue: "A 0.24% of each swap is distributed to liquidity providers",
    Revenue: "A 0.06% of each swap goes to governance",
  }
};

const adapters: SimpleAdapter = {
  adapter: {
    [CHAIN.ETHEREUM]: {
      fetch,
      start: 1684022400,
      meta,
    },
    [CHAIN.BSC]: {
      fetch,
      start: 1684022400,
      meta,
    },
    [CHAIN.POLYGON]: {
      fetch,
      start: 1684022400,
      meta,
    },
    [CHAIN.ARBITRUM]: {
      fetch,
      start: 1687838400,
      meta,
    },
    [CHAIN.AVAX]: {
      fetch,
      start: 1698030000,
      meta,
    },
    [CHAIN.OPTIMISM]: {
      fetch,
      start: 1702868400,
      meta,
    },
    [CHAIN.TRON]: {
      fetch,
      start: 1685109600,
      meta,
    },
  },
};

export default adapters;
