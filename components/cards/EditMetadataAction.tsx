import { useState, useEffect } from "react";
import Button from "react-bootstrap/Button";
import Card from "react-bootstrap/Card";
import Alert from "react-bootstrap/Alert";
import Form from "react-bootstrap/Form";
import { ethers, BigNumber } from "ethers";
import Image from "react-bootstrap/Image";
import { PAYMENT_TOKEN } from "../../lib/constants";
import type { IPCOLicenseDiamond } from "@geo-web/contracts/dist/typechain-types/IPCOLicenseDiamond";
import { ParcelInfoProps } from "./ParcelInfo";
import AddFundsModal from "../profile/AddFundsModal";
import { SubmitBundleButton } from "../SubmitBundleButton";
import InfoTooltip from "../InfoTooltip";
import { STATE } from "../Map";
import WrapModal from "../wrap/WrapModal";
import TransactionError from "./TransactionError";
import PerformButton from "../PerformButton";
import { BasicProfile } from "../../lib/geo-web-content/basicProfile";
import { useSuperTokenBalance } from "../../lib/superTokenBalance";
import { useMediaQuery } from "../../lib/mediaQuery";
import { useBundleSettings } from "../../lib/transactionBundleSettings";

export type EditMetadataActionProps = ParcelInfoProps & {
  basicProfile: BasicProfile;
  signer: ethers.Signer;
  setShouldBasicProfileUpdate: React.Dispatch<React.SetStateAction<boolean>>;
  licenseDiamondContract: IPCOLicenseDiamond | null;
};

export type ActionData = {
  parcelName?: string;
  parcelWebContentURI?: string;
  didFail?: boolean;
  isActing?: boolean;
  errorMessage?: string;
};

