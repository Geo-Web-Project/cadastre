import * as React from "react";
import Button from "react-bootstrap/Button";
import Card from "react-bootstrap/Card";
import Alert from "react-bootstrap/Alert";
import Form from "react-bootstrap/Form";
import { ethers, BigNumber } from "ethers";
import Image from "react-bootstrap/Image";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import type { BasicProfile, MediaGallery } from "@geo-web/types";
import {
  PAYMENT_TOKEN,
  NETWORK_ID,
  SECONDS_IN_YEAR,
} from "../../lib/constants";
import BN from "bn.js";
import { AssetId, AccountId } from "caip";
import { SidebarProps } from "../Sidebar";
import InfoTooltip from "../InfoTooltip";
import { truncateEth } from "../../lib/truncate";
import { STATE } from "../Map";
import WrapModal from "../wrap/WrapModal";
import { formatBalance } from "../../lib/formatBalance";
import TransactionError from "./TransactionError";
import ApproveButton from "../ApproveButton";
import PerformButton from "../PerformButton";
import { useSuperTokenBalance } from "../../lib/superTokenBalance";

export type ActionFormProps = SidebarProps & {
  perSecondFeeNumerator: BigNumber;
  perSecondFeeDenominator: BigNumber;
  licenseAddress: string;
  licenseOwner?: string;
  loading: boolean;
  performAction: () => Promise<string | void>;
  actionData: ActionData;
  setActionData: React.Dispatch<React.SetStateAction<ActionData>>;
  summaryView: JSX.Element;
  requiredBid?: BigNumber;
  hasOutstandingBid?: boolean;
  requiredPayment: BigNumber | null;
  requiredFlowPermissions: number | null;
  spender: string | null;
  flowOperator: string | null;
  minForSalePrice: BigNumber;
  setShouldParcelContentUpdate?: React.Dispatch<React.SetStateAction<boolean>>;
  setRootCid?: React.Dispatch<React.SetStateAction<string | null>>;
};

export type ActionData = {
  parcelName?: string;
  parcelWebContentURI?: string;
  displayNewForSalePrice?: string;
  displayCurrentForSalePrice?: string;
  didFail?: boolean;
  isActing?: boolean;
  errorMessage?: string;
};

