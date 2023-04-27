import { useState } from "react";
import { BigNumber } from "ethers";
import { Modal, Container, Row, Col, Image, Button } from "react-bootstrap";
import { Framework } from "@superfluid-finance/sdk-core";
import { GeoWebContent } from "@geo-web/content";
import { Contracts } from "@geo-web/sdk/dist/contract/types";
import HighestValue from "./HighestValue";
import Recent from "./Recent";
import Random from "./Random";
import NeedsTransfer from "./NeedsTransfer";
import Foreclosure from "./Foreclosure";
import OutstandingBid from "./OutstandingBid";
import { STATE } from "../Map";
import type { Point } from "@turf/turf";
import { useMediaQuery } from "../../lib/mediaQuery";
import { useParcelNavigation } from "../../lib/parcelNavigation";

interface ParcelListProps {
  sfFramework: Framework;
  geoWebContent: GeoWebContent;
  registryContract: Contracts["registryDiamondContract"];
  setSelectedParcelId: React.Dispatch<React.SetStateAction<string>>;
  setInteractionState: React.Dispatch<React.SetStateAction<STATE>>;
  showParcelList: boolean;
  shouldRefetchParcelsData: boolean;
  setShouldRefetchParcelsData: React.Dispatch<React.SetStateAction<boolean>>;
  handleCloseModal: () => void;
}

export interface Parcel {
  parcelId: string;
  createdAtBlock: bigint;
  status: string;
  name: string;
  price: BigNumber;
  center: Point;
}

interface Bid {
  forSalePrice: string;
  contributionRate: string;
  timestamp: number;
}

interface GeoWebParcel {
  id: string;
  createdAtBlock: bigint;
  licenseOwner: string;
  licenseDiamond: string;
  currentBid: Bid;
  pendingBid?: Bid;
  bboxN: number;
  bboxS: number;
  bboxE: number;
  bboxW: number;
}

export interface ParcelsQuery {
  geoWebParcels: GeoWebParcel[];
}

export enum QuerySelection {
  HIGHEST_VALUE = "Highest Value",
  RECENT = "Recent Claims",
  RANDOM = "Random",
  NEEDS_TRASFER = "Needs Transfer",
  FORECLOSURE = "In Foreclosure",
  OUTSTANDING_BID = "Outstanding Bids",
}

function ParcelList(props: ParcelListProps) {
  const {
    showParcelList,
    handleCloseModal,
    setSelectedParcelId,
    setInteractionState,
  } = props;
  const [querySelected, setQuerySelected] = useState<QuerySelection>(
    QuerySelection.HIGHEST_VALUE
  );
  const [hasRefreshed, setHasRefreshed] = useState<boolean>(false);

  const { isMobile } = useMediaQuery();
  const { flyToParcel } = useParcelNavigation();

  const maxListSize = isMobile ? 10 : 25;

  const handleQuerySelection = (selection: QuerySelection) => {
    if (querySelected === selection) {
      setHasRefreshed(true);
      return;
    }

    setQuerySelected(selection);
  };

  const handleAction = (parcel: Parcel): void => {
    const [lng, lat] = parcel.center.coordinates;

    handleCloseModal();
    setInteractionState(STATE.PARCEL_SELECTED);
    setSelectedParcelId(parcel.parcelId);
    flyToParcel({
      center: [lng, lat],
      duration: 500,
    });
  };

  return (
    <Modal
      show={showParcelList}
      keyboard={false}
      centered
      onHide={handleCloseModal}
      size="xl"
      contentClassName="bg-dark"
    >
      <Modal.Header className="bg-dark border-0 p-2 p-sm-4 pb-0">
        <Container>
          <Row>
            <Col
              className="text-sm-center ps-0 ps-sm-5 text-light fs-1"
              xs="9"
              sm="11"
            >
              Geo Web Parcels
            </Col>
            <Col xs="3" sm="1" className="p-0 text-end">
              <Button
                variant="link"
                size="sm"
                className="p-0"
                onClick={() => handleCloseModal()}
              >
                <Image width={36} src="close.svg" />
              </Button>
            </Col>
          </Row>
          <Row className="mt-4 p-0">
            {Object.values(QuerySelection).map((selection, i) => (
              <Col xs="6" xl="2" className="p-1" key={i}>
                <Button
                  variant={`${
                    querySelected === selection ? "primary" : "outline-info"
                  }`}
                  className="px-1 w-100"
                  onClick={() => handleQuerySelection(selection)}
                >
                  {selection}
                  {querySelected === selection && (
                    <Image
                      src="refresh.svg"
                      alt="refresh"
                      width={22}
                      className="float-end pt-1"
                    />
                  )}{" "}
                </Button>
              </Col>
            ))}
          </Row>
        </Container>
      </Modal.Header>
      <Modal.Body className="p-1 pt-3 p-sm-3 bg-dark text-light text-start">
        {querySelected === QuerySelection.HIGHEST_VALUE ? (
          <HighestValue
            hasRefreshed={hasRefreshed}
            setHasRefreshed={setHasRefreshed}
            maxListSize={maxListSize}
            handleAction={handleAction}
            {...props}
          />
        ) : querySelected === QuerySelection.RECENT ? (
          <Recent
            hasRefreshed={hasRefreshed}
            setHasRefreshed={setHasRefreshed}
            maxListSize={maxListSize}
            handleAction={handleAction}
            {...props}
          />
        ) : querySelected === QuerySelection.RANDOM ? (
          <Random
            hasRefreshed={hasRefreshed}
            setHasRefreshed={setHasRefreshed}
            maxListSize={maxListSize}
            handleAction={handleAction}
            {...props}
          />
        ) : querySelected === QuerySelection.NEEDS_TRASFER ? (
          <NeedsTransfer
            hasRefreshed={hasRefreshed}
            setHasRefreshed={setHasRefreshed}
            maxListSize={maxListSize}
            handleAction={handleAction}
            {...props}
          />
        ) : querySelected === QuerySelection.FORECLOSURE ? (
          <Foreclosure
            hasRefreshed={hasRefreshed}
            setHasRefreshed={setHasRefreshed}
            maxListSize={maxListSize}
            handleAction={handleAction}
            {...props}
          />
        ) : querySelected === QuerySelection.OUTSTANDING_BID ? (
          <OutstandingBid
            hasRefreshed={hasRefreshed}
            setHasRefreshed={setHasRefreshed}
            maxListSize={maxListSize}
            handleAction={handleAction}
            {...props}
          />
        ) : null}
      </Modal.Body>
    </Modal>
  );
}

export default ParcelList;
