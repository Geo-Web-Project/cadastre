import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { NativeAssetSuperToken } from "@superfluid-finance/sdk-core";
import Safe, { SafeFactory } from "@safe-global/safe-core-sdk";
import EthersAdapter from "@safe-global/safe-ethers-lib";
import Button from "react-bootstrap/Button";
import Modal from "react-bootstrap/Modal";
import Image from "react-bootstrap/Image";
import Spinner from "react-bootstrap/Spinner";
import CopyTooltip from "../CopyTooltip";
import InfoTooltip from "../InfoTooltip";
import { SmartAccount } from "../../pages/index";
import { useSuperTokenBalance } from "../../lib/superTokenBalance";
import { truncateEth } from "../../lib/truncate";
import { getETHBalance } from "../../lib/getBalance";
import { RPC_URLS, NETWORK_ID, GW_SAFE_SALT_NONCE } from "../../lib/constants";
import { getSigner } from "../../lib/getSigner";
import {
  getProxyFactoryDeployment,
  getSafeL2SingletonDeployment,
} from "@gnosis.pm/safe-deployments";

const MIN_CLAIM_BALANCE = 0.008;

interface AddFundsModal {
  show: boolean;
  handleClose: () => void;
  paymentToken: NativeAssetSuperToken;
  smartAccount: SmartAccount | null;
  setSmartAccount: React.Dispatch<React.SetStateAction<SmartAccount | null>>;
}

