import React from "react";
import Modal from "react-bootstrap/Modal";
import Col from "react-bootstrap/Col";
import Row from "react-bootstrap/Row";
import Button from "react-bootstrap/Button";
import Container from "react-bootstrap/Container";
import Image from "react-bootstrap/Image";
import { truncateStr } from "../../lib/truncate";
import { Alert } from "react-bootstrap";
import { PAYMENT_TOKEN } from "../../lib/constants";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleInfo } from "@fortawesome/free-solid-svg-icons";
// eslint-disable-next-line import/named
import { GetRealtimeBalanceResult } from "@superfluid-finance/sdk-redux";
import { BigNumber } from "ethers";

type DashboardProps = {
  balanceData: GetRealtimeBalanceResult;
  account: string;
  showProfile: boolean;
  disconnectWallet: () => Promise<void>;
  handleCloseProfile: () => void;
};

function BalanceAlert(props: DashboardProps) {
  const { balanceData } = props;

  return (
    <>
      {BigNumber.from(balanceData.availableBalanceWei).gt(BigNumber.from(0)) ? (
        <Alert variant="warning">
          <FontAwesomeIcon icon={faCircleInfo} /> Your {PAYMENT_TOKEN} balance
          will hit zero on:
        </Alert>
      ) : (
        <Alert variant="danger">
          <FontAwesomeIcon icon={faCircleInfo} /> Your {PAYMENT_TOKEN} balance
          is 0. Any previously opened streams have been closed.
        </Alert>
      )}
    </>
  );
}

function Dashboard(props: DashboardProps) {
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
      size="xl"
      onHide={handleCloseProfile}
    >
      <Modal.Header className="bg-dark border-0">
        <Container>
          <Row>
            <Col sm="10">
              <Modal.Title className="text-light">
                Account: {truncateStr(account, 14)}
              </Modal.Title>
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
        <Row>
          <Col>
            <BalanceAlert {...props} />
          </Col>
        </Row>
      </Modal.Body>
    </Modal>
  );
}

export default Dashboard;
