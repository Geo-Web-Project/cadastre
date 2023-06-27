import { useState, useEffect } from "react";
import { BigNumber } from "ethers";
import { MetaTransactionData } from "@safe-global/safe-core-sdk-types";
import {
  getProxyFactoryDeployment,
  getMultiSendCallOnlyDeployment,
} from "@safe-global/safe-deployments";
import Button from "react-bootstrap/Button";
import Image from "react-bootstrap/Image";
import Modal from "react-bootstrap/Modal";
import Accordion from "react-bootstrap/Accordion";
import Spinner from "react-bootstrap/Spinner";
import { SmartAccount } from "../pages/index";
import { formatBalance } from "../lib/formatBalance";
import { truncateEth } from "../lib/truncate";
import { useBundleSettings } from "../lib/transactionBundleSettings";
import { useSafe } from "../lib/safe";
import { NETWORK_ID } from "../lib/constants";

type TransactionBundleDetailsProps = {
  metaTransactions: MetaTransactionData[];
  forSalePrice?: BigNumber;
  transactionBundleFeesEstimate: BigNumber;
  requiredPayment: BigNumber | null;
  requiredFlowAmount: BigNumber | null;
  isActing: boolean;
  isDisabled: boolean;
  submit: () => void;
  smartAccount: SmartAccount;
};

enum FunctionSelector {
  WRAP = "0xcf81464b",
  APPROVE_SPENDING = "0x095ea7b3",
  APPROVE_FLOW = "0x39255d5b",
  CLAIM = "0x059c73ba",
  EDIT_BID = "0x90c33bba",
  RECLAIM = "0x0b4ee502",
  PLACE_BID = "0x00fa6802",
  ACCEPT_BID = "0xe52a7874",
  REJECT_BID = "0x499ca2f5",
}

