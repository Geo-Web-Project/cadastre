import { useState, useMemo } from "react";
import { BigNumber } from "ethers";
import { NativeAssetSuperToken } from "@superfluid-finance/sdk-core";
import { sfSubgraph } from "../redux/store";
import Button from "react-bootstrap/Button";
import Modal from "react-bootstrap/Modal";
import Image from "react-bootstrap/Image";
import Card from "react-bootstrap/Card";
import Form from "react-bootstrap/Form";
import InputGroup from "react-bootstrap/InputGroup";
import InfoTooltip from "./InfoTooltip";
import { useMediaQuery } from "../lib/mediaQuery";
import { SmartAccount } from "../pages/index";
import { NETWORK_ID, SECONDS_IN_YEAR } from "../lib/constants";

type TransactionBundleConfigModalProps = {
  show: boolean;
  handleClose: () => void;
  smartAccount: SmartAccount;
  paymentToken: NativeAssetSuperToken;
  transactionBundleConfig: TransactionBundleConfig;
  setTransactionBundleConfig: React.Dispatch<
    React.SetStateAction<TransactionBundleConfig>
  >;
  existingAnnualNetworkFee?: BigNumber;
  newAnnualNetworkFee: BigNumber | null;
};

export interface TransactionBundleConfig {
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

enum TopUpDropDownSelection {
  DAYS = "Days",
  WEEKS = "Weeks",
  MONTHS = "Months",
  YEARS = "Years",
}

function TransactionBundleConfigModal(
  props: TransactionBundleConfigModalProps
) {
  const {
    show,
    handleClose,
    smartAccount,
    paymentToken,
    transactionBundleConfig,
    setTransactionBundleConfig,
    existingAnnualNetworkFee,
    newAnnualNetworkFee,
  } = props;

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
  const { isMobile } = useMediaQuery();

  const totalNetworkStream =
    accountTokenSnapshot?.data[0].totalOutflowRate ?? "";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleTopUpChange = (e: any, strategy: string) => {
    if (isNaN(e.target.value)) {
      return;
    }
    const dropDownSelection =
      strategy === "total"
        ? transactionBundleConfig.topUpTotalSelection
        : transactionBundleConfig.topUpSingleSelection;

    updateWrapAmount(strategy, dropDownSelection, Number(e.target.value));
  };

  const saveTransactionBundleConfig = (
    newTransactionBundleConfig: TransactionBundleConfig
  ) => {
    setTransactionBundleConfig(newTransactionBundleConfig);
    localStorage.setItem(
      "transactionBundleConfig",
      JSON.stringify(newTransactionBundleConfig)
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
      saveTransactionBundleConfig({
        ...transactionBundleConfig,
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
      saveTransactionBundleConfig({
        ...transactionBundleConfig,
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
    if (newAnnualNetworkFee && transactionBundleConfig.topUpStrategy) {
      const digit =
        transactionBundleConfig.topUpStrategy === "total"
          ? transactionBundleConfig.topUpTotalDigitsSelection
          : transactionBundleConfig.topUpSingleDigitsSelection;
      const dropDownSelection =
        transactionBundleConfig.topUpStrategy === "total"
          ? transactionBundleConfig.topUpTotalSelection
          : transactionBundleConfig.topUpSingleSelection;

      updateWrapAmount(
        transactionBundleConfig.topUpStrategy,
        dropDownSelection,
        digit
      );
    }
  }, [newAnnualNetworkFee?._hex, transactionBundleConfig.topUpStrategy]);

  return (
    <Modal
      show={show}
      onHide={handleClose}
      centered
      onClick={() => {
        setShowTopUpTotalDropDown(false);
        setShowTopUpSingleDropDown(false);
      }}
      contentClassName="bg-dark"
    >
      <Modal.Header className="bg-dark border-0 pb-2">
        <Modal.Title className="d-flex align-items-center gap-3 fw-bold text-light fs-4 ms-1">
          ETH : ETHx Settings
          <InfoTooltip
            position={{ top: isMobile, right: !isMobile }}
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
              <Image src="info.svg" alt="info" width={28} className="mb-1" />
            }
          />
        </Modal.Title>
        <Button
          size="sm"
          variant="link"
          className="d-flex shadow-none p-1"
          onClick={handleClose}
        >
          <Image src="close.svg" alt="close" width={28} />
        </Button>
      </Modal.Header>
      <Modal.Body className="d-flex flex-column justify-content-center bg-dark text-light p-0 p-lg-3 mb-lg-0">
        <div className="form-check d-flex align-items-center gap-2 ms-3 ms-sm-1">
          <input
            defaultChecked={transactionBundleConfig.isSponsored}
            aria-label="Checkbox to choose if payment denominated in ETHx or ETH"
            className="form-check-input"
            type="checkbox"
            style={{ width: 24, height: 24 }}
            onClick={() => {
              saveTransactionBundleConfig({
                ...transactionBundleConfig,
                isSponsored: !transactionBundleConfig.isSponsored,
                wrapAll: !transactionBundleConfig.isSponsored,
                noWrap: transactionBundleConfig.isSponsored ? true : false,
                topUpStrategy: "",
              });
            }}
          />
          <label className="form-check-label" htmlFor="flexCheckDefault">
            Enable transaction sponsoring + refunding
          </label>
        </div>
        <Card
          border="secondary"
          className={`bg-dark mt-4 mb-2 p-3 ${isMobile ? "" : "rounded-4"}`}
        >
          <small
            className="position-absolute bg-dark px-1 text-secondary"
            style={{ left: 25, top: -12 }}
          >
            {" "}
            Auto-Wrapping
          </small>
          <Card.Body className="pb-1">
            <Button
              variant={
                transactionBundleConfig.wrapAll
                  ? "outline-primary"
                  : transactionBundleConfig.isSponsored
                  ? "outline-light"
                  : "outline-info"
              }
              disabled={!transactionBundleConfig.isSponsored}
              className="w-100 p-2 rounded-3 mb-3 shadow-none btn-wrap-strategy"
              onClick={() => {
                saveTransactionBundleConfig({
                  ...transactionBundleConfig,
                  wrapAll: true,
                  noWrap: false,
                  wrapAmount: "0",
                  topUpStrategy: "",
                });
              }}
            >
              <span
                className={
                  transactionBundleConfig.wrapAll
                    ? "text-primary"
                    : transactionBundleConfig.isSponsored
                    ? "text-light"
                    : "text-info"
                }
              >
                Auto-wrap all ETH to ETHx
              </span>
            </Button>
            <Button
              variant={
                transactionBundleConfig.noWrap &&
                transactionBundleConfig.isSponsored
                  ? "outline-primary"
                  : transactionBundleConfig.isSponsored
                  ? "outline-light"
                  : "outline-info"
              }
              disabled={!transactionBundleConfig.isSponsored}
              className="w-100 p-2 rounded-3 mb-3 shadow-none btn-wrap-strategy"
              onClick={() => {
                saveTransactionBundleConfig({
                  ...transactionBundleConfig,
                  noWrap: true,
                  wrapAll: false,
                  wrapAmount: "0",
                  topUpStrategy: "",
                });
              }}
            >
              <span
                className={
                  transactionBundleConfig.noWrap &&
                  transactionBundleConfig.isSponsored
                    ? "text-primary"
                    : transactionBundleConfig.isSponsored
                    ? "text-light"
                    : "text-info"
                }
              >
                Don't auto-wrap any ETH to ETHx
              </span>
            </Button>
            <span
              className={
                !transactionBundleConfig.isSponsored
                  ? "text-info"
                  : transactionBundleConfig.topUpStrategy === "total"
                  ? "text-primary"
                  : "text-light"
              }
            >
              Total Balance Top-up
            </span>
            <div className="d-flex justify-content-between align-items-center gap-2 mb-0">
              <InputGroup className="mb-2 mt-1 rounded-3">
                <Form.Control
                  disabled={!transactionBundleConfig.isSponsored}
                  type="text"
                  inputMode="numeric"
                  className={`bg-dark ${
                    !transactionBundleConfig.isSponsored
                      ? "border-info"
                      : transactionBundleConfig.topUpStrategy === "total"
                      ? "border-primary"
                      : "border-light"
                  } ${
                    !transactionBundleConfig.isSponsored
                      ? "text-info"
                      : transactionBundleConfig.topUpStrategy === "total"
                      ? "text-primary"
                      : "text-light"
                  }`}
                  value={
                    transactionBundleConfig.topUpStrategy === "total"
                      ? transactionBundleConfig.topUpTotalDigitsSelection
                      : ""
                  }
                  placeholder="0"
                  onChange={(e) => handleTopUpChange(e, "total")}
                  onBlur={() => {
                    if (
                      !transactionBundleConfig.topUpTotalDigitsSelection ||
                      transactionBundleConfig.topUpTotalDigitsSelection == 0
                    ) {
                      saveTransactionBundleConfig({
                        ...transactionBundleConfig,
                        wrapAll: true,
                        topUpStrategy: "",
                      });
                    }
                  }}
                />
              </InputGroup>
              <Button
                disabled={!transactionBundleConfig.isSponsored}
                variant={
                  !transactionBundleConfig.isSponsored
                    ? "outline-info"
                    : transactionBundleConfig.topUpStrategy === "total"
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
                    !transactionBundleConfig.isSponsored
                      ? "text-info"
                      : transactionBundleConfig.topUpStrategy === "total"
                      ? "text-primary"
                      : "text-light"
                  }
                >
                  {transactionBundleConfig.topUpTotalSelection}
                </span>
                <Image
                  src={`${
                    !transactionBundleConfig.isSponsored
                      ? "expand-more-info.svg"
                      : transactionBundleConfig.topUpStrategy === "total"
                      ? "expand-more-primary.svg"
                      : "expand-more-light.svg"
                  }`}
                  alt="expand"
                  width={18}
                />
              </Button>
              {showTopUpTotalDropDown && (
                <div
                  className="d-flex flex-column gap-1 position-absolute px-2 py-2 bg-light rounded-2"
                  style={{
                    right: 30,
                    top: isMobile ? 218 : 218,
                  }}
                >
                  <span
                    className="text-black px-3 rounded-2 cursor-pointer dropdown-selected"
                    onClick={() =>
                      updateWrapAmount(
                        "total",
                        TopUpDropDownSelection.DAYS,
                        transactionBundleConfig.topUpTotalDigitsSelection
                      )
                    }
                  >
                    Days
                  </span>
                  <span
                    className="text-black px-3 rounded-2 cursor-pointer dropdown-selected"
                    onClick={() =>
                      updateWrapAmount(
                        "total",
                        TopUpDropDownSelection.WEEKS,
                        transactionBundleConfig.topUpTotalDigitsSelection
                      )
                    }
                  >
                    Weeks
                  </span>
                  <span
                    className="text-black px-3 rounded-2 cursor-pointer dropdown-selected"
                    onClick={() =>
                      updateWrapAmount(
                        "total",
                        TopUpDropDownSelection.MONTHS,
                        transactionBundleConfig.topUpTotalDigitsSelection
                      )
                    }
                  >
                    Months
                  </span>
                  <span
                    className="text-black px-3 rounded-2 cursor-pointer dropdown-selected"
                    onClick={() =>
                      updateWrapAmount(
                        "total",
                        TopUpDropDownSelection.YEARS,
                        transactionBundleConfig.topUpTotalDigitsSelection
                      )
                    }
                  >
                    Years
                  </span>
                </div>
              )}
            </div>
            <span
              className={
                !transactionBundleConfig.isSponsored
                  ? "text-info"
                  : transactionBundleConfig.topUpStrategy === "single"
                  ? "text-primary"
                  : "text-light"
              }
            >
              Per Parcel Top-Up
            </span>
            <div className="d-flex justify-content-between align-items-center gap-2 mb-3">
              <InputGroup className="mb-2 mt-1 rounded-3">
                <Form.Control
                  disabled={!transactionBundleConfig.isSponsored}
                  type="text"
                  inputMode="numeric"
                  className={`bg-dark ${
                    !transactionBundleConfig.isSponsored
                      ? "border-info"
                      : transactionBundleConfig.topUpStrategy === "single"
                      ? "border-primary"
                      : "border-light"
                  } ${
                    !transactionBundleConfig.isSponsored
                      ? "text-info"
                      : transactionBundleConfig.topUpStrategy === "single"
                      ? "text-primary"
                      : "text-light"
                  }`}
                  value={
                    transactionBundleConfig.topUpStrategy === "single"
                      ? transactionBundleConfig.topUpSingleDigitsSelection
                      : ""
                  }
                  onChange={(e) => handleTopUpChange(e, "single")}
                  placeholder="0"
                  onBlur={() => {
                    if (
                      !transactionBundleConfig.topUpSingleDigitsSelection ||
                      transactionBundleConfig.topUpSingleDigitsSelection == 0
                    ) {
                      saveTransactionBundleConfig({
                        ...transactionBundleConfig,
                        wrapAll: true,
                        topUpStrategy: "",
                      });
                    }
                  }}
                />
              </InputGroup>
              <Button
                variant={
                  !transactionBundleConfig.isSponsored
                    ? "outline-info"
                    : transactionBundleConfig.topUpStrategy === "single"
                    ? "outline-primary"
                    : "outline-light"
                }
                disabled={!transactionBundleConfig.isSponsored}
                title={`Days`}
                className="d-flex justify-content-center align-items-end mb-1 px-5 w-25 shadow-none btn-wrap-strategy"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowTopUpSingleDropDown(!showTopUpSingleDropDown);
                  setShowTopUpTotalDropDown(false);
                }}
              >
                <span
                  className={
                    !transactionBundleConfig.isSponsored
                      ? "text-info"
                      : transactionBundleConfig.topUpStrategy === "single"
                      ? "text-primary"
                      : "text-light"
                  }
                >
                  {transactionBundleConfig.topUpSingleSelection}
                </span>
                <Image
                  src={`${
                    !transactionBundleConfig.isSponsored
                      ? "expand-more-info.svg"
                      : transactionBundleConfig.topUpStrategy === "single"
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
                    right: 30,
                    top: isMobile ? 290 : 289,
                  }}
                >
                  <span
                    className="text-black px-3 rounded-2 cursor-pointer dropdown-selected"
                    onClick={() =>
                      updateWrapAmount(
                        "single",
                        TopUpDropDownSelection.DAYS,
                        transactionBundleConfig.topUpSingleDigitsSelection
                      )
                    }
                  >
                    Days
                  </span>
                  <span
                    className="text-black px-3 rounded-2 cursor-pointer dropdown-selected"
                    onClick={() =>
                      updateWrapAmount(
                        "single",
                        TopUpDropDownSelection.WEEKS,
                        transactionBundleConfig.topUpSingleDigitsSelection
                      )
                    }
                  >
                    Weeks
                  </span>
                  <span
                    className="text-black px-3 rounded-2 cursor-pointer dropdown-selected"
                    onClick={() =>
                      updateWrapAmount(
                        "single",
                        TopUpDropDownSelection.MONTHS,
                        transactionBundleConfig.topUpSingleDigitsSelection
                      )
                    }
                  >
                    Months
                  </span>
                  <span
                    className="text-black px-3 rounded-2 cursor-pointer dropdown-selected"
                    onClick={() =>
                      updateWrapAmount(
                        "single",
                        TopUpDropDownSelection.YEARS,
                        transactionBundleConfig.topUpSingleDigitsSelection
                      )
                    }
                  >
                    Years
                  </span>
                </div>
              )}
            </div>
            <span
              className={
                !transactionBundleConfig.isSponsored ? "text-info" : ""
              }
              style={{ fontSize: "0.7rem" }}
            >
              Note: If you don't have enough ETH for your chosen strategy with a
              proposed transaction, we'll wrap your full balance and show a
              warning.
            </span>
          </Card.Body>
        </Card>
      </Modal.Body>
    </Modal>
  );
}

export default TransactionBundleConfigModal;
