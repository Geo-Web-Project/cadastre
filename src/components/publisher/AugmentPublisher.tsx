import { useState } from "react";
import Button from "react-bootstrap/Button";
import Image from "react-bootstrap/Image";
import Dropdown from "react-bootstrap/Dropdown";
import PublishingForm from "./PublishingForm";
import { useWorld } from "../../lib/geo-web-content/world";

export enum AugmentType {
  MODEL = "3D Model",
  IMAGE = "Image",
  AUDIO = "Audio",
  VIDEO = "Video",
}

export default function AugmentPublisher() {
  const [showForm, setShowForm] = useState<boolean>(false);
  const [augmentType, setAugmentType] = useState<AugmentType>(
    AugmentType.MODEL
  );

  const { mediaObjects } = useWorld();
  console.log(mediaObjects);

  return (
    <>
      {!showForm && (
        <>
          <h3 className="fs4 fw-bold">Augment Publisher</h3>
          <p className="mt-1 mb-4">Add augments to your parcel.</p>
        </>
      )}
      {showForm ? (
        <PublishingForm augmentType={augmentType} setShowForm={setShowForm} />
      ) : (
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
              <Dropdown.Item onClick={() => setAugmentType(AugmentType.MODEL)}>
                {AugmentType.MODEL}
              </Dropdown.Item>
              <Dropdown.Item onClick={() => setAugmentType(AugmentType.IMAGE)}>
                {AugmentType.IMAGE}
              </Dropdown.Item>
              <Dropdown.Item onClick={() => setAugmentType(AugmentType.AUDIO)}>
                {AugmentType.AUDIO}
              </Dropdown.Item>
              <Dropdown.Item onClick={() => setAugmentType(AugmentType.VIDEO)}>
                {AugmentType.VIDEO}
              </Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown>
          <Button
            variant="secondary"
            className="d-flex align-items-center p-1"
            onClick={() => setShowForm(true)}
          >
            <span>
              <Image src="plus-sign.svg" />
            </span>
          </Button>
        </div>
      )}
    </>
  );
}
