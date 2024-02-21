import * as React from "react";
import { gql, useQuery } from "@apollo/client";
import { STATE } from "../Map";
import {
  PAYMENT_TOKEN,
  BLOCK_EXPLORER,
  SPATIAL_DOMAIN,
} from "../../../lib/constants";
import { truncateStr } from "../../../lib/truncate";
import Image from "react-bootstrap/Image";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Card from "react-bootstrap/Card";
import Button from "react-bootstrap/Button";
import Spinner from "react-bootstrap/Spinner";
import Tooltip from "react-bootstrap/Tooltip";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Dropdown from "react-bootstrap/Dropdown";
import NavItem from "react-bootstrap/NavItem";
import NavLink from "react-bootstrap/NavLink";
import CID from "cids";
import { OffCanvasPanelProps, ParcelFieldsToUpdate } from "../OffCanvasPanel";
import { formatBalance } from "../../../lib/formatBalance";
import EditBidAction from "./EditBidAction";
import EditMetadataAction from "./EditMetadataAction";
import ReclaimAction from "./ReclaimAction";
import { BigNumber } from "ethers";
import AugmentPublisher from "../publisher/AugmentPublisher";
import OutstandingBidView from "./OutstandingBidView";
import AuctionInstructions from "../AuctionInstructions";
import PlaceBidAction from "./PlaceBidAction";
import RejectBidAction from "./RejectBidAction";
import AuctionInfo from "./AuctionInfo";
import ConnectWallet from "../../shared/ConnectWallet";
import NotificationModal from "../NotificationModal";
import { useBasicProfile } from "../../../hooks/geo-web-content/basicProfile";
import BN from "bn.js";
import { PCOLicenseDiamondFactory } from "@geo-web/sdk/dist/contract/index";
import type { IPCOLicenseDiamond } from "@geo-web/contracts/dist/typechain-types/IPCOLicenseDiamond";
import { useMediaQuery } from "../../../hooks/mediaQuery";
import { useParcelNavigation } from "../../../hooks/parcelNavigation";

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
  isFullScreen: boolean;
  setIsFullScreen: React.Dispatch<React.SetStateAction<boolean>>;
};

