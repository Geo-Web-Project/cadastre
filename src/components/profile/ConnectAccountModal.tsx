import { useState, useEffect } from "react";
import { ethers } from "ethers";
import Safe, { EthersAdapter } from "@safe-global/protocol-kit";
import Button from "react-bootstrap/Button";
import Modal from "react-bootstrap/Modal";
import Image from "react-bootstrap/Image";
import Spinner from "react-bootstrap/Spinner";
import { useAccount, useSigner, useDisconnect } from "wagmi";
import CopyTooltip from "../CopyTooltip";
import InfoTooltip from "../InfoTooltip";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { SmartAccount, LoginState } from "../../pages/IndexPage";
import { useMediaQuery } from "../../lib/mediaQuery";
import { GW_SAFE_SALT_NONCE } from "../../lib/constants";

type ConnectAccountModalProps = {
  showAccountModal: boolean;
  handleOpenModal: () => void;
  handleCloseModal: () => void;
  authStatus: string;
  setSmartAccount: React.Dispatch<React.SetStateAction<SmartAccount | null>>;
};

function ConnectAccountModal(props: ConnectAccountModalProps) {
  const {
    showAccountModal,
    handleOpenModal,
    handleCloseModal,
    setSmartAccount,
    authStatus,
  } = props;

  const [loginState, setLoginState] = useState<LoginState | null>(null);
  const [validSafes, setValidSafes] = useState<string[]>();
  const [gwSafe, setGwSafe] = useState<Safe | null>(null);
  const [hasGwSafe, setHasGwSafe] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const { address } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { data: signer } = useSigner();
  const { isMobile, isTablet } = useMediaQuery();
  const { disconnect } = useDisconnect();

  const ethAdapter = signer
    ? new EthersAdapter({
        ethers,
        signerOrProvider: signer,
      })
    : null;
  const predictedSafe = address
    ? {
        safeAccountConfig: { owners: [address], threshold: 1 },
        safeDeploymentConfig: { saltNonce: GW_SAFE_SALT_NONCE },
      }
    : null;

  useEffect(() => {
    (async () => {
      if (!signer || !address || !authStatus) {
        return;
      }

      if (
        loginState !== null &&
        signer &&
        authStatus === "authenticated" &&
        ethAdapter &&
        predictedSafe
      ) {
        setIsLoading(true);
        handleOpenModal();

        let gwSafe = await Safe.create({
          ethAdapter,
          predictedSafe,
        });
        const predictedSafeAddress = await gwSafe.getAddress();
        const isSafeDeployed = await gwSafe.isSafeDeployed();

        if (isSafeDeployed) {
          gwSafe = await Safe.create({
            ethAdapter,
            safeAddress: predictedSafeAddress,
          });
        }

        setGwSafe(gwSafe);

        if (loginState === LoginState.CONNECTING) {
          /*
           * Endpoint to get the safes associated with an address
           * is only available on Opimism mainnet
           */
          if (import.meta.env.MODE === "mainnet") {
            const safes = await getValidSafes(address);

            if (safes) {
              setLoginState(
                safes.length === 0
                  ? LoginState.FUND
                  : safes.length === 1
                  ? LoginState.CONNECTED
                  : LoginState.SELECT
              );

              if (safes.length > 1) {
                setValidSafes(safes);
                setIsLoading(false);

                return;
              }

              if (safes.includes(predictedSafeAddress)) {
                setHasGwSafe(true);
              }
            }
          } else {
            setLoginState(LoginState.CONNECTED);
          }
        } else if (loginState === LoginState.CREATE) {
          setLoginState(LoginState.FUND);
        }

        setSmartAccount({
          safe: gwSafe,
          loginState: LoginState.CONNECTED,
          address: predictedSafeAddress.toLowerCase(),
        });

        setIsLoading(false);
        handleCloseModal();
      }
    })();
  }, [signer, address, authStatus]);

  const getValidSafes = async (address: string) => {
    if (!ethAdapter) {
      return null;
    }

    try {
      const res = await fetch(
        `https://safe-transaction-optimism.safe.global/api/v1/owners/${address}/safes/`
      );

      if (res.ok) {
        const { safes } = await res.json();
        const validSafes = [];

        for (const safeAddress of safes) {
          const safe = await Safe.create({ ethAdapter, safeAddress });
          const owners = await safe.getOwners();

          if (owners.length === 1) {
            validSafes.push(safeAddress);
          }
        }

        return validSafes;
      } else {
        return null;
      }
    } catch (err) {
      console.error((err as Error).message);
      return null;
    }
  };

  const handleSafeSelection = async (safeAddress: string) => {
    if (ethAdapter) {
      const safe = await Safe.create({ ethAdapter, safeAddress });

      setSmartAccount({
        safe,
        address: safeAddress.toLowerCase(),
        loginState: LoginState.CONNECTED,
      });
    }
  };

  const accountTypeBody = (
    <>
      <div className="d-flex align-content-center gap-3 bg-blue rounded-4 p-3 cursor-pointer">
        <div className="mw-25 h-50 m-auto">
          <Image src="safe-logo.svg" alt="safe" width={isMobile ? 56 : 64} />
        </div>
        <div
          onClick={() => {
            if (openConnectModal) {
              openConnectModal();
            }
            handleCloseModal();
            setLoginState(LoginState.CONNECTING);
          }}
        >
          <p className="fs-5 fw-bold mb-1">Smart Account (Recommended)</p>
          <small
            className="mb-1"
            style={{ fontSize: isMobile ? "0.9rem" : "" }}
          >
            Use your existing crypto wallet as the signer of a smart contract
            wallet. This allows for advanced functionality like transaction
            bundling & gas abstraction.
          </small>{" "}
          <a
            href="https://docs.safe.global/learn/what-is-a-smart-contract-account"
            target="_blank"
            rel="noreferrer"
            className="text-light"
            style={{ fontSize: "0.9rem" }}
            onClick={(e) => e.stopPropagation()}
          >
            Learn more.
          </a>{" "}
          <br />
          <Button
            variant="link"
            className="mb-0 p-0 shadow-none"
            style={{ textDecorationColor: "#2bc1c1" }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (openConnectModal) {
                openConnectModal();
              }
              setLoginState(LoginState.CREATE);
              handleCloseModal();
            }}
          >
            <small
              className="text-primary"
              style={{ fontSize: isMobile ? "0.9rem" : "" }}
            >
              Create a new smart account.
            </small>
          </Button>{" "}
        </div>
      </div>
      <div
        onClick={() => {
          if (openConnectModal) {
            openConnectModal();
          }
          handleCloseModal();
          setSmartAccount({
            safe: null,
            loginState: LoginState.CONNECTED,
            address: "",
          });
        }}
        className="d-flex py-4 align-content-center gap-3 bg-blue rounded-4 p-3 cursor-pointer"
      >
        <div className="m-auto">
          <div className="d-flex gap-2">
            <Image
              src="metamask.svg"
              alt="metamask"
              width={isMobile ? 24 : 28}
              className="rounded-2"
            />
            <Image
              src="coinbase.svg"
              alt="coinbase"
              width={isMobile ? 24 : 28}
              className="rounded-2"
            />
          </div>
          <div className="d-flex gap-2 mt-2">
            <Image
              src="ledger.svg"
              alt="ledger"
              width={isMobile ? 24 : 28}
              className="rounded-2"
            />
            <Image
              src="wallet-connect.svg"
              alt="wallet connect"
              width={isMobile ? 24 : 28}
              className="rounded-2"
            />
          </div>
        </div>
        <div>
          <p className="fs-5 fw-bold m-0 mb-1">Wallet Account</p>
          <small style={{ fontSize: isMobile ? "0.9rem" : "" }}>
            A “traditional” crypto wallet—also known as an Externally Owned
            Account (EOA).
          </small>
        </div>
      </div>
      <div className="text-info px-2">
        <small>
          By continuing to use this application, you agree to Geo Web Network,
          LLC’s{" "}
          <a
            href="https://example.com"
            target="_blank"
            rel="noreferrer"
            className="text-info"
          >
            Terms of Service
          </a>{" "}
          and{" "}
          <a
            href="https://example.com"
            target="_blank"
            rel="noreferrer"
            className="text-info"
          >
            Privacy Policy.
          </a>
        </small>
      </div>
    </>
  );

  const selectAccountBody = (
    <div className="text-center mt-1 mt-lg-0">
      {!hasGwSafe && (
        <div>
          <span className="text-center">
            Select one of the existing Safes associated to your Signer wallet or
          </span>
          <span
            className="text-primary cursor-pointer"
            onClick={async () => {
              setLoginState(LoginState.CONNECTED);
              setSmartAccount({
                safe: gwSafe,
                address: gwSafe
                  ? (await gwSafe.getAddress()).toLowerCase()
                  : "",
                loginState: LoginState.CONNECTED,
              });
              handleCloseModal();
            }}
          >
            {" "}
            create a new one
          </span>
        </div>
      )}
      <div className="d-flex flex-column gap-2 mt-3">
        {validSafes?.map((safeAddress, i) => {
          return (
            <div
              key={i}
              className="d-flex justify-content-center align-items-center gap-2 bg-blue p-2 rounded-3"
            >
              <small
                className="cursor-pointer"
                style={{ fontSize: isMobile ? "0.7rem" : "" }}
                onClick={() => handleSafeSelection(safeAddress)}
              >
                {safeAddress}
              </small>
              <CopyTooltip
                contentClick="Address Copied"
                contentHover="Copy Safe Address"
                target={
                  <Image
                    width={isMobile ? 15 : 17}
                    className="ms-1"
                    src="copy-light.svg"
                  />
                }
                handleCopy={() => navigator.clipboard.writeText(safeAddress)}
              />
              <InfoTooltip
                content={<span>Open in Etherscan</span>}
                target={
                  <a
                    href={`https://optimistic.etherscan.io/address/${safeAddress}`}
                    target="_blank"
                    rel="noreferrer"
                    className="d-flex align-items-center"
                  >
                    <Image
                      src="open-new-tab.svg"
                      alt="open new tab"
                      width={isMobile ? 16 : 18}
                      className="m-auto"
                    />
                  </a>
                }
              />
            </div>
          );
        })}
      </div>
    </div>
  );

  const loadingBody = (
    <div
      className="text-center mt-1 mt-lg-0"
      style={{ height: isMobile || isTablet ? 128 : 256 }}
    >
      <div className="position-absolute bottom-50 start-50 translate-middle">
        <Spinner animation="border" role="status" variant="light">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </div>
    </div>
  );

  return (
    <Modal
      show={showAccountModal}
      centered={!isMobile && !isTablet}
      contentClassName="account-modal bg-dark"
      dialogClassName="account-modal"
    >
      <Modal.Header
        className={`d-flex justify-content-around border-0 pt-3 pe-3 ${
          loginState === LoginState.SELECT && (isMobile || isTablet)
            ? "bg-blue"
            : "bg-dark"
        }`}
      >
        <Button
          variant="link"
          className={`${
            loginState === LoginState.SELECT ? "visible" : "invisible"
          } shadow-none p-0`}
          onClick={() => {
            setLoginState(
              loginState === LoginState.SELECT ? LoginState.CONNECTING : null
            );
            disconnect();
          }}
        >
          <Image src="arrow-back.svg" alt="back" width={24} />
        </Button>
        <Modal.Title className="m-auto fw-bold text-light fs-5">
          {isLoading
            ? null
            : loginState === LoginState.SELECT
            ? "Select a Smart Account"
            : "Account Type"}
        </Modal.Title>
        <Button
          size="sm"
          variant="link"
          className="d-flex align-content-center rounded-circle bg-blue shadow-none p-1"
          onClick={handleCloseModal}
        >
          <Image src="close.svg" alt="close" width={18} />
        </Button>
      </Modal.Header>
      <Modal.Body className="d-flex flex-column gap-3 bg-dark text-light pt-0">
        {isLoading
          ? loadingBody
          : loginState === LoginState.SELECT
          ? selectAccountBody
          : accountTypeBody}
      </Modal.Body>
    </Modal>
  );
}
export default ConnectAccountModal;
