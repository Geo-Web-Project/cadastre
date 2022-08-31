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
import { createWrapper } from "next-redux-wrapper";
import { NETWORK_ID } from "../lib/constants";
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
      provider: new ethers.providers.InfuraProvider(
        NETWORK_ID,
        process.env.NEXT_PUBLIC_INFURA_PROJECT_ID
      ),
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

// NOTE: The serialization is important to override because RTK-Query will have some "undefined" values in the state which Next.js doesn't like to serialize by default.
export const wrapper = createWrapper<AppStore>(makeStore, {
  debug: true,
  serializeState: (state) => JSON.stringify(state),
  deserializeState: (state) => JSON.parse(state),
});
