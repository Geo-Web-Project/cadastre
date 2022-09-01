import * as React from "react";
import Col from "react-bootstrap/Col";
import { gql, useQuery } from "@apollo/client";
import { STATE } from "../Map";
import { useEffect } from "react";
import Button from "react-bootstrap/Button";
import {
  PAYMENT_TOKEN,
  NETWORK_ID,
  CERAMIC_EXPLORER,
} from "../../lib/constants";
import { truncateStr } from "../../lib/truncate";
import Image from "react-bootstrap/Image";
import Row from "react-bootstrap/Row";
import Tooltip from "react-bootstrap/Tooltip";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import CID from "cids";
import { SidebarProps } from "../Sidebar";
import { formatBalance } from "../../lib/formatBalance";
import EditAction from "./EditAction";
import ReclaimAction from "./ReclaimAction";
import { BigNumber } from "ethers";
import { useBasicProfileStreamManager } from "../../lib/stream-managers/BasicProfileStreamManager";
import { usePinningManager } from "../../lib/PinningManager";
import GalleryModal from "../gallery/GalleryModal";
import OutstandingBidView from "./OutstandingBidView";
import AuctionInstructions from "../AuctionInstructions";
import PlaceBidAction from "./PlaceBidAction";
import RejectBidAction from "./RejectBidAction";
import AuctionInfo from "./AuctionInfo";
import { DataModel } from "@glazed/datamodel";
import { model as GeoWebModel } from "@geo-web/datamodels";
import { AssetContentManager } from "../../lib/AssetContentManager";
import { AssetId, AccountId } from "caip";
import BN from "bn.js";

const parcelQuery = gql`
  query LandParcel($id: String) {
    landParcel(id: $id) {
      id
      license {
        owner
        currentOwnerBid {
          contributionRate
          perSecondFeeNumerator
          perSecondFeeDenominator
          forSalePrice
          timestamp
        }
        outstandingBid {
          timestamp
          bidder
          contributionRate
          perSecondFeeNumerator
          perSecondFeeDenominator
          forSalePrice
        }
      }
    }
  }
`;

export type ParcelInfoProps = SidebarProps & {
  perSecondFeeNumerator: BigNumber;
  perSecondFeeDenominator: BigNumber;
  licenseAddress: string;
  setInvalidLicenseId: React.Dispatch<React.SetStateAction<string>>;
};

