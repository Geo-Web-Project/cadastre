import { ethers } from "ethers";
import { AccountId } from "caip";
import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";
import Image from "react-bootstrap/Image";
import Spinner from "react-bootstrap/Spinner";
import { Discussion } from "@orbisclub/components";
import "@orbisclub/components/dist/index.modern.css";
import { NETWORK_ID } from "../lib/constants";

const CONTEXT_STREAM =
  "kjzl6cwe1jw145l33v3vbl5171apg9n413hdn0yf8eo0m95qi0iq3wdkqa71fjx";
const THEME_STREAM =
  "kjzl6cwe1jw146bq6o1175c6f0aagjtwe4t8t5csuk8onwga63k4377tpbz5ggz";

interface ParcelChatProps {
  show: boolean;
  parcelId: string;
  licenseOwner?: string;
  handleClose: () => void;
}

function ParcelChat(props: ParcelChatProps) {
  const { show, parcelId, licenseOwner, handleClose } = props;

  const ownerDID = licenseOwner
    ? `did:pkh:${new AccountId({
        chainId: `eip155:${NETWORK_ID}`,
        address: ethers.utils.getAddress(licenseOwner),
      })}`
    : "";

  return (
    <Modal
      show={show}
      centered
      scrollable
      backdrop="static"
      keyboard={false}
      onHide={handleClose}
      contentClassName="bg-dark"
    >
      <Modal.Header className="bg-dark border-0">
        <Modal.Title className="fs-1 text-light">
          Parcel Chat
          <p className="fs-6">Join the conversation at the selected parcel.</p>
        </Modal.Title>
        <Button
          variant="link"
          size="sm"
          className="align-self-start"
          onClick={handleClose}
        >
          <Image width={32} src="close.svg" />
        </Button>
      </Modal.Header>
      <Modal.Body className="bg-dark px-4 text-light">
        {licenseOwner ? (
          <Discussion
            context={`${CONTEXT_STREAM}:${parcelId};${ownerDID}`}
            theme={THEME_STREAM}
          />
        ) : (
          <div className="d-flex justify-content-center m-5">
            <Spinner as="span" animation="border" role="status">
              <span className="visually-hidden">Loading...</span>
            </Spinner>
          </div>
        )}
      </Modal.Body>
    </Modal>
  );
}

export default ParcelChat;
