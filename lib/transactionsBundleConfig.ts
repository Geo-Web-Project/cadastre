import { useState, useMemo } from "react";
import { BigNumber } from "ethers";
import { NativeAssetSuperToken } from "@superfluid-finance/sdk-core";
import { sfSubgraph } from "../redux/store";
import { SmartAccount } from "../pages/index";
import { NETWORK_ID, SECONDS_IN_YEAR } from "./constants";

export enum TopUpDropDownSelection {
  DAYS = "Days",
  WEEKS = "Weeks",
  MONTHS = "Months",
  YEARS = "Years",
}

export interface TransactionsBundleConfig {
  isSponsored: boolean;
  wrapAll: boolean;
  noWrap: boolean;
  wrapAmount: string;
  topUpTotalDigitsSelection: number;
  topUpSingleDigitsSelection: number;
  topUpTotalSelection: string;
  topUpSingleSelection: string;
  topUpStrategy: string;
}

function useTransactionsBundleConfig(
  smartAccount: SmartAccount | null,
  transactionsBundleConfig: TransactionsBundleConfig,
  setTransactionsBundleConfig: React.Dispatch<
    React.SetStateAction<TransactionsBundleConfig>
  >,
  paymentToken: NativeAssetSuperToken,
  existingAnnualNetworkFee: BigNumber,
  newAnnualNetworkFee: BigNumber
) {
  const [showTopUpTotalDropDown, setShowTopUpTotalDropDown] =
    useState<boolean>(false);
  const [showTopUpSingleDropDown, setShowTopUpSingleDropDown] =
    useState<boolean>(false);

  const { data: accountTokenSnapshot } =
    sfSubgraph.useAccountTokenSnapshotsQuery({
      chainId: NETWORK_ID,
      filter: {
        account: smartAccount?.address ?? "",
        token: paymentToken?.address ?? "",
      },
    });

  const totalNetworkStream =
    accountTokenSnapshot?.data[0]?.totalOutflowRate ?? "";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleTopUpChange = (e: any, strategy: string) => {
    if (isNaN(e.target.value)) {
      return;
    }
    const dropDownSelection =
      strategy === "total"
        ? transactionsBundleConfig.topUpTotalSelection
        : transactionsBundleConfig.topUpSingleSelection;

    updateWrapAmount(strategy, dropDownSelection, Number(e.target.value));
  };

  const saveTransactionsBundleConfig = (
    newTransactionsBundleConfig: TransactionsBundleConfig
  ) => {
    setTransactionsBundleConfig(newTransactionsBundleConfig);
    localStorage.setItem(
      "transactionsBundleConfig",
      JSON.stringify(newTransactionsBundleConfig)
    );
  };

  const updateWrapAmount = (
    strategy: string,
    dropDownSelection: string,
    digit: number
  ) => {
    let daysTopUp = 0;

    switch (dropDownSelection) {
      case TopUpDropDownSelection.DAYS:
        daysTopUp = digit;
        break;
      case TopUpDropDownSelection.WEEKS:
        daysTopUp = digit * 7;
        break;
      case TopUpDropDownSelection.MONTHS:
        daysTopUp = digit * 30;
        break;
      case TopUpDropDownSelection.YEARS:
        daysTopUp = digit * 365;
        break;
      default:
        break;
    }

    if (strategy === "total") {
      const networkFeeDelta = newAnnualNetworkFee
        ? newAnnualNetworkFee.sub(existingAnnualNetworkFee ?? 0)
        : BigNumber.from(0);
      const wrapAmount =
        totalNetworkStream && networkFeeDelta
          ? BigNumber.from(totalNetworkStream)
              .mul(SECONDS_IN_YEAR)
              .add(networkFeeDelta)
              .div(365)
              .mul(Math.ceil(daysTopUp))
          : BigNumber.from(0);
      saveTransactionsBundleConfig({
        ...transactionsBundleConfig,
        wrapAll: false,
        noWrap: false,
        topUpStrategy: strategy,
        topUpTotalSelection: dropDownSelection,
        topUpTotalDigitsSelection: strategy === "total" ? digit : 0,
        topUpSingleDigitsSelection: 0,
        wrapAmount: wrapAmount.gt(0) ? wrapAmount.toString() : "0",
      });
    } else if (strategy === "single") {
      const wrapAmount =
        newAnnualNetworkFee && newAnnualNetworkFee.gt(0)
          ? newAnnualNetworkFee.div(365).mul(Math.ceil(daysTopUp))
          : BigNumber.from(0);
      saveTransactionsBundleConfig({
        ...transactionsBundleConfig,
        wrapAll: false,
        noWrap: false,
        topUpStrategy: strategy,
        topUpSingleSelection: dropDownSelection,
        topUpSingleDigitsSelection: strategy === "single" ? digit : 0,
        topUpTotalDigitsSelection: 0,
        wrapAmount: wrapAmount.gt(0) ? wrapAmount.toString() : "0",
      });
    }
  };

  useMemo(() => {
    if (newAnnualNetworkFee && transactionsBundleConfig.topUpStrategy) {
      const digit =
        transactionsBundleConfig.topUpStrategy === "total"
          ? transactionsBundleConfig.topUpTotalDigitsSelection
          : transactionsBundleConfig.topUpSingleDigitsSelection;
      const dropDownSelection =
        transactionsBundleConfig.topUpStrategy === "total"
          ? transactionsBundleConfig.topUpTotalSelection
          : transactionsBundleConfig.topUpSingleSelection;

      updateWrapAmount(
        transactionsBundleConfig.topUpStrategy,
        dropDownSelection,
        digit
      );
    }
  }, [newAnnualNetworkFee?._hex, transactionsBundleConfig.topUpStrategy]);

  return {
    showTopUpTotalDropDown,
    setShowTopUpTotalDropDown,
    showTopUpSingleDropDown,
    setShowTopUpSingleDropDown,
    saveTransactionsBundleConfig,
    updateWrapAmount,
    handleTopUpChange,
  };
}

export { useTransactionsBundleConfig };
