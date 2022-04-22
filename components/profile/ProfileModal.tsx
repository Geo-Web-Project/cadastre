import React from "react";
import Modal from "react-bootstrap/Modal";
import Col from "react-bootstrap/Col";
import Row from "react-bootstrap/Row";
import Button from "react-bootstrap/Button";
import Container from "react-bootstrap/Container";
import Image from "react-bootstrap/Image";
import { ethers } from "ethers";
import { truncateStr, truncateEth } from "../../lib/truncate";
import { FlowingBalance } from "./FlowingBalance";
import Stack from "react-bootstrap/Stack";

function ProfileModal(props: any) {
  const {
    balanceData,
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
            <Col sm="2" className="text-right">
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
      <Modal.Body className="bg-dark text-light text-left">
        <Row className="mx-0">
          <Col className="text-left mb-3" xs="1">
            <Image src="./ProfileIcon.png" />
          </Col>
          <Col
            className="text-left mb-3 mt-1 pl-0 mr-1"
            xs="10"
            sm="8"
            style={{
              fontSize: "0.85rem",
            }}
          >
            {account}
          </Col>
          <Col className="text-right" xs="2" sm="1">
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
            className="text-left p-3 mx-3"
            style={{
              background: "#111320",
            }}
          >
            Wallet Balance:{" "}
            <FlowingBalance
              format={(x) => ethers.utils.formatUnits(x)}
              balanceWei={balanceData.availableBalanceWei}
              flowRateWei={balanceData.netFlowRateWei}
              balanceTimestamp={balanceData.timestamp}
            />{" "}
            ETHx
          </Col>
        </Row>
      </Modal.Body>
    </Modal>
  );
}

export default ProfileModal;
