import { useState } from "react";
import { useRouter } from "next/router";
import Modal from "react-bootstrap/Modal";

function Dashboard() {
  const [show, setShow] = useState(true);

  const handleClose = () => setShow(false);

  const router = useRouter();

  return (
    <Modal
      show={show}
      onHide={handleClose}
      onExited={() => router.push("/")}
      centered
      contentClassName="bg-dark"
      className="wrap-modal"
    >
      <Modal.Header className="bg-dark border-0">
        <Modal.Title className="text-primary">
          Wrap ETH for Streaming
        </Modal.Title>
      </Modal.Header>
      <Modal.Body className="bg-dark text-light position-relative">
        <p>Current Balances</p>
        <div style={{ padding: "0 16px" }}>
          <p className="mb-0 me-3">ETHx: </p>
          <div
            className="position-absolute"
            style={{ bottom: "16px", right: "16px" }}
          ></div>
        </div>
      </Modal.Body>
      <Modal.Footer></Modal.Footer>
    </Modal>
  );
}

export default Dashboard;
