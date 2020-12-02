import * as React from "react";
import Col from "react-bootstrap/Col";
import { gql, useQuery } from "@apollo/client";
import { STATE_PARCEL_SELECTED } from "./Map";
import Web3 from "web3";
import { useState, useEffect } from "react";
import BN from "bn.js";

// TODO: Load from admin contract
const PER_SECOND_FEE_NUMERATOR = new BN(10);
const PER_SECOND_FEE_DENOMINATOR = new BN(60)
  .muln(60)
  .muln(24)
  .muln(365)
  .muln(100);

const parcelQuery = gql`
  query LandParcel($id: String) {
    landParcel(id: $id) {
      id
      license {
        owner
        value
        expirationTimestamp
      }
    }
  }
`;

function ParcelInfo({ interactionState, selectedParcelId }) {
  const { loading, data } = useQuery(parcelQuery, {
    variables: {
      id: selectedParcelId,
    },
  });
  const [networkFeeBalance, setNetworkFeeBalance] = useState(null);

  function _calculateNetworkFeeBalance(license) {
    let now = new Date();
    return new BN(license.expirationTimestamp * 1000 - now)
      .divn(1000)
      .mul(new BN(license.value))
      .mul(PER_SECOND_FEE_NUMERATOR)
      .div(PER_SECOND_FEE_DENOMINATOR);
  }

  useEffect(() => {
    if (data && data.landParcel) {
      setNetworkFeeBalance(
        _calculateNetworkFeeBalance(data.landParcel.license)
      );
    }
  }, [data]);

  const spinner = (
    <div className="spinner-border" role="status">
      <span className="sr-only">Loading...</span>
    </div>
  );

  let forSalePrice;
  let expDate;
  let networkFeeBalanceDisplay;
  if (data && data.landParcel) {
    forSalePrice = (
      <>{Web3.utils.fromWei(data.landParcel.license.value)} GEO </>
    );
    if (networkFeeBalance) {
      networkFeeBalanceDisplay = (
        <>{Web3.utils.fromWei(networkFeeBalance)} GEO </>
      );
    }
    expDate = new Date(
      data.landParcel.license.expirationTimestamp * 1000
    ).toLocaleDateString("en-us");
  }

  return (
    <Col>
      {interactionState == STATE_PARCEL_SELECTED ? (
        <>
          <div className="text-truncate">
            <span className="font-weight-bold">Licensee:</span>{" "}
            {loading ? spinner : data.landParcel.license.owner}
          </div>
          <div>
            <span className="font-weight-bold">For Sale Price:</span>{" "}
            {loading ? spinner : forSalePrice}
          </div>
          <div>
            <span className="font-weight-bold">Expiration Date:</span>{" "}
            {loading ? spinner : expDate}
          </div>
          <div>
            <span className="font-weight-bold">Fee Balance:</span>{" "}
            {loading || networkFeeBalanceDisplay == null
              ? spinner
              : networkFeeBalanceDisplay}
          </div>
        </>
      ) : (
        <p>Unclaimed Coordinates</p>
      )}
    </Col>
  );
}

export default ParcelInfo;
