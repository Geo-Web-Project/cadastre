import Modal from "react-bootstrap/Modal";
import ListGroup from "react-bootstrap/ListGroup";
import Card from "react-bootstrap/Card";
import Button from "react-bootstrap/Button";
import Image from "react-bootstrap/Image";

type PassportMintingInstructionsProps = {
  show: boolean;
  hide: () => void;
};

export default function PassportMintingInstructions(
  props: PassportMintingInstructionsProps
) {
  const { show, hide } = props;

  return (
    <Modal
      show={show}
      contentClassName="bg-dark p-2 rounded-4"
      size="xl"
      centered
      scrollable
    >
      <Modal.Header className="text-primary border-0 pb-0">
        <Modal.Title as="h2">Mint a Gitcoin Passport on Optimism</Modal.Title>
        <Button
          variant="link"
          size="sm"
          className="position-absolute top-0 end-0 pt-1 pe-1 px-sm-2 py-sm-2"
          onClick={hide}
        >
          <Image width={30} src="close.svg" />
        </Button>
      </Modal.Header>
      <Modal.Body className="bg-dark text-light px-4 fs-4">
        <ListGroup as="ol" numbered>
          <ListGroup.Item
            as="li"
            className="d-inline-flex gap-1 bg-dark border-0 text-light px-0 py-1"
            style={{ listStylePosition: "inside" }}
          >
            Open{" "}
            <Card.Link href="https://passport.gitcoin.co/" target="_blank">
              https://passport.gitcoin.co/
            </Card.Link>{" "}
            in a new tab
          </ListGroup.Item>
          <ListGroup.Item
            as="li"
            className="bg-dark border-0 text-light px-0 py-1"
            style={{ listStylePosition: "inside" }}
          >
            Click <i>Sign in with Ethereum</i>
          </ListGroup.Item>
          <ListGroup.Item
            as="li"
            className="bg-dark border-0 text-light px-0 py-1"
            style={{ listStylePosition: "inside" }}
          >
            Connect your wallet & sign the message
          </ListGroup.Item>
          <ListGroup.Item
            as="li"
            className="bg-dark border-0 text-light px-0 py-1"
            style={{ listStylePosition: "inside" }}
          >
            Click through and read the Passport introduction
          </ListGroup.Item>
          <ListGroup.Item
            as="li"
            className="bg-dark border-0 text-light px-0 py-1"
            style={{ listStylePosition: "inside" }}
          >
            Click <i>Verify Stamps</i> to add/update your web3 stamps
            automatically
          </ListGroup.Item>
          <ListGroup.Item
            as="li"
            className="bg-dark border-0 text-light px-0 py-1"
            style={{ listStylePosition: "inside" }}
          >
            Continue to the <i>Dashboard</i> and verify additional web2 stamps
          </ListGroup.Item>
          <ListGroup.Item
            as="li"
            className="bg-dark border-0 text-light px-0 py-1 fw-bold"
            style={{ listStylePosition: "inside" }}
          >
            Earn a Unique Humanity Score of at least 3 before continuing
          </ListGroup.Item>
          <ListGroup.Item
            as="li"
            className="bg-dark border-0 text-light px-0 py-1"
          >
            Scroll to the bottom of the <i>Dashboard</i> and click{" "}
            <i>Bring Passport Onchain</i>
          </ListGroup.Item>
          <ListGroup.Item
            as="li"
            className="bg-dark border-0 text-light px-0 py-1"
            style={{ listStylePosition: "inside" }}
          >
            Click the Optimism <i>Mint</i> button
          </ListGroup.Item>
          <ListGroup as="ul">
            <ListGroup.Item
              as="li"
              className="bg-dark border-0 text-light ms-2 py-1"
            >
              &#x2022; Bringing your Passport onchain requires a $2 payment in
              ETH
            </ListGroup.Item>
          </ListGroup>
          <ListGroup.Item
            as="li"
            className="bg-dark border-0 text-light px-0 py-1"
            style={{ listStylePosition: "inside" }}
          >
            Sign the minting transaction, await confirmation, & return to the
            SQF UI to open your donation stream
          </ListGroup.Item>
        </ListGroup>
        <Modal.Footer className="border-0 p-0">
          <Button
            variant="danger"
            onClick={hide}
            className="float-end px-5 mt-3"
          >
            Close
          </Button>
        </Modal.Footer>
      </Modal.Body>
    </Modal>
  );
}
