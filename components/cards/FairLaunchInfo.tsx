import * as React from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import advancedFormat from "dayjs/plugin/advancedFormat";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Card from "react-bootstrap/Card";

dayjs.extend(utc);
dayjs.extend(advancedFormat);

type FairLaunchInfoProps = {
  /** TODO: add some comments here. */
  currentRequiredBid: string;
  /** TODO: */
  auctionEnd: string;
};

function FairLaunchInfo(props: FairLaunchInfoProps) {
  const { currentRequiredBid, auctionEnd } = props;

  console.log(dayjs(1318781876406).utc().format("DD/MM/YYYY HH:mm"));

  const formattedAuctionEnd = dayjs(auctionEnd)
    .utc()
    .format("DD/MM/YYYY HH:mm");

  return (
    <>
      <Row className="mb-3">
        <Col sm="10">
          <h1 style={{ fontSize: "1.5rem", fontWeight: 600 }}>
            Fair Launch Claim
          </h1>
        </Col>
      </Row>
      <Card border="secondary" className="bg-dark my-5">
        <Card.Body>
          <Card.Title className="text-primary font-weight-bold">
            Auction Details
          </Card.Title>
          <Card.Text>Current Required Bid: {currentRequiredBid} ETHx</Card.Text>
          <Card.Text>Auction End: {formattedAuctionEnd} UTC</Card.Text>
          <Card.Text>Time Remaining: {}</Card.Text>
        </Card.Body>
      </Card>
    </>
  );
}

export default FairLaunchInfo;