function ParcelInfo(props: ParcelInfoProps) {
  const {
    account,
    interactionState,
    setInteractionState,
    selectedParcelId,
    setIsParcelAvailable,
    ceramic,
    licenseContract,
    ipfs,
    firebasePerf,
    invalidLicenseId,
    setInvalidLicenseId,
    auctionSuperApp,
    selectedParcelCoords,
  } = props;
  const { loading, data } = useQuery(parcelQuery, {
    variables: {
      id: selectedParcelId,
    },
    pollInterval: 2000,
  });

  const [parcelIndexStreamId, setParcelIndexStreamId] = React.useState<
    string | null
  >(null);

  const [assetContentManager, setAssetContentManager] =
    React.useState<AssetContentManager | null>(null);

  const [requiredBid, setRequiredBid] = React.useState<BigNumber | null>(null);

  const basicProfileStreamManager =
    useBasicProfileStreamManager(assetContentManager);
  const pinningManager = usePinningManager(
    assetContentManager,
    ipfs,
    firebasePerf
  );

  const parcelContent = basicProfileStreamManager
    ? basicProfileStreamManager.getStreamContent()
    : null;

  const spinner = (
    <span className="spinner-border" role="status">
      <span className="visually-hidden">Loading...</span>
    </span>
  );

  let forSalePrice;
  let licenseOwner: string | null = null;
  let hasOutstandingBid = false;
  let outstandingBidder: string | null = null;
  let currentOwnerBidForSalePrice: BigNumber | null = null;
  let currentOwnerBidTimestamp: BigNumber | null = null;
  let outstandingBidForSalePrice: BigNumber | null = null;
  let outstandingBidTimestamp;
  if (data && data.landParcel && data.landParcel.license) {
    forSalePrice = (
      <>
        {formatBalance(data.landParcel.license.currentOwnerBid.forSalePrice)}{" "}
        {PAYMENT_TOKEN}{" "}
      </>
    );
    licenseOwner = data.landParcel.license.owner;
    hasOutstandingBid =
      data.landParcel.license.outstandingBid.contributionRate > 0;
    outstandingBidForSalePrice = BigNumber.from(
      data.landParcel.license.outstandingBid.forSalePrice
    );
    currentOwnerBidForSalePrice = BigNumber.from(
      data.landParcel.license.currentOwnerBid.forSalePrice
    );
    currentOwnerBidTimestamp = BigNumber.from(
      data.landParcel.license.currentOwnerBid.timestamp
    );
    outstandingBidder = data.landParcel.license.outstandingBid.bidder;
    outstandingBidTimestamp = BigNumber.from(
      data.landParcel.license.outstandingBid.timestamp
    );
    auctionSuperApp
      .ownerBidContributionRate(selectedParcelId)
      .then((ownerBidContributionRate) => {
        if (ownerBidContributionRate.eq(0)) {
          setInvalidLicenseId(selectedParcelId);
        } else {
          setInvalidLicenseId("");
        }
      });
  }

  React.useEffect(() => {
    (async () => {
      if (ceramic == null || !ceramic.did) {
        console.error("Ceramic instance not found");
        return;
      }

      setAssetContentManager(null);

      if (selectedParcelId && licenseOwner) {
        const assetId = new AssetId({
          chainId: `eip155:${NETWORK_ID}`,
          assetName: {
            namespace: "erc721",
            reference: licenseContract.address.toLowerCase(),
          },
          tokenId: new BN(selectedParcelId.slice(2), "hex").toString(10),
        });

        const accountId = new AccountId({
          chainId: `eip155:${NETWORK_ID}`,
          address: licenseOwner,
        });

        const model = new DataModel({
          ceramic,
          aliases: GeoWebModel,
        });

        const _assetContentManager = new AssetContentManager(
          ceramic,
          model,
          `did:pkh:${accountId.toString()}`,
          assetId
        );
        setAssetContentManager(_assetContentManager);

        const doc = await _assetContentManager.getIndex();
        setParcelIndexStreamId(doc.id.toString());
      } else {
        setAssetContentManager(null);
        setParcelIndexStreamId(null);
      }
    })();
  }, [ceramic, selectedParcelId, licenseOwner]);

  useEffect(() => {
    if (!outstandingBidder) {
      setIsParcelAvailable(true);
      return;
    }

    setIsParcelAvailable(!(hasOutstandingBid && outstandingBidder !== account));
  }, [data]);

  const isLoading = loading || data == null;

  let hrefWebContent;
  // Translate ipfs:// to case-insensitive base
  if (
    parcelContent &&
    parcelContent.url &&
    parcelContent.url.startsWith("ipfs://")
  ) {
    const cid = new CID(parcelContent.url.split("ipfs://")[1]);
    hrefWebContent = `ipfs://${cid.toV1().toBaseEncodedString("base32")}`;
  } else if (parcelContent) {
    hrefWebContent = parcelContent.url;
  }

  const cancelButton = (
    <Button
      variant="danger"
      className="w-100"
      onClick={() => {
        setInteractionState(STATE.PARCEL_SELECTED);
      }}
    >
      Cancel
    </Button>
  );

  const editButton = (
    <Button
      variant="primary"
      className="w-100 mb-2"
      onClick={() => {
        setInteractionState(STATE.PARCEL_EDITING);
      }}
    >
      Edit Parcel
    </Button>
  );

  const editGalleryButton = (
    <Button
      variant="secondary"
      className="w-100"
      onClick={() => {
        setInteractionState(STATE.EDITING_GALLERY);
      }}
    >
      Edit Media Gallery
    </Button>
  );

  const placeBidButton = (
    <>
      <Button
        variant="primary"
        className="w-100"
        onClick={() => {
          setInteractionState(STATE.PARCEL_PLACING_BID);
        }}
      >
        Place Bid
      </Button>
      <AuctionInstructions />
    </>
  );
  // <h1 style={{ fontSize: "1.5rem", fontWeight: 600 }}>
  //   {account.toLowerCase() == licenseOwner?.toLowerCase()
  //     ? "Reclaim"
  //     : "Foreclosure Claim"}
  // </h1>

  let header;
  if (
    interactionState == STATE.CLAIM_SELECTING ||
    interactionState == STATE.CLAIM_SELECTED
  ) {
    header = (
      <>
        <Row className="mb-3">
          <Col sm="10">
            ) : (
            <h1 style={{ fontSize: "1.5rem", fontWeight: 600 }}>
              Claim a Parcel
            </h1>
          </Col>
          <Col sm="2">
            <div className="text-end">
              <Button
                variant="link"
                size="sm"
                onClick={() => setInteractionState(STATE.VIEWING)}
              >
                <Image src="close.svg" />
              </Button>
            </div>
          </Col>
        </Row>
      </>
    );
  } else {
    const spatialURL = `https://geoweb.app?longitude=${selectedParcelCoords.x}&latitude=${selectedParcelCoords.y}`;
    header = (
      <>
        <div
          className="bg-image mb-4"
          style={{ backgroundImage: `url(Contour_Lines.png)` }}
        >
          <div className="text-end">
            <Button
              variant="link"
              size="sm"
              onClick={() => setInteractionState(STATE.VIEWING)}
            >
              <Image src="close.svg" />
            </Button>
          </div>
          <Row>
            <Col className="mx-3" sm="10">
              <h1 style={{ fontSize: "1.5rem", fontWeight: 600 }}>
                {!basicProfileStreamManager
                  ? spinner
                  : parcelContent
                  ? parcelContent.name
                  : data?.landParcel?.id
                  ? `Parcel ${data?.landParcel?.id}`
                  : spinner}
              </h1>
            </Col>
          </Row>
          <Row>
            <Col className="mx-3">
              <p className="fw-bold text-truncate">
                {!parcelContent ? null : hrefWebContent ? (
                  <a
                    href={hrefWebContent}
                    target="_blank"
                    rel="noreferrer"
                    className="text-light"
                  >{`${hrefWebContent}`}</a>
                ) : null}
              </p>
            </Col>
            <Col className="text-end pt-2 mx-2">
              <OverlayTrigger
                key="top"
                placement="top"
                overlay={
                  <Tooltip id={`tooltip-key`}>Open in Spatial Browser</Tooltip>
                }
              >
                <Button
                  variant="link"
                  size="sm"
                  className="text-right"
                  href={spatialURL}
                  target="_blank"
                >
                  <Image src="open-in-browser.svg" />
                </Button>
              </OverlayTrigger>
            </Col>
          </Row>
        </div>
        {interactionState == STATE.PARCEL_RECLAIMING ? (
          <Row className="mb-3">
            <h1 style={{ fontSize: "1.rem", fontWeight: 600 }}>
              {account.toLowerCase() == licenseOwner?.toLowerCase()
                ? "Reclaim"
                : "Foreclosure Claim"}
            </h1>
          </Row>
        ) : null}
      </>
    );
  }

  let buttons;
  if (interactionState != STATE.PARCEL_SELECTED) {
    buttons = cancelButton;
  } else if (!isLoading) {
    if (account.toLowerCase() == licenseOwner?.toLowerCase()) {
      buttons = (
        <>
          {editButton}
          {editGalleryButton}
        </>
      );
    } else if (!hasOutstandingBid) {
      buttons = placeBidButton;
    }
  }

  return (
    <>
      {header}
      <Row className="pb-5">
        <Col>
          {interactionState == STATE.PARCEL_SELECTED ||
          interactionState == STATE.PARCEL_EDITING ||
          interactionState == STATE.PARCEL_PLACING_BID ||
          interactionState == STATE.PARCEL_REJECTING_BID ||
          interactionState == STATE.EDITING_GALLERY ? (
            <>
              <p>
                <span className="fw-bold">For Sale Price:</span>{" "}
                {isLoading ? spinner : forSalePrice}
              </p>
              <p className="text-truncate">
                <span className="fw-bold">Parcel ID:</span>{" "}
                {isLoading ? spinner : selectedParcelId}
              </p>
              <p className="text-truncate">
                <span className="fw-bold">Licensee:</span>{" "}
                {isLoading || !licenseOwner
                  ? spinner
                  : truncateStr(licenseOwner, 11)}
              </p>
              <p className="text-truncate">
                <span className="fw-bold">Stream ID:</span>{" "}
                {parcelIndexStreamId == null ? (
                  spinner
                ) : (
                  <a
                    href={`${CERAMIC_EXPLORER}/${parcelIndexStreamId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-light"
                  >{`ceramic://${parcelIndexStreamId}`}</a>
                )}
              </p>
              <br />
              {invalidLicenseId == selectedParcelId ? null : buttons}
            </>
          ) : interactionState == STATE.PARCEL_RECLAIMING ? null : (
            <p>Unclaimed Coordinates</p>
          )}
          {interactionState == STATE.PARCEL_RECLAIMING ||
          (interactionState == STATE.PARCEL_SELECTED &&
            invalidLicenseId == selectedParcelId) ? (
            <AuctionInfo
              account={account}
              licenseOwner={licenseOwner}
              forSalePrice={currentOwnerBidForSalePrice}
              auctionStart={currentOwnerBidTimestamp}
              interactionState={interactionState}
              setInteractionState={setInteractionState}
              requiredBid={requiredBid}
              setRequiredBid={setRequiredBid}
            />
          ) : null}
          {interactionState == STATE.PARCEL_SELECTED &&
          hasOutstandingBid &&
          outstandingBidForSalePrice &&
          currentOwnerBidForSalePrice ? (
            <>
              <OutstandingBidView
                newForSalePrice={outstandingBidForSalePrice}
                existingForSalePrice={currentOwnerBidForSalePrice}
                bidTimestamp={outstandingBidTimestamp ?? null}
                licensorIsOwner={licenseOwner === account}
                {...props}
              />
              <AuctionInstructions />
            </>
          ) : null}
          {interactionState == STATE.PARCEL_EDITING ? (
            <EditAction
              basicProfileStreamManager={basicProfileStreamManager}
              parcelData={data}
              hasOutstandingBid={hasOutstandingBid}
              {...props}
            />
          ) : null}
          {interactionState == STATE.PARCEL_PLACING_BID ? (
            <PlaceBidAction parcelData={data} {...props} />
          ) : null}
          {interactionState == STATE.PARCEL_REJECTING_BID &&
          hasOutstandingBid &&
          outstandingBidForSalePrice ? (
            <RejectBidAction
              parcelData={data}
              bidForSalePrice={outstandingBidForSalePrice}
              bidTimestamp={outstandingBidTimestamp ?? null}
              {...props}
            />
          ) : null}
          {interactionState == STATE.PARCEL_RECLAIMING ? (
            <ReclaimAction
              {...props}
              licenseAddress={licenseContract.address}
              licenseOwner={licenseOwner}
              forSalePrice={currentOwnerBidForSalePrice}
              auctionStart={currentOwnerBidTimestamp}
              requiredBid={requiredBid}
            ></ReclaimAction>
          ) : null}
        </Col>
      </Row>
      <GalleryModal
        pinningManager={pinningManager}
        assetContentManager={assetContentManager}
        show={interactionState == STATE.EDITING_GALLERY}
        {...props}
      ></GalleryModal>
    </>
  );
}

export default ParcelInfo;
