import * as React from "react";
import Card from "react-bootstrap/Card";
import Button from "react-bootstrap/Button";
import Image from "react-bootstrap/Image";
import { STATE, ParcelClaimInfo } from "../Map";
import { MAX_PARCEL_CLAIM, MAX_PARCEL_SIDE_DIM } from "../../lib/constants";
import { useMediaQuery } from "../../lib/mediaQuery";

type ClaimInfoProps = {
  parcelClaimInfo: ParcelClaimInfo;
  setInteractionState: React.Dispatch<React.SetStateAction<STATE>>;
  isValidClaim: boolean;
  setIsFullScreen: React.Dispatch<React.SetStateAction<boolean>>;
};

function ClaimInfo(props: ClaimInfoProps) {
  const {
    parcelClaimInfo,
    setInteractionState,
    isValidClaim,
    setIsFullScreen,
  } = props;

  const { isMobile, isTablet } = useMediaQuery();

  const parcelClaimArea = parcelClaimInfo.width * parcelClaimInfo.height;
  const isOutOfBoundWidth = parcelClaimInfo.width > MAX_PARCEL_SIDE_DIM;
  const isOutOfBoundHeight = parcelClaimInfo.height > MAX_PARCEL_SIDE_DIM;
  const isOutOfBoundArea = parcelClaimArea > MAX_PARCEL_CLAIM;

  return (
    <Card
      className={`${
        isMobile || isTablet ? "bg-dark" : "bg-purple"
      } border-0 bg-opacity-25 text-light mt-lg-2`}
    >
      <Card.Body className="p-0 p-lg-3 pt-lg-2">
        <div className="d-flex align-items-center">
          <Image width={64} src="grid-primary.svg" className="pt-1" />
          <div className="d-flex flex-column">
            <span className={`text-${isOutOfBoundArea ? "danger" : "primary"}`}>
              Area: {parcelClaimArea}/{MAX_PARCEL_CLAIM}
            </span>
            <div>
              <span
                className={`text-${isOutOfBoundWidth ? "danger" : "primary"}`}
              >
                X: {parcelClaimInfo.width}/{MAX_PARCEL_SIDE_DIM},{" "}
              </span>
              <span
                className={`text-${isOutOfBoundHeight ? "danger" : "primary"}`}
              >
                Y: {parcelClaimInfo.height}/{MAX_PARCEL_SIDE_DIM}
              </span>
            </div>
          </div>
        </div>
        <Card.Text className="mt-3">
          Move and resize the rectangle to set your claim.
        </Card.Text>
        <Button
          variant="primary"
          disabled={!isValidClaim}
          className="w-100 mb-2"
          onClick={() => {
            setIsFullScreen(true);
            setInteractionState(STATE.CLAIM_SELECTED);
          }}
        >
          Confirm
        </Button>
      </Card.Body>
    </Card>
  );
}

export default ClaimInfo;
