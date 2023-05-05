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
import { MapProvider } from "react-map-gl";
import { configureChains, createClient, WagmiConfig } from "wagmi";
import { goerli, optimism, optimismGoerli } from "wagmi/chains";
import type { Chain } from "wagmi";
import { jsonRpcProvider } from "wagmi/providers/jsonRpc";
import {
  connectorsForWallets,
  RainbowKitProvider,
  lightTheme,
  RainbowKitAuthenticationProvider,
  createAuthenticationAdapter,
} from "@rainbow-me/rainbowkit";
import type { AuthenticationStatus } from "@rainbow-me/rainbowkit";
import {
  injectedWallet,
  metaMaskWallet,
  walletConnectWallet,
  ledgerWallet,
  coinbaseWallet,
  braveWallet,
} from "@rainbow-me/rainbowkit/wallets";
import "@rainbow-me/rainbowkit/styles.css";
import { DIDSession } from "did-session";
import { Ed25519Provider, encodeDID } from "key-did-provider-ed25519";
import { generateKeyPairFromSeed } from "@stablelib/ed25519";
import KeyDidResolver from "key-did-resolver";
import { DID } from "dids";
import { randomBytes, randomString } from "@stablelib/random";
import { Cacao, SiweMessage as CacaoSiweMessage } from "@didtools/cacao";
import { getEIP191Verifier } from "@didtools/pkh-ethereum";

const networkIdToChain: Record<number, Chain> = {
  5: goerli,
  10: optimism,
  420: optimismGoerli,
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
  const [authStatus, setAuthStatus] =
    React.useState<AuthenticationStatus>("loading");

  const authenticationAdapter = React.useMemo(
    () =>
      createAuthenticationAdapter({
        getNonce: async () => {
          return randomString(10);
        },

        createMessage: ({ nonce, address, chainId }) => {
          const now = new Date();
          const oneWeekLater = new Date(
            now.getTime() + 7 * 24 * 60 * 60 * 1000
          );

          const keySeed = randomBytes(32);
          const { publicKey } = generateKeyPairFromSeed(keySeed);
          const didKey = encodeDID(publicKey);

          // Form SIWE message
          const siweMessage = new CacaoSiweMessage({
            domain: window.location.hostname,
            address,
            statement:
              "Give this application access to some of your data on Ceramic",
            uri: didKey,
            version: "1",
            nonce,
            issuedAt: now.toISOString(),
            expirationTime: oneWeekLater.toISOString(),
            chainId: chainId.toString(),
            resources: ["ceramic://*"],
          });

          return { siweMessage, keySeed };
        },

        getMessageBody: ({ message }) => {
          const { siweMessage } = message;
          return siweMessage.toMessage();
        },

        verify: async ({ message, signature }) => {
          const { siweMessage, keySeed } = message;

          // Verify Cacao
          siweMessage.signature = signature;
          const cacao = Cacao.fromSiweMessage(siweMessage);
          try {
            await Cacao.verify(cacao, {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              verifiers: getEIP191Verifier() as any,
            });
          } catch (e) {
            console.error(e);
            return false;
          }

          // Save DIDSession
          const didProvider = new Ed25519Provider(keySeed);
          const didKey = new DID({
            provider: didProvider,
            resolver: KeyDidResolver.getResolver(),
          });
          const didCacao = await DIDSession.initDID(didKey, cacao);
          const didSession = new DIDSession({
            cacao,
            keySeed,
            did: didCacao,
          });
          localStorage.setItem("didsession", didSession.serialize());

          setAuthStatus("authenticated");
          return true;
        },

        signOut: async () => {
          localStorage.removeItem("didsession");
          setAuthStatus("unauthenticated");
        },
      }),
    [setAuthStatus]
  );

  const client = React.useMemo(
    () =>
      new ApolloClient({
        link: new HttpLink({
          uri: SUBGRAPH_URL,
        }),
        cache: new InMemoryCache({
          typePolicies: {
            Query: {
              fields: {
                geoWebParcels: {
                  keyArgs: ["skip", "orderBy"],
                  merge(existing = [], incoming) {
                    return [...existing, ...incoming];
                  },
                },
              },
            },
          },
        }),
      }),
    []
  );

  React.useEffect(() => {
    (async () => {
      const sessionStr = localStorage.getItem("didsession");
      if (!sessionStr) {
        setAuthStatus("unauthenticated");
        return;
      }

      const session = await DIDSession.fromSession(sessionStr);
      if (session.did.authenticated) {
        setAuthStatus("authenticated");
      } else {
        setAuthStatus("unauthenticated");
      }
    })();
  }, []);

  return (
    <WagmiConfig client={wagmiClient}>
      <RainbowKitAuthenticationProvider
        adapter={authenticationAdapter}
        status={authStatus}
      >
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
            <MapProvider>
              <Component
                {...pageProps}
                authStatus={authStatus}
                setAuthStatus={setAuthStatus}
              />
            </MapProvider>
          </ApolloProvider>
        </RainbowKitProvider>
      </RainbowKitAuthenticationProvider>
    </WagmiConfig>
  );
}

export default wrapper.withRedux(App);
