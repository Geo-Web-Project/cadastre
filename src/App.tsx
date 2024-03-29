import React from "react";
import {
  NETWORK_ID,
  RPC_URLS_HTTP,
  WALLET_CONNECT_PROJECT_ID,
} from "./lib/constants";
import {
  Route,
  createBrowserRouter,
  createRoutesFromElements,
  RouterProvider,
} from "react-router-dom";
import SuperfluidContextProvider from "./context/Superfluid";
import "./styles.scss";
import { MapProvider } from "react-map-gl";
import { configureChains, createConfig, WagmiConfig } from "wagmi";
import { optimism, optimismSepolia } from "wagmi/chains";
import type { Chain } from "wagmi";
import { jsonRpcProvider } from "wagmi/providers/jsonRpc";
import {
  connectorsForWallets,
  RainbowKitProvider,
  darkTheme,
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
import IndexPage from "./pages/Index";
import ErrorPage from "./pages/Error";
import { randomBytes, randomString } from "@stablelib/random";
import { Cacao, SiweMessage as CacaoSiweMessage } from "@didtools/cacao";
import { getEIP191Verifier } from "@didtools/pkh-ethereum";
import merge from "lodash.merge";
import { STATE } from "./components/cadastre/Map";
import Governance from "./pages/Governance";
import Header from "./components/shared/Header";

const networkIdToChain: Record<number, Chain> = {
  10: optimism,
  11155420: optimismSepolia,
};
const { chains, publicClient } = configureChains(
  [networkIdToChain[NETWORK_ID]],
  [
    jsonRpcProvider({
      rpc: (chain) => ({
        http: RPC_URLS_HTTP[chain.id],
      }),
    }),
  ]
);

const connectors = connectorsForWallets([
  {
    groupName: "Suggested",
    wallets: [
      injectedWallet({ chains }),
      metaMaskWallet({ chains, projectId: WALLET_CONNECT_PROJECT_ID }),
      ledgerWallet({ chains, projectId: WALLET_CONNECT_PROJECT_ID }),
      walletConnectWallet({ chains, projectId: WALLET_CONNECT_PROJECT_ID }),
      coinbaseWallet({ appName: "Geo Web Cadastre", chains }),
      braveWallet({ chains }),
    ],
  },
]);

const wagmiConfig = createConfig({
  autoConnect: false,
  connectors,
  publicClient,
});

export default function App() {
  const [authStatus, setAuthStatus] =
    React.useState<AuthenticationStatus>("loading");
  const [isFullScreen, setIsFullScreen] = React.useState<boolean>(false);
  const [portfolioNeedActionCount, setPortfolioNeedActionCount] =
    React.useState(0);
  const [selectedParcelId, setSelectedParcelId] = React.useState("");
  const [interactionState, setInteractionState] = React.useState<STATE>(
    STATE.VIEWING
  );
  const [shouldRefetchParcelsData, setShouldRefetchParcelsData] =
    React.useState(false);

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
            uri: didKey,
            version: "1",
            nonce,
            issuedAt: now.toISOString(),
            expirationTime: oneWeekLater.toISOString(),
            chainId: chainId.toString(),
            resources: [],
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

  const myTheme = merge(darkTheme(), {
    colors: {
      modalBackground: "#202333",
      accentColor: "#2fc1c1",
      modalBorder: "0",
      profileForeground: "#111320",
      modalText: "#f8f9fa",
      closeButtonBackground: "#111320",
      closeButton: "#f8f9fa",
    },
    radii: {
      modal: "18px",
    },
  });

  const router = createBrowserRouter(
    createRoutesFromElements(
      <Route
        path="/"
        element={
          <Header
            isFullScreen={isFullScreen}
            authStatus={authStatus}
            portfolioNeedActionCount={portfolioNeedActionCount}
            setPortfolioNeedActionCount={setPortfolioNeedActionCount}
            interactionState={interactionState}
            setInteractionState={setInteractionState}
            setSelectedParcelId={setSelectedParcelId}
            shouldRefetchParcelsData={shouldRefetchParcelsData}
            setShouldRefetchParcelsData={setShouldRefetchParcelsData}
          />
        }
        errorElement={<ErrorPage />}
      >
        <Route
          index
          element={
            <IndexPage
              authStatus={authStatus}
              setAuthStatus={setAuthStatus}
              isFullScreen={isFullScreen}
              setIsFullScreen={setIsFullScreen}
              portfolioNeedActionCount={portfolioNeedActionCount}
              setPortfolioNeedActionCount={setPortfolioNeedActionCount}
              interactionState={interactionState}
              setInteractionState={setInteractionState}
              selectedParcelId={selectedParcelId}
              setSelectedParcelId={setSelectedParcelId}
              shouldRefetchParcelsData={shouldRefetchParcelsData}
              setShouldRefetchParcelsData={setShouldRefetchParcelsData}
            />
          }
          errorElement={<ErrorPage />}
        />
        <Route path="/governance" element={<Governance />} />
      </Route>
    )
  );

  return (
    <WagmiConfig config={wagmiConfig}>
      <RainbowKitAuthenticationProvider
        adapter={authenticationAdapter}
        status={authStatus}
      >
        <RainbowKitProvider chains={chains} modalSize="compact" theme={myTheme}>
          <SuperfluidContextProvider>
            <MapProvider>
              <RouterProvider router={router} />
            </MapProvider>
          </SuperfluidContextProvider>
        </RainbowKitProvider>
      </RainbowKitAuthenticationProvider>
    </WagmiConfig>
  );
}
