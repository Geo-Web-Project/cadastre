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
      <Modal.Body className="bg-dark text-light text-center">
        <Row>
          <Col className="text-left">
            <Image src="./ProfileIcon.png" /> {account}
          </Col>
          <Col>
            <Button size="sm" onClick={deactivateProfile} variant="danger">
              Disconnect
            </Button>
          </Col>
        </Row>
        <Row className="mt-5">
          <Col className="bg-dark text-left">
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
