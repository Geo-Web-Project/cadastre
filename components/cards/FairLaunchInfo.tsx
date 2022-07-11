import * as React from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import advancedFormat from "dayjs/plugin/advancedFormat";
import duration from "dayjs/plugin/duration";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Card from "react-bootstrap/Card";
import { Button, Image } from "react-bootstrap";
import { STATE } from "../Map";
import { SidebarProps } from "../Sidebar";
import InfoTooltip from "../InfoTooltip";

dayjs.extend(utc);
dayjs.extend(advancedFormat);
dayjs.extend(duration);

type FairLaunchInfoProps = SidebarProps & {
  /** startingBid - priceDecrease. */
  currentRequiredBid: string;
  /** auctionEnd. */
  auctionEnd: number;
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
  const { currentRequiredBid, auctionEnd, setInteractionState } = props;

  const [now, setNow] = React.useState(dayjs.utc());

  React.useEffect(() => {
    const interval = setInterval(() => {
      setNow(dayjs.utc());
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  // React.useEffect(() => {
  const duration = dayjs.duration(dayjs.utc(auctionEnd).diff(now));
  //   console.log(duration.days(), duration.hours(), duration.minutes(), duration.seconds());
  // }, [now]);

  // console.log(dayjs(1318781876406).utc().format("DD/MM/YYYY HH:mm"));

  const formattedAuctionEnd = dayjs(auctionEnd)
    .utc()
    .format("YYYY-MM-DD HH:mm");

  return (
    <>
      <Row className="mb-3">
        <Col sm="10">
          <h1 style={{ fontSize: "1.5rem", fontWeight: 600 }}>
            Fair Launch Claim
          </h1>
        </Col>
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
      <Card border="secondary" className="bg-dark my-5">
        <Card.Body>
          <Card.Title className="text-primary font-weight-bold d-flex justify-content-between ">
            <span>Auction Details</span>
            <InfoTooltip
              content={
                <div style={{ textAlign: "left" }}>
                  To promote a fair launch and help limit gas fee costs, Geo Web
                  land claims were initiated with a global Dutch auction. The
                  auction requires one-time payments (bids) to execute valid
                  parcel claims. These auction payments are made in addition to
                  the ongoing partial common ownership market requirements.
                  <br />
                  <br />
                  The auction started at [Auction Starting Price] ETHx and will
                  linearly decrease in price over two weeks to an ongoing claim
                  price of 0 ETHx.
                </div>
              }
              target={infoIcon}
            />
          </Card.Title>
          <Card.Text>Current Required Bid: {currentRequiredBid} ETHx</Card.Text>
          <Card.Text>Auction End: {formattedAuctionEnd} UTC</Card.Text>
          <Card.Text>
            Time Remaining: <span>{duration.format("DD:HH:mm:ss")}</span>
          </Card.Text>
        </Card.Body>
      </Card>
    </>
  );
}

export default FairLaunchInfo;
