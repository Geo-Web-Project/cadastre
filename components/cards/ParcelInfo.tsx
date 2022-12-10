import * as React from "react";
import Col from "react-bootstrap/Col";
import { gql, useQuery } from "@apollo/client";
import { STATE } from "../Map";
import Button from "react-bootstrap/Button";
import Spinner from "react-bootstrap/Spinner";
import {
  PAYMENT_TOKEN,
  NETWORK_ID,
  CERAMIC_EXPLORER,
  BLOCK_EXPLORER,
  SPATIAL_DOMAIN,
} from "../../lib/constants";
import { truncateStr } from "../../lib/truncate";
import Image from "react-bootstrap/Image";
import Row from "react-bootstrap/Row";
import Tooltip from "react-bootstrap/Tooltip";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import { GeoWebContent } from "@geo-web/content";
import { Web3Storage } from "web3.storage";
import { TileDocument } from "@ceramicnetwork/stream-tile";
import CID from "cids";
import { SidebarProps, ParcelFieldsToUpdate } from "../Sidebar";
import { formatBalance } from "../../lib/formatBalance";
import EditAction from "./EditAction";
import ReclaimAction from "./ReclaimAction";
import { BigNumber } from "ethers";
import GalleryModal from "../gallery/GalleryModal";
import OutstandingBidView from "./OutstandingBidView";
import AuctionInstructions from "../AuctionInstructions";
import PlaceBidAction from "./PlaceBidAction";
import RejectBidAction from "./RejectBidAction";
import AuctionInfo from "./AuctionInfo";
import { useBasicProfile } from "../../lib/geo-web-content/basicProfile";
import { AssetId } from "caip";
import BN from "bn.js";
import { PCOLicenseDiamondFactory } from "@geo-web/sdk/dist/contract/index";
import type { IPCOLicenseDiamond } from "@geo-web/contracts/dist/typechain-types/IPCOLicenseDiamond";

interface Bid {
  contributionRate: string;
  perSecondFeeNumerator: string;
  perSecondFeeDenominator: string;
  forSalePrice: string;
  timestamp: string;
  bidder?: { id: string };
}

export interface GeoWebParcel {
  id: string;
  licenseOwner: string;
  licenseDiamond: string;
  currentBid: Bid;
  pendingBid?: Bid;
}

export interface ParcelQuery {
  geoWebParcel?: GeoWebParcel;
}

const parcelQuery = gql`
  query GeoWebParcel($id: String) {
    geoWebParcel(id: $id) {
      id
      licenseOwner
      licenseDiamond
      currentBid {
        contributionRate
        perSecondFeeNumerator
        perSecondFeeDenominator
        forSalePrice
        timestamp
      }
      pendingBid {
        timestamp
        bidder {
          id
        }
        contributionRate
        perSecondFeeNumerator
        perSecondFeeDenominator
        forSalePrice
      }
    }
  }
`;

export type ParcelInfoProps = SidebarProps & {
  perSecondFeeNumerator: BigNumber;
  perSecondFeeDenominator: BigNumber;
  parcelFieldsToUpdate: ParcelFieldsToUpdate | null;
  setParcelFieldsToUpdate: React.Dispatch<
    React.SetStateAction<ParcelFieldsToUpdate | null>
  >;
  minForSalePrice: BigNumber;
  licenseAddress: string;
};

