import * as React from "react";
import Col from "react-bootstrap/Col";
import { gql, useQuery } from "@apollo/client";
import { STATE_PARCEL_SELECTED } from "../Map";
import Web3 from "web3";
import { useState, useEffect } from "react";
import BN from "bn.js";

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

function ParcelInfo({
  interactionState,
  selectedParcelId,
  perSecondFeeNumerator,
  perSecondFeeDenominator,
}) {
  const { loading, data } = useQuery(parcelQuery, {
    variables: {
      id: selectedParcelId,
    },
  });
  const [networkFeeBalance, setNetworkFeeBalance] = useState(null);

  let isLoading =
    loading || perSecondFeeNumerator == null || perSecondFeeDenominator == null;

  function _calculateNetworkFeeBalance(license) {
    let now = new Date();
    return new BN(license.expirationTimestamp * 1000 - now)
      .divn(1000)
      .mul(new BN(license.value))
      .mul(perSecondFeeNumerator)
      .div(perSecondFeeDenominator);
  }

  useEffect(() => {
    if (
      data &&
      data.landParcel &&
      perSecondFeeNumerator &&
      perSecondFeeDenominator
    ) {
      setNetworkFeeBalance(
        _calculateNetworkFeeBalance(data.landParcel.license)
      );
    }
  }, [data, perSecondFeeNumerator, perSecondFeeDenominator]);

  const spinner = (
    <div className="spinner-border" role="status">
      <span className="sr-only">Loading...</span>
    </div>
  );

  let forSalePrice;
  let expDate;
  let networkFeeBalanceDisplay;
  let licenseOwner;
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
    ).toDateString();
    licenseOwner = data.landParcel.license.owner;
  }

  return (
    <Col>
      {interactionState == STATE_PARCEL_SELECTED ? (
        <>
          <div className="text-truncate">
            <span className="font-weight-bold">Licensee:</span>{" "}
            {isLoading ? spinner : licenseOwner}
          </div>
          <div>
            <span className="font-weight-bold">For Sale Price:</span>{" "}
            {isLoading ? spinner : forSalePrice}
          </div>
          <div>
            <span className="font-weight-bold">Expiration Date:</span>{" "}
            {isLoading ? spinner : expDate}
          </div>
          <div>
            <span className="font-weight-bold">Fee Balance:</span>{" "}
            {isLoading || networkFeeBalanceDisplay == null
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
