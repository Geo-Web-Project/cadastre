import { ethers, BigNumber } from "ethers";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import advancedFormat from "dayjs/plugin/advancedFormat";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Card from "react-bootstrap/Card";
import { Button, Image } from "react-bootstrap";
import { STATE } from "../Map";
import { SidebarProps } from "../Sidebar";
import { PAYMENT_TOKEN } from "../../lib/constants";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(advancedFormat);

type PreFairLaunchInfoProps = SidebarProps & {
  startingBid: BigNumber;
  endingBid: BigNumber;
};

function PreFairLaunchInfo(props: PreFairLaunchInfoProps) {
  const {
    auctionStart,
    auctionEnd,
    startingBid,
    endingBid,
    setInteractionState,
  } = props;

  const formattedAuctionStart = dayjs
    .unix(auctionStart.toNumber())
    .format("YYYY-MM-DD HH:mm z");
  const formattedAuctionEnd = dayjs
    .unix(auctionEnd.toNumber())
    .format("YYYY-MM-DD HH:mm z");

  return (
    <>
      <Row className="ms-1 mb-2">
        <Col sm="10">
          <h1 style={{ fontSize: "1.5rem", fontWeight: 600 }}>Not yet...</h1>
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
      <Card border="dark" className="bg-dark">
        <Card.Body>
          <Card.Text className="mb-4">
            The Geo Web network will be{" "}
            <a
              href="https://docs.geoweb.network/concepts/fair-launch"
              target="_blank"
              rel="noopener"
            >
              Fair Launched with a Dutch Auction
            </a>
            :
          </Card.Text>
          <Card.Text className="mb-1">
            <span className="fw-bold">Auction Start: </span>
            <span>{formattedAuctionStart}</span>
          </Card.Text>
          <Card.Text className="mb-1">
            <span className="fw-bold">Auction End: </span>
            <span>{formattedAuctionEnd}</span>
          </Card.Text>
          <Card.Text className="mb-1">
            <span className="fw-bold">Dutch Auction: </span>
            <span>Linearly Decreasing</span>
          </Card.Text>
          <Card.Text className="mb-1">
            <span className="fw-bold">Starting Bid: </span>
            <span>{`${ethers.utils.formatEther(
              startingBid
            )} ${PAYMENT_TOKEN}`}</span>
          </Card.Text>
          <Card.Text className="mb-5">
            <span className="fw-bold">Ending Bid: </span>
            <span>{`${ethers.utils.formatEther(
              endingBid
            )} ${PAYMENT_TOKEN}`}</span>
          </Card.Text>
          <Card.Text>
            In the meantime, you can join our community or read our
            documentation to learn more:
            <span className="d-flex justify-content-around align-items-center mt-4">
              <a
                href="https://discord.com/invite/reXgPru7ck"
                target="_blank"
                rel="noopener"
              >
                <Image src="discord.svg" alt="discord" width={40} />
              </a>
              <a
                href="https://twitter.com/thegeoweb"
                target="_blank"
                rel="noopener"
              >
                <Image src="twitter.svg" alt="twitter" width={40} />
              </a>
              <a
                href="https://landing.mailerlite.com/webforms/landing/l0s9s9"
                target="_blank"
                rel="noopener"
              >
                <Image src="mail.svg" alt="newsletter" width={40} />
              </a>
              <a
                href="https://docs.geoweb.network/"
                target="_blank"
                rel="noopener"
              >
                <Image src="docs.svg" alt="documentation" width={40} />
              </a>
            </span>
          </Card.Text>
        </Card.Body>
      </Card>
    </>
  );
}

export default PreFairLaunchInfo;