export function ActionForm(props: ActionFormProps) {
  const {
    account,
    licenseOwner,
    geoWebContent,
    perSecondFeeNumerator,
    perSecondFeeDenominator,
    loading,
    performAction,
    actionData,
    setActionData,
    interactionState,
    setInteractionState,
    licenseAddress,
    ceramic,
    selectedParcelId,
    setSelectedParcelId,
    summaryView,
    requiredBid,
    requiredPayment,
    spender,
    hasOutstandingBid = false,
    setIsPortfolioToUpdate,
    minForSalePrice,
    paymentToken,
    setShouldParcelContentUpdate,
    setRootCid,
  } = props;

  const {
    parcelName,
    parcelWebContentURI,
    displayNewForSalePrice,
    displayCurrentForSalePrice,
    didFail,
    isActing,
    errorMessage,
  } = actionData;
  const [showWrapModal, setShowWrapModal] = React.useState(false);
  const [isAllowed, setIsAllowed] = React.useState(false);
  const [isBalanceInsufficient, setIsBalanceInsufficient] =
    React.useState(false);

  const { superTokenBalance } = useSuperTokenBalance(
    account,
    paymentToken.address
  );

  const handleWrapModalOpen = () => setShowWrapModal(true);
  const handleWrapModalClose = () => setShowWrapModal(false);

  const infoIcon = (
    <Image
      style={{
        width: "1.1rem",
        marginLeft: "4px",
      }}
      src="info.svg"
    />
  );

  const isForSalePriceInvalid: boolean =
    displayNewForSalePrice != null &&
    displayNewForSalePrice.length > 0 &&
    (isNaN(Number(displayNewForSalePrice)) ||
      ethers.utils
        .parseEther(displayNewForSalePrice)
        .lt(
          !requiredBid ||
            (interactionState === STATE.PARCEL_RECLAIMING &&
              requiredBid.lt(minForSalePrice))
            ? minForSalePrice
            : requiredBid
        ));

  const annualFeePercentage =
    (perSecondFeeNumerator.toNumber() * SECONDS_IN_YEAR * 100) /
    perSecondFeeDenominator.toNumber();

  const annualNetworkFeeRate =
    displayNewForSalePrice != null &&
    displayNewForSalePrice.length > 0 &&
    !isNaN(Number(displayNewForSalePrice))
      ? ethers.utils
          .parseEther(displayNewForSalePrice)
          .mul(annualFeePercentage)
          .div(100)
      : null;

  const isParcelNameInvalid = parcelName ? parcelName.length > 150 : false;
  const isURIInvalid = parcelWebContentURI
    ? /^(http|https|ipfs|ipns):\/\/[^ "]+$/.test(parcelWebContentURI) ==
        false || parcelWebContentURI.length > 150
    : false;

  const requiredFlowAmount =
    displayCurrentForSalePrice &&
    displayCurrentForSalePrice === displayNewForSalePrice
      ? BigNumber.from(0)
      : annualNetworkFeeRate;

  function updateActionData(updatedValues: ActionData) {
    function _updateData(updatedValues: ActionData) {
      return (prevState: ActionData) => {
        return { ...prevState, ...updatedValues };
      };
    }

    setActionData(_updateData(updatedValues));
  }

  async function submit() {
    updateActionData({ isActing: true, didFail: false });

    let licenseId: string | void;
    try {
      // Perform action
      licenseId = await performAction();
    } catch (err) {
      /* eslint-disable @typescript-eslint/no-explicit-any */
      if (
        (err as any)?.code !== "TRANSACTION_REPLACED" ||
        (err as any).cancelled
      ) {
        console.error(err);
        updateActionData({
          isActing: false,
          didFail: true,
          errorMessage: (err as any).reason
            ? (err as any).reason.replace("execution reverted: ", "")
            : (err as Error).message,
        });
        return;
      }
      /* eslint-enable @typescript-eslint/no-explicit-any */
    }

    const content: BasicProfile = {};
    if (parcelName) {
      content["name"] = parcelName;
    }
    if (parcelWebContentURI) {
      content["url"] = parcelWebContentURI;
    }

    const assetId = new AssetId({
      chainId: `eip155:${NETWORK_ID}`,
      assetName: {
        namespace: "erc721",
        reference: licenseAddress.toLowerCase(),
      },
      tokenId: licenseId
        ? licenseId.toString()
        : new BN(selectedParcelId.slice(2), "hex").toString(10),
    });
    const ownerId = new AccountId(
      AccountId.parse(ceramic.did?.parent.split("did:pkh:")[1] ?? "")
    );

    if (
      licenseId &&
      (interactionState === STATE.CLAIM_SELECTED ||
        (interactionState === STATE.PARCEL_RECLAIMING &&
          account !== licenseOwner))
    ) {
      await geoWebContent.raw.initRoot({ parcelId: assetId, ownerId });
      const rootCid = await geoWebContent.raw.resolveRoot({
        parcelId: assetId,
        ownerId,
      });
      const mediaGallery: MediaGallery = [];
      const newRoot = await geoWebContent.raw.putPath(
        rootCid,
        "/mediaGallery",
        mediaGallery,
        {
          parentSchema: "ParcelRoot",
        }
      );

      await geoWebContent.raw.commit(newRoot, {
        ownerId,
        parcelId: assetId,
        pin: true,
      });
    }

    try {
      const rootCid = await geoWebContent.raw.resolveRoot({
        parcelId: assetId,
        ownerId,
      });

      const newRoot = await geoWebContent.raw.putPath(
        rootCid,
        "/basicProfile",
        {
          name: content.name ?? "",
          url: content.url ?? "",
        },
        { parentSchema: "ParcelRoot" }
      );

      await geoWebContent.raw.commit(newRoot, {
        ownerId,
        parcelId: assetId,
        pin: true,
      });
    } catch (err) {
      console.error(err);
    }

    updateActionData({ isActing: false });

    if (setShouldParcelContentUpdate && setRootCid) {
      const newRootCid = await geoWebContent.raw.resolveRoot({
        parcelId: assetId,
        ownerId,
      });

      setRootCid(newRootCid.toString());
      setShouldParcelContentUpdate(true);
    } else if (licenseId) {
      setSelectedParcelId(`0x${new BN(licenseId.toString()).toString(16)}`);
    }

    setInteractionState(STATE.PARCEL_SELECTED);
    setIsPortfolioToUpdate(true);
  }

  const isInvalid = isForSalePriceInvalid || !displayNewForSalePrice;

  const isLoading = loading;

  React.useEffect(() => {
    if (displayNewForSalePrice == null) {
      updateActionData({ displayNewForSalePrice: displayCurrentForSalePrice });
    }
  }, [displayCurrentForSalePrice, displayNewForSalePrice, updateActionData]);

  React.useEffect(() => {
    setIsBalanceInsufficient(
      requiredPayment ? requiredPayment.gt(superTokenBalance) : false
    );
  }, [superTokenBalance]);

  return (
    <>
      <Card border="secondary" className="bg-dark mt-5">
        <Card.Header>
          <h3>
            {interactionState === STATE.PARCEL_EDITING
              ? "Edit"
              : interactionState === STATE.PARCEL_RECLAIMING &&
                licenseOwner === account
              ? "Reclaim"
              : interactionState === STATE.PARCEL_RECLAIMING
              ? "Foreclosure Claim"
              : null}
          </h3>
        </Card.Header>
        <Card.Body>
          <Form>
            <Form.Group>
              {interactionState == STATE.PARCEL_RECLAIMING &&
              account.toLowerCase() == licenseOwner?.toLowerCase() ? null : (
                <>
                  <Form.Text className="text-primary mb-1">
                    Parcel Name
                  </Form.Text>
                  <Form.Control
                    isInvalid={isParcelNameInvalid}
                    className="bg-dark text-light mt-1"
                    type="text"
                    placeholder="Parcel Name"
                    aria-label="Parcel Name"
                    aria-describedby="parcel-name"
                    value={parcelName ?? ""}
                    disabled={isActing || isLoading}
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
                  <Form.Text className="text-primary mb-1">
                    Content Link (http://, https://, ipfs://, ipns://)
                  </Form.Text>
                  <Form.Control
                    isInvalid={isURIInvalid}
                    className="bg-dark text-light mt-1"
                    type="text"
                    placeholder="URI (http://, https://, ipfs://, ipns://)"
                    aria-label="Web Content URI"
                    aria-describedby="web-content-uri"
                    value={parcelWebContentURI ?? ""}
                    disabled={isActing || isLoading}
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
                  <br />
                </>
              )}
              <Form.Text className="text-primary mb-1">
                For Sale Price ({PAYMENT_TOKEN})
                <InfoTooltip
                  content={
                    <div style={{ textAlign: "left" }}>
                      Be honest about your personal valuation! A{" "}
                      {ethers.utils.formatEther(minForSalePrice)} ETHx minimum
                      valuation is enforced to prevent low-value squatting.
                      <br />
                      <br />
                      You'll have 7 days to accept or reject any bid that meets
                      your price. You must pay a penalty equal to 10% of the
                      bidder's new For Sale Price if you wish to reject the bid.{" "}
                      <br />
                      <br />
                      <a
                        href="https://docs.geoweb.network/concepts/partial-common-ownership"
                        target="_blank"
                        rel="noopener"
                      >
                        You can read more about Partial Common Ownership in our
                        docs.
                      </a>
                    </div>
                  }
                  target={infoIcon}
                />
              </Form.Text>
              <Form.Control
                required
                isInvalid={isForSalePriceInvalid}
                className={
                  hasOutstandingBid
                    ? "bg-dark text-info mt-1"
                    : "bg-dark text-light mt-1"
                }
                type="text"
                placeholder={`New For Sale Price (${PAYMENT_TOKEN})`}
                aria-label="For Sale Price"
                aria-describedby="for-sale-price"
                value={displayNewForSalePrice ?? ""}
                disabled={isActing || isLoading || hasOutstandingBid}
                onChange={(e) =>
                  updateActionData({ displayNewForSalePrice: e.target.value })
                }
              />
              {isForSalePriceInvalid ? (
                <Form.Control.Feedback type="invalid">
                  For Sale Price must be greater than or equal to{" "}
                  {!requiredBid ||
                  (interactionState === STATE.PARCEL_RECLAIMING &&
                    requiredBid.lt(minForSalePrice))
                    ? ethers.utils.formatEther(minForSalePrice)
                    : truncateEth(ethers.utils.formatEther(requiredBid), 8)}
                </Form.Control.Feedback>
              ) : null}

              <br />
              <Form.Text className="text-primary mb-1">
                {annualFeePercentage}% Network Fee ({PAYMENT_TOKEN}, Streamed)
                <InfoTooltip
                  content={
                    <div style={{ textAlign: "left" }}>
                      Network fees are proportional to your For Sale Price. They
                      discourage squatting & create a healthier market. They are
                      used to fund public goods—promoting positive-sum outcomes.
                      You have a say in how they're spent!
                      <br />
                      <br />
                      You pay these fees by opening a per-second stream. Your
                      total yearly payment will be slightly lower than the
                      displayed value due to rounding.
                    </div>
                  }
                  target={infoIcon}
                />
              </Form.Text>
              <Form.Control
                className="bg-dark text-info mt-1"
                type="text"
                readOnly
                disabled
                value={`${
                  annualNetworkFeeRate
                    ? truncateEth(formatBalance(annualNetworkFeeRate), 10)
                    : "0"
                } ${PAYMENT_TOKEN}/year`}
                aria-label="Network Fee"
                aria-describedby="network-fee"
              />
            </Form.Group>
            <br />
            <hr className="action-form_divider" />
            <br />
            {summaryView}
            <br />
            <Button
              variant="secondary"
              className="w-100 mb-3"
              onClick={handleWrapModalOpen}
            >
              {`Wrap ETH to ${PAYMENT_TOKEN}`}
            </Button>
            <ApproveButton
              {...props}
              isDisabled={isActing ?? false}
              requiredFlowAmount={requiredFlowAmount ?? null}
              requiredPayment={requiredPayment ?? null}
              spender={spender ?? null}
              setErrorMessage={(v) => {
                updateActionData({ errorMessage: v });
              }}
              setIsActing={(v) => {
                updateActionData({ isActing: v });
              }}
              setDidFail={(v) => {
                updateActionData({ didFail: v });
              }}
              isAllowed={isAllowed}
              setIsAllowed={setIsAllowed}
            />
            <PerformButton
              isDisabled={
                isActing || isLoading || isInvalid || isBalanceInsufficient
              }
              isActing={isActing ?? false}
              buttonText={
                interactionState === STATE.PARCEL_EDITING
                  ? "Submit"
                  : interactionState === STATE.PARCEL_RECLAIMING &&
                    account.toLowerCase() === licenseOwner?.toLowerCase()
                  ? "Reclaim"
                  : "Claim"
              }
              performAction={submit}
              isAllowed={isAllowed}
            />
          </Form>

          <br />
          {isBalanceInsufficient && displayNewForSalePrice ? (
            <Alert key="warning" variant="warning">
              <Alert.Heading>Insufficient ETHx</Alert.Heading>
              Please wrap enough ETH to ETHx to complete this transaction with
              the button above.
            </Alert>
          ) : didFail && !isActing ? (
            <TransactionError
              message={errorMessage}
              onClick={() => updateActionData({ didFail: false })}
            />
          ) : null}
        </Card.Body>
        <Card.Footer className="border-top border-secondary">
          <Row>
            <Col sm="1">
              <Image src="notice.svg" />
            </Col>
            <Col className="fst-italic">
              Claims, transfers, changes to For Sale Prices, and network fee
              payments require confirmation in your Web3 wallet.
            </Col>
          </Row>
        </Card.Footer>
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

export default ActionForm;
