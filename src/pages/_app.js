import React from "react";
import {
  ApolloClient,
  HttpLink,
  InMemoryCache,
  ApolloProvider,
} from "@apollo/client";
import { SUBGRAPH_URL } from "../lib/constants";
import { Web3ReactProvider } from "@web3-react/core";
import Web3 from "web3";
import { ethers } from "ethers";

import "../styles.scss";

function getLibrary(provider, connector) {
  return new ethers.providers.Web3Provider(provider);
}

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
    <Web3ReactProvider getLibrary={getLibrary}>
      <ApolloProvider client={client}>
        <Component {...pageProps} />
      </ApolloProvider>
    </Web3ReactProvider>
  );
}
