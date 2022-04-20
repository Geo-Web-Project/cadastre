import React from "react";
import {
  ApolloClient,
  HttpLink,
  InMemoryCache,
  ApolloProvider,
} from "@apollo/client";
import { CERAMIC_URL, CONNECT_NETWORK, SUBGRAPH_URL } from "../lib/constants";
import { Provider as MultiAuth } from "@ceramicstudio/multiauth";
import "../styles.scss";
import {
  injected,
  walletconnect,
  fortmatic,
  portis,
  torus,
} from "../lib/wallets/connectors";
import { Provider } from "@self.id/framework";

const connectors = [
  { key: "injected", connector: injected },
  { key: "walletconnect", connector: walletconnect },
  { key: "fortmatic", connector: fortmatic },
  { key: "portis", connector: portis },
  { key: "torus", connector: torus },
];

export default function App({ Component, pageProps }) {
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
    <Provider
      client={{ ceramic: CERAMIC_URL, connectNetwork: CONNECT_NETWORK }}
    >
      <MultiAuth providers={[{ key: "ethereum", connectors }]}>
        <ApolloProvider client={client}>
          <Component {...pageProps} />
        </ApolloProvider>
      </MultiAuth>
    </Provider>
  );
}