function ParcelInfo(props: ParcelInfoProps) {
  const {
    account,
    interactionState,
    licenseAddress,
    setInteractionState,
    selectedParcelId,
    setIsParcelAvailable,
    ceramic,
    registryContract,
    ipfs,
    invalidLicenseId,
    setInvalidLicenseId,
    selectedParcelCoords,
    parcelFieldsToUpdate,
    setParcelFieldsToUpdate,
    sfFramework,
    paymentToken,
  } = props;
  const { loading, data, refetch } = useQuery<ParcelQuery>(parcelQuery, {
    variables: {
      id: selectedParcelId,
    },
  });

  const [parcelIndexStreamId, setParcelIndexStreamId] =
    React.useState<string | null>(null);

  const [requiredBid, setRequiredBid] = React.useState<BigNumber | null>(null);
  const [auctionStartTimestamp, setAuctionStartTimestamp] =
    React.useState<Date | null>(null);

  const [licenseDiamondContract, setLicenseDiamondContract] =
    React.useState<IPCOLicenseDiamond | null>(null);
  const [queryTimerId, setQueryTimerId] =
    React.useState<NodeJS.Timer | null>(null);
  const [geoWebContent, setGeoWebContent] =
    React.useState<GeoWebContent | null>(null);

  const { parcelContent, setShouldParcelContentUpdate } = useBasicProfile(
    geoWebContent,
    licenseAddress,
    data?.geoWebParcel?.licenseOwner,
    selectedParcelId
  );

  const spinner = (
    <Spinner as="span" size="sm" animation="border" role="status">
      <span className="visually-hidden">Loading...</span>
    </Spinner>
  );

  const forSalePrice =
    data && data.geoWebParcel ? (
      <>
        {formatBalance(data.geoWebParcel.currentBid.forSalePrice)}{" "}
        {PAYMENT_TOKEN}{" "}
      </>
    ) : null;
  const licenseOwner = data?.geoWebParcel?.licenseOwner;
  const hasOutstandingBid =
    data && data.geoWebParcel && data.geoWebParcel.pendingBid
      ? BigNumber.from(data.geoWebParcel.pendingBid.contributionRate).gt(
          BigNumber.from(0)
        ) ?? false
      : false;
  const outstandingBidder = hasOutstandingBid
    ? data?.geoWebParcel?.pendingBid?.bidder?.id ?? null
    : null;
  const currentOwnerBidForSalePrice =
    data && data.geoWebParcel
      ? BigNumber.from(data.geoWebParcel.currentBid.forSalePrice)
      : null;
  const outstandingBidForSalePrice = BigNumber.from(
    hasOutstandingBid ? data?.geoWebParcel?.pendingBid?.forSalePrice : 0
  );
  const outstandingBidTimestamp =
    hasOutstandingBid &&
    data &&
    data.geoWebParcel &&
    data.geoWebParcel.pendingBid
      ? BigNumber.from(data.geoWebParcel.pendingBid.timestamp)
      : null;
  const licenseDiamondAddress = data?.geoWebParcel?.licenseDiamond;

  React.useEffect(() => {
    const loadLicenseDiamond = async () => {
      if (!licenseDiamondAddress) {
        setLicenseDiamondContract(null);
        return;
      }

      const _licenseDiamond = PCOLicenseDiamondFactory.connect(
        licenseDiamondAddress,
        sfFramework.settings.provider
      );

      setLicenseDiamondContract(_licenseDiamond);

      const isPayerBidActive = await _licenseDiamond.isPayerBidActive();
      if (isPayerBidActive) {
        setInvalidLicenseId("");
      } else {
        setInvalidLicenseId(selectedParcelId);
      }

      if (!sfFramework || !paymentToken) {
        setAuctionStartTimestamp(null);
        return;
      }

      const { timestamp } = await sfFramework.cfaV1.getAccountFlowInfo({
        superToken: paymentToken.address,
        account: licenseDiamondAddress,
        providerOrSigner: sfFramework.settings.provider,
      });
      setAuctionStartTimestamp(timestamp);
    };

    loadLicenseDiamond();
  }, [licenseDiamondAddress, sfFramework, paymentToken]);

  React.useEffect(() => {
    if (!licenseAddress || !data?.geoWebParcel || !selectedParcelId) {
      return;
    }

    (async () => {
      const web3Storage = new Web3Storage({
        token: process.env.NEXT_PUBLIC_WEB3_STORAGE_TOKEN ?? "",
        endpoint: new URL("https://api.web3.storage"),
      });
      const geoWebContent = new GeoWebContent({
        ceramic,
        ipfs,
        web3Storage,
      });

      setGeoWebContent(geoWebContent);

      const assetId = new AssetId({
        chainId: `eip155:${NETWORK_ID}`,
        assetName: {
          namespace: "erc721",
          reference: registryContract.address.toLowerCase(),
        },
        tokenId: new BN(selectedParcelId.slice(2), "hex").toString(10),
      });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const doc = await TileDocument.deterministic(ceramic as any, {
        controllers: [ceramic.did?.parent ?? ""],
        family: `geo-web-parcel`,
        tags: [assetId.toString()],
      });
      setParcelIndexStreamId(doc.id.toString());
    })();
  }, [licenseAddress, data, selectedParcelId]);

  React.useEffect(() => {
    if (data?.geoWebParcel && parcelFieldsToUpdate && queryTimerId) {
      clearInterval(queryTimerId);
      setParcelFieldsToUpdate(null);
      setQueryTimerId(null);
    }

    if (!outstandingBidder) {
      setIsParcelAvailable(true);
      return;
    }

    setIsParcelAvailable(!(hasOutstandingBid && outstandingBidder !== account));
  }, [data]);

  React.useEffect(() => {
    if (parcelFieldsToUpdate && selectedParcelId) {
      const timerId = setInterval(() => {
        refetch({
          id: selectedParcelId,
        });
      }, 2000);

      setQueryTimerId(timerId);

      if (invalidLicenseId) {
        setInvalidLicenseId("");

        if (licenseOwner === account) {
          setParcelFieldsToUpdate(null);
        }
      }
    }

    return () => {
      if (queryTimerId) {
        clearInterval(queryTimerId);
      }
    };
  }, [parcelFieldsToUpdate, selectedParcelId]);

  React.useEffect(() => {
    setShouldParcelContentUpdate(true);
  }, [selectedParcelId]);

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

  let header;
  if (
    interactionState == STATE.CLAIM_SELECTING ||
    interactionState == STATE.CLAIM_SELECTED
  ) {
    header = (
      <>
        <Row className="mb-3">
          <Col sm="10">
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
    const spatialURL = `${SPATIAL_DOMAIN}?latitude=${selectedParcelCoords?.y}&longitude=${selectedParcelCoords?.x}`;
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
                {!geoWebContent
                  ? spinner
                  : parcelContent?.name
                  ? parcelContent.name
                  : data?.geoWebParcel?.id
                  ? `Parcel ${data.geoWebParcel.id}`
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
      </>
    );
  }

  let buttons;
  if (parcelFieldsToUpdate) {
    buttons = null;
  } else if (interactionState != STATE.PARCEL_SELECTED) {
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
                {isLoading || parcelFieldsToUpdate?.forSalePrice
                  ? spinner
                  : forSalePrice}
              </p>
              <p className="text-truncate">
                <span className="fw-bold">Parcel ID:</span>{" "}
                {isLoading ? (
                  spinner
                ) : (
                  <a
                    href={`${BLOCK_EXPLORER}/token/${
                      registryContract.address
                    }?a=${new BN(selectedParcelId.slice(2), "hex").toString(
                      10
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-light"
                  >
                    {selectedParcelId}
                  </a>
                )}
              </p>
              <p className="text-truncate">
                <span className="fw-bold">Licensee:</span>{" "}
                {isLoading ||
                !licenseOwner ||
                parcelFieldsToUpdate?.licenseOwner
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
              {invalidLicenseId == selectedParcelId
                ? null
                : parcelFieldsToUpdate
                ? null
                : buttons}
            </>
          ) : null}
          {(interactionState == STATE.PARCEL_RECLAIMING ||
            (interactionState == STATE.PARCEL_SELECTED &&
              invalidLicenseId == selectedParcelId &&
              data)) &&
          licenseOwner &&
          currentOwnerBidForSalePrice &&
          auctionStartTimestamp ? (
            <AuctionInfo
              licenseOwner={licenseOwner}
              forSalePrice={currentOwnerBidForSalePrice}
              auctionStartTimestamp={auctionStartTimestamp}
              requiredBid={requiredBid}
              setRequiredBid={setRequiredBid}
              {...props}
            />
          ) : null}
          {interactionState == STATE.PARCEL_SELECTED &&
          hasOutstandingBid &&
          outstandingBidForSalePrice &&
          currentOwnerBidForSalePrice &&
          !parcelFieldsToUpdate ? (
            <>
              <OutstandingBidView
                newForSalePrice={outstandingBidForSalePrice}
                existingForSalePrice={currentOwnerBidForSalePrice}
                bidTimestamp={outstandingBidTimestamp ?? null}
                licensorIsOwner={licenseOwner === account}
                licenseDiamondContract={licenseDiamondContract}
                {...props}
              />
              <AuctionInstructions />
            </>
          ) : null}
          {interactionState == STATE.PARCEL_EDITING && data?.geoWebParcel ? (
            <EditAction
              parcelData={data.geoWebParcel}
              parcelContent={parcelContent}
              hasOutstandingBid={
                !parcelFieldsToUpdate ? hasOutstandingBid : false
              }
              licenseDiamondContract={licenseDiamondContract}
              setShouldParcelContentUpdate={setShouldParcelContentUpdate}
              {...props}
            />
          ) : null}
          {interactionState == STATE.PARCEL_PLACING_BID &&
          data?.geoWebParcel ? (
            <PlaceBidAction
              parcelData={data.geoWebParcel}
              licenseDiamondContract={licenseDiamondContract}
              {...props}
            />
          ) : null}
          {interactionState == STATE.PARCEL_REJECTING_BID &&
          hasOutstandingBid &&
          outstandingBidForSalePrice &&
          data?.geoWebParcel &&
          !parcelFieldsToUpdate ? (
            <RejectBidAction
              parcelData={data.geoWebParcel}
              bidForSalePrice={outstandingBidForSalePrice}
              bidTimestamp={outstandingBidTimestamp ?? null}
              licenseDiamondContract={licenseDiamondContract}
              {...props}
            />
          ) : null}
          {interactionState == STATE.PARCEL_RECLAIMING &&
          licenseOwner &&
          geoWebContent ? (
            <ReclaimAction
              {...props}
              parcelContent={parcelContent}
              licenseOwner={licenseOwner}
              licenseDiamondContract={licenseDiamondContract}
              requiredBid={requiredBid ?? undefined}
              setShouldParcelContentUpdate={setShouldParcelContentUpdate}
            ></ReclaimAction>
          ) : null}
        </Col>
      </Row>
      <GalleryModal
        show={interactionState == STATE.EDITING_GALLERY}
        geoWebContent={geoWebContent}
        {...props}
      ></GalleryModal>
    </>
  );
}

export default ParcelInfo;
