import { useRef, useState, useEffect, useLayoutEffect } from "react";
import { BigNumber } from "ethers";
import Container from "react-bootstrap/Container";
import Button from "react-bootstrap/Button";
import Image from "react-bootstrap/Image";
import Row from "react-bootstrap/Row";
import ClaimAction from "./cards/ClaimAction";
import ClaimInfo from "./cards/ClaimInfo";
import ParcelInfo from "./cards/ParcelInfo";
import { STATE, MapProps, Coord, ParcelClaimInfo } from "./Map";
import ConnectWallet from "./ConnectWallet";
import { useMediaQuery } from "../lib/mediaQuery";
import {
  DRAWER_PREVIEW_HEIGHT_PARCEL,
  DRAWER_PREVIEW_HEIGHT_TRANSACTION,
  DRAWER_CLAIM_HEIGHT,
} from "../lib/constants";

export type OffCanvasPanelProps = MapProps & {
  claimBase1Coord: Coord | null;
  claimBase2Coord: Coord | null;
  selectedParcelId: string;
  setSelectedParcelId: React.Dispatch<React.SetStateAction<string>>;
  setIsParcelAvailable: React.Dispatch<React.SetStateAction<boolean>>;
  parcelClaimInfo: ParcelClaimInfo;
  invalidLicenseId: string;
  setInvalidLicenseId: React.Dispatch<React.SetStateAction<string>>;
  setNewParcel: React.Dispatch<
    React.SetStateAction<{ id: string; timerId: number | null }>
  >;
  isValidClaim: boolean;
  delay: boolean;
};

export interface ParcelFieldsToUpdate {
  forSalePrice: boolean;
  licenseOwner: boolean;
}

