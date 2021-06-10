import * as React from "react";
import Col from "react-bootstrap/Col";
import { gql, useQuery } from "@apollo/client";
import {
  STATE_PARCEL_SELECTED,
  STATE_PARCEL_EDITING,
  STATE_PARCEL_PURCHASING,
  STATE_VIEWING,
  STATE_CLAIM_SELECTED,
  STATE_CLAIM_SELECTING,
  STATE_EDITING_GALLERY,
} from "../Map";
import { ethers, BigNumber } from "ethers";
import { useState, useEffect } from "react";
import Button from "react-bootstrap/Button";
import EditAction from "./EditAction";
import PurchaseAction from "./PurchaseAction";
import { PAYMENT_TOKEN } from "../../lib/constants";
import AuctionInfo from "./AuctionInfo";
import { truncateStr } from "../../lib/truncate";
import Image from "react-bootstrap/Image";
import Row from "react-bootstrap/Row";
import CID from "cids";
import GalleryModal from "../gallery/GalleryModal";

const parcelQuery = gql`
  query LandParcel($id: String) {
    landParcel(id: $id) {
      id
      license {
        rootCID
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
  adminAddress,
  ceramic,
  ipfs,
  parcelRootStreamManager,
}) {
  const { loading, data, refetch } = useQuery(parcelQuery, {
    variables: {
      id: selectedParcelId,
    },
  });

  const [networkFeeBalance, setNetworkFeeBalance] = useState(null);
  const [auctionValue, setAuctionValue] = React.useState(null);

  const parcelContent = parcelRootStreamManager
    ? parcelRootStreamManager.getStreamContent()
    : null;
  const parcelContentStreamId = parcelRootStreamManager
    ? parcelRootStreamManager.getStreamId()
    : null;
  let isLoading =
    loading ||
    perSecondFeeNumerator == null ||
    perSecondFeeDenominator == null ||
    parcelContent == null;

  function _calculateNetworkFeeBalance(license) {
    let now = Date.now();
    let networkFeeBalance = BigNumber.from(license.expirationTimestamp)
      .mul(1000)
      .sub(now)
      .div(1000)
      .mul(BigNumber.from(license.value))
      .mul(perSecondFeeNumerator.toNumber())
      .div(perSecondFeeDenominator.toNumber());

    return networkFeeBalance < 0 ? BigNumber.from(0) : networkFeeBalance;
  }

  useEffect(() => {
    async function updateContent() {
      if (
        data &&
        data.landParcel &&
        perSecondFeeNumerator &&
        perSecondFeeDenominator
      ) {
        if (data.landParcel.license.rootCID && parcelRootStreamManager) {
          await parcelRootStreamManager.setExistingStreamId(
            data.landParcel.license.rootCID
          );
        }

        if (networkFeeBalance == null) {
          setInterval(() => {
            setNetworkFeeBalance(
              _calculateNetworkFeeBalance(data.landParcel.license)
            );
          }, 500);
        }
      }
    }

    updateContent();
  }, [
    data,
    perSecondFeeNumerator,
    perSecondFeeDenominator,
    parcelRootStreamManager,
  ]);

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
        {ethers.utils.formatEther(data.landParcel.license.value)}{" "}
        {PAYMENT_TOKEN}{" "}
      </>
    );
    if (networkFeeBalance != null) {
      isExpired = networkFeeBalance == 0;
      networkFeeBalanceDisplay = (
        <>
          {ethers.utils.formatEther(networkFeeBalance.toString())}{" "}
          {PAYMENT_TOKEN}{" "}
        </>
      );
    }
    expDate = new Date(
      data.landParcel.license.expirationTimestamp * 1000
    ).toUTCString();
    licenseOwner = data.landParcel.license.owner;
  }

  let hrefWebContent;
  // Translate ipfs:// to case-insensitive base
  if (
    parcelContent &&
    parcelContent.webContent &&
    parcelContent.webContent.startsWith("ipfs://")
  ) {
    const cid = new CID(parcelContent.webContent.split("ipfs://")[1]);
    hrefWebContent = `ipfs://${cid.toV1().toBaseEncodedString("base32")}`;
  } else if (parcelContent) {
    hrefWebContent = parcelContent.webContent;
  }

  let cancelButton = (
    <Button
      variant="danger"
      className="w-100"
      onClick={() => {
        setInteractionState(STATE_PARCEL_SELECTED);
      }}
    >
      Cancel
    </Button>
  );

  let editButton = (
    <Button
      variant="primary"
      className="w-100"
      onClick={() => {
        setInteractionState(STATE_PARCEL_EDITING);
      }}
    >
      Edit Parcel
    </Button>
  );

  let editGalleryButton = (
    <Button
      variant="secondary"
      className="w-100"
      onClick={() => {
        setInteractionState(STATE_EDITING_GALLERY);
      }}
    >
      Edit Media Gallery
    </Button>
  );

  let initiateTransferButton = (
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

  let title;
  if (
    interactionState == STATE_CLAIM_SELECTING ||
    interactionState == STATE_CLAIM_SELECTED
  ) {
    title = (
      <>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 600 }}>Claim a Parcel</h1>
      </>
    );
  } else {
    title = (
      <>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 600 }}>
          {isLoading ? spinner : parcelContent.name}
        </h1>
      </>
    );
  }

  let buttons;
  if (interactionState != STATE_PARCEL_SELECTED) {
    buttons = cancelButton;
  } else if (!isLoading) {
    if (account.toLowerCase() == licenseOwner.toLowerCase()) {
      buttons = (
        <>
          <div className="mb-2">{editButton}</div>
          {editGalleryButton}
        </>
      );
    } else {
      buttons = initiateTransferButton;
    }
  }

  return (
    <>
      <Row className="mb-3">
        <Col sm="10">{title}</Col>
        <Col sm="2" className="text-right">
          <Button
            variant="link"
            size="sm"
            onClick={() => setInteractionState(STATE_VIEWING)}
          >
            <Image src="close.svg" />
          </Button>
        </Col>
      </Row>
      <Row>
        <Col>
          {interactionState == STATE_PARCEL_SELECTED ||
          interactionState == STATE_PARCEL_EDITING ||
          interactionState == STATE_PARCEL_PURCHASING ||
          interactionState == STATE_EDITING_GALLERY ? (
            <>
              <p className="font-weight-bold text-truncate">
                {isLoading ? (
                  spinner
                ) : (
                  <a
                    href={hrefWebContent}
                    target="_blank"
                    rel="noreferrer"
                    className="text-light"
                  >{`[${hrefWebContent}]`}</a>
                )}
              </p>
              <p className="text-truncate">
                <span className="font-weight-bold">Parcel ID:</span>{" "}
                {isLoading ? spinner : selectedParcelId}
              </p>
              <p className="text-truncate">
                <span className="font-weight-bold">Licensee:</span>{" "}
                {isLoading ? spinner : truncateStr(licenseOwner, 11)}
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
              <p className="text-truncate">
                <span className="font-weight-bold">Stream ID:</span>{" "}
                {parcelContentStreamId == null ? (
                  spinner
                ) : (
                  <a
                    href={`https://gateway.ceramic.network/api/v0/streams/${parcelContentStreamId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-light"
                  >{`ceramic://${parcelContentStreamId}`}</a>
                )}
              </p>
              {isExpired ? (
                <>
                  <hr className="border-secondary" />
                  <AuctionInfo
                    adminContract={adminContract}
                    licenseInfo={data.landParcel.license}
                    auctionValue={auctionValue}
                    setAuctionValue={setAuctionValue}
                  ></AuctionInfo>
                </>
              ) : null}
              <br />
              {buttons}
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
              adminAddress={adminAddress}
              parcelRootStreamManager={parcelRootStreamManager}
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
              adminAddress={adminAddress}
              auctionValue={auctionValue}
              parcelRootStreamManager={parcelRootStreamManager}
              existingNetworkFeeBalance={networkFeeBalance}
            />
          ) : null}
        </Col>
      </Row>
      <GalleryModal
        ipfs={ipfs}
        show={interactionState == STATE_EDITING_GALLERY}
        setInteractionState={setInteractionState}
        parcelRootStreamManager={parcelRootStreamManager}
        ceramic={ceramic}
      ></GalleryModal>
    </>
  );
}

export default ParcelInfo;
