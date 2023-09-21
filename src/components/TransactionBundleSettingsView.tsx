import { useMemo } from "react";
import { BigNumber } from "ethers";
import Card from "react-bootstrap/Card";
import Button from "react-bootstrap/Button";
import Image from "react-bootstrap/Image";
import Form from "react-bootstrap/Form";
import InputGroup from "react-bootstrap/InputGroup";
import InfoTooltip from "./InfoTooltip";
import { useMediaQuery } from "../lib/mediaQuery";
import {
  useBundleSettings,
  useBundleSettingsDispatch,
  TopUpDropDownSelection,
  BundleSettingsActionType,
} from "../lib/transactionBundleSettings";

function TransactionsBundleSettingsView(props: {
  direction?: string;
  showTopUpTotalDropDown: boolean;
  setShowTopUpTotalDropDown: React.Dispatch<React.SetStateAction<boolean>>;
  showTopUpSingleDropDown: boolean;
  setShowTopUpSingleDropDown: React.Dispatch<React.SetStateAction<boolean>>;
  existingAnnualNetworkFee: BigNumber;
  newAnnualNetworkFee: BigNumber;
  totalNetworkStream: BigNumber;
}) {
  const {
    direction,
    showTopUpTotalDropDown,
    setShowTopUpTotalDropDown,
    showTopUpSingleDropDown,
    setShowTopUpSingleDropDown,
    existingAnnualNetworkFee,
    newAnnualNetworkFee,
    totalNetworkStream,
  } = props;

  const { isMobile, isTablet, isDesktop } = useMediaQuery();
  const bundleSettings = useBundleSettings();
  const bundleSettingsDispatch = useBundleSettingsDispatch();

  useMemo(() => {
    if (newAnnualNetworkFee && bundleSettings.topUpStrategy) {
      const digit =
        bundleSettings.topUpStrategy === "total"
          ? bundleSettings.topUpTotalDigitsSelection
          : bundleSettings.topUpSingleDigitsSelection;
      const dropDownSelection =
        bundleSettings.topUpStrategy === "total"
          ? bundleSettings.topUpTotalSelection
          : bundleSettings.topUpSingleSelection;

      bundleSettingsDispatch({
        type: BundleSettingsActionType.UPDATE_WRAP_AMOUNT,
        bundleSettings,
        strategy: bundleSettings.topUpStrategy,
        dropDownSelection,
        digit,
        stream: {
          existingAnnualNetworkFee,
          newAnnualNetworkFee,
          totalNetworkStream,
        },
      });
    }
  }, [newAnnualNetworkFee?._hex, bundleSettings.topUpStrategy]);

  return (
    <>
      <div className="form-check d-flex align-items-center gap-2 ms-0 ms-sm-1">
        <input
          defaultChecked={bundleSettings.isSponsored}
          aria-label="Checkbox to choose if payment denominated in ETHx or ETH"
          className="form-check-input"
          type="checkbox"
          style={{ width: isMobile ? 18 : 24, height: isMobile ? 18 : 24 }}
          onClick={() =>
            bundleSettingsDispatch({
              type: BundleSettingsActionType.UPDATE_BUNDLE_SETTINGS,
              bundleSettings: {
                ...bundleSettings,
                isSponsored: !bundleSettings.isSponsored,
                wrapAll: !bundleSettings.isSponsored,
                noWrap: bundleSettings.isSponsored ? true : false,
                topUpStrategy: "",
              },
            })
          }
        />
        <label
          className="form-check-label"
          htmlFor="flexCheckDefault"
          style={{ fontSize: isMobile ? "0.8rem" : "" }}
        >
          Enable transaction sponsoring + refunding
        </label>
        {direction === "row" && (
          <InfoTooltip
            position={{ bottom: isMobile || isTablet }}
            content={
              <div style={{ textAlign: "left" }}>
                Optimism transaction fees (aka gas) are paid in ETH, but all Geo
                Web land transactions are denominated in ETHx. <br />
                <br />
                Safe smart accounts allow us to sponsor your transaction
                bundle's gas with ETH and then get refunded by you with ETHx.
                <br />
                <br />
                This means you can (optionally) keep all your account funds in
                the form ETHx.
                <br />
                <br />
                Otherwise, set how much ETH you want to wrap to ETHx with each
                transaction.
              </div>
            }
            target={
              <span className="d-flex align-content-center">
                <Image src="info.svg" alt="info" width={isMobile ? 20 : 22} />
              </span>
            }
          />
        )}
      </div>
      <Card
        border="secondary"
        className={`bg-dark mt-4 mb-2 p-2 p-sm-3 ${
          isMobile ? "" : "rounded-4"
        }`}
      >
        <small
          className="position-absolute bg-dark px-1 text-secondary"
          style={{ left: 25, top: -12 }}
        >
          {" "}
          Auto-Wrapping
        </small>
        <Card.Header>
          <span>
            Select a strategy for auto-balancing your ETH:ETHx with each
            Cadastre transaction. This setting is saved in your browser.{" "}
          </span>
        </Card.Header>
        <Card.Body className="pb-1">
          <div
            className={`d-flex ${
              direction === "column" || isMobile || isTablet
                ? "flex-column"
                : "flex-row gap-4"
            }`}
          >
            <Button
              variant={
                bundleSettings.wrapAll
                  ? "outline-primary"
                  : bundleSettings.isSponsored
                  ? "outline-light"
                  : "outline-info"
              }
              disabled={!bundleSettings.isSponsored}
              className="w-100 p-2 rounded-3 mb-3 shadow-none btn-wrap-strategy"
              onClick={() =>
                bundleSettingsDispatch({
                  type: BundleSettingsActionType.UPDATE_BUNDLE_SETTINGS,
                  bundleSettings: {
                    ...bundleSettings,
                    wrapAll: true,
                    noWrap: false,
                    wrapAmount: "0",
                    topUpStrategy: "",
                  },
                })
              }
            >
              <span
                className={
                  bundleSettings.wrapAll
                    ? "text-primary"
                    : bundleSettings.isSponsored
                    ? "text-light"
                    : "text-info"
                }
              >
                Auto-wrap all ETH to ETHx
              </span>
            </Button>
            <Button
              variant={
                bundleSettings.noWrap && bundleSettings.isSponsored
                  ? "outline-primary"
                  : bundleSettings.isSponsored
                  ? "outline-light"
                  : "outline-info"
              }
              disabled={!bundleSettings.isSponsored}
              className="w-100 p-2 rounded-3 mb-3 shadow-none btn-wrap-strategy"
              onClick={() =>
                bundleSettingsDispatch({
                  type: BundleSettingsActionType.UPDATE_BUNDLE_SETTINGS,
                  bundleSettings: {
                    ...bundleSettings,
                    noWrap: true,
                    wrapAll: false,
                    wrapAmount: "0",
                    topUpStrategy: "",
                  },
                })
              }
            >
              <span
                className={
                  bundleSettings.noWrap && bundleSettings.isSponsored
                    ? "text-primary"
                    : bundleSettings.isSponsored
                    ? "text-light"
                    : "text-info"
                }
              >
                Don't auto-wrap any ETH to ETHx
              </span>
            </Button>
          </div>
          <div
            className={`d-flex ${
              direction === "column" || isMobile || isTablet
                ? "flex-column"
                : "flex-row gap-4"
            }`}
          >
            <div className="d-flex flex-column gap-1">
              <span
                className={
                  !bundleSettings.isSponsored
                    ? "text-info"
                    : bundleSettings.topUpStrategy === "total"
                    ? "text-primary"
                    : "text-light"
                }
              >
                Total Balance Top-up
              </span>
              <div className="d-flex justify-content-between align-items-center gap-2 mb-0">
                <InputGroup className="mb-2 mt-1 rounded-3">
                  <Form.Control
                    disabled={!bundleSettings.isSponsored}
                    type="text"
                    inputMode="numeric"
                    className={`bg-dark ${
                      !bundleSettings.isSponsored
                        ? "border-info"
                        : bundleSettings.topUpStrategy === "total"
                        ? "border-primary"
                        : "border-light"
                    } ${
                      !bundleSettings.isSponsored
                        ? "text-info"
                        : bundleSettings.topUpStrategy === "total"
                        ? "text-primary"
                        : "text-light"
                    }`}
                    value={
                      bundleSettings.topUpStrategy === "total"
                        ? bundleSettings.topUpTotalDigitsSelection
                        : ""
                    }
                    placeholder="0"
                    onChange={(e) => {
                      if (isNaN(Number(e.target.value))) {
                        return;
                      }
                      bundleSettingsDispatch({
                        type: BundleSettingsActionType.UPDATE_TOP_UP_SELECTION,
                        bundleSettings,
                        digit: Number(e.target.value),
                        strategy: "total",
                        stream: {
                          existingAnnualNetworkFee,
                          newAnnualNetworkFee,
                          totalNetworkStream,
                        },
                      });
                    }}
                    onBlur={() => {
                      if (
                        !bundleSettings.topUpTotalDigitsSelection ||
                        bundleSettings.topUpTotalDigitsSelection == 0
                      ) {
                        bundleSettingsDispatch({
                          type: BundleSettingsActionType.UPDATE_BUNDLE_SETTINGS,
                          bundleSettings: {
                            ...bundleSettings,
                            wrapAll: true,
                            topUpStrategy: "",
                          },
                        });
                      }
                    }}
                  />
                </InputGroup>
                <Button
                  disabled={!bundleSettings.isSponsored}
                  variant={
                    !bundleSettings.isSponsored
                      ? "outline-info"
                      : bundleSettings.topUpStrategy === "total"
                      ? "outline-primary"
                      : "outline-light"
                  }
                  className="d-flex justify-content-center align-items-end mb-1 px-5 w-25 shadow-none btn-wrap-strategy"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowTopUpTotalDropDown(!showTopUpTotalDropDown);

                    setShowTopUpSingleDropDown(false);
                  }}
                >
                  <span
                    className={
                      !bundleSettings.isSponsored
                        ? "text-info"
                        : bundleSettings.topUpStrategy === "total"
                        ? "text-primary"
                        : "text-light"
                    }
                  >
                    {bundleSettings.topUpTotalSelection}
                  </span>
                  <Image
                    src={`${
                      !bundleSettings.isSponsored
                        ? "expand-more-info.svg"
                        : bundleSettings.topUpStrategy === "total"
                        ? "expand-more-primary.svg"
                        : "expand-more-light.svg"
                    }`}
                    alt="expand"
                    width={18}
                  />
                </Button>
                {showTopUpTotalDropDown && (
                  <div
                    className="d-flex flex-column gap-1 position-absolute px-2 py-1 bg-light rounded-2"
                    style={{
                      right:
                        direction === "row" && isDesktop
                          ? 420
                          : isMobile
                          ? 24
                          : 30,
                      top:
                        direction === "row" && isDesktop
                          ? 226
                          : isMobile
                          ? 325
                          : 309,
                    }}
                  >
                    <span
                      className="text-black px-3 rounded-2 cursor-pointer dropdown-selected"
                      onClick={() =>
                        bundleSettingsDispatch({
                          type: BundleSettingsActionType.UPDATE_WRAP_AMOUNT,
                          bundleSettings,
                          strategy: "total",
                          dropDownSelection: TopUpDropDownSelection.DAYS,
                          digit: bundleSettings.topUpTotalDigitsSelection,
                          stream: {
                            existingAnnualNetworkFee,
                            newAnnualNetworkFee,
                            totalNetworkStream,
                          },
                        })
                      }
                    >
                      Days
                    </span>
                    <span
                      className="text-black px-3 rounded-2 cursor-pointer dropdown-selected"
                      onClick={() =>
                        bundleSettingsDispatch({
                          type: BundleSettingsActionType.UPDATE_WRAP_AMOUNT,
                          bundleSettings,
                          strategy: "total",
                          dropDownSelection: TopUpDropDownSelection.WEEKS,
                          digit: bundleSettings.topUpTotalDigitsSelection,
                          stream: {
                            existingAnnualNetworkFee,
                            newAnnualNetworkFee,
                            totalNetworkStream,
                          },
                        })
                      }
                    >
                      Weeks
                    </span>
                    <span
                      className="text-black px-3 rounded-2 cursor-pointer dropdown-selected"
                      onClick={() =>
                        bundleSettingsDispatch({
                          type: BundleSettingsActionType.UPDATE_WRAP_AMOUNT,
                          bundleSettings,
                          strategy: "total",
                          dropDownSelection: TopUpDropDownSelection.MONTHS,
                          digit: bundleSettings.topUpTotalDigitsSelection,
                          stream: {
                            existingAnnualNetworkFee,
                            newAnnualNetworkFee,
                            totalNetworkStream,
                          },
                        })
                      }
                    >
                      Months
                    </span>
                    <span
                      className="text-black px-3 rounded-2 cursor-pointer dropdown-selected"
                      onClick={() =>
                        bundleSettingsDispatch({
                          type: BundleSettingsActionType.UPDATE_WRAP_AMOUNT,
                          bundleSettings,
                          strategy: "total",
                          dropDownSelection: TopUpDropDownSelection.YEARS,
                          digit: bundleSettings.topUpTotalDigitsSelection,
                          stream: {
                            existingAnnualNetworkFee,
                            newAnnualNetworkFee,
                            totalNetworkStream,
                          },
                        })
                      }
                    >
                      Years
                    </span>
                  </div>
                )}
              </div>
            </div>
            <div className="d-flex flex-column gap-1">
              <span
                className={
                  !bundleSettings.isSponsored
                    ? "text-info"
                    : bundleSettings.topUpStrategy === "single"
                    ? "text-primary"
                    : "text-light"
                }
              >
                Per Parcel Top-Up
              </span>
              <div className="d-flex justify-content-between align-items-center gap-2 mb-3">
                <InputGroup className="mb-2 mt-1 rounded-3">
                  <Form.Control
                    disabled={!bundleSettings.isSponsored}
                    type="text"
                    inputMode="numeric"
                    className={`bg-dark ${
                      !bundleSettings.isSponsored
                        ? "border-info"
                        : bundleSettings.topUpStrategy === "single"
                        ? "border-primary"
                        : "border-light"
                    } ${
                      !bundleSettings.isSponsored
                        ? "text-info"
                        : bundleSettings.topUpStrategy === "single"
                        ? "text-primary"
                        : "text-light"
                    }`}
                    value={
                      bundleSettings.topUpStrategy === "single"
                        ? bundleSettings.topUpSingleDigitsSelection
                        : ""
                    }
                    onChange={(e) => {
                      if (isNaN(Number(e.target.value))) {
                        return;
                      }
                      bundleSettingsDispatch({
                        type: BundleSettingsActionType.UPDATE_TOP_UP_SELECTION,
                        bundleSettings,
                        digit: Number(e.target.value),
                        strategy: "single",
                        stream: {
                          existingAnnualNetworkFee,
                          newAnnualNetworkFee,
                          totalNetworkStream,
                        },
                      });
                    }}
                    placeholder="0"
                    onBlur={() => {
                      if (
                        !bundleSettings.topUpSingleDigitsSelection ||
                        bundleSettings.topUpSingleDigitsSelection == 0
                      ) {
                        bundleSettingsDispatch({
                          type: BundleSettingsActionType.UPDATE_BUNDLE_SETTINGS,
                          bundleSettings: {
                            ...bundleSettings,
                            wrapAll: true,
                            topUpStrategy: "",
                          },
                        });
                      }
                    }}
                  />
                </InputGroup>
                <Button
                  variant={
                    !bundleSettings.isSponsored
                      ? "outline-info"
                      : bundleSettings.topUpStrategy === "single"
                      ? "outline-primary"
                      : "outline-light"
                  }
                  disabled={!bundleSettings.isSponsored}
                  title="Days"
                  className="d-flex justify-content-center align-items-end mb-1 px-5 w-25 shadow-none btn-wrap-strategy"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowTopUpSingleDropDown(!showTopUpSingleDropDown);
                    setShowTopUpTotalDropDown(false);
                  }}
                >
                  <span
                    className={
                      !bundleSettings.isSponsored
                        ? "text-info"
                        : bundleSettings.topUpStrategy === "single"
                        ? "text-primary"
                        : "text-light"
                    }
                  >
                    {bundleSettings.topUpSingleSelection}
                  </span>
                  <Image
                    src={`${
                      !bundleSettings.isSponsored
                        ? "expand-more-info.svg"
                        : bundleSettings.topUpStrategy === "single"
                        ? "expand-more-primary.svg"
                        : "expand-more-light.svg"
                    }`}
                    alt="expand"
                    width={18}
                  />
                </Button>
                {showTopUpSingleDropDown && (
                  <div
                    className="d-flex flex-column gap-1 position-absolute px-2 py-1 bg-light rounded-2"
                    style={{
                      right:
                        direction === "row" && isDesktop
                          ? 30
                          : isMobile
                          ? 24
                          : 30,
                      top:
                        direction === "row" && isDesktop
                          ? 226
                          : isMobile
                          ? 402
                          : 386,
                    }}
                  >
                    <span
                      className="text-black px-3 rounded-2 cursor-pointer dropdown-selected"
                      onClick={() =>
                        bundleSettingsDispatch({
                          type: BundleSettingsActionType.UPDATE_WRAP_AMOUNT,
                          bundleSettings,
                          strategy: "single",
                          dropDownSelection: TopUpDropDownSelection.DAYS,
                          digit: bundleSettings.topUpSingleDigitsSelection,
                          stream: {
                            existingAnnualNetworkFee,
                            newAnnualNetworkFee,
                            totalNetworkStream,
                          },
                        })
                      }
                    >
                      Days
                    </span>
                    <span
                      className="text-black px-3 rounded-2 cursor-pointer dropdown-selected"
                      onClick={() =>
                        bundleSettingsDispatch({
                          type: BundleSettingsActionType.UPDATE_WRAP_AMOUNT,
                          bundleSettings,
                          strategy: "single",
                          dropDownSelection: TopUpDropDownSelection.WEEKS,
                          digit: bundleSettings.topUpSingleDigitsSelection,
                          stream: {
                            existingAnnualNetworkFee,
                            newAnnualNetworkFee,
                            totalNetworkStream,
                          },
                        })
                      }
                    >
                      Weeks
                    </span>
                    <span
                      className="text-black px-3 rounded-2 cursor-pointer dropdown-selected"
                      onClick={() =>
                        bundleSettingsDispatch({
                          type: BundleSettingsActionType.UPDATE_WRAP_AMOUNT,
                          bundleSettings,
                          strategy: "single",
                          dropDownSelection: TopUpDropDownSelection.MONTHS,
                          digit: bundleSettings.topUpSingleDigitsSelection,
                          stream: {
                            existingAnnualNetworkFee,
                            newAnnualNetworkFee,
                            totalNetworkStream,
                          },
                        })
                      }
                    >
                      Months
                    </span>
                    <span
                      className="text-black px-3 rounded-2 cursor-pointer dropdown-selected"
                      onClick={() =>
                        bundleSettingsDispatch({
                          type: BundleSettingsActionType.UPDATE_WRAP_AMOUNT,
                          bundleSettings,
                          strategy: "single",
                          dropDownSelection: TopUpDropDownSelection.YEARS,
                          digit: bundleSettings.topUpSingleDigitsSelection,
                          stream: {
                            existingAnnualNetworkFee,
                            newAnnualNetworkFee,
                            totalNetworkStream,
                          },
                        })
                      }
                    >
                      Years
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
          <span
            className={!bundleSettings.isSponsored ? "text-info" : ""}
            style={{ fontSize: "0.7rem" }}
          >
            Note: If you don't have enough ETH for your chosen strategy with a
            proposed transaction, we'll wrap your full balance and show a
            warning.
          </span>
        </Card.Body>
      </Card>
    </>
  );
}

export default TransactionsBundleSettingsView;
