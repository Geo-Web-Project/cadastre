import { useState, useEffect, useRef } from "react";
/* eslint-disable import/named */
import init, { World } from "augmented-worlds";
import {
  GraphicsSystem,
  WebXRSystem,
  ImageCaptureSystem,
} from "@augmented-worlds/system-babylonjs";
/* eslint-enable */

import Image from "react-bootstrap/Image";
import { UAParser } from "ua-parser-js";
import Button from "react-bootstrap/Button";
import Modal from "react-bootstrap/Modal";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Spinner from "react-bootstrap/Spinner";
import NotAvailableView from "./NotAvailableView";

enum State {
  Loading,
  Ready,
  NotSupported,
}

export default function AWImageCapture({ onClose }: { onClose: () => void }) {
  const [state, setState] = useState(State.Loading);
  const [world, setWorld] = useState<World | null>(null);
  const [webXRSystem, setWebXRSystem] = useState<WebXRSystem | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const parser = new UAParser();
  const { browser } = parser.getResult();

  const incubationsUri = `${
    browser.name === "Brave"
      ? "brave"
      : browser.name === "Samsung Browser"
      ? "internet"
      : "chrome"
  }://flags/#webxr-incubations`;

  // Setup World
  useEffect(() => {
    (async () => {
      const isSupported = await WebXRSystem.isSupported();

      if (!isSupported) {
        setState(State.NotSupported);
        return;
      }

      await init();

      // Create World
      const world = new World();
      setWorld(world);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      if (!world || !canvasRef.current || !overlayRef.current) return;

      setState(State.Loading);

      // Create host systems
      const graphicsSystem = new GraphicsSystem(
        world,
        canvasRef.current,
        "https://w3s.link"
      );

      const webXRSystem = new WebXRSystem(graphicsSystem.getScene());
      setWebXRSystem(webXRSystem);

      const imageCaptureSystem = new ImageCaptureSystem(
        webXRSystem,
        overlayRef.current
      );

      imageCaptureSystem.onImageAnchorCaptured.add((imageAnchorCapture) => {
        console.log(imageAnchorCapture);
        onClose();
      });

      world.add_system(graphicsSystem);
      world.add_system(webXRSystem);
      world.add_system(imageCaptureSystem);

      graphicsSystem.start();

      try {
        await webXRSystem.startXRSession();

        (await webXRSystem.getXRSessionManager()).onXRSessionEnded.add(() => {
          if (canvasRef.current) canvasRef.current.hidden = true;
          if (overlayRef.current && closeButtonRef.current) {
            overlayRef.current.innerHTML = "";
            overlayRef.current.appendChild(closeButtonRef.current);
            overlayRef.current.hidden = true;
          }
          graphicsSystem.getScene().getEngine().dispose();
          setWorld(new World());
          onClose();
        });

        canvasRef.current.hidden = false;
        overlayRef.current.hidden = false;

        setState(State.Ready);
      } catch (e) {
        console.log(e);
        setState(State.NotSupported);
      }
    })();
  }, [world]);

  return (
    <Modal
      show={true}
      centered
      onHide={onClose}
      size="xl"
      contentClassName="bg-dark"
    >
      <Modal.Header className="bg-dark border-0 p-2 p-sm-4 pb-0">
        <Container>
          <Row>
            <Col xs={{ span: 1, offset: 11 }} className="p-0 text-end">
              <Button
                variant="link"
                size="sm"
                className="p-0"
                onClick={() => onClose()}
              >
                <Image width={36} src="close.svg" />
              </Button>
            </Col>
          </Row>
        </Container>
      </Modal.Header>
      <Modal.Body className="py-5 bg-dark text-light text-start">
        <canvas ref={canvasRef} hidden />
        <div ref={overlayRef} hidden>
          <Button
            ref={closeButtonRef}
            variant="link"
            size="sm"
            className="position-absolute top-0 end-0 mx-3 my-5 p-2 border-0 rounded-6"
            style={{ background: "rgba(32, 35, 51, 0.6)" }}
            onClick={async () => {
              const sessionManager = await webXRSystem?.getXRSessionManager();
              await sessionManager?.exitXRAsync();
              onClose();
            }}
          >
            <Image width={28} src="close.svg" />
          </Button>
        </div>
        {!world || state === State.Loading ? (
          <Container>
            <Row>
              <Col xs={{ span: 1, offset: 5 }} className="my-5">
                <Spinner as="span" animation="border" role="status">
                  <span className="visually-hidden">Loading...</span>
                </Spinner>
              </Col>
            </Row>
          </Container>
        ) : state === State.NotSupported ? (
          <NotAvailableView incubationsUri={incubationsUri} onClose={onClose} />
        ) : null}
      </Modal.Body>
    </Modal>
  );
}
