import { useState, useEffect } from "react";
import { ethers, BigNumber } from "ethers";
import Safe from "@safe-global/protocol-kit";
import { useDisconnect } from "wagmi";
import { RampInstantSDK } from "@ramp-network/ramp-instant-sdk";
import Button from "react-bootstrap/Button";
import Modal from "react-bootstrap/Modal";
import Image from "react-bootstrap/Image";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import ToggleButton from "react-bootstrap/ToggleButton";
import ToggleButtonGroup from "react-bootstrap/ToggleButtonGroup";
import Tooltip from "react-bootstrap/Tooltip";
import Card from "react-bootstrap/Card";
import Form from "react-bootstrap/Form";
import InputGroup from "react-bootstrap/InputGroup";
import Dropdown from "react-bootstrap/Dropdown";
import DropdownButton from "react-bootstrap/DropdownButton";
import DropdownMenu from "react-bootstrap/DropdownMenu";
import Spinner from "react-bootstrap/Spinner";
import InfoTooltip from "./InfoTooltip";
import { useMediaQuery } from "../lib/mediaQuery";
import { useSafe } from "../lib/safe";
import { SmartAccount } from "../pages/index";
import { truncateEth } from "../lib/truncate";

type TransactionBundleConfigModalProps = {
  show: boolean;
  handleClose: () => void;
  smartAccount: SmartAccount;
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
  wrapAmount: BigNumber;
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
    transactionBundleConfig,
    setTransactionBundleConfig,
    existingAnnualNetworkFee,
    newAnnualNetworkFee,
  } = props;

  const [daysTopUpTotalFlow, setDaysTopUpTotalFlow] = useState<number>(0);
  const [daysTopUpSingleFLow, setDaysTopUpSingleFlow] = useState<number>(0);
  const [topUpTotalDigitsSelection, setTopUpTotalDigitsSelection] =
    useState<number>(0);
  const [topUpSingleDigitsSelection, setTopUpSingleDigitsSelection] =
    useState<number>(0);
  const [showTopUpTotalDropDown, setShowTopUpTotalDropDown] =
    useState<boolean>(false);
  const [showTopUpSingleDropDown, setShowTopUpSingleDropDown] =
    useState<boolean>(false);
  const [topUpTotalSelection, setTopUpTotalSelection] =
    useState<TopUpDropDownSelection>(TopUpDropDownSelection.DAYS);
  const [topUpSingleSelection, setTopUpSingleSelection] =
    useState<TopUpDropDownSelection>(TopUpDropDownSelection.DAYS);
  const [topUpStrategy, setTopUpStrategy] = useState<string>("");

  const { isMobile, isTablet } = useMediaQuery();

  const handleTopUpChange = (e: React.ChangeEvent<any>, strategy: string) => {
    if (isNaN(e.target.value)) {
      return;
    }

    const digit = Number(e.target.value);
    let daysTopUp = 0;

    switch (strategy === "total" ? topUpTotalSelection : topUpSingleSelection) {
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
      const wrapAmount =
        existingAnnualNetworkFee && newAnnualNetworkFee
          ? newAnnualNetworkFee.div(365).mul(Math.ceil(daysTopUp))
          : BigNumber.from(0);
      setTransactionBundleConfig({
        ...transactionBundleConfig,
        wrapAll: false,
        noWrap: false,
        wrapAmount,
      });
      setTopUpTotalDigitsSelection(e.target.value);
      setTopUpStrategy(strategy);
    } else if (strategy === "single") {
      const wrapAmount =
        existingAnnualNetworkFee && newAnnualNetworkFee
          ? newAnnualNetworkFee
              .div(365)
              .sub(existingAnnualNetworkFee)
              .mul(Math.ceil(daysTopUp))
          : BigNumber.from(0);
      setTransactionBundleConfig({
        ...transactionBundleConfig,
        wrapAll: false,
        noWrap: false,
        wrapAmount,
      });
      setTopUpSingleDigitsSelection(e.target.value);
      setTopUpStrategy(strategy);
    }
  };

  return (
    <Modal
      show={show}
      onHide={handleClose}
      centered
      onClick={() => {
        setShowTopUpTotalDropDown(false);
        setShowTopUpSingleDropDown(false);
      }}
    >
      <Modal.Header className="bg-dark border-0 pb-1">
        <Modal.Title className="d-flex align-items-center gap-3 fw-bold text-light fs-4">
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
        <div className="form-check d-flex align-items-center gap-2 ms-3 ms-sm-0">
          <input
            checked={transactionBundleConfig.isSponsored}
            aria-label="Checkbox to choose if payment denominated in ETHx or ETH"
            className="form-check-input"
            type="checkbox"
            style={{ width: 24, height: 24 }}
            onClick={(e) =>
              setTransactionBundleConfig({
                ...transactionBundleConfig,
                isSponsored: !transactionBundleConfig.isSponsored,
                noWrap: true,
              })
            }
          />
          <label className="form-check-label" htmlFor="flexCheckDefault">
            Enable transaction sponsoring + refunding
          </label>
        </div>
        <Card
          border="dark"
          className={`bg-blue mt-3 pb-2 ${isMobile ? "" : "rounded-4"} ${
            !transactionBundleConfig.isSponsored ? "opacity-50" : ""
          }`}
        >
          <Card.Body>
            <Button
              variant={transactionBundleConfig.isSponsored ? "primary" : "info"}
              disabled={!transactionBundleConfig.isSponsored}
              className={`w-100 p-2 rounded-3 mb-3 ${
                transactionBundleConfig.wrapAll ? "opacity-100" : "opacity-50"
              }`}
              onClick={() =>
                setTransactionBundleConfig({
                  ...transactionBundleConfig,
                  wrapAll: true,
                  noWrap: false,
                })
              }
            >
              Auto-wrap all ETH to ETHx
            </Button>
            <Button
              variant="secondary"
              disabled={!transactionBundleConfig.isSponsored}
              className={`w-100 p-2 rounded-3 mb-3 ${
                transactionBundleConfig.noWrap ? "opacity-100" : "opacity-50"
              }`}
              onClick={() =>
                setTransactionBundleConfig({
                  ...transactionBundleConfig,
                  noWrap: true,
                  wrapAll: false,
                })
              }
            >
              Don't auto-wrap any ETH to ETHx
            </Button>
            <span>Balance Top-up (based on your total ETHx outflow)</span>
            <div className="d-flex justify-content-between align-items-center gap-2 mb-2">
              <InputGroup className="mb-2 mt-1 rounded-3">
                <Form.Control
                  disabled={!transactionBundleConfig.isSponsored}
                  type="text"
                  inputMode="numeric"
                  value={
                    topUpStrategy === "total" ? topUpTotalDigitsSelection : "0"
                  }
                  placeholder="0"
                  aria-label="Username"
                  aria-describedby="basic-addon1"
                  onChange={(e) => handleTopUpChange(e, "total")}
                />
              </InputGroup>
              <Button
                disabled={!transactionBundleConfig.isSponsored}
                variant="light"
                className="d-flex align-items-end mb-1 px-4 w-25"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowTopUpTotalDropDown(!showTopUpTotalDropDown);

                  setShowTopUpSingleDropDown(false);
                }}
              >
                <span className="text-black">{topUpTotalSelection}</span>
                <Image src="expand-more.svg" alt="expand" width={18} />
              </Button>
              {showTopUpTotalDropDown && (
                <div
                  className="d-flex flex-column gap-1 position-absolute px-2 py-2 bg-light rounded-2"
                  style={{
                    right: 15,
                    top: isMobile ? 230 : 205,
                  }}
                >
                  <span
                    className="text-black px-3 rounded-2 cursor-pointer dropdown-selected"
                    onClick={() =>
                      setTopUpTotalSelection(TopUpDropDownSelection.DAYS)
                    }
                  >
                    Days
                  </span>
                  <span
                    className="text-black px-3 rounded-2 cursor-pointer dropdown-selected"
                    onClick={() =>
                      setTopUpTotalSelection(TopUpDropDownSelection.WEEKS)
                    }
                  >
                    Weeks
                  </span>
                  <span
                    className="text-black px-3 rounded-2 cursor-pointer dropdown-selected"
                    onClick={() =>
                      setTopUpTotalSelection(TopUpDropDownSelection.MONTHS)
                    }
                  >
                    Months
                  </span>
                  <span
                    className="text-black px-3 rounded-2 cursor-pointer dropdown-selected"
                    onClick={() =>
                      setTopUpTotalSelection(TopUpDropDownSelection.YEARS)
                    }
                  >
                    Years
                  </span>
                </div>
              )}
            </div>
            <span>
              Per Parcel Top-Up (based on the ETHx outflow in the transaction)
            </span>
            <div className="d-flex justify-content-between align-items-center gap-2 mb-2">
              <InputGroup className="mb-2 mt-1 rounded-3">
                <Form.Control
                  disabled={!transactionBundleConfig.isSponsored}
                  type="text"
                  inputMode="numeric"
                  value={
                    topUpStrategy === "single"
                      ? topUpSingleDigitsSelection
                      : "0"
                  }
                  onChange={(e) => handleTopUpChange(e, "single")}
                  placeholder="0"
                  aria-label="Username"
                  aria-describedby="basic-addon1"
                />
              </InputGroup>
              <Button
                variant="light"
                disabled={!transactionBundleConfig.isSponsored}
                title={`Days`}
                className="d-flex align-items-end mb-1 px-4 w-25"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowTopUpSingleDropDown(!showTopUpSingleDropDown);
                  setShowTopUpTotalDropDown(false);
                }}
              >
                <span className="text-black">{topUpSingleSelection}</span>
                <Image src="expand-more.svg" alt="expand" width={18} />
              </Button>
              {showTopUpSingleDropDown && (
                <div
                  className="d-flex flex-column gap-1 position-absolute px-2 py-1 bg-light rounded-2"
                  style={{
                    right: 15,
                    top: isMobile ? 335 : 285,
                  }}
                >
                  <span
                    className="text-black px-3 rounded-2 cursor-pointer dropdown-selected"
                    onClick={() =>
                      setTopUpSingleSelection(TopUpDropDownSelection.DAYS)
                    }
                  >
                    Days
                  </span>
                  <span
                    className="text-black px-3 rounded-2 cursor-pointer dropdown-selected"
                    onClick={() =>
                      setTopUpSingleSelection(TopUpDropDownSelection.WEEKS)
                    }
                  >
                    Weeks
                  </span>
                  <span
                    className="text-black px-3 rounded-2 cursor-pointer dropdown-selected"
                    onClick={() =>
                      setTopUpSingleSelection(TopUpDropDownSelection.MONTHS)
                    }
                  >
                    Months
                  </span>
                  <span
                    className="text-black px-3 rounded-2 cursor-pointer dropdown-selected"
                    onClick={() =>
                      setTopUpSingleSelection(TopUpDropDownSelection.YEARS)
                    }
                  >
                    Years
                  </span>
                </div>
              )}
            </div>
            <small className="mb-2">
              Note: If you don't have enough ETH for your chosen strategy with a
              proposed transaction, we'll wrap your full balance and show a
              warning.
            </small>
          </Card.Body>
        </Card>
      </Modal.Body>
    </Modal>
  );
}

export default TransactionBundleConfigModal;
