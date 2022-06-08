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

dayjs.extend(utc);
dayjs.extend(advancedFormat);
dayjs.extend(duration);

type FairLaunchInfoProps = SidebarProps & {
  /** startingBid - priceDecrease. */
  currentRequiredBid: string;
  /** auctionEnd. */
  auctionEnd: number;
};

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
          <Card.Title className="text-primary font-weight-bold">
            Auction Details
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
