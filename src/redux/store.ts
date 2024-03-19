/* eslint-disable import/named */
import { configureStore, Dispatch } from "@reduxjs/toolkit";
import {
  initializeRpcApiSlice,
  initializeTransactionTrackerSlice,
  initializeSubgraphApiSlice,
  createApiWithReactHooks,
  allSubgraphEndpoints,
  allRpcEndpoints,
  setFrameworkForSdkRedux,
} from "@superfluid-finance/sdk-redux";
import { TypedUseSelectorHook, useDispatch, useSelector } from "react-redux";
import { ethers } from "ethers";
import {
  NETWORK_ID,
  RPC_URLS_HTTP,
  SUPERFLUID_RESOLVER_ADDRESS,
} from "../lib/constants";
import { Framework } from "@superfluid-finance/sdk-core";

export const sfApi = initializeRpcApiSlice(
  createApiWithReactHooks
).injectEndpoints(allRpcEndpoints);

export const sfSubgraph = initializeSubgraphApiSlice(
  createApiWithReactHooks
).injectEndpoints(allSubgraphEndpoints);

export const sfTransactions = initializeTransactionTrackerSlice();

export const makeStore = () => {
  setFrameworkForSdkRedux(NETWORK_ID, async () => {
    return await Framework.create({
      chainId: NETWORK_ID,
      provider: new ethers.providers.JsonRpcProvider(RPC_URLS_HTTP[NETWORK_ID]),
      customSubgraphQueriesEndpoint:
        import.meta.env.MODE === "mainnet"
          ? "https://api.thegraph.com/subgraphs/name/superfluid-finance/protocol-v1-optimism-mainnet"
          : "https://subgraph-endpoints.superfluid.dev/optimism-sepolia/protocol-v1",
      resolverAddress: SUPERFLUID_RESOLVER_ADDRESS,
    });
  });

  return configureStore({
    reducer: {
      [sfApi.reducerPath]: sfApi.reducer,
      [sfTransactions.reducerPath]: sfTransactions.reducer,
      [sfSubgraph.reducerPath]: sfSubgraph.reducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware()
        .concat(sfApi.middleware)
        .concat(sfSubgraph.middleware),
  });
};

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const useAppDispatch = () => useDispatch<Dispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

export const store = makeStore();
