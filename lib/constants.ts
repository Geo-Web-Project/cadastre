export const NETWORK_ID = 5;
export const NETWORK_NAME = "goerli";
export const PAYMENT_TOKEN = "ETHx";
export const PAYMENT_TOKEN_FAUCET_URL = "https://faucet.paradigm.xyz";
export const SUBGRAPH_URL =
  "https://api.thegraph.com/subgraphs/id/QmTkV9Ho7fyPSsxUnCcjj2npECz2i31NAiijBhGJek8n7D";

export const CERAMIC_URL = "https://ceramic-clay.geoweb.network/";
export const CONNECT_NETWORK = "testnet-clay";
export const CERAMIC_EXPLORER = `https://cerscan.com/${CONNECT_NETWORK}/stream`;
export const BLOCK_EXPLORER = `https://goerli.etherscan.io`;
export const RPC_URLS = {
  4: `https://rinkeby.infura.io/v3/${process.env.NEXT_PUBLIC_INFURA_PROJECT_ID}`,
  5: `https://goerli.infura.io/v3/${process.env.NEXT_PUBLIC_INFURA_PROJECT_ID}`,
  420: `https://optimism-goerli.infura.io/v3/${process.env.NEXT_PUBLIC_INFURA_PROJECT_ID}`,
};

export const PINATA_API_ENDPOINT = "https://api.pinata.cloud/psa";
export const STORAGE_WORKER_ENDPOINT =
  "https://storage-workers.geo-web.workers.dev";

export const SECONDS_IN_WEEK = 60 * 60 * 24 * 7;
export const SECONDS_IN_YEAR = 60 * 60 * 24 * 365;
export const AUCTION_LENGTH = 1209600;
export const MAX_PARCEL_CLAIM = 3000;

export const SPATIAL_DOMAIN = "https://geoweb.app/";