function ParcelInfo(props: ParcelInfoProps) {
  const {
    account,
    signer,
    interactionState,
    setInteractionState,
    selectedParcelId,
    setIsParcelAvailable,
    registryContract,
    invalidLicenseId,
    setInvalidLicenseId,
    parcelFieldsToUpdate,
    setParcelFieldsToUpdate,
    sfFramework,
    paymentToken,
    isFullScreen,
    setIsFullScreen,
  } = props;
  const { isMobile, isTablet } = useMediaQuery();
  const { loading, data, refetch } = useQuery<ParcelQuery>(parcelQuery, {
    variables: {
      id: selectedParcelId,
    },
    fetchPolicy: "cache-first",
  });

  const [requiredBid, setRequiredBid] = React.useState<BigNumber | null>(null);
  const [auctionStartTimestamp, setAuctionStartTimestamp] =
    React.useState<Date | null>(null);
  const [licenseDiamondContract, setLicenseDiamondContract] =
    React.useState<IPCOLicenseDiamond | null>(null);
  const [queryTimerId, setQueryTimerId] = React.useState<NodeJS.Timer | null>(
    null
  );
  const { basicProfile, setShouldBasicProfileUpdate } = useBasicProfile(
    registryContract,
    selectedParcelId
  );
  const { getParcelCoords, flyToParcel } =
    useParcelNavigation(selectedParcelId);

  const spinner = (
    <Spinner as="span" size="sm" animation="border" role="status">
      <span className="visually-hidden">Loading...</span>
    </Spinner>
  );

  const accountAddress = account;
  const selectedParcelCoords = getParcelCoords();
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
    const parcelLink = new URL(window.location.origin);

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

    setIsParcelAvailable(
      !(hasOutstandingBid && outstandingBidder !== accountAddress)
    );
  }, [data]);

  React.useEffect(() => {
    if (
      (parcelFieldsToUpdate?.forSalePrice ||
        parcelFieldsToUpdate?.licenseOwner) &&
      selectedParcelId
    ) {
      const timerId = setInterval(() => {
        refetch({
          id: selectedParcelId,
        });
      }, 2000);

      setQueryTimerId(timerId);

      if (invalidLicenseId) {
        setInvalidLicenseId("");

        if (licenseOwner === accountAddress) {
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

  const isLoading = loading || data === null;

  let hrefWebContent;
  // Translate ipfs:// to case-insensitive base
  if (
    basicProfile &&
    basicProfile.external_url &&
    basicProfile.external_url.startsWith("ipfs://")
  ) {
    const cid = new CID(basicProfile.external_url.split("ipfs://")[1]);
    hrefWebContent = `ipfs://${cid.toV1().toBaseEncodedString("base32")}`;
  } else if (basicProfile) {
    hrefWebContent = basicProfile.external_url;
  }

  const cancelButton = (
    <Button
      variant="danger"
      className="w-100"
      onClick={() => {
        setInteractionState(STATE.PARCEL_SELECTED);
        setIsFullScreen(true);
      }}
    >
      Cancel
    </Button>
  );

  const publisherButton = (
    <Button
      variant="secondary"
      className="w-100"
      disabled={import.meta.env.MODE === "mainnet"}
      onClick={() => {
        if (selectedParcelCoords) {
          flyToParcel({
            center: selectedParcelCoords,
            duration: 500,
          });
        }

        setInteractionState(STATE.PUBLISHING);
        setIsFullScreen(true);
      }}
    >
      Augment Publisher
    </Button>
  );

  const placeBidButton = (
    <>
      <Button
        variant="primary"
        className="w-100"
        onClick={() => {
          setInteractionState(STATE.PARCEL_PLACING_BID);
          setIsFullScreen(true);
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
    (interactionState !== STATE.PARCEL_SELECTED &&
      interactionState !== STATE.PUBLISHING &&
      (isMobile || isTablet))
  ) {
    const headerText =
      interactionState === STATE.PARCEL_PLACING_BID
        ? "Place Bid"
        : interactionState === STATE.PARCEL_ACCEPTING_BID
        ? "Accept Bid"
        : interactionState === STATE.PARCEL_REJECTING_BID
        ? "Reject Bid"
        : interactionState === STATE.PARCEL_EDITING_BID
        ? "Edit Price"
        : interactionState === STATE.EDITING_METADATA
        ? "Edit Metadata"
        : interactionState === STATE.PARCEL_RECLAIMING &&
          accountAddress === licenseOwner
        ? "Reclaim Parcel"
        : interactionState === STATE.PARCEL_RECLAIMING
        ? "Foreclosure Claim"
        : ((isMobile || isTablet) &&
            interactionState === STATE.CLAIM_SELECTING) ||
          (interactionState === STATE.CLAIM_SELECTED && !accountAddress)
        ? "Claim Parcel"
        : null;
    header = (
      <Row
        className={`${
          (!isMobile && !isTablet) || isFullScreen ? "pb-0" : "pb-3"
        } p-sm-0`}
      >
        <Col sm="10" className="w-75">
          <span className="fs-4 fw-bold text-white">{headerText}</span>
        </Col>
      </Row>
    );
  } else {
    const spatialURL = selectedParcelCoords
      ? `${SPATIAL_DOMAIN}?latitude=${selectedParcelCoords[1]}&longitude=${selectedParcelCoords[0]}`
      : SPATIAL_DOMAIN;
    header =
      interactionState === STATE.PARCEL_SELECTED ||
      (!isMobile &&
        !isTablet &&
        interactionState !== STATE.PUBLISHING &&
        interactionState !== STATE.PUBLISHING_NEW_MARKER) ? (
        <>
          <div
            className="d-flex flex-column justify-content-between rounded-3 p-0 pt-2 m-0 mt-sm-0"
            style={{
              backgroundImage: "url(Contour_Lines.png)",
              backgroundSize: "cover",
              height: isMobile || isTablet ? "80px" : "auto",
            }}
          >
            <Row className="justify-content-between m-0">
              <Col xs="9" style={{ height: "80px" }}>
                <h1 className="fs-3 fw-bold text-truncate">
                  {basicProfile === null
                    ? spinner
                    : basicProfile?.name
                    ? basicProfile.name
                    : data?.geoWebParcel?.id
                    ? `Parcel ${data.geoWebParcel.id}`
                    : spinner}
                </h1>
                {!basicProfile ? null : hrefWebContent ? (
                  <a
                    href={hrefWebContent}
                    target="_blank"
                    rel="noreferrer"
                    className="d-block text-light fw-bold text-truncate"
                  >{`${hrefWebContent}`}</a>
                ) : null}
              </Col>
              <Col
                xs="3"
                className="d-flex gap-2 justify-content-end align-items-start m-0 px-1"
              >
                {accountAddress === licenseOwner && !invalidLicenseId && (
                  <>
                    {!basicProfile?.external_url && (
                      <OverlayTrigger
                        placement="top"
                        overlay={<Tooltip>Add Link</Tooltip>}
                      >
                        <Button
                          variant="link"
                          className="p-0"
                          onClick={() => {
                            setInteractionState(STATE.EDITING_METADATA);
                            setIsFullScreen(true);
                          }}
                        >
                          <Image src="add-link.svg" alt="add link" width={18} />
                        </Button>
                      </OverlayTrigger>
                    )}
                    <OverlayTrigger
                      placement="top"
                      overlay={<Tooltip>Edit Metadata</Tooltip>}
                    >
                      <Button
                        variant="link"
                        className={`p-0 pe-1 ${
                          (isMobile || isTablet) && !isFullScreen
                            ? "me-4"
                            : "ms-1"
                        }`}
                        onClick={() => {
                          setInteractionState(STATE.EDITING_METADATA);
                          setIsFullScreen(true);
                        }}
                      >
                        <Image src="edit.svg" alt="edit" width={18} />
                      </Button>
                    </OverlayTrigger>
                  </>
                )}
                <Dropdown
                  as={NavItem}
                  drop={isMobile || isTablet ? "up" : "down"}
                  align="end"
                  style={{
                    position:
                      (isMobile || isTablet) && !isFullScreen
                        ? "fixed"
                        : "static",
                    zIndex:
                      (isMobile || isTablet) && !isFullScreen ? 10000 : 1000,
                  }}
                >
                  <Dropdown.Toggle as={NavLink} bsPrefix="nav-link">
                    <Image src="more-menu.svg" alt="more-menu" width={24} />
                  </Dropdown.Toggle>
                  <Dropdown.Menu variant="dark">
                    <Dropdown.Item>
                      <NotificationModal
                        isMobile={isMobile}
                        licenseDiamondAddress={licenseDiamondAddress ?? ""}
                      />
                    </Dropdown.Item>
                    <Dropdown.Item
                      as={NavLink}
                      href={spatialURL}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2 ms-2"
                    >
                      Open Parcel in Spatial Browser
                    </Dropdown.Item>
                    <Dropdown.Item onClick={copyParcelLink}>
                      Copy a sharable link
                    </Dropdown.Item>
                  </Dropdown.Menu>
                </Dropdown>
              </Col>
            </Row>
          </div>
        </>
      ) : null;
  }

  let buttons;
  if (
    parcelFieldsToUpdate?.forSalePrice ||
    parcelFieldsToUpdate?.licenseOwner
  ) {
    buttons = null;
  } else if (interactionState !== STATE.PARCEL_SELECTED) {
    buttons = cancelButton;
  } else if (!isLoading) {
    if (!accountAddress) {
      buttons = (
        <>
          <ConnectWallet />
          {!hasOutstandingBid && <AuctionInstructions />}
        </>
      );
    } else if (accountAddress.toLowerCase() === licenseOwner?.toLowerCase()) {
      buttons = <div>{publisherButton}</div>;
    } else if (!hasOutstandingBid) {
      buttons = placeBidButton;
    }
  }

  return (
    <>
      {header}
      {interactionState === STATE.PARCEL_SELECTED ||
      (!isMobile &&
        !isTablet &&
        (interactionState === STATE.PARCEL_EDITING_BID ||
          interactionState === STATE.PARCEL_PLACING_BID ||
          interactionState === STATE.PARCEL_ACCEPTING_BID ||
          interactionState === STATE.PARCEL_REJECTING_BID ||
          interactionState === STATE.EDITING_METADATA)) ? (
        <Container>
          <Row className="m-0 mt-2 mt-sm-3">
            <Col className="p-0">
              <div className="d-flex flex-column gap-1 gap-sm-3">
                <div>
                  <span className="fw-bold">For Sale Price:</span>{" "}
                  {isLoading || parcelFieldsToUpdate?.forSalePrice
                    ? spinner
                    : forSalePrice}
                  {!isLoading &&
                    accountAddress === licenseOwner &&
                    !invalidLicenseId &&
                    !parcelFieldsToUpdate?.forSalePrice && (
                      <OverlayTrigger
                        placement="top"
                        overlay={<Tooltip>Edit Price</Tooltip>}
                      >
                        <Button
                          variant="link"
                          className="p-0 m-0 shadow-none"
                          onClick={() => {
                            setInteractionState(STATE.PARCEL_EDITING_BID);
                            setIsFullScreen(true);
                          }}
                        >
                          <Image
                            className="d-flex align-items-center"
                            src="edit.svg"
                          />
                        </Button>
                      </OverlayTrigger>
                    )}
                </div>
              </div>
            </Col>
          </Row>
          <Row className="mt-3 text-truncate">
            <Col>
              <span className="fw-bold">Parcel ID:</span>{" "}
              {isLoading ? (
                spinner
              ) : (
                <a
                  href={`${BLOCK_EXPLORER}/token/${
                    registryContract.address
                  }?a=${new BN(selectedParcelId.slice(2), "hex").toString(10)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-light"
                >
                  {selectedParcelId}
                </a>
              )}
            </Col>
          </Row>
          <Row className="mt-3 text-truncate">
            <Col>
              <span className="fw-bold">Licensee:</span>{" "}
              {isLoading || !licenseOwner || parcelFieldsToUpdate?.licenseOwner
                ? spinner
                : truncateStr(licenseOwner, 11)}
            </Col>
          </Row>
          <Row className="my-4">
            <Col>
              {invalidLicenseId === selectedParcelId
                ? null
                : parcelFieldsToUpdate?.forSalePrice ||
                  parcelFieldsToUpdate?.licenseOwner
                ? null
                : buttons}
            </Col>
          </Row>
        </Container>
      ) : null}
      <Row>
        <Col>
          {(interactionState === STATE.PARCEL_RECLAIMING ||
            (interactionState === STATE.PARCEL_SELECTED &&
              invalidLicenseId === selectedParcelId &&
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
          {interactionState === STATE.PARCEL_SELECTED &&
          hasOutstandingBid &&
          outstandingBidForSalePrice &&
          currentOwnerBidForSalePrice &&
          !parcelFieldsToUpdate?.forSalePrice &&
          !parcelFieldsToUpdate?.licenseOwner ? (
            <>
              <OutstandingBidView
                {...props}
                newForSalePrice={outstandingBidForSalePrice}
                existingForSalePrice={currentOwnerBidForSalePrice}
                bidTimestamp={outstandingBidTimestamp ?? null}
                licensorIsOwner={licenseOwner === accountAddress}
                licenseDiamondContract={licenseDiamondContract}
              />
              <AuctionInstructions />
            </>
          ) : null}
          {interactionState === STATE.PARCEL_EDITING_BID &&
          accountAddress &&
          signer &&
          data?.geoWebParcel &&
          licenseOwner ? (
            <EditBidAction
              {...props}
              signer={signer}
              parcelData={data.geoWebParcel}
              hasOutstandingBid={
                !parcelFieldsToUpdate?.forSalePrice &&
                !parcelFieldsToUpdate?.licenseOwner
                  ? hasOutstandingBid
                  : false
              }
              licenseDiamondContract={licenseDiamondContract}
              licenseOwner={licenseOwner}
            />
          ) : null}
          {interactionState === STATE.EDITING_METADATA &&
          basicProfile &&
          accountAddress &&
          signer &&
          data?.geoWebParcel ? (
            <EditMetadataAction
              {...props}
              basicProfile={basicProfile}
              setShouldBasicProfileUpdate={setShouldBasicProfileUpdate}
              signer={signer}
            />
          ) : null}
          {interactionState === STATE.PARCEL_PLACING_BID &&
          accountAddress &&
          signer &&
          data?.geoWebParcel ? (
            <PlaceBidAction
              {...props}
              signer={signer}
              parcelData={data.geoWebParcel}
              licenseDiamondContract={licenseDiamondContract}
            />
          ) : null}
          {interactionState === STATE.PARCEL_REJECTING_BID &&
          accountAddress &&
          signer &&
          hasOutstandingBid &&
          outstandingBidForSalePrice &&
          data?.geoWebParcel &&
          !parcelFieldsToUpdate?.forSalePrice &&
          !parcelFieldsToUpdate?.licenseOwner ? (
            <RejectBidAction
              {...props}
              signer={signer}
              parcelData={data.geoWebParcel}
              bidForSalePrice={outstandingBidForSalePrice}
              bidTimestamp={outstandingBidTimestamp ?? null}
              licenseDiamondContract={licenseDiamondContract}
            />
          ) : null}
          {interactionState === STATE.PARCEL_RECLAIMING &&
          accountAddress &&
          signer &&
          licenseOwner ? (
            <ReclaimAction
              {...props}
              signer={signer}
              basicProfile={basicProfile}
              licenseOwner={licenseOwner}
              licenseDiamondContract={licenseDiamondContract}
              requiredBid={requiredBid ?? undefined}
            ></ReclaimAction>
          ) : null}
        </Col>
      </Row>
      {(interactionState === STATE.PUBLISHING ||
        interactionState === STATE.PUBLISHING_NEW_MARKER) && (
        <AugmentPublisher {...props}></AugmentPublisher>
      )}
      {interactionState === STATE.PARCEL_SELECTED &&
        accountAddress.toLowerCase() === licenseOwner?.toLowerCase() && (
          <Card text="white" className="bg-dark border-secondary rounded-3">
            <Card.Header className="fs-4 fw-bold border-0">
              A new era of the Geo Web is almost here!
            </Card.Header>
            <Card.Body className="small">
              We’re moving the Geo Web’s default content layer onchain with{" "}
              <Card.Link href="https://mud.dev/" target="_blank">
                Lattice MUD
              </Card.Link>{" "}
              to expand developer opportunities, maximize composability, and
              increase network resiliency. But it’s not ready for mainnet yet…
              <br />
              <br />- Try the{" "}
              <Card.Link href="https://testnet.geoweb.land/" target="_blank">
                Augment Publisher on testnet
              </Card.Link>{" "}
              <br />- Read more about{" "}
              <Card.Link
                href="https://docs.geoweb.network/developers/geospatial-publishing/augments"
                target="_blank"
              >
                the Geo Web approach to geospatial AR and start building an
                Augment
              </Card.Link>{" "}
              <br />- Join{" "}
              <Card.Link
                href="https://discord.com/invite/reXgPru7ck"
                target="_blank"
              >
                the Geo Web Discord
              </Card.Link>{" "}
              and request access to the Spatial Browser TestFlight
            </Card.Body>
          </Card>
        )}
    </>
  );
}

export default ParcelInfo;
