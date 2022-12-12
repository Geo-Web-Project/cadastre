/* eslint-disable @typescript-eslint/no-non-null-assertion */
export const NETWORK_ID = parseInt(process.env.NEXT_PUBLIC_NETWORK_ID!);
export const SUBGRAPH_URL = process.env.NEXT_PUBLIC_SUBGRAPH_URL!;
export const CERAMIC_URL = process.env.NEXT_PUBLIC_CERAMIC_URL!;
export const CONNECT_NETWORK = process.env.NEXT_PUBLIC_CERAMIC_CONNECT_NETWORK!;
export const BLOCK_EXPLORER = process.env.NEXT_PUBLIC_BLOCK_EXPLORER!;
export const RPC_URLS: Record<number, string> = {
  4: `https://rinkeby.infura.io/v3/${process.env
    .NEXT_PUBLIC_INFURA_PROJECT_ID!}`,
  5: `https://goerli.infura.io/v3/${process.env
    .NEXT_PUBLIC_INFURA_PROJECT_ID!}`,
  420: `https://optimism-goerli.infura.io/v3/${process.env
    .NEXT_PUBLIC_INFURA_PROJECT_ID!}`,
};
export const SPATIAL_DOMAIN = process.env.NEXT_PUBLIC_SPATIAL_DOMAIN!;
/* eslint-enable @typescript-eslint/no-non-null-assertion */

export const PAYMENT_TOKEN = "ETHx";
export const PAYMENT_TOKEN_FAUCET_URL = "https://faucet.paradigm.xyz";
export const CERAMIC_EXPLORER = `https://cerscan.com/${CONNECT_NETWORK}/stream`;

export const PINATA_API_ENDPOINT = "https://api.pinata.cloud/psa";
export const STORAGE_WORKER_ENDPOINT =
  "https://storage-workers.geo-web.workers.dev";

export const SECONDS_IN_WEEK = 60 * 60 * 24 * 7;
export const SECONDS_IN_YEAR = 60 * 60 * 24 * 365;
export const AUCTION_LENGTH = 1209600;
export const MAX_PARCEL_CLAIM = 3000;