function TransactionBundleDetails(props: TransactionBundleDetailsProps) {
  const {
    smartAccount,
    metaTransactions,
    transactionBundleFeesEstimate,
    forSalePrice,
    requiredPayment,
    requiredFlowAmount,
    isActing,
    isDisabled,
    submit,
  } = props;
  const { safe } = smartAccount;

  const { encodeSafeDeploymentData, encodeMultiSendData } = useSafe(safe);
  const bundleSettings = useBundleSettings();

  const [showModal, setShowModal] = useState<boolean>(false);
  const [isSafeDeployed, setIsSafeDeployed] = useState<boolean>(false);
  const [safeDeploymentData, setSafeDeploymentData] = useState<string>("0x");
  const [proxyFactoryAddress, setProxyFactoryAddress] = useState<string>("0x");
  const [multiSendAddress, setMultiSendAddress] = useState<string>("0x");

  useEffect(() => {
    (async () => {
      const isSafeDeployed = await safe?.isSafeDeployed();
      setIsSafeDeployed(isSafeDeployed ?? false);

      if (!isSafeDeployed) {
        const safeDeploymentData = await encodeSafeDeploymentData();
        setSafeDeploymentData(safeDeploymentData);
        const proxyFactoryDeployments = getProxyFactoryDeployment();

        if (proxyFactoryDeployments) {
          const proxyFactoryAddress =
            proxyFactoryDeployments.networkAddresses[NETWORK_ID];
          setProxyFactoryAddress(proxyFactoryAddress);
        }
      }

      const multiSendDeployments = getMultiSendCallOnlyDeployment();

      if (multiSendDeployments) {
        const multiSendAddress =
          multiSendDeployments.networkAddresses[NETWORK_ID];
        setMultiSendAddress(multiSendAddress);
      }
    })();
  }, [smartAccount]);

  const getFunctionDescription = (
    metaTx: MetaTransactionData,
    index: number
  ) => {
    const selector = metaTx.data.slice(0, 10);
    let description = "";

    switch (selector) {
      case FunctionSelector.WRAP:
        description = `${index}. Wrap ${truncateEth(
          formatBalance(metaTx.value),
          8
        )} ETH to ETHx`;
        break;
      case FunctionSelector.APPROVE_SPENDING:
        description = `${index}. Authorize ${truncateEth(
          formatBalance(requiredPayment ?? "0"),
          8
        )} ETHx transfer`;
        break;
      case FunctionSelector.APPROVE_FLOW:
        description = `${index}. Set stream authorization to ${truncateEth(
          formatBalance(requiredFlowAmount ?? "0"),
          8
        )} ETHx/year`;
        break;
      case FunctionSelector.CLAIM:
        description = `${index}. Claim Parcel (Send ${truncateEth(
          formatBalance(requiredPayment ?? "0"),
          8
        )} ETHx)`;
        break;
      case FunctionSelector.EDIT_BID:
        description = `${index}. Edit Bid (${
          requiredPayment?.gt(0) ? "Send" : "Receive"
        } ${truncateEth(
          formatBalance(
            requiredPayment?.gt(0)
              ? requiredPayment.mul(2)
              : requiredPayment
              ? requiredPayment.mul(2).mul(-1)
              : "0"
          ),
          8
        )} ETHx)`;
        break;
      case FunctionSelector.RECLAIM:
        description = `${index}. Reclaim Parcel (Send ${truncateEth(
          formatBalance(requiredPayment ?? "0"),
          8
        )} ETHx)`;
        break;
      case FunctionSelector.PLACE_BID:
        description = `${index}. Place Bid (Send ${truncateEth(
          formatBalance(requiredPayment ?? "0"),
          8
        )})`;
        break;
      case FunctionSelector.ACCEPT_BID:
        description = `${index}. Accept Bid (Receive ${truncateEth(
          formatBalance(forSalePrice ?? "0"),
          8
        )} ETHx)`;
        break;
      case FunctionSelector.REJECT_BID:
        description = `${index}. Reject Bid (Send ${truncateEth(
          formatBalance(requiredPayment ?? "0"),
          8
        )})`;
        break;
      default:
        break;
    }

    return description;
  };

  const functionSignature: {
    [key: string]: string;
  } = {
    [FunctionSelector.WRAP]: "upgradeByETH",
    [FunctionSelector.APPROVE_SPENDING]: "approve",
    [FunctionSelector.APPROVE_FLOW]: "callAgreement",
    [FunctionSelector.CLAIM]: "claim",
    [FunctionSelector.EDIT_BID]: "editBid",
    [FunctionSelector.RECLAIM]: "reclaim",
    [FunctionSelector.PLACE_BID]: "placeBid",
    [FunctionSelector.ACCEPT_BID]: "acceptBid",
    [FunctionSelector.REJECT_BID]: "rejectBid",
  };

  return (
    <>
      <Button
        variant="link"
        className="w-100 mt-1 pb-0 text-decoration-none shadow-none"
        onClick={() => setShowModal(true)}
      >
        <span className="m-auto text-primary">Transaction Bundle Preview</span>
      </Button>
      <Modal
        show={showModal}
        onHide={() => setShowModal(false)}
        centered
        contentClassName="bg-dark"
      >
        <Modal.Header className="border-0">
          <Modal.Title className="d-flex align-items-center gap-3 fw-bold text-light fs-4 ms-1">
            Transaction Bundle Details
          </Modal.Title>
          <Button
            size="sm"
            variant="link"
            className="d-flex shadow-none p-1"
            onClick={() => setShowModal(false)}
          >
            <Image src="close.svg" alt="close" width={28} />
          </Button>
        </Modal.Header>
        <Modal.Body className="text-light">
          <Accordion flush>
            {!isSafeDeployed && (
              <Accordion.Item eventKey="0">
                <Accordion.Header>
                  1. Initialize Safe Smart Account
                </Accordion.Header>
                <Accordion.Body className="d-flex flex-column gap-2 overflow-auto">
                  <span className="m-auto fw-bold">createProxyWithNonce</span>
                  <div className="d-flex gap-4">
                    <span>to:</span> <span>{proxyFactoryAddress}</span>
                  </div>
                  <div className="d-flex gap-2" style={{ maxHeight: 100 }}>
                    <span>data:</span>{" "}
                    <span className="text-break">{safeDeploymentData}</span>
                  </div>
                </Accordion.Body>
              </Accordion.Item>
            )}
            {metaTransactions.map((metaTx, i) => (
              <Accordion.Item
                key={i}
                eventKey={`${isSafeDeployed ? i : i + 1}`}
              >
                <Accordion.Header>
                  {getFunctionDescription(
                    metaTx,
                    isSafeDeployed ? i + 1 : i + 2
                  )}
                </Accordion.Header>
                <Accordion.Body className="d-flex flex-column gap-2 overflow-auto">
                  <span className="m-auto fw-bold">
                    {functionSignature[metaTx.data.slice(0, 10)]}
                  </span>
                  <div className="d-flex gap-4">
                    <span>to:</span> <span>{metaTx.to}</span>
                  </div>
                  <div className="d-flex gap-2" style={{ maxHeight: 100 }}>
                    <span>data:</span>{" "}
                    <span className="text-break">{metaTx.data}</span>
                  </div>
                </Accordion.Body>
              </Accordion.Item>
            ))}
            <Accordion.Item
              eventKey={`${
                isSafeDeployed
                  ? metaTransactions.length
                  : metaTransactions.length + 1
              }`}
            >
              <Accordion.Header>
                {isSafeDeployed
                  ? metaTransactions.length + 1
                  : metaTransactions.length + 2}
                . Pay{" "}
                {truncateEth(formatBalance(transactionBundleFeesEstimate), 8)}{" "}
                {bundleSettings.isSponsored ? "ETHx" : "ETH"} for bundle gas
              </Accordion.Header>
              <Accordion.Body className="d-flex flex-column gap-2 overflow-auto">
                <span className="m-auto fw-bold">multiSend</span>
                <div className="d-flex gap-4">
                  <span>to:</span> <span>{multiSendAddress}</span>
                </div>
                <div className="d-flex gap-2" style={{ maxHeight: 100 }}>
                  <span>data</span>{" "}
                  <span className="text-break">
                    {encodeMultiSendData(metaTransactions)}
                  </span>
                </div>
              </Accordion.Body>
            </Accordion.Item>
          </Accordion>
          <Modal.Footer>
            <Button
              variant="primary"
              className="d-flex justify-content-center m-auto me-0 mt-2 px-4"
              disabled={isDisabled}
              onClick={submit}
            >
              {isActing ? (
                <div className="px-3">
                  <Spinner as="span" size="sm" animation="border" role="status">
                    <span className="visually-hidden">Submitting...</span>
                  </Spinner>
                </div>
              ) : (
                <span>Submit</span>
              )}
            </Button>
          </Modal.Footer>
        </Modal.Body>
      </Modal>
    </>
  );
}

export default TransactionBundleDetails;
