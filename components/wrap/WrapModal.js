import * as React from "react";
import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";

function WrapMpdal({ show, setShow, ETHBalance, ETHxBalance }) {
  const handleClose = () => setShow(false);

  return (
    <Modal show={show} onHide={handleClose}>
      <Modal.Header closeButton>
        <Modal.Title>Wrap ETH for Streaming</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p>Current Balances</p>
        <div style={{ padding: "0 16px" }}>
          <p>ETH: {ETHBalance}</p>
          <p>ETHx: {ETHxBalance}</p>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Form>
          <Row className="align-items-center">
            <Col xs="auto">
              <Form.Label htmlFor="inlineFormInput" srOnly="true">
                Amount
              </Form.Label>
              <Form.Control
                className="mb-2"
                id="inlineFormInput"
                placeholder="0.00"
              />
            </Col>
            <Col xs="auto">
              <Button type="button" className="mb-2" onClick={handleClose}>
                Wrap to ETHx
              </Button>
            </Col>
          </Row>
        </Form>
      </Modal.Footer>
    </Modal>
  );
}

export default WrapMpdal;
