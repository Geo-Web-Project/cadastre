import { useState } from "react";
import Button from "react-bootstrap/Button";
import Image from "react-bootstrap/Image";
import Dropdown from "react-bootstrap/Dropdown";
import Card from "react-bootstrap/Card";
import Stack from "react-bootstrap/Stack";
import PublishingForm from "./PublishingForm";
import {
  MediaObjectType,
  useWorld,
} from "../../../hooks/geo-web-content/world";
import { ParcelInfoProps } from "../cards/ParcelInfo";
import { STATE } from "../Map";
import { MODEL_AUGMENT_ADDRESS } from "../../../lib/constants";

export enum AugmentType {
  MODEL = "3D Model",
  IMAGE = "Image",
  AUDIO = "Audio",
  VIDEO = "Video",
}

export function getAugmentAddress(augmentType: AugmentType) {
  switch (augmentType) {
    default:
      return MODEL_AUGMENT_ADDRESS;
  }
}

export default function AugmentPublisher(props: ParcelInfoProps) {
  const { interactionState, setInteractionState } = props;
  const [augmentType, setAugmentType] = useState<AugmentType>(
    AugmentType.MODEL
  );

  const {
    mediaObjects,
    shouldMediaObjectsUpdate,
    setShouldMediaObjectsUpdate,
  } = useWorld();

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
          shouldMediaObjectsUpdate={shouldMediaObjectsUpdate}
          setShouldMediaObjectsUpdate={setShouldMediaObjectsUpdate}
          {...props}
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
          <Stack direction="vertical" className="mt-4">
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
                default:
                  break;
              }

              return (
                <Stack
                  direction="horizontal"
                  className={`${
                    i === 0
                      ? "rounded-top-3"
                      : i === mediaObjects.length - 1
                      ? "rounded-bottom-3"
                      : ""
                  } ${i % 2 === 0 ? "bg-blue" : "bg-purple"}`}
                  key={i}
                >
                  <Card.Text className="text-center w-10 m-0 p-2">
                    {i + 1}
                  </Card.Text>
                  <Card.Text className="w-50 m-0 p-2 overflow-hidden text-truncate">
                    {mediaObject.name}
                  </Card.Text>
                  <Card.Text className="m-50 p-2">{mediaType}</Card.Text>
                </Stack>
              );
            })}
          </Stack>
        </>
      )}
    </>
  );
}
