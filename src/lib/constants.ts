/* eslint-disable @typescript-eslint/no-non-null-assertion */
export const NETWORK_ID = parseInt(import.meta.env.VITE_NETWORK_ID!);
export const SUBGRAPH_URL = import.meta.env.VITE_GRAPH_URI!;
export const BLOCK_EXPLORER = import.meta.env.VITE_BLOCK_EXPLORER!;
export const WORLD = {
  worldAddress: import.meta.env.VITE_WORLD_ADDRESS,
  blockNumber: import.meta.env.VITE_WORLD_BLOCK_NUMBER,
};
export const RPC_URLS_HTTP: Record<number, string> = {
  10: import.meta.env.VITE_RPC_URL_HTTP_MAINNET!,
  11155420: import.meta.env.VITE_RPC_URL_HTTP_TESTNET!,
};
export const RPC_URLS_WS: Record<number, string> = {
  10: import.meta.env.VITE_RPC_URL_WS_MAINNET!,
  11155420: import.meta.env.VITE_RPC_URL_WS_TESTNET!,
};
export const SPATIAL_DOMAIN = import.meta.env.VITE_SPATIAL_DOMAIN!;
export const SSX_HOST = import.meta.env.VITE_SSX_HOST!;
export const REFERRAL_HOST = import.meta.env.VITE_REFERRAL_HOST!;
export const RAMP_HOST_KEY = import.meta.env.VITE_RAMP_HOST_KEY!;
export const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN!;
export const REFUND_RECEIVER = import.meta.env.VITE_REFUND_RECEIVER!;
export const WALLET_CONNECT_PROJECT_ID = import.meta.env
  .VITE_WALLET_CONNECT_PROJECT_ID!;
export const TRANSAK_API_KEY = import.meta.env.VITE_TRANSAK_API_KEY!;
/* eslint-enable @typescript-eslint/no-non-null-assertion */

export const PAYMENT_TOKEN = "ETHx";
export const ETHX_ADDRESS = import.meta.env.VITE_ETHX_ADDRESS;
export const DAI_ADDRESS = import.meta.env.VITE_DAI_ADDRESS;
export const DAIX_ADDRESS = import.meta.env.VITE_DAIX_ADDRESS;
export const ALLO_CONTRACT_ADDRESS = import.meta.env.VITE_ALLO_CONTRACT_ADDRESS;
export const PASSPORT_DECODER_ADDRESS = import.meta.env
  .VITE_PASSPORT_DECODER_ADDRESS;

export const SUPERFLUID_HOST_ADDRESS = import.meta.env
  .VITE_SUPERFLUID_HOST_ADDRESS;
export const SUPERFLUID_RESOLVER_ADDRESS = import.meta.env
  .VITE_SUPERFLUID_RESOLVER_ADDRESS!;
export const GDA_CONTRACT_ADDRESS = import.meta.env.VITE_GDA_CONTRACT_ADDRESS;
export const SQF_STRATEGY_ADDRESS = import.meta.env.VITE_SQF_STRATEGY_ADDRESS;
export const ALLO_POOL_ID = import.meta.env.VITE_ALLO_POOL_ID;
export const PAYMENT_TOKEN_FAUCET_URL = "https://faucet.paradigm.xyz";
export const BETA_AGREEMENT_KEY = "storedBetaAgreement";
export const STORAGE_WORKER_ENDPOINT =
  "https://storage-workers.geo-web.workers.dev";
export const IPFS_GATEWAYS = [
  "https://trustless-gateway.link",
  "https://gateway.pinata.cloud",
  "https://storry.tv",
  "https://cloudflare-ipfs.com",
  "https://4everland.io",
  "https://ipfs.runfission.com",
];

export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
export const SECONDS_IN_WEEK = 60 * 60 * 24 * 7;
export const SECONDS_IN_YEAR = 60 * 60 * 24 * 365;
export const AUCTION_LENGTH = 1209600;
export const MAX_PARCEL_SIDE_DIM = 200;
export const MAX_PARCEL_CLAIM = 3000;
export const DRAWER_PREVIEW_HEIGHT_PARCEL = 116;
export const DRAWER_CLAIM_HEIGHT = 280;
export const DRAWER_PREVIEW_HEIGHT_TRANSACTION = 84;
export const MS_PER_SECOND = 1000;
export const VIZ_ANIMATION_DURATION = MS_PER_SECOND * 3;
export const VIZ_CARD_WIDTH_SOURCE = 230;
export const VIZ_CARD_WIDTH_GRANTEE = 290;
