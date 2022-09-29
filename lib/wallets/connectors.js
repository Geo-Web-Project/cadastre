/* eslint-disable import/no-unresolved */
import {
  InjectedConnector,
  TorusConnector,
  WalletConnectConnector,
} from "@ceramicstudio/multiauth";
// import { NetworkConnector } from "@web3-react/network-connector";
// import { WalletLinkConnector } from "@web3-react/walletlink-connector";
// import { LedgerConnector } from "@web3-react/ledger-connector";
// import { TrezorConnector } from "@web3-react/trezor-connector";
// import { FrameConnector } from "@web3-react/frame-connector";
// import { SquarelinkConnector } from "@web3-react/squarelink-connector";
// import { AuthereumConnector } from "@web3-react/authereum-connector";

import { NETWORK_ID } from "../constants";

const POLLING_INTERVAL = 12000;
export const RPC_URLS = {
  4: `https://rinkeby.infura.io/v3/${process.env.NEXT_PUBLIC_INFURA_PROJECT_ID}`,
  5: `https://goerli.infura.io/v3/${process.env.NEXT_PUBLIC_INFURA_PROJECT_ID}`,
  69: `https://optimism-kovan.infura.io/v3/${process.env.NEXT_PUBLIC_INFURA_PROJECT_ID}`,
  420: `https://optimism-goerli.infura.io/v3/${process.env.NEXT_PUBLIC_INFURA_PROJECT_ID}`,
};
const WALLET_NETWORKS = {
  5: {
    chainId: `0x${(5).toString(16)}`,
    rpcUrls: ["https://goerli.prylabs.net"],
    chainName: "Goerli Test Network",
    nativeCurrency: {
      name: "ETH",
      decimals: 18,
      symbol: "ETH",
    },
    blockExplorerUrls: ["https://goerli.etherscan.io"],
    iconUrls: [],
  },
  69: {
    chainId: `0x${(69).toString(16)}`,
    rpcUrls: ["https://kovan.optimism.io/"],
    chainName: "Optimism Kovan",
    nativeCurrency: {
      name: "ETH",
      decimals: 18,
      symbol: "ETH",
    },
    blockExplorerUrls: ["https://kovan-optimistic.etherscan.io"],
    iconUrls: [],
  },
  420: {
    chainId: `0x${(420).toString(16)}`,
    rpcUrls: ["https://goerli.optimism.io/"],
    chainName: "Optimism Goerli",
    nativeCurrency: {
      name: "ETH",
      decimals: 18,
      symbol: "ETH",
    },
    blockExplorerUrls: ["https://goerli-optimism.etherscan.io"],
    iconUrls: [],
  },
};

export const injected = new InjectedConnector();

export const walletconnect = new WalletConnectConnector({
  rpc: { NETWORK_ID: RPC_URLS[NETWORK_ID] },
  bridge: "https://bridge.walletconnect.org",
  qrcode: true,
  pollingInterval: POLLING_INTERVAL,
});

// export const fortmatic = new FortmaticConnector({
//   apiKey: "pk_test_CB1CC382AF3E20E1",
//   chainId: NETWORK_ID,
// });

// export const portis = new PortisConnector({
//   dAppId: "0d71c499-a58a-4d55-9181-ebcfce593856",
//   networks: [NETWORK_ID],
// });

export const torus = new TorusConnector({ chainId: NETWORK_ID });

export const switchNetwork = async (provider) => {
  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: `0x${NETWORK_ID.toString(16)}` }],
    });
  } catch (switchError) {
    // 4902 error code indicates the chain is missing on the wallet
    if (switchError.code === 4902) {
      try {
        await provider.request({
          method: "wallet_addEthereumChain",
          params: [WALLET_NETWORKS[NETWORK_ID]],
        });
      } catch (error) {
        console.error(error);
      }
    }
  }
};

// export const network = new NetworkConnector({
//   urls: { 1: RPC_URLS[1], 4: RPC_URLS[4] },
//   defaultChainId: 1,
//   pollingInterval: POLLING_INTERVAL
// });

// export const walletlink = new WalletLinkConnector({
//   url: RPC_URLS[1],
//   appName: "web3-react example"
// });

// export const ledger = new LedgerConnector({
//   chainId: 1,
//   url: RPC_URLS[1],
//   pollingInterval: POLLING_INTERVAL
// });

// export const trezor = new TrezorConnector({
//   chainId: 1,
//   url: RPC_URLS[1],
//   pollingInterval: POLLING_INTERVAL,
//   manifestEmail: "dummy@abc.xyz",
//   manifestAppUrl: "https://8rg3h.csb.app/"
// });

// export const frame = new FrameConnector({ supportedChainIds: [1] });

// export const squarelink = new SquarelinkConnector({
//   clientId: "5f2a2233db82b06b24f9",
//   networks: [1, 100]
// });

// export const authereum = new AuthereumConnector({ chainId: 42 });
