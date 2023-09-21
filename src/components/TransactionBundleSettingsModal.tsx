import { useState } from "react";
import { BigNumber } from "ethers";
import { NativeAssetSuperToken } from "@superfluid-finance/sdk-core";
import { sfSubgraph } from "../redux/store";
import Button from "react-bootstrap/Button";
import Modal from "react-bootstrap/Modal";
import Image from "react-bootstrap/Image";
import InfoTooltip from "./InfoTooltip";
import { useMediaQuery } from "../lib/mediaQuery";
import { SmartAccount } from "../pages/index";
import TransactionBundleSettingsView from "./TransactionBundleSettingsView";
import { NETWORK_ID } from "../lib/constants";

type TransactionBundleSettngsModalProps = {
  show: boolean;
  handleClose: () => void;
  smartAccount: SmartAccount;
  paymentToken: NativeAssetSuperToken;
  existingAnnualNetworkFee?: BigNumber;
  newAnnualNetworkFee: BigNumber | null;
};

function TransactionBundleSettngsModal(
  props: TransactionBundleSettngsModalProps
) {
  const {
    show,
    handleClose,
    smartAccount,
    paymentToken,
    existingAnnualNetworkFee,
    newAnnualNetworkFee,
  } = props;

  const [showTopUpTotalDropDown, setShowTopUpTotalDropDown] =
    useState<boolean>(false);
  const [showTopUpSingleDropDown, setShowTopUpSingleDropDown] =
    useState<boolean>(false);

  const { isMobile } = useMediaQuery();
  const { data: accountTokenSnapshot } =
    sfSubgraph.useAccountTokenSnapshotsQuery({
      chainId: NETWORK_ID,
      filter: {
        account: smartAccount?.address ?? "",
        token: paymentToken?.address ?? "",
      },
    });
  const totalNetworkStream = BigNumber.from(
    accountTokenSnapshot?.data[0]?.totalOutflowRate ?? 0
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
        <TransactionBundleSettingsView
          direction="column"
          showTopUpTotalDropDown={showTopUpTotalDropDown}
          setShowTopUpTotalDropDown={setShowTopUpTotalDropDown}
          showTopUpSingleDropDown={showTopUpSingleDropDown}
          setShowTopUpSingleDropDown={setShowTopUpSingleDropDown}
          existingAnnualNetworkFee={
            existingAnnualNetworkFee ?? BigNumber.from(0)
          }
          newAnnualNetworkFee={newAnnualNetworkFee ?? BigNumber.from(0)}
          totalNetworkStream={totalNetworkStream}
        />
      </Modal.Body>
    </Modal>
  );
}

export default TransactionBundleSettngsModal;
