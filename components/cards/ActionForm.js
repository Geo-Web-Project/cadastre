import * as React from "react";
import Button from "react-bootstrap/Button";
import Card from "react-bootstrap/Card";
import Form from "react-bootstrap/Form";
import Web3 from "web3";
import BN from "bn.js";
import Image from "react-bootstrap/Image";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Alert from "react-bootstrap/Alert";
import { PAYMENT_TOKEN, CONTENT_ROOT_SCHEMA_CID } from "../../lib/constants";

const MIN_CLAIM_DATE_MILLIS = 365 * 24 * 60 * 60 * 1000; // 1 year
const MIN_EDIT_DATE_MILLIS = 1 * 24 * 60 * 60 * 1000; // 1 day
const MAX_DATE_MILLIS = 730 * 24 * 60 * 60 * 1000; // 2 years

export function ActionForm({
  title,
  adminContract,
  perSecondFeeNumerator,
  perSecondFeeDenominator,
  loading,
  performAction,
  actionData,
  setActionData,
  ceramic,
}) {
  const [minInitialValue, setMinInitialValue] = React.useState(0);
  let [displaySubtotal, setDisplaySubtotal] = React.useState(null);

  const {
    parcelContentDoc,
    parcelName,
    parcelWebContentURI,
    newForSalePrice,
    networkFeePayment,
    currentForSalePrice,
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
    newForSalePrice &&
    newForSalePrice.length > 0 &&
    (isNaN(newForSalePrice) || Number(newForSalePrice) < minInitialValue);
  let isNetworkFeePaymentInvalid =
    networkFeePayment &&
    networkFeePayment.length > 0 &&
    isNaN(networkFeePayment);
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
    existingForSalePrice,
    existingExpirationTimestamp,
    newForSalePrice,
    additionalNetworkFeePayment
  ) {
    let newExpirationDate;
    let isDateInvalid;
    let isDateWarning;

    if (
      perSecondFeeNumerator == null ||
      perSecondFeeDenominator == null ||
      isForSalePriceInvalid ||
      isNetworkFeePaymentInvalid ||
      newForSalePrice == null ||
      newForSalePrice.length == 0
    ) {
      return [null, false, false];
    }

    let now = new Date();
    let existingTimeBalance = existingExpirationTimestamp
      ? (existingExpirationTimestamp * 1000 - now.getTime()) / 1000
      : 0;

    existingTimeBalance = Math.max(existingTimeBalance, 0);

    let existingPerSecondFee = new BN(
      existingForSalePrice ? Web3.utils.toWei(existingForSalePrice) : 0
    )
      .mul(perSecondFeeNumerator)
      .div(perSecondFeeDenominator);

    let existingFeeBalance = existingPerSecondFee.muln(existingTimeBalance);

    let newPerSecondFee = new BN(Web3.utils.toWei(newForSalePrice))
      .mul(perSecondFeeNumerator)
      .div(perSecondFeeDenominator);

    let newFeeBalance = existingFeeBalance.add(
      new BN(
        additionalNetworkFeePayment
          ? Web3.utils.toWei(additionalNetworkFeePayment)
          : 0
      )
    );
    let newTimeBalanceMillis = newFeeBalance.div(newPerSecondFee).muln(1000);

    newExpirationDate = new Date(
      now.getTime() + newTimeBalanceMillis.toNumber()
    );

    // New parcel
    if (
      existingForSalePrice == null ||
      existingForSalePrice.length == 0 ||
      existingForSalePrice == 0
    ) {
      if (additionalNetworkFeePayment.length > 0) {
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
    async function _updateContentRootDoc() {
      let doc;
      if (parcelContentDoc) {
        doc = parcelContentDoc;
        await doc.change({
          content: { name: parcelName, webContent: parcelWebContentURI },
        });
      } else {
        doc = await ceramic.createDocument("tile", {
          content: { name: parcelName, webContent: parcelWebContentURI },
          metadata: {
            schema: CONTENT_ROOT_SCHEMA_CID,
          },
        });
        updateActionData({ parcelContentDoc: doc });
      }

      return doc.id;
    }
    updateActionData({ isActing: true });
    const rootCID = await _updateContentRootDoc();
    performAction(rootCID);
  }

  let [
    newExpirationDate,
    isDateInvalid,
    isDateWarning,
  ] = _calculateNewExpiration(
    currentForSalePrice,
    currentExpirationTimestamp,
    newForSalePrice,
    networkFeePayment
  );

  let isInvalid =
    isForSalePriceInvalid ||
    isNetworkFeePaymentInvalid ||
    isDateInvalid ||
    !newForSalePrice ||
    (currentForSalePrice == null && !networkFeePayment);

  let isLoading = loading || ceramic == null;

  let expirationDateErrorMessage;
  if (currentForSalePrice == null && isDateInvalid) {
    expirationDateErrorMessage =
      "Initial payment must result in an expiration date between 1 and 2 years from now";
  } else if (currentForSalePrice != null) {
    if (isDateInvalid) {
      expirationDateErrorMessage =
        "Additional payment is needed to ensure the expiration is at least 2 weeks from now";
    } else if (isDateWarning) {
      expirationDateErrorMessage =
        "New For Sale Price results in a calculated expiration date that exceeds the maximum value (> 2 years). You may proceed with your transaction, but the expiration date will only be set as 2 years from now.";
    }
  }

  React.useEffect(() => {
    if (adminContract == null) {
      return;
    }

    adminContract.methods
      .minInitialValue()
      .call()
      .then((minInitialValue) => {
        setMinInitialValue(Web3.utils.fromWei(minInitialValue));
      });
  }, [adminContract]);

  React.useEffect(() => {
    if (!isActing) {
      setDisplaySubtotal(transactionSubtotal);
    }
  }, [transactionSubtotal]);

  React.useEffect(() => {
    if (newForSalePrice == null) {
      updateActionData({ newForSalePrice: currentForSalePrice });
    }
  }, [currentForSalePrice]);

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
                defaultValue={currentForSalePrice}
                disabled={isActing || isLoading}
                onChange={(e) =>
                  updateActionData({ newForSalePrice: e.target.value })
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
                required={currentForSalePrice == null}
                className="bg-dark text-light"
                type="text"
                placeholder={
                  currentForSalePrice != null
                    ? `Additional Network Fee Payment (${PAYMENT_TOKEN})`
                    : `Network Fee Payment (${PAYMENT_TOKEN})`
                }
                aria-label="Network Fee Payment"
                aria-describedby="network-fee-payment"
                disabled={isActing || isLoading}
                isInvalid={isNetworkFeePaymentInvalid}
                onChange={(e) =>
                  updateActionData({ networkFeePayment: e.target.value })
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
              ? `${Web3.utils.fromWei(displaySubtotal)} ${PAYMENT_TOKEN}`
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
            You will need to confirm this transaction in Metamask.
          </Col>
        </Row>
      </Card.Footer>
    </Card>
  );
}

export default ActionForm;

export function calculateWeiSubtotalField(value) {
  if (value && value.length > 0 && !isNaN(value)) {
    return new BN(Web3.utils.toWei(value));
  } else {
    return new BN(0);
  }
}
