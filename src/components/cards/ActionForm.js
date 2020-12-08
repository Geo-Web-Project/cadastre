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

const MIN_DATE_MILLIS = 365 * 24 * 60 * 60 * 1000;
const MAX_DATE_MILLIS = 730 * 24 * 60 * 60 * 1000;

function ActionForm({
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
}) {
  const [minInitialValue, setMinInitialValue] = React.useState(0);

  const spinner = (
    <div className="spinner-border" role="status">
      <span className="sr-only">Sending Transaction...</span>
    </div>
  );

  let isForSalePriceInvalid =
    forSalePrice.length > 0 &&
    (isNaN(forSalePrice) || Number(forSalePrice) < minInitialValue);
  let isNetworkFeePaymentInvalid =
    networkFeePayment.length > 0 && isNaN(networkFeePayment);

  let newExpirationDate;
  let isDateInvalid = false;
  if (
    perSecondFeeNumerator &&
    perSecondFeeDenominator &&
    forSalePrice.length > 0 &&
    networkFeePayment.length > 0 &&
    !isForSalePriceInvalid &&
    !isNetworkFeePaymentInvalid
  ) {
    let perSecondFee = new BN(Web3.utils.toWei(forSalePrice))
      .mul(perSecondFeeNumerator)
      .div(perSecondFeeDenominator);

    let newFeeBalanceDuration = new BN(Web3.utils.toWei(networkFeePayment))
      .div(perSecondFee)
      .muln(1000);
    let now = new Date();
    newExpirationDate = new Date(
      now.getTime() + newFeeBalanceDuration.toNumber()
    );

    isDateInvalid =
      newFeeBalanceDuration < MIN_DATE_MILLIS ||
      newFeeBalanceDuration > MAX_DATE_MILLIS;
  }

  let isInvalid =
    isForSalePriceInvalid || isNetworkFeePaymentInvalid || isDateInvalid;

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
                disabled={isActing || loading}
                onChange={(e) => setForSalePrice(e.target.value)}
              />
              <Form.Control.Feedback type="invalid">
                For Sale Price must be greater than or equal to{" "}
                {minInitialValue}
              </Form.Control.Feedback>
              <br />
              <Form.Control
                required
                className="bg-dark text-light"
                type="text"
                placeholder="Network Fee Payment (GEO)"
                aria-label="Network Fee Payment"
                aria-describedby="network-fee-payment"
                disabled={isActing || loading}
                isInvalid={isNetworkFeePaymentInvalid || isDateInvalid}
                onChange={(e) => setNetworkFeePayment(e.target.value)}
              />
              <Form.Control.Feedback type="invalid">
                Initial payment must result in an expiration date between 1 and
                2 years from now
              </Form.Control.Feedback>
            </Form.Group>
            <Button
              variant="primary"
              className="w-100"
              onClick={performAction}
              disabled={
                !(forSalePrice && networkFeePayment) ||
                isActing ||
                loading ||
                isInvalid
              }
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
          <div className={isDateInvalid ? "text-danger font-weight-bold" : ""}>
            {newExpirationDate ? newExpirationDate.toDateString() : "N/A"}
          </div>
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
