import { useState } from "react";
import Button from "react-bootstrap/Button";
import Image from "react-bootstrap/Image";
import Form from "react-bootstrap/Form";
import InputGroup from "react-bootstrap/InputGroup";
import { AugmentType } from "./AugmentPublisher";

type PublishingFormProps = {
  augmentType: AugmentType;
  setShowForm: React.Dispatch<React.SetStateAction<boolean>>;
};

type AugmentArgs = {
  contentURI: string;
  name: string;
  coords: { lat: string; lon: string };
  altitude: string;
  orientation: string;
  displayScale: string;
  displayWidth: string;
  audioVolume: string;
};

export default function PublishingForm(props: PublishingFormProps) {
  const { augmentType, setShowForm } = props;

  const [isLocationOn, setIsLocationOn] = useState<boolean>(false);
  const [augmentArgs, setAugmentArgs] = useState<AugmentArgs>({
    contentURI: "",
    name: "",
    coords: { lat: "", lon: "" },
    altitude: "",
    orientation: "",
    displayScale: "",
    displayWidth: "",
    audioVolume: "",
  });

  const title = (
    <div className="d-flex align-items-center gap-2 mb-2 mt-1">
      <Image
        src={
          augmentType === AugmentType.MODEL
            ? "model.svg"
            : augmentType === AugmentType.IMAGE
            ? "image.svg"
            : augmentType === AugmentType.AUDIO
            ? "audio.svg"
            : augmentType === AugmentType.VIDEO
            ? "video.svg"
            : ""
        }
        alt={
          augmentType === AugmentType.MODEL
            ? "model"
            : augmentType === AugmentType.IMAGE
            ? "image"
            : augmentType === AugmentType.AUDIO
            ? "audio"
            : augmentType === AugmentType.VIDEO
            ? "video"
            : ""
        }
        width={32}
      />
      <h3 className="m-0">{augmentType}</h3>
    </div>
  );

  return (
    <>
      {title}
      <small>
        Important: Geo-anchored augments rely on street mapping data for
        positioning. For best results, place your anchor within direct view of a
        publicly accessible road (i.e. front yards).
      </small>
      <Form className="mt-3" onSubmit={(e) => e.preventDefault()}>
        <Form.Group className="mb-3">
          <InputGroup className="mb-3">
            <Button
              as="label"
              variant="secondary"
              className="d-flex align-items-center p-0 m-0 px-1"
              htmlFor="upload-augment-uri"
            >
              <Image src="upload.svg" alt="upload" width={24} />
            </Button>
            <Form.Control
              hidden
              type="file"
              id="upload-augment-uri"
              onChange={(e) => {
                e.persist();
                console.log(e);
              }}
            />
            <Form.Control
              type="text"
              required
              placeholder={`${augmentType} URI*`}
              className="bg-blue border-0 text-light"
              value={augmentArgs.contentURI}
              onChange={(e) =>
                setAugmentArgs({ ...augmentArgs, contentURI: e.target.value })
              }
            />
          </InputGroup>
          <Form.Control
            type="text"
            placeholder="Name"
            className="bg-blue border-0 text-light"
            value={augmentArgs.name}
            onChange={(e) =>
              setAugmentArgs({ ...augmentArgs, name: e.target.value })
            }
          />
        </Form.Group>
        <Form.Group className="d-flex gap-3 mb-3">
          <InputGroup>
            <Button
              variant={isLocationOn ? "secondary" : "info"}
              className="d-flex align-items-center p-0 m-0 px-1"
              onClick={() => setIsLocationOn(!isLocationOn)}
            >
              <Image
                src={isLocationOn ? "location-on.svg" : "location-off.svg"}
                alt="upload"
                width={24}
              />
            </Button>
            <Form.Control
              type="number"
              inputMode="numeric"
              placeholder="Lat (±°)"
              className="bg-blue border-0 text-light"
              pattern="-?[0-9]*"
              min={-90}
              max={90}
              value={augmentArgs.coords.lat}
              onChange={(e) =>
                setAugmentArgs({
                  ...augmentArgs,
                  coords: {
                    ...augmentArgs.coords,
                    lat: e.target.value,
                  },
                })
              }
            />
          </InputGroup>
          <Form.Control
            type="number"
            inputMode="numeric"
            placeholder="Lon (±°)"
            className="bg-blue border-0 text-light"
            pattern="-?[0-9]*"
            min={-180}
            max={180}
            value={augmentArgs.coords.lon}
            onChange={(e) =>
              setAugmentArgs({
                ...augmentArgs,
                coords: {
                  ...augmentArgs.coords,
                  lon: e.target.value,
                },
              })
            }
          />
        </Form.Group>
        <InputGroup className="mb-3">
          <Form.Control
            type="number"
            inputMode="numeric"
            placeholder="Altitude (m from the ground)"
            className="bg-blue border-0 text-light"
            pattern="[0-9]*"
            min={0}
            value={augmentArgs.altitude}
            onChange={(e) =>
              setAugmentArgs({
                ...augmentArgs,
                altitude: e.target.value,
              })
            }
          />
          {augmentArgs.altitude && (
            <InputGroup.Text className="bg-blue text-info border-0">
              m
            </InputGroup.Text>
          )}
        </InputGroup>
        <InputGroup className="mb-3">
          <Form.Control
            type="number"
            inputMode="numeric"
            placeholder="Orientation (N=0°, ↻)"
            className="bg-blue border-0 text-light"
            pattern="[0-9]*"
            min={0}
            max={360}
            value={augmentArgs.orientation}
            onChange={(e) =>
              setAugmentArgs({
                ...augmentArgs,
                orientation: e.target.value,
              })
            }
          />
          {augmentArgs.orientation && (
            <InputGroup.Text className="bg-blue text-info border-0">
              °
            </InputGroup.Text>
          )}
        </InputGroup>
        {augmentType === AugmentType.MODEL ? (
          <InputGroup className="mb-1">
            <Form.Control
              type="number"
              inputMode="numeric"
              placeholder="Display Scale (%)"
              className="bg-blue border-0 text-light"
              pattern="[0-9]*"
              min={0}
              value={augmentArgs.displayScale}
              onChange={(e) =>
                setAugmentArgs({
                  ...augmentArgs,
                  displayScale: e.target.value,
                })
              }
            />
            {augmentArgs.displayScale && (
              <InputGroup.Text className="bg-blue text-info border-0">
                %
              </InputGroup.Text>
            )}
          </InputGroup>
        ) : augmentType === AugmentType.IMAGE ||
          augmentType === AugmentType.VIDEO ? (
          <InputGroup className="mb-1">
            <Form.Control
              type="number"
              inputMode="numeric"
              placeholder="Display Width (m, height is scaled)"
              className="bg-blue border-0 text-light"
              pattern="[0-9]*"
              min={0}
              value={augmentArgs.displayWidth}
              onChange={(e) =>
                setAugmentArgs({
                  ...augmentArgs,
                  displayWidth: e.target.value,
                })
              }
            />
            {augmentArgs.displayWidth && (
              <InputGroup.Text className="bg-blue text-info border-0">
                m
              </InputGroup.Text>
            )}
          </InputGroup>
        ) : augmentType === AugmentType.AUDIO ? (
          <>
            <Form.Select
              className="bg-blue text-info mb-3"
              onChange={(e) => console.log(e.target.value)}
            >
              <option value="" hidden>
                Select Spatial Audio Type
              </option>
              <option value="1">One</option>
              <option value="2">Two</option>
              <option value="3">Three</option>
            </Form.Select>
            <InputGroup className="mb-1">
              <Form.Control
                type="number"
                inputMode="numeric"
                placeholder="Volume Adjustment (%)"
                className="bg-blue border-0 text-light"
                pattern="[0-9]*"
                min={0}
                value={augmentArgs.audioVolume}
                onChange={(e) =>
                  setAugmentArgs({
                    ...augmentArgs,
                    audioVolume: e.target.value,
                  })
                }
              />
              {augmentArgs.audioVolume && (
                <InputGroup.Text className="bg-blue text-info border-0">
                  %
                </InputGroup.Text>
              )}
            </InputGroup>
          </>
        ) : null}
        <small className="text-info mt-3">*Required field</small>
        <div className="d-flex justify-content-end gap-2 mt-1">
          <Button
            variant="danger"
            className="px-3"
            onClick={() => setShowForm(false)}
          >
            <Image src="close.svg" alt="cancel" width={30} />
          </Button>
          <Button variant="primary" type="submit" className="px-3">
            <Image src="confirm.svg" alt="confirm" width={30} />
          </Button>
        </div>
      </Form>
    </>
  );
}
