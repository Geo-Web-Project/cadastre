import * as React from "react";
import dynamic from "next/dynamic";
import Col from "react-bootstrap/Col";
import { gql, useQuery } from "@apollo/client";
import { STATE } from "../Map";
import Button from "react-bootstrap/Button";
import Spinner from "react-bootstrap/Spinner";
import {
  PAYMENT_TOKEN,
  BLOCK_EXPLORER,
  SPATIAL_DOMAIN,
} from "../../lib/constants";
import { truncateStr } from "../../lib/truncate";
import Image from "react-bootstrap/Image";
import Row from "react-bootstrap/Row";
import Tooltip from "react-bootstrap/Tooltip";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import CID from "cids";
import { OffCanvasPanelProps, ParcelFieldsToUpdate } from "../OffCanvasPanel";
import CopyTooltip from "../CopyTooltip";
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
import ConnectWallet from "../ConnectWallet";
import BackButton from "../BackButton";
import { useBasicProfile } from "../../lib/geo-web-content/basicProfile";
import BN from "bn.js";
import { GeoWebContent } from "@geo-web/content";
import { PCOLicenseDiamondFactory } from "@geo-web/sdk/dist/contract/index";
import type { IPCOLicenseDiamond } from "@geo-web/contracts/dist/typechain-types/IPCOLicenseDiamond";
import { useMediaQuery } from "../../lib/mediaQuery";

const ParcelChat = dynamic(() => import("../ParcelChat"), {
  ssr: false,
});

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

export type ParcelInfoProps = OffCanvasPanelProps & {
  perSecondFeeNumerator: BigNumber;
  perSecondFeeDenominator: BigNumber;
  parcelFieldsToUpdate: ParcelFieldsToUpdate | null;
  setParcelFieldsToUpdate: React.Dispatch<
    React.SetStateAction<ParcelFieldsToUpdate | null>
  >;
  minForSalePrice: BigNumber;
  licenseAddress: string;
  geoWebContent: GeoWebContent;
  isFullSize: boolean;
  setIsFullSize: React.Dispatch<React.SetStateAction<boolean>>;
};

