import { useState } from "react";
import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";
import Image from "react-bootstrap/Image";
import ListGroup from "react-bootstrap/ListGroup";
import CopyTooltip from "./CopyTooltip";
import { truncateStr } from "../lib/truncate";

type NotificationModalProps = {
  isMobile: boolean;
  licenseDiamondAddress: string;
};

function NotificationModal(props: NotificationModalProps) {
  const { isMobile, licenseDiamondAddress } = props;

  const [show, setShow] = useState<boolean>(false);

  return (
    <>
      <Button
        size="sm"
        bsPrefix="text-start dropdown-item shadow-none border-0 px-0 py-0 bg-transparent"
        onClick={() => setShow(true)}
      >
        Setup Notifications
      </Button>
      <Modal
        show={show}
        scrollable
        size="xl"
        centered
        onHide={() => setShow(false)}
        contentClassName="p-1 p-lg-3 bg-dark"
      >
        <Modal.Header className="border-0 text-light pb-3">
          <Modal.Title as={isMobile ? "h5" : "h3"}>
            Set Up Parcel Monitoring Emails
          </Modal.Title>
          <Button
            variant="link"
            size="sm"
            className="position-absolute top-0 end-0 pe-1 pt-1 px-lg-2 py-lg-2"
            onClick={() => setShow(false)}
          >
            <Image width={isMobile ? 24 : 28} src="close.svg" />
          </Button>
        </Modal.Header>
        <Modal.Body className="pt-0">
          <ListGroup as="ol" numbered>
            <ListGroup.Item
              as="li"
              className="d-inline-flex gap-1 bg-dark border-0 text-light px-0 pb-0"
            >
              <div>
                <a
                  href="https://optimistic.etherscan.io/register"
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary"
                >
                  Create
                </a>{" "}
                or{" "}
                <a
                  href="https://optimistic.etherscan.io/register"
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary"
                >
                  sign in
                </a>{" "}
                to your Optimistic Etherscan account.
              </div>
            </ListGroup.Item>
            <ListGroup.Item
              as="li"
              className="d-inline-flex gap-1 bg-dark border-0 text-light px-0 pb-0"
            >
              <div>
                Navigate to the{" "}
                <a
                  href="https://optimistic.etherscan.io/myaddress"
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary"
                >
                  Watch List
                </a>{" "}
                tab under your profile.
              </div>
            </ListGroup.Item>
            <ListGroup.Item
              as="li"
              className="d-inline-flex gap-1 bg-dark border-0 text-light px-0 pb-0"
            >
              <div>
                Click the <b>+ Add</b> button next to the <b>My Watch List</b>{" "}
                page header.
              </div>
            </ListGroup.Item>
            <ListGroup.Item
              as="li"
              className="d-inline-flex gap-1 bg-dark border-0 text-light px-0 pb-0"
            >
              <div className="text-break">
                Paste this parcel's address into <b>ETH Address</b>:{" "}
                <CopyTooltip
                  contentClick="Address Copied"
                  contentHover="Copy Parcel Address"
                  target={
                    <>
                      {isMobile
                        ? truncateStr(licenseDiamondAddress, 22)
                        : licenseDiamondAddress}
                      <Image
                        className="ms-1 pb-1"
                        width={isMobile ? 20 : 20}
                        src="copy-light.svg"
                      />
                    </>
                  }
                  handleCopy={() =>
                    navigator.clipboard.writeText(licenseDiamondAddress)
                  }
                />
              </div>
            </ListGroup.Item>
            <ListGroup.Item
              as="li"
              className="d-inline-flex gap-1 bg-dark border-0 text-light px-0 pb-0"
            >
              <div>
                Add your parcel's name to the <b>Description</b>.
              </div>
            </ListGroup.Item>
            <ListGroup.Item
              as="li"
              className="d-inline-flex gap-1 bg-dark border-0 text-light px-0 pb-0"
            >
              <div>
                Select the <b>Notify on Incoming & Outgoing Txns</b>.
              </div>
            </ListGroup.Item>
            <ListGroup.Item
              as="li"
              className="d-inline-flex gap-1 bg-dark border-0 text-light px-0 pb-0"
            >
              <div>
                Check the <b>Also Track ERC20 Token Transfers</b>.
              </div>
            </ListGroup.Item>
            <ListGroup.Item
              as="li"
              className="d-inline-flex gap-1 bg-dark border-0 text-light px-0 pb-0"
            >
              <div>
                Click <b>Continue</b>.
              </div>
            </ListGroup.Item>
            <ListGroup.Item
              as="li"
              className="d-inline-flex gap-1 bg-dark border-0 text-light px-0 pb-0"
            >
              <div>
                You will now receive notification emails when your parcel's
                price is adjusted, a bid is placed on it, or it goes into
                foreclosure.
              </div>
            </ListGroup.Item>
            <ListGroup.Item
              as="li"
              className="d-inline-flex gap-1 bg-dark border-0 text-light px-0"
            >
              <div>
                You can currently monitor up to 50 addresses for free, so repeat
                this process for your other parcels!
              </div>
            </ListGroup.Item>
          </ListGroup>
        </Modal.Body>
      </Modal>
    </>
  );
}

export default NotificationModal;
