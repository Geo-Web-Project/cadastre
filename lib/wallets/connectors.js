import { InjectedConnector } from "@ceramicstudio/multiauth";
import { WalletConnectConnector } from "@ceramicstudio/multiauth";
import { FortmaticConnector } from "@ceramicstudio/multiauth";
import { PortisConnector } from "@ceramicstudio/multiauth";
import { TorusConnector } from "@ceramicstudio/multiauth";
// import { NetworkConnector } from "@web3-react/network-connector";
// import { WalletLinkConnector } from "@web3-react/walletlink-connector";
// import { LedgerConnector } from "@web3-react/ledger-connector";
// import { TrezorConnector } from "@web3-react/trezor-connector";
// import { FrameConnector } from "@web3-react/frame-connector";
// import { SquarelinkConnector } from "@web3-react/squarelink-connector";
// import { AuthereumConnector } from "@web3-react/authereum-connector";

import { NETWORK_ID } from "../constants";

const POLLING_INTERVAL = 12000;
const RPC_URLS = {
  1: "https://mainnet.infura.io/v3/84842078b09946638c03157f83405213",
  4: "https://rinkeby.infura.io/v3/84842078b09946638c03157f83405213",
  42: "https://kovan.infura.io/v3/c0887990426741829db3e7d035bd6614",
};

export const injected = new InjectedConnector();

export const walletconnect = new WalletConnectConnector({
  rpc: { NETWORK_ID: RPC_URLS[NETWORK_ID] },
  bridge: "https://bridge.walletconnect.org",
  qrcode: true,
  pollingInterval: POLLING_INTERVAL,
});

export const fortmatic = new FortmaticConnector({
  apiKey: "pk_test_CB1CC382AF3E20E1",
  chainId: NETWORK_ID,
});

export const portis = new PortisConnector({
  dAppId: "0d71c499-a58a-4d55-9181-ebcfce593856",
  networks: [NETWORK_ID],
});

export const torus = new TorusConnector({ chainId: NETWORK_ID });

export const switchNetwork = async (provider) => {
  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: `0x${NETWORK_ID.toString(16)}` }],
    });
  } catch (switchError) {
    console.error(switchError);
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
