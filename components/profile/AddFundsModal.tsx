import { useState, useEffect } from "react";
import { ethers, BigNumber } from "ethers";
import Safe from "@safe-global/protocol-kit";
import { useDisconnect } from "wagmi";
import { RampInstantSDK } from "@ramp-network/ramp-instant-sdk";
import Button from "react-bootstrap/Button";
import Modal from "react-bootstrap/Modal";
import Image from "react-bootstrap/Image";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Tooltip from "react-bootstrap/Tooltip";
import Spinner from "react-bootstrap/Spinner";
import InfoTooltip from "../InfoTooltip";
import { useMediaQuery } from "../../lib/mediaQuery";
import { useSafe } from "../../lib/safe";
import { SmartAccount } from "../../pages/index";
import { truncateEth } from "../../lib/truncate";
import {
  NETWORK_ID,
  MIN_CLAIM_BALANCE,
  RAMP_HOST_KEY,
} from "../../lib/constants";

interface AddFundsModalProps {
  show: boolean;
  handleClose: () => void;
  smartAccount: SmartAccount;
  setSmartAccount: React.Dispatch<React.SetStateAction<SmartAccount | null>>;
  setIsSafeDeployed?: React.Dispatch<React.SetStateAction<boolean | null>>;
  superTokenBalance: BigNumber;
}

