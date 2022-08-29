/* eslint-disable import/no-unresolved */
import * as React from "react";
import Button from "react-bootstrap/Button";
import Modal from "react-bootstrap/Modal";
import Image from "react-bootstrap/Image";

function AuctionInstructions() {
  const [show, setShow] = React.useState(false);

  const handleClose = () => setShow(false);
  const handleShow = () => setShow(true);

  return (
    <>
      <div className="d-grid gap-2">
        <Button
          variant="link"
          className="fst-italic mt-3"
          size="lg"
          onClick={handleShow}
        >
          How do Geo Web auctions work?
        </Button>
      </div>
      <Modal show={show} onHide={handleClose} contentClassName="bg-dark">
        <Modal.Header
          style={{
            background: "#111320",
            fontFamily: "Abel",
            fontSize: "1.5em",
          }}
          className="text-primary border-dark"
        >
          <Modal.Title as="h2">How Geo Web Auctions Work</Modal.Title>
          <Button variant="link" size="sm" onClick={handleClose}>
            <Image src="close.svg" />
          </Button>
        </Modal.Header>
        <Modal.Body className="bg-dark text-light px-4">
          <p>
            The parcel licensor has 7 days to accept or match (i.e. reject with
            a penalty) an incoming bid. No other bids or changes to the parcel's
            For Sale Price are allowed during this time.
          </p>
          <p>
            If the licensor accepts the bid, license of this parcel will
            transfer to the bidder and they will begin network fee payments
            based on their new For Sale Price. They will receive payment equal
            to their previous For Sale Price (not the bid amount!).
          </p>
          <p>
            If the licensor wants to reject the bid, they must authorize a new
            For Sale Price equal to or greater than the bid amount. They must
            also pay a bid matching penalty equal to 2% of their previous For
            Sale Price.
          </p>
          <p>
            If they do not act upon the bid in the 7 day window, any network
            participant (including you) may trigger acceptance of the bid and
            the corresponding actions. The licensor cannot reject a bid after
            the 7 day window has lapsed.
          </p>
        </Modal.Body>
      </Modal>
    </>
  );
}

export default AuctionInstructions;
