import * as React from "react";
import Col from "react-bootstrap/Col";
import { gql, useQuery } from "@apollo/client";
import {
  STATE_PARCEL_SELECTED,
  STATE_PARCEL_EDITING,
  STATE_PARCEL_PURCHASING,
} from "../Map";
import Web3 from "web3";
import { useState, useEffect } from "react";
import BN from "bn.js";
import Button from "react-bootstrap/Button";
import EditAction from "./EditAction";
import PurchaseAction from "./PurchaseAction";
import { PAYMENT_TOKEN } from "../../constants";
import AuctionInfo from "./AuctionInfo";

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
  account,
  adminContract,
  interactionState,
  setInteractionState,
  selectedParcelId,
  setSelectedParcelId,
  perSecondFeeNumerator,
  perSecondFeeDenominator,
  paymentTokenContract,
  adminAddress,
}) {
  const { loading, data, refetch } = useQuery(parcelQuery, {
    variables: {
      id: selectedParcelId,
    },
  });
  const [networkFeeBalance, setNetworkFeeBalance] = useState(null);

  let isLoading =
    loading || perSecondFeeNumerator == null || perSecondFeeDenominator == null;

  function _calculateNetworkFeeBalance(license) {
    let now = new Date();
    let networkFeeBalance = new BN(license.expirationTimestamp * 1000 - now)
      .divn(1000)
      .mul(new BN(license.value))
      .mul(perSecondFeeNumerator)
      .div(perSecondFeeDenominator);

    return networkFeeBalance < 0 ? 0 : networkFeeBalance;
  }

  useEffect(() => {
    if (
      data &&
      data.landParcel &&
      perSecondFeeNumerator &&
      perSecondFeeDenominator
    ) {
      if (networkFeeBalance == null) {
        setInterval(() => {
          setNetworkFeeBalance(
            _calculateNetworkFeeBalance(data.landParcel.license)
          );
        }, 500);
      }
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
  let isExpired;
  if (data && data.landParcel) {
    forSalePrice = (
      <>
        {Web3.utils.fromWei(data.landParcel.license.value)} {PAYMENT_TOKEN}{" "}
      </>
    );
    if (networkFeeBalance) {
      isExpired = networkFeeBalance == 0;
      networkFeeBalanceDisplay = (
        <>
          {Web3.utils.fromWei(networkFeeBalance)} {PAYMENT_TOKEN}{" "}
        </>
      );
    }
    expDate = new Date(
      data.landParcel.license.expirationTimestamp * 1000
    ).toDateString();
    licenseOwner = data.landParcel.license.owner;
  }

  let editButton;
  switch (interactionState) {
    case STATE_PARCEL_SELECTED:
      editButton = (
        <Button
          variant="primary"
          className="w-100"
          onClick={() => {
            setInteractionState(STATE_PARCEL_EDITING);
          }}
        >
          Edit
        </Button>
      );
      break;
    case STATE_PARCEL_EDITING:
      editButton = (
        <Button
          variant="danger"
          className="w-100"
          onClick={() => {
            setInteractionState(STATE_PARCEL_SELECTED);
          }}
        >
          Cancel Editing
        </Button>
      );
      break;
    default:
      break;
  }

  let initiateTransferButton;
  switch (interactionState) {
    case STATE_PARCEL_SELECTED:
      initiateTransferButton = (
        <Button
          variant="primary"
          className="w-100"
          onClick={() => {
            setInteractionState(STATE_PARCEL_PURCHASING);
          }}
        >
          {isExpired ? "Auction Claim" : "Initiate Transfer"}
        </Button>
      );
      break;
    case STATE_PARCEL_PURCHASING:
      initiateTransferButton = (
        <Button
          variant="danger"
          className="w-100"
          onClick={() => {
            setInteractionState(STATE_PARCEL_SELECTED);
          }}
        >
          {isExpired ? "Cancel Auction Claim" : "Cancel Transfer"}
        </Button>
      );
      break;
    default:
      break;
  }

  return (
    <Col>
      {interactionState == STATE_PARCEL_SELECTED ||
      interactionState == STATE_PARCEL_EDITING ||
      interactionState == STATE_PARCEL_PURCHASING ? (
        <>
          <p className="text-truncate">
            <span className="font-weight-bold">Licensee:</span>{" "}
            {isLoading ? spinner : licenseOwner}
          </p>
          <p>
            <span className="font-weight-bold">For Sale Price:</span>{" "}
            {isLoading ? spinner : forSalePrice}
          </p>
          <p>
            <span className="font-weight-bold">Expiration Date:</span>{" "}
            {isLoading ? spinner : expDate}
          </p>
          <p>
            <span className="font-weight-bold">Fee Balance:</span>{" "}
            {isLoading || networkFeeBalanceDisplay == null
              ? spinner
              : networkFeeBalanceDisplay}
          </p>
          {isExpired ? (
            <>
              <hr className="border-secondary" />
              <AuctionInfo
                adminContract={adminContract}
                licenseInfo={data.landParcel.license}
              ></AuctionInfo>
            </>
          ) : null}
          <br />
          {!isLoading
            ? account == licenseOwner
              ? editButton
              : initiateTransferButton
            : null}
        </>
      ) : (
        <p>Unclaimed Coordinates</p>
      )}
      {interactionState == STATE_PARCEL_EDITING ? (
        <EditAction
          adminContract={adminContract}
          account={account}
          setInteractionState={setInteractionState}
          setSelectedParcelId={setSelectedParcelId}
          perSecondFeeNumerator={perSecondFeeNumerator}
          perSecondFeeDenominator={perSecondFeeDenominator}
          parcelData={data}
          refetchParcelData={refetch}
          paymentTokenContract={paymentTokenContract}
          adminAddress={adminAddress}
        />
      ) : null}
      {interactionState == STATE_PARCEL_PURCHASING ? (
        <PurchaseAction
          adminContract={adminContract}
          account={account}
          setInteractionState={setInteractionState}
          setSelectedParcelId={setSelectedParcelId}
          perSecondFeeNumerator={perSecondFeeNumerator}
          perSecondFeeDenominator={perSecondFeeDenominator}
          parcelData={data}
          refetchParcelData={refetch}
          paymentTokenContract={paymentTokenContract}
          adminAddress={adminAddress}
        />
      ) : null}
    </Col>
  );
}

export default ParcelInfo;
