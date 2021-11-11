import * as React from "react";
import Button from "react-bootstrap/Button";
import Card from "react-bootstrap/Card";
import Form from "react-bootstrap/Form";
import { ethers, BigNumber } from "ethers";
import Image from "react-bootstrap/Image";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Alert from "react-bootstrap/Alert";
import { PAYMENT_TOKEN } from "../../lib/constants";
import { createNftDidUrl } from "nft-did-resolver";
import { NETWORK_ID, publishedModel } from "../../lib/constants";
import { STATE_PARCEL_SELECTED } from "../Map";
import { ParcelIndexManager } from "../../lib/stream-managers/ParcelIndexManager";
import { BasicProfileStreamManager } from "../../lib/stream-managers/BasicProfileStreamManager";
import { DIDDataStore } from "@glazed/did-datastore";
import BN from "bn.js";

const MIN_CLAIM_DATE_MILLIS = 365 * 24 * 60 * 60 * 1000; // 1 year
const MIN_EDIT_DATE_MILLIS = 1 * 24 * 60 * 60 * 1000; // 1 day
const MAX_DATE_MILLIS = 730 * 24 * 60 * 60 * 1000; // 2 years

export function ActionForm({
  title,
  collectorContract,
  perSecondFeeNumerator,
  perSecondFeeDenominator,
  loading,
  performAction,
  actionData,
  setActionData,
  parcelIndexManager,
  basicProfileStreamManager,
  setInteractionState,
  licenseAddress,
  ceramic,
  setSelectedParcelId,
}) {
  const [minInitialValue, setMinInitialValue] = React.useState(0);
  let [displaySubtotal, setDisplaySubtotal] = React.useState(null);

  const {
    parcelName,
    parcelWebContentURI,
    displayNewForSalePrice,
    displayNetworkFeePayment,
    displayCurrentForSalePrice,
    currentExpirationTimestamp,
    transactionSubtotal,
    didFail,
    isActing,
  } = actionData;

  const spinner = (
    <div className="spinner-border" role="status">
      <span className="sr-only">Sending Transaction...</span>
    </div>
  );

  let isForSalePriceInvalid =
    displayNewForSalePrice &&
    displayNewForSalePrice.length > 0 &&
    (isNaN(displayNewForSalePrice) ||
      Number(displayNewForSalePrice) < minInitialValue);
  let isNetworkFeePaymentInvalid =
    displayNetworkFeePayment &&
    displayNetworkFeePayment.length > 0 &&
    isNaN(displayNetworkFeePayment);
  let isParcelNameInvalid = parcelName ? parcelName.length > 150 : false;
  let isURIInvalid = parcelWebContentURI
    ? /^(http|https|ipfs|ipns):\/\/[^ "]+$/.test(parcelWebContentURI) ==
        false || parcelWebContentURI.length > 150
    : false;

  function updateActionData(updatedValues) {
    function _updateData(updatedValues) {
      return (prevState) => {
        return { ...prevState, ...updatedValues };
      };
    }

    setActionData(_updateData(updatedValues));
  }

  function _calculateNewExpiration(
    displayExistingForSalePrice,
    existingExpirationTimestamp,
    displayNewForSalePrice,
    displayAdditionalNetworkFeePayment
  ) {
    let newExpirationDate;
    let isDateInvalid;
    let isDateWarning;

    if (
      perSecondFeeNumerator == null ||
      perSecondFeeDenominator == null ||
      isForSalePriceInvalid ||
      isNetworkFeePaymentInvalid ||
      displayNewForSalePrice == null ||
      displayNewForSalePrice.length == 0
    ) {
      return [null, false, false];
    }

    let now = new Date();
    let existingTimeBalance = existingExpirationTimestamp
      ? (existingExpirationTimestamp * 1000 - now.getTime()) / 1000
      : 0;

    existingTimeBalance = Math.floor(Math.max(existingTimeBalance, 0));

    const existingForSalePrice = ethers.utils.parseEther(
      displayExistingForSalePrice ? displayExistingForSalePrice : "0"
    );
    let existingPerSecondFee = existingForSalePrice
      .mul(perSecondFeeNumerator)
      .div(perSecondFeeDenominator);

    let existingFeeBalance = existingPerSecondFee.mul(existingTimeBalance);

    let newPerSecondFee = ethers.utils
      .parseEther(displayNewForSalePrice)
      .mul(perSecondFeeNumerator)
      .div(perSecondFeeDenominator);

    const additionalNetworkFeePayment = ethers.utils.parseEther(
      displayAdditionalNetworkFeePayment.length > 0
        ? displayAdditionalNetworkFeePayment
        : "0"
    );
    let newFeeBalance = existingFeeBalance.add(additionalNetworkFeePayment);
    let newTimeBalanceMillis = newFeeBalance.div(newPerSecondFee).mul(1000);

    newExpirationDate = new Date(
      now.getTime() + newTimeBalanceMillis.toNumber()
    );

    // New parcel
    if (
      existingForSalePrice == null ||
      existingForSalePrice.length == 0 ||
      existingForSalePrice == 0
    ) {
      if (displayAdditionalNetworkFeePayment.length > 0) {
        isDateInvalid =
          newTimeBalanceMillis < MIN_CLAIM_DATE_MILLIS ||
          newTimeBalanceMillis > MAX_DATE_MILLIS;
      }

      isDateWarning = false;
    } else {
      // Existing parcel
      isDateInvalid = newTimeBalanceMillis < MIN_EDIT_DATE_MILLIS;
      isDateWarning = newTimeBalanceMillis > MAX_DATE_MILLIS;
    }

    return [newExpirationDate, isDateInvalid, isDateWarning];
  }

  async function submit() {
    updateActionData({ isActing: true });

    let parcelId;
    try {
      // Perform action
      parcelId = await performAction();
    } catch (err) {
      console.error(err);
      updateActionData({ isActing: false, didFail: true });
      return;
    }

    let content = {};
    if (parcelName) {
      content["name"] = parcelName;
    }
    if (parcelWebContentURI) {
      content["url"] = parcelWebContentURI;
    }

    if (parcelId) {
      const didNFT = createNftDidUrl({
        chainId: `eip155:${NETWORK_ID}`,
        namespace: "erc721",
        contract: licenseAddress.toLowerCase(),
        tokenId: parcelId.toString(),
      });

      // Create new ParcelIndexManager and BasicProfileStreamManager
      const dataStore = new DIDDataStore({ ceramic, model: publishedModel });
      const _parcelIndexManager = new ParcelIndexManager(ceramic, dataStore);
      await _parcelIndexManager.setController(didNFT);

      const _basicProfileStreamManager = new BasicProfileStreamManager(
        _parcelIndexManager
      );
      await _basicProfileStreamManager.createOrUpdateStream(content);
      setSelectedParcelId(`0x${new BN(parcelId.toString()).toString(16)}`);
    } else {
      // Use existing BasicProfileStreamManager
      await basicProfileStreamManager.createOrUpdateStream(content);
    }

    updateActionData({ isActing: false });
    setInteractionState(STATE_PARCEL_SELECTED);
  }

  let [newExpirationDate, isDateInvalid, isDateWarning] =
    _calculateNewExpiration(
      displayCurrentForSalePrice,
      currentExpirationTimestamp,
      displayNewForSalePrice,
      displayNetworkFeePayment
    );

  let isInvalid =
    isForSalePriceInvalid ||
    isNetworkFeePaymentInvalid ||
    isDateInvalid ||
    !displayNewForSalePrice ||
    (displayCurrentForSalePrice == null && !displayNetworkFeePayment);

  let isLoading = loading;

  let expirationDateErrorMessage;
  if (displayCurrentForSalePrice == null && isDateInvalid) {
    expirationDateErrorMessage =
      "Initial payment must result in an expiration date between 1 and 2 years from now";
  } else if (displayCurrentForSalePrice != null) {
    if (isDateInvalid) {
      expirationDateErrorMessage =
        "Additional payment is needed to ensure the expiration is at least 2 weeks from now";
    } else if (isDateWarning) {
      expirationDateErrorMessage =
        "New For Sale Price results in a calculated expiration date that exceeds the maximum value (> 2 years). You may proceed with your transaction, but the expiration date will only be set as 2 years from now.";
    }
  }

  React.useEffect(() => {
    if (collectorContract == null) {
      return;
    }

    collectorContract.minContributionRate().then((minContributionRate) => {
      const _minInitialValue = fromRateToValue(
        minContributionRate,
        perSecondFeeNumerator,
        perSecondFeeDenominator
      );
      setMinInitialValue(ethers.utils.formatEther(_minInitialValue.toString()));
    });
  }, [collectorContract, perSecondFeeNumerator, perSecondFeeDenominator]);

  React.useEffect(() => {
    if (!isActing) {
      setDisplaySubtotal(transactionSubtotal);
    }
  }, [transactionSubtotal]);

  React.useEffect(() => {
    if (displayNewForSalePrice == null) {
      updateActionData({ displayNewForSalePrice: displayCurrentForSalePrice });
    }
  }, [displayCurrentForSalePrice]);

  return (
    <Card border="secondary" className="bg-dark mt-5">
      <Card.Body>
        <Card.Title className="text-primary font-weight-bold">
          {title}
        </Card.Title>
        <Card.Text>
          <Form>
            <Form.Group>
              <Form.Control
                isInvalid={isParcelNameInvalid}
                className="bg-dark text-light"
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
              <Form.Control
                isInvalid={isURIInvalid}
                className="bg-dark text-light"
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
              <Form.Control
                required
                isInvalid={isForSalePriceInvalid}
                className="bg-dark text-light"
                type="text"
                placeholder={`New For Sale Price (${PAYMENT_TOKEN})`}
                aria-label="For Sale Price"
                aria-describedby="for-sale-price"
                defaultValue={displayCurrentForSalePrice}
                disabled={isActing || isLoading}
                onChange={(e) =>
                  updateActionData({ displayNewForSalePrice: e.target.value })
                }
              />
              {isForSalePriceInvalid ? (
                <Form.Control.Feedback type="invalid">
                  For Sale Price must be greater than or equal to{" "}
                  {minInitialValue}
                </Form.Control.Feedback>
              ) : null}

              <br />
              <Form.Control
                required={displayCurrentForSalePrice == null}
                className="bg-dark text-light"
                type="text"
                placeholder={
                  displayCurrentForSalePrice != null
                    ? `Additional Network Fee Payment (${PAYMENT_TOKEN})`
                    : `Network Fee Payment (${PAYMENT_TOKEN})`
                }
                aria-label="Network Fee Payment"
                aria-describedby="network-fee-payment"
                disabled={isActing || isLoading}
                isInvalid={isNetworkFeePaymentInvalid}
                onChange={(e) =>
                  updateActionData({ displayNetworkFeePayment: e.target.value })
                }
              />
            </Form.Group>
            <Button
              variant="primary"
              className="w-100"
              onClick={() => submit()}
              disabled={isActing || isLoading || isInvalid}
            >
              {isActing || isLoading ? spinner : "Confirm"}
            </Button>
          </Form>

          <br />
          {didFail && !isActing ? (
            <Alert
              variant="danger"
              dismissible
              onClick={() => updateActionData({ didFail: false })}
            >
              <Alert.Heading style={{ fontSize: "1em" }}>
                Transaction failed
              </Alert.Heading>
              <p style={{ fontSize: "0.8em" }}>
                Oops! Something went wrong. Please try again.
              </p>
            </Alert>
          ) : null}

          <div className="font-weight-bold">New Expiration Date:</div>
          <div
            className={
              isDateInvalid
                ? "text-danger font-weight-bold"
                : isDateWarning
                ? "text-warning font-weight-bold"
                : ""
            }
          >
            {newExpirationDate ? newExpirationDate.toDateString() : "N/A"}
          </div>
          <div className="font-weight-bold">
            Transaction subtotal (excludes gas):
          </div>
          <div>
            {displaySubtotal
              ? `${ethers.utils.formatEther(
                  displaySubtotal.toString()
                )} ${PAYMENT_TOKEN}`
              : "N/A"}
          </div>
          {isDateInvalid ? (
            <Alert className="mt-2" variant="danger">
              <Alert.Heading style={{ fontSize: "1em" }}>
                Expiration date is not valid
              </Alert.Heading>
              <p style={{ fontSize: "0.8em" }}>{expirationDateErrorMessage}</p>
            </Alert>
          ) : null}
          {isDateWarning ? (
            <Alert className="mt-2" variant="warning">
              <p style={{ fontSize: "0.8em" }}>{expirationDateErrorMessage}</p>
            </Alert>
          ) : null}
        </Card.Text>
      </Card.Body>
      <Card.Footer className="border-top border-secondary">
        <Row>
          <Col sm="1">
            <Image src="notice.svg" />
          </Col>
          <Col className="font-italic">
            Claims, transfers, changes to For Sale Prices, and network fee
            payments require confirmation in your Web3 wallet.
          </Col>
        </Row>
      </Card.Footer>
    </Card>
  );
}

export default ActionForm;

export function calculateWeiSubtotalField(displayValue) {
  if (displayValue && displayValue.length > 0 && !isNaN(displayValue)) {
    return ethers.utils.parseEther(displayValue);
  } else {
    return BigNumber.from(0);
  }
}

export function fromRateToValue(
  contributionRate,
  perSecondFeeNumerator,
  perSecondFeeDenominator
) {
  return contributionRate
    .mul(perSecondFeeDenominator)
    .div(perSecondFeeNumerator);
}

export function fromValueToRate(
  value,
  perSecondFeeNumerator,
  perSecondFeeDenominator
) {
  return value.mul(perSecondFeeNumerator).div(perSecondFeeDenominator);
}
