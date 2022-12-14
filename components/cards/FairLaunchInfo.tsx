import { useState, useEffect } from "react";
import { BigNumber, ethers } from "ethers";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import advancedFormat from "dayjs/plugin/advancedFormat";
import duration from "dayjs/plugin/duration";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Card from "react-bootstrap/Card";
import { Button, Image } from "react-bootstrap";
import { STATE } from "../Map";
import { SidebarProps } from "../Sidebar";
import InfoTooltip from "../InfoTooltip";
import { calculateRequiredBid } from "../../lib/calculateRequiredBid";
import { calculateTimeString } from "../../lib/utils";
import { truncateEth } from "../../lib/truncate";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(advancedFormat);
dayjs.extend(duration);

type FairLaunchInfoProps = SidebarProps & {
  auctionStart: BigNumber;
  /** auctionEnd. */
  auctionEnd: BigNumber;
  startingBid: BigNumber;
  endingBid: BigNumber;
  /** startingBid - priceDecrease. */
  requiredBid: BigNumber;
  setRequiredBid: React.Dispatch<React.SetStateAction<BigNumber>>;
};

const infoIcon = (
  <Image
    style={{
      width: "1.1rem",
      marginLeft: "4px",
    }}
    src="info.svg"
  />
);

function FairLaunchInfo(props: FairLaunchInfoProps) {
  const {
    auctionStart,
    auctionEnd,
    startingBid,
    endingBid,
    requiredBid,
    setRequiredBid,
    setInteractionState,
  } = props;

  const [timeRemaining, setTimeRemaining] = useState<string | null>(null);

  const formattedAuctionEnd = dayjs
    .unix(auctionEnd.toNumber())
    .format("YYYY-MM-DD HH:mm z");

  useEffect(() => {
    let interval: NodeJS.Timer | null = null;

    if (auctionStart && auctionEnd && startingBid && endingBid) {
      interval = setInterval(() => {
        const remaining = auctionEnd.toNumber() * 1000 - Date.now();
        setTimeRemaining(calculateTimeString(remaining));

        setRequiredBid(
          calculateRequiredBid(auctionStart, auctionEnd, startingBid, endingBid)
        );
      }, 1000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [auctionStart, auctionEnd, startingBid, endingBid]);

  return (
    <>
      <Row className="mb-3">
        <Col sm="10">
          <h1 style={{ fontSize: "1.5rem", fontWeight: 600 }}>
            Fair Launch Claim
          </h1>
        </Col>
        <Col sm="2" className="text-end">
          <Button
            variant="link"
            size="sm"
            onClick={() => setInteractionState(STATE.VIEWING)}
          >
            <Image src="close.svg" />
          </Button>
        </Col>
      </Row>
      <Card border="secondary" className="bg-dark my-5">
        <Card.Body>
          <Card.Title className="text-primary fw-bold d-flex justify-content-between ">
            <span>Dutch Auction Details</span>
            <InfoTooltip
              content={
                <div style={{ textAlign: "left" }}>
                  To promote a fair launch and help limit gas fee costs, Geo Web
                  land claims were initiated with a global Dutch auction. The
                  auction requires one-time payments (bids) to execute parcel
                  claims. These auction payments are made in addition to the
                  ongoing partial common ownership market requirements.
                  <br />
                  <br />
                  The auction started at {ethers.utils.formatEther(
                    startingBid
                  )}{" "}
                  ETHx and will linearly decrease to an ongoing minimum claim
                  price of {ethers.utils.formatEther(endingBid)} ETHx over 30
                  days.
                </div>
              }
              target={infoIcon}
            />
          </Card.Title>
          <Card.Text>
            Current Required Bid:{" "}
            {truncateEth(ethers.utils.formatEther(requiredBid), 8)} ETHx
          </Card.Text>
          <Card.Text>Auction End: {formattedAuctionEnd}</Card.Text>
          <Card.Text>
            Time Remaining: <span>{timeRemaining}</span>
          </Card.Text>
        </Card.Body>
      </Card>
    </>
  );
}

export default FairLaunchInfo;
