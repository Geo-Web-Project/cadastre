import * as React from "react";
import Button from "react-bootstrap/Button";
import Card from "react-bootstrap/Card";
import Form from "react-bootstrap/Form";
import { ethers, BigNumber } from "ethers";
import Image from "react-bootstrap/Image";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import {
  PAYMENT_TOKEN,
  NETWORK_ID,
  SECONDS_IN_YEAR,
} from "../../lib/constants";
import BN from "bn.js";
import { SidebarProps } from "../Sidebar";
import InfoTooltip from "../InfoTooltip";
import { truncateEth } from "../../lib/truncate";
import { STATE } from "../Map";
import WrapModal from "../wrap/WrapModal";
import { formatBalance } from "../../lib/formatBalance";
import { BasicProfileStreamManager } from "../../lib/stream-managers/BasicProfileStreamManager";
import { AssetId } from "caip";
import { model as GeoWebModel } from "@geo-web/datamodels";
import { DataModel } from "@glazed/datamodel";
import { AssetContentManager } from "../../lib/AssetContentManager";
import TransactionError from "./TransactionError";

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
  basicProfileStreamManager?: BasicProfileStreamManager | null;
  requiredBid?: BigNumber;
  hasOutstandingBid?: boolean;
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
    provider,
    perSecondFeeNumerator,
    perSecondFeeDenominator,
    loading,
    performAction,
    actionData,
    setActionData,
    basicProfileStreamManager,
    interactionState,
    setInteractionState,
    licenseAddress,
    ceramic,
    setSelectedParcelId,
    paymentToken,
    summaryView,
    requiredBid,
    hasOutstandingBid = false,
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

  const handleWrapModalOpen = () => setShowWrapModal(true);
  const handleWrapModalClose = () => setShowWrapModal(false);

  const spinner = (
    <span className="spinner-border" role="status">
      <span className="visually-hidden">Sending Transaction...</span>
    </span>
  );

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
        .lt(requiredBid ?? BigNumber.from(0)));

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

    let parcelId: string | void;
    try {
      // Perform action
      parcelId = await performAction();
    } catch (err) {
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

    const content: any = {};
    if (parcelName) {
      content["name"] = parcelName;
    }
    if (parcelWebContentURI) {
      content["url"] = parcelWebContentURI;
    }

    if (parcelId && !basicProfileStreamManager) {
      const assetId = new AssetId({
        chainId: `eip155:${NETWORK_ID}`,
        assetName: {
          namespace: "erc721",
          reference: licenseAddress.toLowerCase(),
        },
        tokenId: parcelId.toString(),
      });

      const model = new DataModel({
        ceramic: ceramic as any,
        aliases: GeoWebModel,
      });

      const _assetContentManager = new AssetContentManager(
        ceramic as any,
        model,
        ceramic.did!.capability.p.iss,
        assetId
      );

      const _basicProfileStreamManager = new BasicProfileStreamManager(
        _assetContentManager
      );
      await _basicProfileStreamManager.createOrUpdateStream(content);

      setSelectedParcelId(`0x${new BN(parcelId.toString()).toString(16)}`);
    } else if (basicProfileStreamManager) {
      // Use existing BasicProfileStreamManager
      await basicProfileStreamManager.createOrUpdateStream(content);
    }

    updateActionData({ isActing: false });
    setInteractionState(STATE.PARCEL_SELECTED);
  }

  const isInvalid = isForSalePriceInvalid || !displayNewForSalePrice;

  const isLoading = loading;

  React.useEffect(() => {
    if (displayNewForSalePrice == null) {
      updateActionData({ displayNewForSalePrice: displayCurrentForSalePrice });
    }
  }, [displayCurrentForSalePrice, displayNewForSalePrice, updateActionData]);

  return (
    <>
      <Card border="secondary" className="bg-dark mt-5">
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
                    defaultValue={parcelName}
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
                    defaultValue={parcelWebContentURI}
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
                      Be honest about your personal valuation!
                      <br />
                      <br />
                      You'll have 7 days to accept or reject any bid that meets
                      this price. You must pay a penalty equal to 10% of the
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
                defaultValue={displayCurrentForSalePrice}
                disabled={isActing || isLoading || hasOutstandingBid}
                onChange={(e) =>
                  updateActionData({ displayNewForSalePrice: e.target.value })
                }
              />
              {isForSalePriceInvalid ? (
                <Form.Control.Feedback type="invalid">
                  For Sale Price must be a number greater than{" "}
                  {requiredBid
                    ? truncateEth(ethers.utils.formatEther(requiredBid), 8)
                    : "0"}
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
            <span style={{ display: "flex", gap: "16px" }}>
              <Button
                variant="primary"
                className="w-100"
                onClick={handleWrapModalOpen}
              >
                {"Wrap to ETHx"}
              </Button>
              <Button
                variant="primary"
                className="w-100"
                onClick={() => submit()}
                disabled={isActing || isLoading || isInvalid}
              >
                {isActing || isLoading ? spinner : "Confirm"}
              </Button>
            </span>
          </Form>

          <br />
          {didFail && !isActing ? (
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
          account={account}
          provider={provider}
          show={showWrapModal}
          handleClose={handleWrapModalClose}
          paymentToken={paymentToken}
        />
      )}
    </>
  );
}

export default ActionForm;
