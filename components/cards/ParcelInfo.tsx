import * as React from "react";
import Col from "react-bootstrap/Col";
import { gql, useQuery } from "@apollo/client";
import { STATE } from "../Map";
import { useEffect } from "react";
import Button from "react-bootstrap/Button";
import { PAYMENT_TOKEN, NETWORK_ID } from "../../lib/constants";
import { truncateStr } from "../../lib/truncate";
import Image from "react-bootstrap/Image";
import Row from "react-bootstrap/Row";
import CID from "cids";
import { SidebarProps } from "../Sidebar";
import { formatBalance } from "../../lib/formatBalance";
import EditAction from "./EditAction";
import { BigNumber } from "ethers";
import { useBasicProfileStreamManager } from "../../lib/stream-managers/BasicProfileStreamManager";
import { usePinningManager } from "../../lib/PinningManager";
import GalleryModal from "../gallery/GalleryModal";
import OutstandingBidView from "./OutstandingBidView";
import AuctionInstructions from "../AuctionInstructions";
import PlaceBidAction from "./PlaceBidAction";
import RejectBidAction from "./RejectBidAction";
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
  } = props;
  const { loading, data } = useQuery(parcelQuery, {
    variables: {
      id: selectedParcelId,
    },
    pollInterval: 2000,
  });

  const [parcelIndexStreamId, setParcelIndexStreamId] =
    React.useState<string | null>(null);

  const [assetContentManager, setAssetContentManager] =
    React.useState<AssetContentManager | null>(null);

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
      <span className="sr-only">Loading...</span>
    </span>
  );

  let forSalePrice;
  let licenseOwner: string | null = null;
  let hasOutstandingBid = false;
  let outstandingBidder: string | null = null;
  let currentOwnerBidForSalePrice: BigNumber | null = null;
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
    outstandingBidder = data.landParcel.license.outstandingBid.bidder;
    outstandingBidTimestamp = BigNumber.from(
      data.landParcel.license.outstandingBid.timestamp
    );
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

  const isLoading = loading || data == null || licenseOwner == null;

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

  let title;
  if (
    interactionState == STATE.CLAIM_SELECTING ||
    interactionState == STATE.CLAIM_SELECTED
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
          {!basicProfileStreamManager
            ? spinner
            : parcelContent
            ? parcelContent.name
            : "[No Name Found]"}
        </h1>
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
    } else {
      buttons = placeBidButton;
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
            onClick={() => setInteractionState(STATE.VIEWING)}
          >
            <Image src="close.svg" />
          </Button>
        </Col>
      </Row>
      <Row className="pb-5">
        <Col>
          {interactionState == STATE.PARCEL_SELECTED ||
          interactionState == STATE.PARCEL_EDITING ||
          interactionState == STATE.PARCEL_PLACING_BID ||
          interactionState == STATE.PARCEL_REJECTING_BID ||
          interactionState == STATE.EDITING_GALLERY ? (
            <>
              <p className="font-weight-bold text-truncate">
                {!parcelContent ? null : hrefWebContent ? (
                  <a
                    href={hrefWebContent}
                    target="_blank"
                    rel="noreferrer"
                    className="text-light"
                  >{`[${hrefWebContent}]`}</a>
                ) : null}
              </p>
              <p>
                <span className="font-weight-bold">For Sale Price:</span>{" "}
                {isLoading ? spinner : forSalePrice}
              </p>
              <p className="text-truncate">
                <span className="font-weight-bold">Parcel ID:</span>{" "}
                {isLoading ? spinner : selectedParcelId}
              </p>
              <p className="text-truncate">
                <span className="font-weight-bold">Licensee:</span>{" "}
                {isLoading || !licenseOwner
                  ? spinner
                  : truncateStr(licenseOwner, 11)}
              </p>
              <p className="text-truncate">
                <span className="font-weight-bold">Stream ID:</span>{" "}
                {parcelIndexStreamId == null ? (
                  spinner
                ) : (
                  <a
                    href={`https://tiles.ceramic.community/document/${parcelIndexStreamId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-light"
                  >{`ceramic://${parcelIndexStreamId}`}</a>
                )}
              </p>
              <br />
              {buttons}
              <br />
              <br />
            </>
          ) : (
            <p>Unclaimed Coordinates</p>
          )}
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
