import { ApolloClient, InMemoryCache, ApolloProvider } from "@apollo/client";
import { AlloContextProvider } from "../context/Allo";
import StreamingQuadraticFunding from "../components/governance/StreamingQuadraticFunding";

const apolloClient = new ApolloClient({
  uri:
    import.meta.env.MODE === "mainnet"
      ? "https://api.thegraph.com/subgraphs/name/superfluid-finance/protocol-v1-optimism-mainnet"
      : "https://optimism-sepolia.subgraph.x.superfluid.dev",
  cache: new InMemoryCache(),
});

export default function Governance() {
  return (
    <ApolloProvider client={apolloClient}>
      <AlloContextProvider>
        <StreamingQuadraticFunding />
      </AlloContextProvider>
    </ApolloProvider>
  );
}
