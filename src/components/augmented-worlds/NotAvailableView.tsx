import { useCallback } from "react";
import Image from "react-bootstrap/Image";
import { UAParser } from "ua-parser-js";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import CopyTooltip from "../CopyTooltip";
import Button from "react-bootstrap/Button";

export default function NotAvailableView({
  incubationsUri,
  onClose,
}: {
  incubationsUri: string;
  onClose: () => void;
}) {
  const parser = new UAParser();
  const { os } = parser.getResult();

  const copyUri = useCallback(() => {
    navigator.clipboard.writeText(incubationsUri);
  }, [incubationsUri]);

  return (
    <Container>
      <Row className="justify-content-center">
        <Col xs={6} className="mb-4">
          <Image src="ar-unavailable.svg" />
        </Col>
      </Row>
      <Row>
        <Col xs={12} className="text-center mb-4">
          <h1>Browser Not Compatible</h1>
        </Col>
        <Col xs={12} className="text-center">
          {os.name === "iOS" ? (
            <p>iOS doesn’t yet support WebXR.</p>
          ) : os.name === "Android" ? (
            <p>
              On Android, try using{" "}
              <a href="https://play.google.com/store/apps/details?id=com.android.chrome">
                Chrome (version 113+)
              </a>{" "}
              & installing the{" "}
              <a href="https://play.google.com/store/apps/details?id=com.google.ar.core">
                latest version of ARCore
              </a>
              . Then paste the following into your URL bar & enable the WebXR
              Incubations flag:{" "}
              <span style={{ textDecoration: "underline" }}>
                {incubationsUri}
              </span>{" "}
              <CopyTooltip
                contentClick="Copied"
                contentHover="Copy Address"
                target={
                  <div className="d-flex flex-shrink-1 align-items-center">
                    <Image width={25} src="copy-light.svg" alt="copy" />
                  </div>
                }
                handleCopy={copyUri}
              />
            </p>
          ) : (
            <p>
              This augmented reality experience uses experimental features of
              the open-source WebXR standard. Not all devices and browsers
              support these features.
            </p>
          )}
        </Col>
      </Row>
      <Row>
        <Col xs={{ span: 8, offset: 2 }} className="mt-5">
          <Button
            variant="primary"
            onClick={() => {
              onClose();
            }}
          >
            Return to the Cadastre
          </Button>
        </Col>
      </Row>
    </Container>
  );
}
