import { useState } from "react";
import Button from "react-bootstrap/Button";
import Image from "react-bootstrap/Image";
import Dropdown from "react-bootstrap/Dropdown";
import Table from "react-bootstrap/Table";
import PublishingForm from "./PublishingForm";
import Row from "react-bootstrap/Row";
import { MediaObjectType, useWorld } from "../../lib/geo-web-content/world";
import { ParcelInfoProps } from "../cards/ParcelInfo";
import { STATE } from "../Map";

export enum AugmentType {
  MODEL = "3D Model",
  IMAGE = "Image",
  AUDIO = "Audio",
  VIDEO = "Video",
}

export default function AugmentPublisher(props: ParcelInfoProps) {
  const { interactionState, setInteractionState } = props;
  const [augmentType, setAugmentType] = useState<AugmentType>(
    AugmentType.MODEL
  );

  const { mediaObjects } = useWorld();

  return (
    <>
      {interactionState === STATE.PUBLISHING && (
        <>
          <h3 className="fs4 fw-bold">Augment Publisher</h3>
          <p className="mt-1 mb-4">Add augments to your parcel.</p>
        </>
      )}
      {interactionState === STATE.PUBLISHING_NEW_MARKER ? (
        <PublishingForm
          augmentType={augmentType}
          setShowForm={(showForm) => {
            setInteractionState(
              showForm ? STATE.PUBLISHING_NEW_MARKER : STATE.PUBLISHING
            );
          }}
        />
      ) : (
        <>
          <div className="d-flex align-items-center gap-2">
            <Dropdown>
              <Dropdown.Toggle
                variant="blue"
                className="d-flex justify-content-between align-items-center"
                style={{ width: 128 }}
              >
                {augmentType}
              </Dropdown.Toggle>

              <Dropdown.Menu variant="dark" className="bg-blue">
                <Dropdown.Item
                  onClick={() => setAugmentType(AugmentType.MODEL)}
                >
                  {AugmentType.MODEL}
                </Dropdown.Item>
                <Dropdown.Item
                  onClick={() => setAugmentType(AugmentType.IMAGE)}
                >
                  {AugmentType.IMAGE}
                </Dropdown.Item>
                <Dropdown.Item
                  onClick={() => setAugmentType(AugmentType.AUDIO)}
                >
                  {AugmentType.AUDIO}
                </Dropdown.Item>
                <Dropdown.Item
                  onClick={() => setAugmentType(AugmentType.VIDEO)}
                >
                  {AugmentType.VIDEO}
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>
            <Button
              variant="secondary"
              className="d-flex align-items-center p-1"
              onClick={() => setInteractionState(STATE.PUBLISHING_NEW_MARKER)}
            >
              <span>
                <Image src="plus-sign.svg" />
              </span>
            </Button>
          </div>
          <Row className="mt-4">
            <Table
              striped
              variant="dark"
              className="m-3 mt-0 text-light flex-shrink-1"
            >
              <tbody>
                {mediaObjects.map((mediaObject, i) => {
                  let mediaType;
                  switch (mediaObject.mediaType) {
                    case MediaObjectType.Model:
                      mediaType = "3D Model";
                      break;
                    case MediaObjectType.Audio:
                      mediaType = "Audio";
                      break;
                    case MediaObjectType.Image:
                      mediaType = "Image";
                      break;
                    case MediaObjectType.Video:
                      mediaType = "Video";
                      break;
                  }
                  return (
                    <tr>
                      <td>{i + 1}</td>
                      <td>{mediaObject.name}</td>
                      <td>{mediaType}</td>
                      {/* <td>
                        <Button variant="link">
                          <Image src={"delete.svg"} width={20}></Image>
                        </Button>
                      </td> */}
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </Row>
        </>
      )}
    </>
  );
}
