import { createContext, useContext, useReducer, useEffect } from "react";
import { BigNumber } from "ethers";
import { SECONDS_IN_YEAR } from "./constants";

export interface BundleSettings {
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

interface BundleSettingsAction {
  type: BundleSettingsActionType;
  bundleSettings: BundleSettings;
  strategy?: string;
  digit?: number;
  dropDownSelection?: string;
  stream?: Stream;
}

interface Stream {
  existingAnnualNetworkFee: BigNumber;
  newAnnualNetworkFee: BigNumber;
  totalNetworkStream: BigNumber;
}

export enum TopUpDropDownSelection {
  DAYS = "Days",
  WEEKS = "Weeks",
  MONTHS = "Months",
  YEARS = "Years",
}

export enum BundleSettingsActionType {
  UPDATE_BUNDLE_SETTINGS = "updateBundleSettings",
  UPDATE_WRAP_AMOUNT = "updateWrapAmount",
  UPDATE_TOP_UP_SELECTION = "updateTopUpSelection",
}

const BundleSettingsContext = createContext<BundleSettings | null>(null);
const BundleSettingsDispatchContext =
  createContext<React.Dispatch<BundleSettingsAction> | null>(null);
const initialState = {
  isSponsored: true,
  wrapAll: true,
  noWrap: false,
  wrapAmount: "0",
  topUpTotalDigitsSelection: 0,
  topUpSingleDigitsSelection: 0,
  topUpTotalSelection: "Days",
  topUpSingleSelection: "Days",
  topUpStrategy: "",
};

function saveBundleSettings(newBundleSettings: BundleSettings) {
  localStorage.setItem(
    "transactionsBundleSettings",
    JSON.stringify(newBundleSettings)
  );
  return newBundleSettings;
}

function updateWrapAmount(
  bundleSettings: BundleSettings,
  strategy: string,
  dropDownSelection: string,
  digit: number,
  stream: Stream
) {
  const { existingAnnualNetworkFee, newAnnualNetworkFee, totalNetworkStream } =
    stream;
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
        ? totalNetworkStream
            .mul(SECONDS_IN_YEAR)
            .add(networkFeeDelta)
            .div(365)
            .mul(Math.ceil(daysTopUp))
        : BigNumber.from(0);
    return saveBundleSettings({
      ...bundleSettings,
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
    return saveBundleSettings({
      ...bundleSettings,
      wrapAll: false,
      noWrap: false,
      topUpStrategy: strategy,
      topUpSingleSelection: dropDownSelection,
      topUpSingleDigitsSelection: strategy === "single" ? digit : 0,
      topUpTotalDigitsSelection: 0,
      wrapAmount: wrapAmount.gt(0) ? wrapAmount.toString() : "0",
    });
  }

  return bundleSettings;
}

function updateTopUpSelection(
  bundleSettings: BundleSettings,
  digit: number,
  strategy: string,
  stream: Stream
) {
  const dropDownSelection =
    strategy === "total"
      ? bundleSettings.topUpTotalSelection
      : bundleSettings.topUpSingleSelection;

  return updateWrapAmount(
    bundleSettings,
    strategy,
    dropDownSelection,
    digit,
    stream
  );
}

function bundleSettingsReducer(
  bundleSettings: BundleSettings,
  action: BundleSettingsAction
) {
  switch (action.type) {
    case BundleSettingsActionType.UPDATE_BUNDLE_SETTINGS: {
      return saveBundleSettings(action.bundleSettings);
    }
    case BundleSettingsActionType.UPDATE_WRAP_AMOUNT: {
      if (
        action.strategy &&
        action.dropDownSelection &&
        action.digit &&
        action.stream
      ) {
        return updateWrapAmount(
          action.bundleSettings,
          action.strategy,
          action.dropDownSelection,
          action.digit,
          action.stream
        );
      }
      return bundleSettings;
    }
    case BundleSettingsActionType.UPDATE_TOP_UP_SELECTION: {
      if (action.strategy && action.digit && action.stream) {
        return updateTopUpSelection(
          action.bundleSettings,
          action.digit,
          action.strategy,
          action.stream
        );
      }
      return bundleSettings;
    }
    default: {
      throw Error("Unknown action: " + action.type);
    }
  }
}

function useBundleSettings() {
  const context = useContext(BundleSettingsContext);

  if (!context) {
    throw Error("BundleSettings context was not found");
  }

  return context;
}

function useBundleSettingsDispatch() {
  const context = useContext(BundleSettingsDispatchContext);

  if (!context) {
    throw Error("BundleSettingsDispatch context was not found");
  }

  return context;
}

function BundleSettingsProvider({ children }: { children: React.ReactNode }) {
  const [bundleSettings, dispatch] = useReducer(
    bundleSettingsReducer,
    initialState
  );

  useEffect(() => {
    if (localStorage.transactionsBundleSettings) {
      dispatch({
        type: BundleSettingsActionType.UPDATE_BUNDLE_SETTINGS,
        bundleSettings: JSON.parse(localStorage.transactionsBundleSettings),
      });
    }
  }, []);

  return (
    <BundleSettingsContext.Provider value={bundleSettings}>
      <BundleSettingsDispatchContext.Provider value={dispatch}>
        {children}
      </BundleSettingsDispatchContext.Provider>
    </BundleSettingsContext.Provider>
  );
}

export { BundleSettingsProvider, useBundleSettings, useBundleSettingsDispatch };
