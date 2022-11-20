import { wrapper } from "../redux/store";

import React from "react";
import {
  ApolloClient,
  HttpLink,
  InMemoryCache,
  ApolloProvider,
} from "@apollo/client";
import { SUBGRAPH_URL, NETWORK_ID, RPC_URLS } from "../lib/constants";
import "../styles.scss";
import { AppProps } from "next/app";

import { chain, configureChains, createClient, WagmiConfig } from "wagmi";
import type { Chain } from "wagmi";
import { jsonRpcProvider } from "wagmi/providers/jsonRpc";
import {
  connectorsForWallets,
  RainbowKitProvider,
  lightTheme,
} from "@rainbow-me/rainbowkit";
import {
  injectedWallet,
  metaMaskWallet,
  walletConnectWallet,
  ledgerWallet,
  coinbaseWallet,
  braveWallet,
} from "@rainbow-me/rainbowkit/wallets";
import "@rainbow-me/rainbowkit/styles.css";

const networkIdToChain: Record<number, Chain> = {
  5: chain.goerli,
  10: chain.optimism,
  420: chain.optimismGoerli,
};
const { chains, provider } = configureChains(
  [networkIdToChain[NETWORK_ID]],
  [
    jsonRpcProvider({
      rpc: (chain) => ({
        http: RPC_URLS[chain.id],
      }),
    }),
  ]
);

const connectors = connectorsForWallets([
  {
    groupName: "Suggested",
    wallets: [
      injectedWallet({ chains }),
      metaMaskWallet({ chains }),
      ledgerWallet({ chains }),
      walletConnectWallet({ chains }),
      coinbaseWallet({ appName: "Geo Web Cadastre", chains }),
      braveWallet({ chains }),
    ],
  },
]);

const wagmiClient = createClient({
  autoConnect: false,
  connectors,
  provider,
});

export function App({ Component, pageProps }: AppProps) {
  const client = new ApolloClient({
    link: new HttpLink({
      uri: SUBGRAPH_URL,
    }),
    cache: new InMemoryCache({
      typePolicies: {
        Query: {
          fields: {
            geoWebParcels: {
              keyArgs: [],
              merge(existing = [], incoming) {
                return [...existing, ...incoming];
              },
            },
          },
        },
      },
    }),
  });

  return (
    <WagmiConfig client={wagmiClient}>
      <RainbowKitProvider
        chains={chains}
        modalSize="compact"
        theme={lightTheme({
          accentColor: "#2fc1c1",
          accentColorForeground: "#202333",
          borderRadius: "medium",
          fontStack: "system",
        })}
      >
        <ApolloProvider client={client}>
          <Component {...pageProps} />
        </ApolloProvider>
      </RainbowKitProvider>
    </WagmiConfig>
  );
}

export default wrapper.withRedux(App);