function AddFundsModal(props: AddFundsModalProps) {
  const {
    show,
    handleClose,
    smartAccount,
    setSmartAccount,
    setIsSafeDeployed,
    superTokenBalance,
  } = props;

  const { disconnect } = useDisconnect();
  const { isMobile, isTablet } = useMediaQuery();
  const { deploySafe } = useSafe(smartAccount.safe);

  const [safeBalance, setSafeBalance] = useState<BigNumber>(
    ethers.BigNumber.from(0)
  );
  const [showCopyAddressTooltip, setShowCopyAddressTooltip] =
    useState<boolean>(false);
  const [isDeploying, setIsDeploying] = useState<boolean>(false);
  const [isDeployed, setIsDeployed] = useState<boolean>(false);

  const hasEnoughBalance =
    Number(ethers.utils.formatEther(safeBalance.add(superTokenBalance))) >=
    MIN_CLAIM_BALANCE;

  useEffect(() => {
    if (!smartAccount?.safe) {
      return;
    }

    let timerId: NodeJS.Timer;

    (async () => {
      if (!smartAccount?.safe) {
        return;
      }

      const isDeployed = await smartAccount.safe.isSafeDeployed();
      setIsDeployed(isDeployed);
      const ethAdapter = await smartAccount.safe.getEthAdapter();

      const updateBalance = async () => {
        const balance = await ethAdapter.getBalance(smartAccount.address);
        setSafeBalance(balance);
      };

      (async () => {
        await updateBalance();
      })();

      timerId = setInterval(updateBalance, 10000);
    })();

    return () => clearTimeout(timerId);
  }, []);

  const handleSafeDeployment = async () => {
    if (!smartAccount?.safe || !setIsSafeDeployed) {
      return;
    }

    const { safe, address } = smartAccount;
    const ethAdapter = await safe.getEthAdapter();

    try {
      setIsDeploying(true);
      await deploySafe({ isRefunded: true });
      setIsDeploying(false);
      setIsSafeDeployed(true);
      setSmartAccount({
        ...smartAccount,
        safe: await Safe.create({ ethAdapter, safeAddress: address }),
      });
      handleClose();
    } catch (err) {
      setIsDeploying(false);
      console.error(err);
    }
  };

  return (
    <Modal
      show={show}
      onHide={handleClose}
      centered={!isMobile && !isTablet}
      contentClassName="account-modal add-funds bg-dark"
      dialogClassName="account-modal add-funds"
    >
      <Modal.Header
        className={`border-0 pe-3 pb-0 ${
          isMobile || isTablet ? "bg-blue" : "bg-dark"
        }`}
      >
        <Modal.Title className="m-auto ps-4 fw-bold text-light fs-5">
          Fund Your Smart Account
        </Modal.Title>
        <Button
          size="sm"
          variant="link"
          className="d-flex rounded-circle bg-blue shadow-none p-1"
          onClick={handleClose}
        >
          <Image src="close.svg" alt="close" width={18} />
        </Button>
      </Modal.Header>
      <Modal.Body className="d-flex flex-column justify-content-center bg-dark text-light p-0 p-lg-3 mb-2 mb-lg-0">
        <span
          className={`text-center px-4 p-0 ${
            isMobile || isTablet ? "bg-blue py-3" : ""
          }`}
        >
          We recommend depositing at least {MIN_CLAIM_BALANCE} ETH into your
          smart account address on Optimism for each minimum price land parcel
          claim.
        </span>
        <div className="w-100 rounded-3 text-center pt-2 pb-3 m-auto mt-lg-3">
          {safeBalance ? (
            <div
              className={`${
                !isMobile && !isTablet ? "bg-blue rounded-4 pb-lg-5" : ""
              }`}
            >
              <div className="d-flex justify-content-end pt-1 pt-lg-2 pe-2 pe-lg-0 me-2 mt-lg-0">
                <InfoTooltip
                  content={<span>Disconnect from account</span>}
                  target={
                    <Image
                      src="power-button.svg"
                      alt="disconnect"
                      width={isMobile || isTablet ? 24 : 28}
                      className="cursor-pointer"
                      onClick={() => {
                        setSmartAccount(null);
                        disconnect();
                        handleClose();
                      }}
                    />
                  }
                />
              </div>
              <div className="d-flex justify-content-center gap-2">
                <div className="d-flex flex-column ms-5 ps-4">
                  <span className="fs-2 fw-bold">
                    {truncateEth(ethers.utils.formatEther(safeBalance), 3)} ETH,
                  </span>
                  <span className="fs-2 fw-bold">
                    {truncateEth(
                      ethers.utils.formatEther(superTokenBalance),
                      3
                    )}{" "}
                    ETHx
                  </span>
                </div>
                <Image
                  src="green-checkmark.svg"
                  alt="success"
                  width={64}
                  className={`${hasEnoughBalance ? "visible" : "invisible"}`}
                />
              </div>
              <div
                className="d-flex align-items-center justify-content-center gap-1"
                style={{ fontSize: "0.9rem" }}
              >
                <span className="d-none d-lg-block">Optimism: </span>
                <span>{smartAccount?.address ?? ""}</span>
                <InfoTooltip
                  content={<span>Open in Etherscan</span>}
                  target={
                    <a
                      href={`https://${
                        process.env.NEXT_PUBLIC_APP_ENV === "mainnet"
                          ? "optimistic"
                          : "goerli-optimism"
                      }.etherscan.io/address/${smartAccount.address}`}
                      target="_blank"
                      rel="noreferrer"
                      className="d-flex align-items-center"
                    >
                      <Image
                        src="open-new-tab.svg"
                        alt="open new tab"
                        width={16}
                        className="m-auto"
                      />
                    </a>
                  }
                />
              </div>
            </div>
          ) : (
            <Spinner as="span" animation="border" role="status">
              <span className="visually-hidden">Loading...</span>
            </Spinner>
          )}
        </div>
        <div className="d-flex justify-content-center gap-3 mt-2 px-3 px-lg-0">
          <Button
            variant="secondary"
            className="d-flex justify-content-center gap-1 w-100 rounded-4"
            onClick={() => {
              const rampWidget = new RampInstantSDK({
                hostAppName: "Geo Web Cadastre",
                hostLogoUrl: "https://assets.ramp.network/misc/test-logo.png",
                hostApiKey: RAMP_HOST_KEY,
                variant: isMobile ? "mobile" : "desktop",
                defaultAsset: "OPTIMISM_ETH",
                url: "https://app.demo.ramp.network",
                userAddress: smartAccount?.address ?? "",
                fiatCurrency: "USD",
                fiatValue: "20",
              });
              rampWidget.show();
              if (rampWidget.domNodes?.overlay) {
                rampWidget.domNodes.overlay.style.zIndex = "10000";
              }
            }}
          >
            <Image src="credit-card-light.svg" alt="credit card" width={24} />
            <span className="d-lg-none">Buy ETH</span>
            <span className="d-none d-lg-block">Buy ETH on Optimism</span>
          </Button>
          <OverlayTrigger
            trigger={["click"]}
            show={showCopyAddressTooltip}
            onToggle={() => {
              if (!showCopyAddressTooltip) {
                setShowCopyAddressTooltip(true);
              }
              setTimeout(() => setShowCopyAddressTooltip(false), 2000);
            }}
            placement="top"
            overlay={<Tooltip>Address copied to clipboard</Tooltip>}
          >
            <Button
              variant="primary"
              className="d-flex align-items-center justify-content-center gap-1 w-100 rounded-4"
              onClick={() =>
                navigator.clipboard.writeText(smartAccount?.address ?? "")
              }
            >
              <Image src="copy-light.svg" alt="copy" width={18} />
              <span className="d-none d-lg-block">Copy Deposit Address</span>
              <span className="d-lg-none">Copy Address</span>
            </Button>
          </OverlayTrigger>
        </div>
      </Modal.Body>
      <Modal.Footer className="d-flex justify-content-center p-0 border-0 text-light mb-1">
        {isDeploying ? (
          <Spinner
            as="span"
            size="sm"
            animation="border"
            role="status"
            className="mt-0 mb-2"
          >
            <span className="visually-hidden">Loading...</span>
          </Spinner>
        ) : safeBalance.gt(0) && !isDeployed ? (
          <div
            className="mt-0 mb-2"
            style={{ fontSize: "0.75rem" }}
            onClick={handleSafeDeployment}
          >
            Your smart account will be initialized with your first transaction
            or can be{" "}
            <span className="text-light cursor-pointer underline-hover">
              triggered manually.
            </span>
          </div>
        ) : null}
      </Modal.Footer>
    </Modal>
  );
}

export default AddFundsModal;
