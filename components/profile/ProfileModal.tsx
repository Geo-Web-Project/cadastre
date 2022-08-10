import React from "react";
import Modal from "react-bootstrap/Modal";
import Col from "react-bootstrap/Col";
import Row from "react-bootstrap/Row";
import Button from "react-bootstrap/Button";
import Container from "react-bootstrap/Container";
import Image from "react-bootstrap/Image";
import { FlowingBalance } from "./FlowingBalance";
import { ethers } from "ethers";
// eslint-disable-next-line import/named
import { AccountTokenSnapshot } from "@superfluid-finance/sdk-core";

type ProfileModalProps = {
  accountTokenSnapshot: AccountTokenSnapshot | undefined;
  account: string;
  showProfile: boolean;
  disconnectWallet: () => Promise<void>;
  handleCloseProfile: () => void;
};

function ProfileModal(props: ProfileModalProps) {
  const {
    accountTokenSnapshot,
    account,
    showProfile,
    disconnectWallet,
    handleCloseProfile,
  } = props;

  const deactivateProfile = () => {
    disconnectWallet();
    handleCloseProfile();
  };

  return (
    <Modal
      show={showProfile}
      keyboard={false}
      centered
      onHide={handleCloseProfile}
    >
      <Modal.Header className="bg-dark border-0">
        <Container>
          <Row>
            <Col sm="10">
              <Modal.Title className="text-primary">Profile</Modal.Title>
            </Col>
            <Col sm="2" className="text-end">
              <Button
                variant="link"
                size="sm"
                onClick={() => handleCloseProfile()}
              >
                <Image src="close.svg" />
              </Button>
            </Col>
          </Row>
        </Container>
      </Modal.Header>
      <Modal.Body className="bg-dark text-light text-start">
        <Row className="mx-0">
          <Col className="text-start mb-3" xs="1">
            <Image src="./ProfileIcon.png" />
          </Col>
          <Col
            className="text-start mb-3 mt-1 ps-0 me-1"
            xs="10"
            sm="8"
            style={{
              fontSize: "0.85rem",
            }}
          >
            {account}
          </Col>
          <Col className="text-end" xs="2" sm="1">
            <Button
              size="sm"
              onClick={deactivateProfile}
              variant="info"
              style={{
                fontSize: "0.8rem",
              }}
            >
              Disconnect
            </Button>
          </Col>
        </Row>
        <Row className="mt-3">
          <Col
            className="text-start p-3 mx-3"
            style={{
              background: "#111320",
            }}
          >
            Wallet Balance:{" "}
            <FlowingBalance
              format={(x) => ethers.utils.formatUnits(x)}
              accountTokenSnapshot={accountTokenSnapshot}
            />{" "}
            ETHx
          </Col>
        </Row>
      </Modal.Body>
    </Modal>
  );
}

export default ProfileModal;