function OffCanvasPanel(props: OffCanvasPanelProps) {
  const {
    account,
    signer,
    registryContract,
    interactionState,
    setInteractionState,
    parcelClaimInfo,
    selectedParcelId,
    isValidClaim,
    delay,
  } = props;

  const { isMobile, isTablet } = useMediaQuery();

  const [perSecondFeeNumerator, setPerSecondFeeNumerator] =
    useState<BigNumber | null>(null);
  const [perSecondFeeDenominator, setPerSecondFeeDenominator] =
    useState<BigNumber | null>(null);
  const [parcelFieldsToUpdate, setParcelFieldsToUpdate] =
    useState<ParcelFieldsToUpdate | null>(null);
  const [requiredBid, setRequiredBid] = useState<BigNumber>(BigNumber.from(0));
  const [minForSalePrice, setMinForSalePrice] = useState<BigNumber | null>(
    null
  );
  const [isFullSize, setIsFullSize] = useState<boolean>(false);
  const [show, setShow] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = (e: React.TouchEvent<HTMLElement>) => {
    if (!containerRef.current || interactionState === STATE.CLAIM_SELECTING) {
      return;
    }

    e.preventDefault();

    const MIN_SWIPE = 40;
    const paddingTop = isMobile ? 82 : 96;
    const bodyHeight = document.body.clientHeight;
    const containerScrollHeight = containerRef.current.scrollHeight;
    const containerHeightStart = containerRef.current.clientHeight;
    const touchYStart = e.touches[0].clientY;
    let touchYLast = touchYStart;
    let containerHeightLast = containerHeightStart;

    const onTouchMove = (e: TouchEvent) => {
      if (!containerRef.current) {
        return;
      }

      const touchYcurrent = e.changedTouches[0].clientY;
      const containerHeightCurrent = containerRef.current.clientHeight;
      const delta = touchYLast - touchYcurrent;

      if (delta < 0 && containerRef.current.scrollTop !== 0) {
        return;
      } else if (
        delta > 0 &&
        (containerHeightCurrent === bodyHeight - paddingTop ||
          containerHeightCurrent === containerScrollHeight)
      ) {
        return;
      } else if (delta > 0) {
        containerRef.current.scrollTop = 0;
      }

      const newHeight = containerHeightCurrent + delta;

      containerRef.current.style.transition = "";
      containerRef.current.style.maxHeight = `${
        newHeight < DRAWER_PREVIEW_HEIGHT_TRANSACTION
          ? DRAWER_PREVIEW_HEIGHT_TRANSACTION
          : newHeight < DRAWER_PREVIEW_HEIGHT_PARCEL &&
            interactionState === STATE.PARCEL_SELECTED
          ? DRAWER_PREVIEW_HEIGHT_PARCEL
          : newHeight >= bodyHeight - paddingTop
          ? bodyHeight - paddingTop
          : newHeight
      }px`;
      containerHeightLast = containerRef.current.clientHeight;
      touchYLast = touchYcurrent;
    };

    const onTouchEnd = () => {
      if (!containerRef.current) {
        return;
      }

      if (touchYStart > touchYLast) {
        if (containerHeightLast - containerHeightStart > MIN_SWIPE) {
          containerRef.current.style.maxHeight = `${bodyHeight - paddingTop}px`;
          setIsFullSize(true);
        } else if (containerHeightStart === DRAWER_PREVIEW_HEIGHT_PARCEL) {
          containerRef.current.style.maxHeight = `${DRAWER_PREVIEW_HEIGHT_PARCEL}px`;
        } else if (containerHeightStart === DRAWER_PREVIEW_HEIGHT_TRANSACTION) {
          containerRef.current.style.maxHeight = `${DRAWER_PREVIEW_HEIGHT_TRANSACTION}px`;
        }
      } else if (touchYStart < touchYLast) {
        if (containerRef.current.scrollTop === 0) {
          if (containerHeightLast - containerHeightStart < MIN_SWIPE * -1) {
            containerRef.current.style.maxHeight = `${
              interactionState === STATE.PARCEL_SELECTED
                ? DRAWER_PREVIEW_HEIGHT_PARCEL
                : DRAWER_PREVIEW_HEIGHT_TRANSACTION
            }px`;
            setIsFullSize(false);
          } else if (
            containerHeightStart === bodyHeight - paddingTop ||
            containerHeightStart === containerRef.current.scrollHeight
          ) {
            containerRef.current.style.maxHeight = `${
              bodyHeight - paddingTop
            }px`;
          }
        }
      }

      containerRef.current.style.transition = "max-height 0.2s ease-out";
      containerRef.current.removeEventListener("touchmove", onTouchMove);
    };

    containerRef.current.addEventListener("touchmove", onTouchMove);
    containerRef.current.addEventListener("touchend", onTouchEnd, {
      once: true,
    });
  };

  useLayoutEffect(() => {
    if (!containerRef?.current) {
      return;
    }

    containerRef.current.scrollTop = 0;
  }, [interactionState]);

  useEffect(() => {
    registryContract
      .getPerSecondFeeNumerator()
      .then((_perSecondFeeNumerator) => {
        setPerSecondFeeNumerator(_perSecondFeeNumerator);
      });
    registryContract
      .getPerSecondFeeDenominator()
      .then((_perSecondFeeDenominator) => {
        setPerSecondFeeDenominator(_perSecondFeeDenominator);
      });
    registryContract.getMinForSalePrice().then((_minForSalePrice) => {
      setMinForSalePrice(_minForSalePrice);
    });
    registryContract.requiredBid().then((_requiredBid) => {
      setRequiredBid(_requiredBid);
    });
  }, [registryContract]);

  useEffect(() => {
    setTimeout(() => setShow(true), 500);
  }, []);

  if (!show && delay) {
    return null;
  }

  return (
    <Container
      ref={containerRef}
      className={`position-absolute left-0 ${
        isMobile || isTablet ? "bottom-0" : "top-0"
      } ${isMobile || isTablet ? "w-100" : "w-25"} ${
        isMobile || isTablet ? "" : "vh-100"
      } bg-dark text-light px-3 pb-3`}
      style={{
        zIndex: 10,
        paddingTop: isMobile || isTablet ? "0px" : "100px",
        maxHeight:
          isMobile && isFullSize
            ? "calc(100svh - 82px)"
            : isTablet && isFullSize
            ? "calc(100svh - 96px)"
            : (isMobile || isTablet) &&
              !isFullSize &&
              interactionState === STATE.PARCEL_SELECTED
            ? `${DRAWER_PREVIEW_HEIGHT_PARCEL}px`
            : (isMobile || isTablet) &&
              !isFullSize &&
              interactionState === STATE.CLAIM_SELECTING
            ? `${DRAWER_CLAIM_HEIGHT}px`
            : (isMobile || isTablet) && !isFullSize
            ? `${DRAWER_PREVIEW_HEIGHT_TRANSACTION}px`
            : "100%",
        overflow: (isMobile || isTablet) && !isFullSize ? "hidden" : "auto",
        overscrollBehavior: "none",
        transition: "max-height 0.2s ease-in-out",
      }}
      onTouchStart={handleTouchStart}
    >
      <Row className="sticky-top bg-dark pt-1">
        {(isMobile || isTablet) &&
          interactionState !== STATE.CLAIM_SELECTING &&
          (interactionState !== STATE.CLAIM_SELECTED || account) && (
            <div
              className="w-25 bg-info rounded-3 m-auto"
              style={{
                height: "6px",
              }}
              onClick={() => setIsFullSize(!isFullSize)}
            ></div>
          )}
        <Button
          variant="link"
          size="sm"
          className="shadow-none text-end float-end p-0"
        >
          <Image
            src="close.svg"
            alt="close"
            width={28}
            onClick={() => setInteractionState(STATE.VIEWING)}
          />
        </Button>
      </Row>
      {perSecondFeeNumerator && perSecondFeeDenominator && minForSalePrice ? (
        <ParcelInfo
          {...props}
          perSecondFeeNumerator={perSecondFeeNumerator}
          perSecondFeeDenominator={perSecondFeeDenominator}
          minForSalePrice={minForSalePrice}
          parcelFieldsToUpdate={parcelFieldsToUpdate}
          setParcelFieldsToUpdate={setParcelFieldsToUpdate}
          licenseAddress={registryContract.address}
          isFullSize={isFullSize}
          setIsFullSize={setIsFullSize}
          key={selectedParcelId}
        ></ParcelInfo>
      ) : null}
      {interactionState == STATE.CLAIM_SELECTING ? (
        <ClaimInfo
          setInteractionState={setInteractionState}
          parcelClaimInfo={parcelClaimInfo}
          isValidClaim={isValidClaim}
          setIsFullSize={setIsFullSize}
        />
      ) : null}
      {interactionState === STATE.CLAIM_SELECTED && !account ? (
        <ConnectWallet variant="claim" />
      ) : interactionState === STATE.CLAIM_SELECTED &&
        account &&
        signer &&
        perSecondFeeNumerator &&
        perSecondFeeDenominator &&
        minForSalePrice ? (
        <ClaimAction
          {...props}
          signer={signer}
          licenseAddress={registryContract.address}
          perSecondFeeNumerator={perSecondFeeNumerator}
          perSecondFeeDenominator={perSecondFeeDenominator}
          requiredBid={requiredBid}
          minForSalePrice={minForSalePrice}
          setParcelFieldsToUpdate={setParcelFieldsToUpdate}
        ></ClaimAction>
      ) : null}
    </Container>
  );
}

export default OffCanvasPanel;
