import * as React from "react";
import Form from "react-bootstrap/Form";
import Col from "react-bootstrap/Col";
import Row from "react-bootstrap/Row";
import Button from "react-bootstrap/Button";

export function GalleryForm({}) {
  return (
    <>
      <Form>
        <Row>
          <Col sm="12" md="6">
            <Form.File
              id="uploadCid"
              label="Upload media or add an existing CID"
              custom
            />
          </Col>
          <Col sm="12" md="6">
            <div key="inline-radio" className="mb-3">
              <Form.Check
                inline
                label="AR/VR (.glb or .usdz)"
                type="radio"
                id="inline-radio-1"
              />
              <Form.Check
                inline
                label="Image"
                type="radio"
                id="inline-radio-2"
                disabled
              />
              <Form.Check
                inline
                label="Video"
                type="radio"
                id="inline-radio-3"
                disabled
              />
              <Form.Check
                inline
                label="Audio"
                type="radio"
                id="inline-radio-4"
                disabled
              />
            </div>
          </Col>
        </Row>
        <Row>
          <Col sm="12" md="6">
            <Form.Control type="text" placeholder="Display Name of Media" />
          </Col>
          <Col sm="12" md="6">
            <Form.Control as="select" custom>
              <option>Pinata Pinning Service (Requires Credentials)</option>
              <option>Custom Pinning Service</option>
            </Form.Control>
          </Col>
        </Row>
        <Row>
          <Col sm="12" md="6">
            <Form.Control
              type="text"
              placeholder="Pinning Service API Endpoint"
            />
          </Col>
          <Col sm="12" md="6">
            <Form.Control type="text" placeholder="JWT Access Token" />
          </Col>
        </Row>
        <Row>
          <Col sm="12" md="6">
            <Button variant="danger">Cancel</Button>
            <Button variant="secondary">Add to Gallery</Button>
          </Col>
        </Row>
      </Form>
    </>
  );
}

export default GalleryForm;
