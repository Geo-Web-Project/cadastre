import React from "react";
import {
  ApolloClient,
  HttpLink,
  InMemoryCache,
  ApolloProvider,
} from "@apollo/client";
import { SUBGRAPH_URL } from "../lib/constants";
import {
  Provider as MultiAuth,
  PartialConnectorConfig,
} from "@ceramicstudio/multiauth";
import "../styles.scss";
import {
  injected,
  walletconnect,
  // fortmatic,
  // portis,
  torus,
} from "../lib/wallets/connectors";
import { wrapper } from "../redux/store";

const connectors = new Array<PartialConnectorConfig>(
  { key: "injected", connector: injected },
  { key: "walletConnect", connector: walletconnect },
  // { key: "fortmatic", connector: fortmatic },
  // { key: "portis", connector: portis },
  { key: "torus", connector: torus }
);

export function App({ Component, pageProps }) {
  const client = new ApolloClient({
    link: new HttpLink({
      uri: SUBGRAPH_URL,
    }),
    cache: new InMemoryCache({
      typePolicies: {
        Query: {
          fields: {
            geoWebCoordinates: {
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
    <MultiAuth providers={[{ key: "ethereum", connectors }]}>
      <ApolloProvider client={client}>
        <Component {...pageProps} />
      </ApolloProvider>
    </MultiAuth>
  );
}

export default wrapper.withRedux(App);