export function EditMetadataAction(props: EditMetadataActionProps) {
  const {
    signer,
    account,
    smartAccount,
    registryContract,
    setSmartAccount,
    w3Client,
    selectedParcelId,
    basicProfile,
    setShouldBasicProfileUpdate,
    setShouldRefetchParcelsData,
    licenseDiamondContract,
    setInteractionState,
    paymentToken,
  } = props;

  const [showWrapModal, setShowWrapModal] = useState(false);
  const [actionData, setActionData] = useState<ActionData>({
    parcelName: basicProfile?.name,
    parcelWebContentURI: basicProfile?.external_url,
    didFail: false,
    isActing: false,
    errorMessage: "",
  });
  const [showAddFundsModal, setShowAddFundsModal] = useState<boolean>(false);
  const [transactionBundleFeesEstimate, setTransactionBundleFeesEstimate] =
    useState<BigNumber | null>(null);
  const [safeEthBalance, setSafeEthBalance] = useState<BigNumber | null>(null);

  const { parcelName, parcelWebContentURI, didFail, isActing, errorMessage } =
    actionData;

  const accountAddress = smartAccount?.safe ? smartAccount.address : account;
  const { superTokenBalance } = useSuperTokenBalance(
    accountAddress,
    paymentToken.address
  );
  const { isMobile, isTablet } = useMediaQuery();
  const bundleSettings = useBundleSettings();

  const handleWrapModalOpen = () => setShowWrapModal(true);
  const handleWrapModalClose = () => setShowWrapModal(false);

  const isParcelNameInvalid = parcelName ? parcelName.length > 150 : false;
  const hasMetatadataChanged =
    parcelName !== basicProfile.name ||
    parcelWebContentURI !== basicProfile.external_url;
  const isURIInvalid = parcelWebContentURI
    ? /^(http|https|ipfs|ipns):\/\/[^ "]+$/.test(parcelWebContentURI) ==
        false || parcelWebContentURI.length > 150
    : false;
  const isInvalid = isParcelNameInvalid || isURIInvalid;
  const isSafeBalanceInsufficient =
    smartAccount?.safe &&
    bundleSettings.isSponsored &&
    safeEthBalance &&
    transactionBundleFeesEstimate
      ? transactionBundleFeesEstimate.gt(superTokenBalance.add(safeEthBalance))
      : false;

  const isSafeEthBalanceInsufficient =
    smartAccount?.safe &&
    !bundleSettings.isSponsored &&
    safeEthBalance &&
    transactionBundleFeesEstimate
      ? transactionBundleFeesEstimate.gt(safeEthBalance)
      : false;

  function updateActionData(updatedValues: ActionData) {
    function _updateData(updatedValues: ActionData) {
      return (prevState: ActionData) => {
        return { ...prevState, ...updatedValues };
      };
    }

    setActionData(_updateData(updatedValues));
  }

  async function generateTokenURI() {
    let tokenURI = "ipfs://";
    const basicProfile = { name: "", external_url: "" };

    if (parcelName) {
      basicProfile["name"] = parcelName;
    }
    if (parcelWebContentURI) {
      basicProfile["external_url"] = parcelWebContentURI;
    }

    try {
      if (w3Client) {
        const basicProfileBlob = new Blob([JSON.stringify(basicProfile)]);
        const basicProfileCID = await w3Client.uploadFile(basicProfileBlob);

        tokenURI = `${tokenURI}${basicProfileCID}`;
      } else {
        throw Error("w3Client is not instantiated");
      }
    } catch (err) {
      console.error(err);
      throw Error("Could not update parcel content, please try again later");
    }

    return tokenURI;
  }

  const getUpdateMetadata = async () => {
    const tokenURI = await generateTokenURI();
    const calldata = registryContract.interface.encodeFunctionData(
      "updateTokenURI",
      [BigNumber.from(selectedParcelId), tokenURI]
    );

    return { to: registryContract.address, data: calldata, value: "0" };
  };

  const bundleCallback = async () => {
    if (basicProfile?.name !== parcelName) {
      setShouldRefetchParcelsData(true);
    }

    setShouldBasicProfileUpdate(true);
    setInteractionState(STATE.PARCEL_SELECTED);
  };

  const updateMetadata = async () => {
    try {
      updateActionData({ isActing: true, didFail: false });

      const tokenURI = await generateTokenURI();
      const tx = await registryContract
        .connect(signer)
        .updateTokenURI(BigNumber.from(selectedParcelId), tokenURI);

      await tx.wait();

      if (basicProfile?.name !== parcelName) {
        setShouldRefetchParcelsData(true);
      }

      updateActionData({ isActing: false });
      setShouldBasicProfileUpdate(true);
      setInteractionState(STATE.PARCEL_SELECTED);
    } catch (err) {
      /* eslint-disable @typescript-eslint/no-explicit-any */
      if (
        (err as any)?.code !== "TRANSACTION_REPLACED" ||
        (err as any).cancelled
      ) {
        console.error(err);
        updateActionData({
          errorMessage: (err as any).reason
            ? (err as any).reason.replace("execution reverted: ", "")
            : (err as Error).message,
          didFail: true,
          isActing: false,
        });
        return;
      }
      /* eslint-enable @typescript-eslint/no-explicit-any */
    }
  };

  useEffect(() => {
    let timerId: NodeJS.Timer;

    if (smartAccount?.safe) {
      timerId = setInterval(async () => {
        if (smartAccount?.safe) {
          const safeEthBalance = await smartAccount.safe.getBalance();
          setSafeEthBalance(safeEthBalance);
        }
      }, 10000);
    }

    return () => clearInterval(timerId);
  }, [smartAccount]);

  return (
    <>
      <Card
        border={isMobile || isTablet ? "dark" : "secondary"}
        className="bg-dark"
      >
        <Card.Header className="d-none d-lg-block fs-3">
          Edit Metadata
        </Card.Header>

        <Card.Body className="p-1 p-lg-3">
          <Form>
            <Form.Group>
              <Form.Text className="text-primary mb-1">Parcel Name</Form.Text>
              <InfoTooltip
                content={
                  <div style={{ textAlign: "left" }}>
                    Optional - Add a name to your parcel for all visitors to
                    see.
                  </div>
                }
                target={
                  <Image
                    style={{
                      width: "1.1rem",
                      marginLeft: "4px",
                    }}
                    src="info.svg"
                  />
                }
              />
              <Form.Control
                isInvalid={isParcelNameInvalid}
                className="bg-dark text-light mt-1"
                type="text"
                placeholder="Parcel Name"
                aria-label="Parcel Name"
                aria-describedby="parcel-name"
                value={parcelName ?? ""}
                disabled={isActing}
                onChange={(e) =>
                  updateActionData({ parcelName: e.target.value })
                }
              />
              {isParcelNameInvalid ? (
                <Form.Control.Feedback type="invalid">
                  Parcel name cannot be longer than 150 characters
                </Form.Control.Feedback>
              ) : null}
              <br />
              <Form.Text className="text-primary mb-1">Content Link</Form.Text>
              <InfoTooltip
                content={
                  <div style={{ textAlign: "left" }}>
                    Optional - Link content to your parcel via URI. This is
                    displayed in an iframe on the{" "}
                    <a
                      href="https://geoweb.app/"
                      target="_blank"
                      rel="noopener"
                    >
                      Geo Web spatial browser
                    </a>
                    .
                  </div>
                }
                target={
                  <Image
                    style={{
                      width: "1.1rem",
                      marginLeft: "4px",
                    }}
                    src="info.svg"
                  />
                }
              />
              <Form.Control
                isInvalid={isURIInvalid}
                className="bg-dark text-light mt-1"
                type="text"
                placeholder="URI (http://, https://, ipfs://, ipns://)"
                aria-label="Web Content URI"
                aria-describedby="web-content-uri"
                value={parcelWebContentURI ?? ""}
                disabled={isActing}
                autoCapitalize="off"
                autoComplete="off"
                autoCorrect="off"
                onChange={(e) =>
                  updateActionData({ parcelWebContentURI: e.target.value })
                }
              />
              {isURIInvalid ? (
                <Form.Control.Feedback type="invalid">
                  Web content URI must be one of
                  (http://,https://,ipfs://,ipns://) and less than 150
                  characters
                </Form.Control.Feedback>
              ) : null}
            </Form.Group>
            <br className="d-lg-none" />
            <div className="d-none d-lg-block">
              <hr className="action-form_divider" />
            </div>
            <br />
            {smartAccount?.safe ? (
              <>
                <Button
                  variant="secondary"
                  className="w-100 mb-3"
                  onClick={() => setShowAddFundsModal(true)}
                >
                  Add Funds
                </Button>
                <AddFundsModal
                  show={showAddFundsModal}
                  handleClose={() => setShowAddFundsModal(false)}
                  smartAccount={smartAccount}
                  setSmartAccount={setSmartAccount}
                  superTokenBalance={superTokenBalance}
                />
                <SubmitBundleButton
                  {...props}
                  superTokenBalance={superTokenBalance}
                  requiredFlowAmount={BigNumber.from(0)}
                  requiredPayment={BigNumber.from(0)}
                  flowOperator={licenseDiamondContract?.address ?? null}
                  spender={licenseDiamondContract?.address ?? null}
                  requiredBuffer={BigNumber.from(0)}
                  setErrorMessage={(v) => {
                    updateActionData({ errorMessage: v });
                  }}
                  setIsActing={(v) => {
                    updateActionData({ isActing: v });
                  }}
                  setDidFail={(v) => {
                    updateActionData({ didFail: v });
                  }}
                  isDisabled={
                    isActing ||
                    isInvalid ||
                    isSafeBalanceInsufficient ||
                    isSafeEthBalanceInsufficient ||
                    !hasMetatadataChanged
                  }
                  isActing={isActing ?? false}
                  buttonText={"Submit"}
                  metaTransactionCallbacks={[getUpdateMetadata]}
                  bundleCallback={bundleCallback}
                  transactionBundleFeesEstimate={transactionBundleFeesEstimate}
                  setTransactionBundleFeesEstimate={
                    setTransactionBundleFeesEstimate
                  }
                />
              </>
            ) : (
              <>
                <Button
                  variant="secondary"
                  className="w-100 mb-3"
                  onClick={handleWrapModalOpen}
                >
                  {`Wrap ETH to ${PAYMENT_TOKEN}`}
                </Button>
                <PerformButton
                  isDisabled={isActing || isInvalid || !hasMetatadataChanged}
                  isActing={isActing ?? false}
                  buttonText={"Submit"}
                  performAction={updateMetadata}
                  isAllowed={true}
                />
              </>
            )}
          </Form>

          <br />
          {isSafeBalanceInsufficient && !isActing ? (
            <Alert variant="danger">
              <Alert.Heading>Insufficient Funds</Alert.Heading>
              You must deposit more ETH to your account to complete your
              transaction. Click Add Funds above.
            </Alert>
          ) : smartAccount?.safe &&
            bundleSettings.isSponsored &&
            !bundleSettings.noWrap &&
            safeEthBalance &&
            BigNumber.from(bundleSettings.wrapAmount).gt(safeEthBalance) &&
            !isActing ? (
            <Alert variant="warning">
              <Alert.Heading>ETH balance warning</Alert.Heading>
              You don't have enough ETH to fully fund your ETHx wrapping
              strategy. We'll wrap your full balance, but consider depositing
              ETH or changing your transaction settings.
            </Alert>
          ) : isSafeEthBalanceInsufficient && !isActing ? (
            <Alert variant="danger">
              <Alert.Heading>Insufficient ETH for Gas</Alert.Heading>
              You must deposit more ETH to your account or enable transaction
              sponsoring in Transaction Settings.
            </Alert>
          ) : bundleSettings.isSponsored &&
            ((bundleSettings.noWrap &&
              superTokenBalance.lt(transactionBundleFeesEstimate ?? 0)) ||
              (BigNumber.from(bundleSettings.wrapAmount).gt(0) &&
                superTokenBalance.lt(transactionBundleFeesEstimate ?? 0))) &&
            !isActing ? (
            <Alert variant="warning">
              <Alert.Heading>Gas Sponsoring Notice</Alert.Heading>
              You have transaction sponsoring enabled, but your current ETHx
              balance doesn't cover the Initial Transfer shown above. We'll use
              your ETH balance to directly pay for the Transaction Cost then
              proceed with your chosen auto-wrapping strategy.
            </Alert>
          ) : didFail && !isActing ? (
            <TransactionError
              message={errorMessage}
              onClick={() => updateActionData({ didFail: false })}
            />
          ) : null}
        </Card.Body>
      </Card>

      {showWrapModal && (
        <WrapModal
          show={showWrapModal}
          handleClose={handleWrapModalClose}
          {...props}
        />
      )}
    </>
  );
}

export default EditMetadataAction;
