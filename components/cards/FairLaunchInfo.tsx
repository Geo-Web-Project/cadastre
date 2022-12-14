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
    const mailerFormJs = `
        (function(m,a,i,l,e,r){ m['MailerLiteObject']=e;function f(){
        var c={ a:arguments,q:[]};var r=this.push(c);return "number"!=typeof r?r:f.bind(c.q);}
        f.q=f.q||[];m[e]=m[e]||f.bind(f.q);m[e].q=m[e].q||f.q;r=a.createElement(i);
        var _=a.getElementsByTagName(i)[0];r.async=1;r.src=l+'?v'+(~~(new Date().getTime()/1000000));
        _.parentNode.insertBefore(r,_);})(window, document, 'script', 'https://static.mailerlite.com/js/universal.js', 'ml');
        
        var ml_account = ml('accounts', '2708212', 'd2a0n7u4k9', 'load');
      `;
    const script = document.createElement("script");
    const scriptText = document.createTextNode(mailerFormJs);
    script.appendChild(scriptText);
    document.body.appendChild(script);
  }, []);

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

  function showNotifyOnClose() {
    const didShowAuctionNotification = localStorage.getItem(
      "didShowAuctionNotification"
    );
    if (!didShowAuctionNotification) {
      localStorage.setItem("didShowAuctionNotification", "true");
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      ml_account("webforms", "5836954", "w6k5n8", "show");
    }
  }

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
            onClick={() => {
              showNotifyOnClose();
              setInteractionState(STATE.VIEWING);
            }}
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
          <Card.Text className="text-center">
            <Button
              variant="primary"
              className="text-light fw-bold border-dark mx-auto fit-content"
              onClick={() =>
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                ml_account("webforms", "5836954", "w6k5n8", "show")
              }
            >
              <span>Get Notified</span>
            </Button>
          </Card.Text>
        </Card.Body>
      </Card>
    </>
  );
}

export default FairLaunchInfo;
