import * as React from "react";
import Button from "react-bootstrap/Button";
import Card from "react-bootstrap/Card";
import Form from "react-bootstrap/Form";
import Web3 from "web3";
import { STATE_PARCEL_SELECTED } from "../Map";
import BN from "bn.js";
import { gql, useLazyQuery } from "@apollo/client";

const GeoWebCoordinate = require("js-geo-web-coordinate");

const newParcelQuery = gql`
  query LandParcel($id: String) {
    landParcel(id: $id) {
      id
    }
  }
`;

function ClaimAction({
  adminContract,
  account,
  claimBase1Coord,
  claimBase2Coord,
  setInteractionState,
  setSelectedParcelId,
}) {
  const [forSalePrice, setForSalePrice] = React.useState(null);
  const [networkFeePayment, setNetworkFeePayment] = React.useState(null);
  const [isActing, setIsActing] = React.useState(false);
  const [newParcelId, setNewParcelId] = React.useState(null);

  const spinner = (
    <div className="spinner-border" role="status">
      <span className="sr-only">Sending Transaction...</span>
    </div>
  );

  const [getNewParcel, { loading, data, stopPolling }] = useLazyQuery(
    newParcelQuery
  );

  React.useEffect(() => {
    if (data == null || data.landParcel == null) {
      return;
    }
    // Stop polling for new parcel
    stopPolling();

    // Load new parcel
    setSelectedParcelId(newParcelId);
    setInteractionState(STATE_PARCEL_SELECTED);
  }, [data]);

  function _claim() {
    setIsActing(true);

    let baseCoord = GeoWebCoordinate.make_gw_coord(
      claimBase1Coord.x,
      claimBase1Coord.y
    );
    let destCoord = GeoWebCoordinate.make_gw_coord(
      claimBase2Coord.x,
      claimBase2Coord.y
    );
    let path = GeoWebCoordinate.make_rect_path(baseCoord, destCoord);
    if (path.length == 0) {
      path = [new BN(0)];
    }

    adminContract.methods
      .claim(
        account,
        baseCoord,
        path,
        Web3.utils.toWei(forSalePrice),
        Web3.utils.toWei(networkFeePayment)
      )
      .send({ from: account })
      .once("receipt", async function (receipt) {
        let licenseId =
          receipt.events["LicenseInfoUpdated"].returnValues._licenseId;
        let _newParcelId = `0x${new BN(licenseId, 10).toString(16)}`;
        setNewParcelId(_newParcelId);

        getNewParcel({
          variables: { id: _newParcelId },
          pollInterval: 2000,
        });

        setIsActing(false);
      })
      .catch(() => {
        setIsActing(false);
      });
  }

  return (
    <Card border="secondary" className="bg-dark mt-5">
      <Card.Body>
        <Card.Title className="text-primary font-weight-bold">Claim</Card.Title>
        <Card.Text>
          <Form>
            <Form.Group>
              <Form.Control
                className="bg-dark text-light"
                type="text"
                placeholder="New For Sale Price (GEO)"
                aria-label="For Sale Price"
                aria-describedby="for-sale-price"
                disabled={isActing || loading}
                onChange={(e) => setForSalePrice(e.target.value)}
              />
              <br />
              <Form.Control
                className="bg-dark text-light"
                type="text"
                placeholder="Network Fee Payment (GEO)"
                aria-label="Network Fee Payment"
                aria-describedby="network-fee-payment"
                disabled={isActing || loading}
                onChange={(e) => setNetworkFeePayment(e.target.value)}
              />
            </Form.Group>
          </Form>
          <Button
            variant="primary"
            className="w-100"
            onClick={_claim}
            disabled={
              !(forSalePrice && networkFeePayment) || isActing || loading
            }
          >
            {isActing || loading ? spinner : "Confirm"}
          </Button>
        </Card.Text>
      </Card.Body>
      <Card.Footer border="secondary">
        You will need to confirm this transaction in Metamask.
      </Card.Footer>
    </Card>
  );
}

export default ClaimAction;
