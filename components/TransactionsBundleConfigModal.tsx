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
import TransactionsBundleConfigView from "./TransactionsBundleConfigView";
import {
  TransactionsBundleConfig,
  TopUpDropDownSelection,
  useTransactionsBundleConfig,
} from "../lib/transactionsBundleConfig";
import { NETWORK_ID, SECONDS_IN_YEAR } from "../lib/constants";

type TransactionsBundleConfigModalProps = {
  show: boolean;
  handleClose: () => void;
  smartAccount: SmartAccount;
  paymentToken: NativeAssetSuperToken;
  transactionsBundleConfig: TransactionsBundleConfig;
  setTransactionsBundleConfig: React.Dispatch<
    React.SetStateAction<TransactionsBundleConfig>
  >;
  existingAnnualNetworkFee?: BigNumber;
  newAnnualNetworkFee: BigNumber | null;
};

function TransactionsBundleConfigModal(
  props: TransactionsBundleConfigModalProps
) {
  const {
    show,
    handleClose,
    smartAccount,
    paymentToken,
    transactionsBundleConfig,
    setTransactionsBundleConfig,
    existingAnnualNetworkFee,
    newAnnualNetworkFee,
  } = props;

  const { isMobile } = useMediaQuery();
  const {
    showTopUpTotalDropDown,
    setShowTopUpTotalDropDown,
    showTopUpSingleDropDown,
    setShowTopUpSingleDropDown,
    saveTransactionsBundleConfig,
    updateWrapAmount,
    handleTopUpChange,
  } = useTransactionsBundleConfig(
    smartAccount,
    transactionsBundleConfig,
    setTransactionsBundleConfig,
    paymentToken,
    existingAnnualNetworkFee ?? BigNumber.from(0),
    newAnnualNetworkFee ?? BigNumber.from(0)
  );

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
        <TransactionsBundleConfigView
          direction="column"
          transactionsBundleConfig={transactionsBundleConfig}
          showTopUpTotalDropDown={showTopUpTotalDropDown}
          setShowTopUpTotalDropDown={setShowTopUpTotalDropDown}
          showTopUpSingleDropDown={showTopUpSingleDropDown}
          setShowTopUpSingleDropDown={setShowTopUpSingleDropDown}
          updateWrapAmount={updateWrapAmount}
          saveTransactionsBundleConfig={saveTransactionsBundleConfig}
          handleTopUpChange={handleTopUpChange}
        />
      </Modal.Body>
    </Modal>
  );
}

export default TransactionsBundleConfigModal;
