import * as React from "react";
import Button from "react-bootstrap/Button";
import Card from "react-bootstrap/Card";
import Form from "react-bootstrap/Form";
import Web3 from "web3";
import Image from "react-bootstrap/Image";
import Col from "react-bootstrap/Col";
import Row from "react-bootstrap/Row";
import { STATE_VIEWING } from "../Map";

const GeoWebCoordinate = require("js-geo-web-coordinate");

function ClaimAction({
  adminContract,
  account,
  claimBase1Coord,
  claimBase2Coord,
}) {
  const [forSalePrice, setForSalePrice] = React.useState(null);
  const [networkFeePayment, setNetworkFeePayment] = React.useState(null);

  function _claim() {
    let baseCoord = GeoWebCoordinate.make_gw_coord(
      claimBase1Coord.x,
      claimBase1Coord.y
    );
    let destCoord = GeoWebCoordinate.make_gw_coord(
      claimBase2Coord.x,
      claimBase2Coord.y
    );
    let path = GeoWebCoordinate.make_rect_path(baseCoord, destCoord);

    adminContract.methods
      .claim(
        account,
        baseCoord,
        path,
        Web3.utils.toWei(forSalePrice),
        Web3.utils.toWei(networkFeePayment)
      )
      .send({ from: account });
  }

  return (
    <Card border="secondary" className="bg-dark mt-5">
      <Card.Body>
        <Card.Title className="text-primary">Claim</Card.Title>
        <Card.Text>
          <Form>
            <Form.Group>
              <Form.Control
                className="bg-dark text-light"
                type="text"
                placeholder="New For Sale Price (GEO)"
                aria-label="For Sale Price"
                aria-describedby="for-sale-price"
                onChange={(e) => setForSalePrice(e.target.value)}
              />
              <br />
              <Form.Control
                className="bg-dark text-light"
                type="text"
                placeholder="Network Fee Payment (GEO)"
                aria-label="Network Fee Payment"
                aria-describedby="network-fee-payment"
                onChange={(e) => setNetworkFeePayment(e.target.value)}
              />
            </Form.Group>
          </Form>
          <Button
            variant="primary"
            className="w-100"
            onClick={_claim}
            disabled={!(forSalePrice && networkFeePayment)}
          >
            Confirm
          </Button>
        </Card.Text>
      </Card.Body>
      <Card.Footer border="secondary">
        You will need to confirm a Metamask transactions to complete the
        transfer.
      </Card.Footer>
    </Card>
  );
}

export default ClaimAction;