function AddFundsModal(props: AddFundsModal) {
  const { show, handleClose, paymentToken, smartAccount, setSmartAccount } =
    props;

  const [safeBalance, setSafeBalance] = useState<string>("");
  const [isInitializing, setIsInitializing] = useState<boolean>(false);

  const { superTokenBalance } = useSuperTokenBalance(
    smartAccount?.safeAddress ?? "",
    paymentToken.address
  );

  const provider = new ethers.providers.JsonRpcBatchProvider(
    RPC_URLS[NETWORK_ID],
    NETWORK_ID
  );
  const hasEnoughBalance = Number(safeBalance) >= MIN_CLAIM_BALANCE;

  const initSafe = async () => {
    if (
      !smartAccount?.safeAuthKit ||
      !smartAccount?.eoaAddress ||
      !smartAccount?.safeAddress
    ) {
      return;
    }

    const { safeAuthKit, relayAdapter, eoaAddress, safeAddress } = smartAccount;

    setIsInitializing(true);

    const ethAdapter = new EthersAdapter({
      ethers,
      signerOrProvider: getSigner(safeAuthKit),
    });
    const safeFactory = await SafeFactory.create({ ethAdapter });
    const safeAccountConfig = {
      threshold: 1,
      owners: [eoaAddress],
    };
    //eslint-disable-next-line @typescript-eslint/no-explicit-any
    const options = { isSponsored: true } as any;
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    //@ts-ignore
    const encodedSetupCallData = await safeFactory.encodeSetupCallData(
      safeAccountConfig
    );
    const safeproxyFactoryAddress =
      getProxyFactoryDeployment()?.networkAddresses[NETWORK_ID];
    const safeSingletonDeployment =
      getSafeL2SingletonDeployment()?.networkAddresses[NETWORK_ID];
    const contract = new ethers.Contract(
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      safeproxyFactoryAddress!,
      ["function createProxyWithNonce(address, bytes, uint256)"],
      getSigner(safeAuthKit)
    );
    const encodedTransaction =
      await contract.populateTransaction.createProxyWithNonce(
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        safeSingletonDeployment!,
        encodedSetupCallData,
        GW_SAFE_SALT_NONCE
      );

    await relayAdapter.relayTransaction({
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      target: safeproxyFactoryAddress!,
      encodedTransaction: encodedTransaction.data ?? "0x",
      chainId: NETWORK_ID,
      options,
    });

    /* eslint no-constant-condition: ["error", { "checkLoops": false }] */
    while (true) {
      const isDeployed = await ethAdapter.isContractDeployed(safeAddress);

      if (isDeployed) {
        break;
      }

      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    const safe = await Safe.create({
      ethAdapter,
      safeAddress: safeAddress,
    });

    setSmartAccount({
      safeAuthKit,
      relayAdapter,
      eoaAddress,
      safeAddress,
      safe,
    });
    setIsInitializing(false);
    handleClose();
  };

  useEffect(() => {
    const updateBalance = async () => {
      if (!smartAccount?.safeAddress) {
        return;
      }

      const balance = await getETHBalance(provider, smartAccount.safeAddress);

      setSafeBalance(balance);
    };

    (async () => {
      await updateBalance();
    })();

    const timerId = setInterval(updateBalance, 10000);

    return () => clearTimeout(timerId);
  }, []);

  return (
    <Modal
      show={show}
      keyboard={false}
      centered
      onHide={handleClose}
      size="xl"
      contentClassName="bg-dark"
    >
      <Modal.Header className="bg-dark border-0">
        <Modal.Title className="w-100 ms-5 fs-1 fw-bold text-light text-center">
          <span className="me-3">Fund Your Smart Account to Transact</span>
          <InfoTooltip
            top
            content={
              <span className="text-start">
                The Geo Web uses{" "}
                <a
                  href="https://docs.safe.global/learn/what-is-a-smart-contract-account"
                  target="_blank"
                  rel="noreferrer"
                >
                  Safe's account abstraction setup.
                </a>{" "}
                This separates your signing account from your asset-holding
                smart account. It enables numerous UX improvements.
              </span>
            }
            target={
              <Image
                src="info-light.svg"
                alt="info"
                width={28}
                className="mb-1"
              />
            }
          />
        </Modal.Title>
        <Button
          variant="link"
          size="sm"
          className="align-self-start"
          onClick={handleClose}
        >
          <Image width={32} src="close.svg" />
        </Button>
      </Modal.Header>
      <Modal.Body className="d-flex flex-column justify-content-center bg-dark px-4 text-light">
        <div className="d-flex m-auto mt-3">
          {smartAccount?.safeAddress ? (
            <div className="fs-5">
              Send ETH on Optimism to{" "}
              <span className="fw-bold">{smartAccount.safeAddress}</span>
            </div>
          ) : (
            <Spinner as="span" animation="border" role="status">
              <span className="visually-hidden">Loading...</span>
            </Spinner>
          )}
          <CopyTooltip
            contentClick="Address Copied"
            contentHover="Copy Address"
            target={
              <Image
                src="copy-light.svg"
                alt="copy"
                className="ms-2"
                width={24}
              />
            }
            handleCopy={() =>
              navigator.clipboard.writeText(smartAccount?.safeAddress ?? "")
            }
          />
        </div>
        <span className="fs-2 fw-bold m-auto mt-5">
          {safeBalance ? (
            <>
              <span>
                Your Balance:{" "}
                {truncateEth(
                  smartAccount?.safe
                    ? ethers.utils.formatEther(superTokenBalance) + safeBalance
                    : safeBalance,
                  3
                )}{" "}
                ETH
              </span>
              {!smartAccount?.safe && hasEnoughBalance && (
                <Image
                  src="check.svg"
                  alt="success"
                  width={36}
                  className="ms-2 mb-2"
                />
              )}
            </>
          ) : (
            <Spinner as="span" animation="border" role="status">
              <span className="visually-hidden">Loading...</span>
            </Spinner>
          )}
        </span>
        <span className="m-auto mt-5">
          {MIN_CLAIM_BALANCE} ETH or more is needed to make a minimum price
          parcel claim
        </span>
        {!smartAccount?.safe && (
          <div className="d-flex justify-content-end gap-3 mt-5 w-75 m-auto me-0">
            <Button
              variant="danger"
              className="w-25 fs-5"
              onClick={handleClose}
            >
              I'll do it later
            </Button>
            <Button
              variant="primary"
              disabled={!hasEnoughBalance || isInitializing}
              className="w-25 fs-5"
              onClick={initSafe}
            >
              {isInitializing ? (
                <Spinner as="span" animation="border" role="status">
                  <span className="visually-hidden">Loading...</span>
                </Spinner>
              ) : (
                <span>Initialize Account</span>
              )}
            </Button>
          </div>
        )}
      </Modal.Body>
    </Modal>
  );
}

export default AddFundsModal;