function ParcelInfo(props: ParcelInfoProps) {
  const {
    account,
    signer,
    interactionState,
    licenseAddress,
    setInteractionState,
    selectedParcelId,
    setIsParcelAvailable,
    registryContract,
    geoWebContent,
    invalidLicenseId,
    setInvalidLicenseId,
    selectedParcelCoords,
    parcelFieldsToUpdate,
    setParcelFieldsToUpdate,
    sfFramework,
    paymentToken,
    isFullSize,
    setIsFullSize,
  } = props;
  const { isMobile, isTablet } = useMediaQuery();
  const { loading, data, refetch } = useQuery<ParcelQuery>(parcelQuery, {
    variables: {
      id: selectedParcelId,
    },
  });

  const [requiredBid, setRequiredBid] = React.useState<BigNumber | null>(null);
  const [auctionStartTimestamp, setAuctionStartTimestamp] =
    React.useState<Date | null>(null);
  const [licenseDiamondContract, setLicenseDiamondContract] =
    React.useState<IPCOLicenseDiamond | null>(null);
  const [queryTimerId, setQueryTimerId] = React.useState<NodeJS.Timer | null>(
    null
  );
  const [showParcelChat, setShowParcelChat] = React.useState<boolean>(false);

  const { parcelContent, rootCid, setRootCid, setShouldParcelContentUpdate } =
    useBasicProfile(
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

  function copyParcelLink() {
    if (!selectedParcelCoords) {
      return;
    }

    const parcelLink = new URL(window.location.origin);

    parcelLink.searchParams.set("latitude", selectedParcelCoords.y.toString());
    parcelLink.searchParams.set("longitude", selectedParcelCoords.x.toString());
    parcelLink.searchParams.set("id", selectedParcelId);

    navigator.clipboard.writeText(parcelLink.href);
  }

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
        setIsFullSize(true);
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
        setIsFullSize(true);
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
        setIsFullSize(true);
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
          setIsFullSize(true);
        }}
      >
        Place Bid
      </Button>
      <AuctionInstructions />
    </>
  );

  let header;
  if (
    interactionState === STATE.CLAIM_SELECTING ||
    interactionState === STATE.CLAIM_SELECTED ||
    (interactionState !== STATE.PARCEL_SELECTED && (isMobile || isTablet))
  ) {
    const headerText =
      interactionState === STATE.PARCEL_PLACING_BID
        ? "Place Bid"
        : interactionState === STATE.PARCEL_REJECTING_BID
        ? "Reject Bid"
        : interactionState === STATE.PARCEL_EDITING
        ? "Edit Parcel"
        : interactionState === STATE.PARCEL_RECLAIMING &&
          account === licenseOwner
        ? "Reclaim Parcel"
        : interactionState === STATE.PARCEL_RECLAIMING
        ? "Forclosure Claim"
        : "Claim a Parcel";
    header = (
      <>
        <Row
          className={`${
            (!isMobile && !isTablet) || isFullSize ? "pb-0" : "pb-3"
          } p-sm-0`}
        >
          <Col sm="10" className="w-75">
            <span className="fs-4 fw-bold">{headerText}</span>
          </Col>
        </Row>
        {((!isMobile && !isTablet) || isFullSize) &&
          interactionState !== STATE.CLAIM_SELECTING && (
            <Row className="m-0 p-0 pb-3 pb-lg-4">
              <BackButton
                interactionState={interactionState}
                setInteractionState={setInteractionState}
              />
            </Row>
          )}
      </>
    );
  } else {
    const spatialURL = `${SPATIAL_DOMAIN}?latitude=${selectedParcelCoords?.y}&longitude=${selectedParcelCoords?.x}`;
    header =
      interactionState === STATE.PARCEL_SELECTED || (!isMobile && !isTablet) ? (
        <>
          <div
            className="d-flex flex-column justify-content-between rounded-3 p-0 pt-2 m-0 mt-sm-0"
            style={{
              backgroundImage: "url(Contour_Lines.png)",
              backgroundSize: "cover",
              height: isMobile || isTablet ? "116px" : "auto",
            }}
          >
            <Row className="m-0">
              <h1 className="fs-3 fw-bold">
                {parcelContent === null
                  ? spinner
                  : parcelContent?.name
                  ? parcelContent.name
                  : data?.geoWebParcel?.id
                  ? `Parcel ${data.geoWebParcel.id}`
                  : spinner}
              </h1>
            </Row>
            <Row className="m-0">
              {!parcelContent ? null : hrefWebContent ? (
                <a
                  href={hrefWebContent}
                  target="_blank"
                  rel="noreferrer"
                  className="d-block text-light fw-bold text-truncate"
                >{`${hrefWebContent}`}</a>
              ) : null}
              <div className="d-flex justify-content-end gap-1 gap-sm-2 text-end pt-2 mb-1 mb-sm-0  mx-sm-2">
                <OverlayTrigger
                  key="chat"
                  placement="top"
                  overlay={
                    <Tooltip id={`tooltip-key`}>Open Parcel Chat</Tooltip>
                  }
                >
                  <Button
                    variant="link"
                    size="sm"
                    className="p-0 mt-1 shadow-none"
                    onClick={() => setShowParcelChat(true)}
                  >
                    <Image width={isMobile ? 24 : 32} src="chat.svg" />
                  </Button>
                </OverlayTrigger>
                <OverlayTrigger
                  key="browser"
                  placement="top"
                  overlay={
                    <Tooltip id={`tooltip-key`}>
                      Open in Spatial Browser
                    </Tooltip>
                  }
                >
                  <Button
                    variant="link"
                    size="sm"
                    className="text-right shadow-none"
                    href={spatialURL}
                    target="_blank"
                  >
                    <Image
                      width={isMobile ? 24 : 32}
                      src="open-in-browser.svg"
                    />
                  </Button>
                </OverlayTrigger>
                <CopyTooltip
                  contentClick="Link Copied"
                  contentHover="Copy link to Parcel"
                  target={
                    <Image
                      className="me-1"
                      width={isMobile ? 30 : 36}
                      src="link.svg"
                    />
                  }
                  handleCopy={copyParcelLink}
                />
              </div>
            </Row>
          </div>
        </>
      ) : null;
  }

  let buttons;
  if (parcelFieldsToUpdate) {
    buttons = null;
  } else if (interactionState != STATE.PARCEL_SELECTED) {
    buttons = cancelButton;
  } else if (!isLoading) {
    if (!account) {
      buttons = (
        <>
          <ConnectWallet />
          {!hasOutstandingBid && <AuctionInstructions />}
        </>
      );
    } else if (account.toLowerCase() == licenseOwner?.toLowerCase()) {
      buttons = (
        <div>
          {editButton}
          {editGalleryButton}
        </div>
      );
    } else if (!hasOutstandingBid) {
      buttons = placeBidButton;
    }
  }

  return (
    <>
      {header}
      {interactionState == STATE.PARCEL_SELECTED ||
      (!isMobile &&
        !isTablet &&
        (interactionState == STATE.PARCEL_EDITING ||
          interactionState == STATE.PARCEL_PLACING_BID ||
          interactionState == STATE.PARCEL_REJECTING_BID ||
          interactionState == STATE.EDITING_GALLERY)) ? (
        <Row className="m-0 mt-2 mt-sm-3 pb-1 pb-lg-5">
          <Col className="p-0">
            <div className="d-flex flex-column gap-1 gap-sm-3">
              <div>
                <span className="fw-bold">For Sale Price:</span>{" "}
                {isLoading || parcelFieldsToUpdate?.forSalePrice
                  ? spinner
                  : forSalePrice}
              </div>
              <div className="text-truncate">
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
              </div>
              <div className="text-truncate">
                <span className="fw-bold">Licensee:</span>{" "}
                {isLoading ||
                !licenseOwner ||
                parcelFieldsToUpdate?.licenseOwner
                  ? spinner
                  : truncateStr(licenseOwner, 11)}
              </div>
              <div className="text-truncate">
                <span className="fw-bold">Root CID: </span>{" "}
                {rootCid === "" ? (
                  "Not Available"
                ) : !rootCid ? (
                  spinner
                ) : (
                  <a
                    href={`https://explore.ipld.io/#/explore/${rootCid}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-light"
                  >
                    {rootCid}
                  </a>
                )}
              </div>
              <br />
              {invalidLicenseId == selectedParcelId
                ? null
                : parcelFieldsToUpdate
                ? null
                : buttons}
            </div>
          </Col>
        </Row>
      ) : null}
      <Row>
        <Col>
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
                {...props}
                newForSalePrice={outstandingBidForSalePrice}
                existingForSalePrice={currentOwnerBidForSalePrice}
                bidTimestamp={outstandingBidTimestamp ?? null}
                licensorIsOwner={licenseOwner === account}
                licenseDiamondContract={licenseDiamondContract}
              />
              <AuctionInstructions />
            </>
          ) : null}
          {interactionState == STATE.PARCEL_EDITING &&
          account &&
          signer &&
          data?.geoWebParcel ? (
            <EditAction
              {...props}
              signer={signer}
              parcelData={data.geoWebParcel}
              parcelContent={parcelContent}
              hasOutstandingBid={
                !parcelFieldsToUpdate ? hasOutstandingBid : false
              }
              licenseDiamondContract={licenseDiamondContract}
              setShouldParcelContentUpdate={setShouldParcelContentUpdate}
              setRootCid={setRootCid}
            />
          ) : null}
          {interactionState == STATE.PARCEL_PLACING_BID &&
          account &&
          signer &&
          data?.geoWebParcel ? (
            <PlaceBidAction
              {...props}
              signer={signer}
              parcelData={data.geoWebParcel}
              licenseDiamondContract={licenseDiamondContract}
            />
          ) : null}
          {interactionState == STATE.PARCEL_REJECTING_BID &&
          account &&
          signer &&
          hasOutstandingBid &&
          outstandingBidForSalePrice &&
          data?.geoWebParcel &&
          !parcelFieldsToUpdate ? (
            <RejectBidAction
              {...props}
              signer={signer}
              parcelData={data.geoWebParcel}
              bidForSalePrice={outstandingBidForSalePrice}
              bidTimestamp={outstandingBidTimestamp ?? null}
              licenseDiamondContract={licenseDiamondContract}
            />
          ) : null}
          {interactionState == STATE.PARCEL_RECLAIMING &&
          account &&
          signer &&
          licenseOwner ? (
            <ReclaimAction
              {...props}
              signer={signer}
              parcelContent={parcelContent}
              licenseOwner={licenseOwner}
              licenseDiamondContract={licenseDiamondContract}
              requiredBid={requiredBid ?? undefined}
              setShouldParcelContentUpdate={setShouldParcelContentUpdate}
              setRootCid={setRootCid}
            ></ReclaimAction>
          ) : null}
        </Col>
      </Row>
      {interactionState == STATE.EDITING_GALLERY && (
        <GalleryModal
          show={interactionState === STATE.EDITING_GALLERY}
          setRootCid={setRootCid}
          {...props}
        ></GalleryModal>
      )}
      <ParcelChat
        show={showParcelChat}
        parcelId={selectedParcelId}
        licenseOwner={licenseOwner}
        handleClose={() => setShowParcelChat(false)}
      />
    </>
  );
}

export default ParcelInfo;
