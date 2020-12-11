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

const MIN_CLAIM_DATE_MILLIS = 365 * 24 * 60 * 60 * 1000; // 1 year
const MIN_EDIT_DATE_MILLIS = 14 * 24 * 60 * 60 * 1000; // 14 days
const MAX_DATE_MILLIS = 730 * 24 * 60 * 60 * 1000; // 2 years

export function ActionForm({
  title,
  adminContract,
  perSecondFeeNumerator,
  perSecondFeeDenominator,
  isActing,
  loading,
  performAction,
  forSalePrice,
  setForSalePrice,
  networkFeePayment,
  setNetworkFeePayment,
  didFail,
  setDidFail,
  currentForSalePrice,
  currentExpirationTimestamp,
  transactionSubtotal,
}) {
  const [minInitialValue, setMinInitialValue] = React.useState(0);

  const spinner = (
    <div className="spinner-border" role="status">
      <span className="sr-only">Sending Transaction...</span>
    </div>
  );

  let isForSalePriceInvalid =
    forSalePrice &&
    forSalePrice.length > 0 &&
    (isNaN(forSalePrice) || Number(forSalePrice) < minInitialValue);
  let isNetworkFeePaymentInvalid =
    networkFeePayment &&
    networkFeePayment.length > 0 &&
    isNaN(networkFeePayment);

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

  let [
    newExpirationDate,
    isDateInvalid,
    isDateWarning,
  ] = _calculateNewExpiration(
    currentForSalePrice,
    currentExpirationTimestamp,
    forSalePrice,
    networkFeePayment
  );

  let isInvalid =
    isForSalePriceInvalid ||
    isNetworkFeePaymentInvalid ||
    isDateInvalid ||
    !forSalePrice ||
    (currentForSalePrice == null && !networkFeePayment);

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
    setForSalePrice(currentForSalePrice);
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
                required
                isInvalid={isForSalePriceInvalid}
                className="bg-dark text-light"
                type="text"
                placeholder="New For Sale Price (GEO)"
                aria-label="For Sale Price"
                aria-describedby="for-sale-price"
                defaultValue={currentForSalePrice}
                disabled={isActing || loading}
                onChange={(e) => setForSalePrice(e.target.value)}
              />
              <Form.Control.Feedback type="invalid">
                For Sale Price must be greater than or equal to{" "}
                {minInitialValue}
              </Form.Control.Feedback>
              <br />
              <Form.Control
                required={currentForSalePrice == null}
                className="bg-dark text-light"
                type="text"
                placeholder={
                  currentForSalePrice != null
                    ? "Additional Network Fee Payment (GEO)"
                    : "Network Fee Payment (GEO)"
                }
                aria-label="Network Fee Payment"
                aria-describedby="network-fee-payment"
                disabled={isActing || loading}
                isInvalid={isNetworkFeePaymentInvalid}
                onChange={(e) => setNetworkFeePayment(e.target.value)}
              />
            </Form.Group>
            <Button
              variant="primary"
              className="w-100"
              onClick={performAction}
              disabled={isActing || loading || isInvalid}
            >
              {isActing || loading ? spinner : "Confirm"}
            </Button>
          </Form>

          <br />
          {didFail && !isActing ? (
            <Alert
              variant="danger"
              dismissible
              onClick={() => setDidFail(false)}
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
            {transactionSubtotal
              ? `${Web3.utils.fromWei(transactionSubtotal)} GEO`
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
