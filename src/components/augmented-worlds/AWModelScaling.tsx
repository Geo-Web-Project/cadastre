import { useState, useEffect, useRef } from "react";
/* eslint-disable import/named */
import init, {
  World,
  ComponentType,
  Position,
  Scale,
  Orientation,
  GLTFModel,
  IsAnchor,
  Anchor,
  TrackedImage,
  CoachingOverlay,
} from "augmented-worlds";
import {
  GraphicsSystem,
  WebXRSystem,
  AnchorTransformSystem,
  AnchorSystem,
  CoachingOverlaySystem,
  ImageTrackingSystem,
  ModelScalingSystem,
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
import "@augmented-worlds/system-babylonjs/styles.css";

/* eslint-disable import/no-unresolved */
import { CID } from "multiformats";
import { encode as encodeDagJson } from "@ipld/dag-json";
import { decode as decodeJson } from "multiformats/codecs/json";
import "swiper/css";
import "swiper/css/navigation";
/* eslint-enable */

enum State {
  Loading,
  Ready,
  NotSupported,
}

export default function AWModelScaling({
  augmentedWorldCid,
  modelToScaleCid,
  onClose,
}: {
  augmentedWorldCid: CID;
  modelToScaleCid: CID;
  onClose: () => void;
}) {
  const [state, setState] = useState(State.Loading);
  const [world, setWorld] = useState<World | null>(null);
  const [webXRSystem, setWebXRSystem] = useState<WebXRSystem | null>(null);
  const [isWorldReady, setIsWorldReady] = useState(false);
  const [graphicsSystem, setGraphicsSystem] = useState<GraphicsSystem | null>(
    null
  );
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

  // useEffect(() => {
  //   (async () => {
  //     if (!world || !canvasRef.current || !overlayRef.current) return;

  //     setIsWorldReady(false);

  //     // Download world
  //     const entities = (await gwContent.raw.get(
  //       // eslint-disable-next-line @typescript-eslint/no-explicit-any
  //       augmentedWorldCid as any,
  //       "/",
  //       {}
  //     )) as CID[];

  //     const localEntityMap: Record<string, number> = {};
  //     const trackedImages: number[] = [];
  //     const worldEntities: number[] = [];

  //     // Add all entities locally
  //     for (const entityCid of entities) {
  //       const worldEntity = world.create_entity();
  //       worldEntities.push(worldEntity);
  //       localEntityMap[entityCid.toString()] = worldEntity;
  //     }

  //     // Add components
  //     for (const entityCid of entities) {
  //       // eslint-disable-next-line @typescript-eslint/no-explicit-any
  //       const entity = await gwContent.raw.get(entityCid as any, "/", {});

  //       const worldEntity = localEntityMap[entityCid.toString()];
  //       world.add_component_to_entity(worldEntity, ComponentType.Component, {});

  //       if (entity.isAnchor !== undefined) {
  //         world.add_component_to_entity(worldEntity, ComponentType.IsAnchor, {
  //           isAnchor: entity.isAnchor,
  //         } as IsAnchor);
  //       }

  //       if (entity.glTFModel) {
  //         world.add_component_to_entity(worldEntity, ComponentType.GLTFModel, {
  //           glTFModel: { "/": entity.glTFModel.toString() },
  //         } as GLTFModel);

  //         world.add_component_to_entity(worldEntity, ComponentType.Position, {
  //           startPosition: {
  //             x: entity.position?.x ?? 0,
  //             y: entity.position?.y ?? 0,
  //             z: entity.position?.z ?? 0,
  //           },
  //         } as Position);

  //         world.add_component_to_entity(worldEntity, ComponentType.Scale, {
  //           startScale: {
  //             x: entity.scale?.x ?? 1,
  //             y: entity.scale?.y ?? 1,
  //             z: entity.scale?.z ?? 1,
  //           },
  //         } as Scale);

  //         world.add_component_to_entity(
  //           worldEntity,
  //           ComponentType.Orientation,
  //           {
  //             startOrientation: {
  //               x: entity.orientation?.x ?? 0,
  //               y: entity.orientation?.y ?? 0,
  //               z: entity.orientation?.z ?? 0,
  //               w: entity.orientation?.w ?? 1,
  //             },
  //           } as Orientation
  //         );
  //       } else {
  //         world.add_component_to_entity(
  //           worldEntity,
  //           ComponentType.Position,
  //           entity.position
  //             ? ({
  //                 startPosition: {
  //                   x: entity.position?.x ?? 0,
  //                   y: entity.position?.y ?? 0,
  //                   z: entity.position?.z ?? 0,
  //                 },
  //               } as Position)
  //             : {}
  //         );

  //         world.add_component_to_entity(
  //           worldEntity,
  //           ComponentType.Scale,
  //           entity.scale
  //             ? ({
  //                 startScale: {
  //                   x: entity.scale?.x ?? 1,
  //                   y: entity.scale?.y ?? 1,
  //                   z: entity.scale?.z ?? 1,
  //                 },
  //               } as Scale)
  //             : {}
  //         );

  //         world.add_component_to_entity(
  //           worldEntity,
  //           ComponentType.Orientation,
  //           entity.orientation
  //             ? ({
  //                 startOrientation: {
  //                   x: entity.orientation?.x ?? 0,
  //                   y: entity.orientation?.y ?? 0,
  //                   z: entity.orientation?.z ?? 0,
  //                   w: entity.orientation?.w ?? 1,
  //                 },
  //               } as Orientation)
  //             : {}
  //         );
  //       }

  //       if (entity.anchor) {
  //         // Replace CID with local entity
  //         // TODO: Support nested anchors
  //         const anchor = {
  //           anchor: localEntityMap[entity.anchor.toString()],
  //         } as Anchor;
  //         world.add_component_to_entity(
  //           worldEntity,
  //           ComponentType.Anchor,
  //           anchor
  //         );
  //       }

  //       if (entity.trackedImage) {
  //         world.add_component_to_entity(
  //           worldEntity,
  //           ComponentType.TrackedImage,
  //           decodeJson(encodeDagJson(entity.trackedImage)) as TrackedImage
  //         );
  //         trackedImages.push(worldEntity);
  //       }
  //     }

  //     if (trackedImages.length > 0) {
  //       const coachingOverlayEntity = world.create_entity();
  //       world.add_component_to_entity(
  //         coachingOverlayEntity,
  //         ComponentType.CoachingOverlay,
  //         {
  //           trackedImages: trackedImages.map((v) => {
  //             return { "/": localEntityMap[v] };
  //           }),
  //           text: "Point and hold the camera on the image target to enter AR.",
  //         } as CoachingOverlay
  //       );
  //     }

  //     // Create host systems
  //     const graphicsSystem = new GraphicsSystem(
  //       world,
  //       canvasRef.current,
  //       "https://w3s.link"
  //     );
  //     setGraphicsSystem(graphicsSystem);

  //     const webXRSystem = new WebXRSystem(graphicsSystem.getScene());
  //     setWebXRSystem(webXRSystem);
  //     const webXRAnchorSystem = new AnchorSystem(webXRSystem);
  //     const anchorTransformSystem = new AnchorTransformSystem();
  //     const imageTrackingSystem = new ImageTrackingSystem(
  //       webXRSystem,
  //       "https://w3s.link"
  //     );
  //     const coachingOverlaySystem = new CoachingOverlaySystem(
  //       webXRSystem,
  //       "https://w3s.link",
  //       overlayRef.current
  //     );
  //     const modelScalingSystem = new ModelScalingSystem(
  //       webXRSystem,
  //       overlayRef.current,
  //       localEntityMap[modelToScaleCid.toString()],
  //       ["btn", "btn-primary", "lh-sm"],
  //       ["btn", "btn-primary", "lh-sm"],
  //       ["bg-dark", "text-light", "border-0"]
  //     );

  //     modelScalingSystem.onModelScaleChanged.add((v) => {
  //       console.log("New scale: " + v);
  //     });

  //     world.add_system(graphicsSystem);
  //     world.add_system(webXRSystem);
  //     world.add_system(webXRAnchorSystem);
  //     world.add_system(anchorTransformSystem);
  //     world.add_system(imageTrackingSystem);
  //     world.add_system(coachingOverlaySystem);
  //     world.add_system(modelScalingSystem);

  //     graphicsSystem.start();

  //     setIsWorldReady(true);
  //   })();
  // }, [world]);

  useEffect(() => {
    if (world && isWorldReady && state === State.Loading) {
      enterWorld();
    }
  }, [world, canvasRef, overlayRef, webXRSystem, graphicsSystem]);

  const enterWorld = async () => {
    if (
      !world ||
      !canvasRef.current ||
      !overlayRef.current ||
      !webXRSystem ||
      !graphicsSystem
    )
      return;

    setState(State.Loading);

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
  };

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
        {state === State.Loading ? (
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
