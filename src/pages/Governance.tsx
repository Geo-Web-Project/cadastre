import { ApolloClient, InMemoryCache, ApolloProvider } from "@apollo/client";
import { AlloContextProvider } from "../context/Allo";
import StreamingQuadraticFunding from "../components/governance/StreamingQuadraticFunding";

const apolloClient = new ApolloClient({
  uri:
    import.meta.env.MODE === "mainnet"
      ? "https://subgraph-endpoints.superfluid.dev/optimism-mainnet/protocol-v1"
      : "https://subgraph-endpoints.superfluid.dev/optimism-sepolia/protocol-v1",
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
