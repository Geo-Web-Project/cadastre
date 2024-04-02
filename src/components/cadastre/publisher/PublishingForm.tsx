import { useCallback, useEffect, useMemo, useState } from "react";
import Button from "react-bootstrap/Button";
import Image from "react-bootstrap/Image";
import Form from "react-bootstrap/Form";
import InputGroup from "react-bootstrap/InputGroup";
import Spinner from "react-bootstrap/Spinner";
import { AugmentType } from "./AugmentPublisher";
import Stack from "react-bootstrap/Stack";
import ApproveAugmentButton from "./actions/ApproveAugmentButton";
import { OffCanvasPanelProps } from "../OffCanvasPanel";
import AugmentPin from "../AugmentPin";
import TransactionError from "../cards/TransactionError";
import { getAugmentAddress } from "./AugmentPublisher";
import { encodeAbiParameters, stringToHex } from "viem";
import { useMUD } from "../../../context/MUD";
import { encodeValueArgs } from "@latticexyz/protocol-parser/internal";
import Geohash from "latlon-geohash";
import Quaternion from "quaternion";

type PublishingFormProps = {
  augmentType: AugmentType;
  setShowForm: React.Dispatch<React.SetStateAction<boolean>>;
  shouldMediaObjectsUpdate: boolean;
  setShouldMediaObjectsUpdate: React.Dispatch<React.SetStateAction<boolean>>;
} & OffCanvasPanelProps;

type AugmentArgs = {
  contentURI?: string;
  name?: string;
  coords: { lat?: number; lon?: number };
  altitude?: string;
  orientation?: string;
  displayScale?: string;
  displayWidth?: string;
  audioVolume?: string;
};

export default function PublishingForm(props: PublishingFormProps) {
  const {
    augmentType,
    setShowForm,
    signer,
    worldContract,
    selectedParcelId,
    w3Client,
    newAugmentCoords,
    setNewAugmentCoords,
    shouldMediaObjectsUpdate,
    setShouldMediaObjectsUpdate,
  } = props;

  const { tables } = useMUD();

  const [isUploading, setIsUploading] = useState(false);
  const [isAllowed, setIsAllowed] = useState(false);
  const [isActing, setIsActing] = useState(false);
  const [didFail, setDidFail] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [augmentArgs, setAugmentArgs] = useState<AugmentArgs>({
    contentURI: "",
    name: "",
    coords: {},
    altitude: "",
    orientation: "",
    displayScale: "",
    displayWidth: "",
    audioVolume: "",
  });

  const namespaceId = useMemo(() => {
    return stringToHex(Number(selectedParcelId).toString(), { size: 14 });
  }, [selectedParcelId]);

  const isReady =
    augmentArgs.contentURI &&
    augmentArgs.name &&
    augmentArgs.coords.lat &&
    augmentArgs.coords.lon &&
    augmentArgs.orientation &&
    augmentArgs.displayScale
      ? true
      : false;

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

  const installAugment = useCallback(async () => {
    setIsActing(true);
    setDidFail(false);

    if (!signer) {
      throw new Error("Could not find signer");
    }

    try {
      let modelComSchema: any = {};
      Object.keys(tables.ModelCom.schema).forEach((key) => {
        if (tables.ModelCom.key.includes(key)) {
          return;
        }
        modelComSchema[key] = tables.ModelCom.schema[key].type;
      });

      // TODO: Support GLB
      const modelCom = encodeValueArgs(modelComSchema, {
        encodingFormat: 1,
        contentURI: augmentArgs.contentURI ?? "",
      });

      let nameComSchema: any = {};
      Object.keys(tables.NameCom.schema).forEach((key) => {
        if (tables.NameCom.key.includes(key)) {
          return;
        }
        nameComSchema[key] = tables.NameCom.schema[key].type;
      });

      const nameCom = encodeValueArgs(nameComSchema, {
        value: augmentArgs.name ?? "",
      });

      let positionComSchema: any = {};
      Object.keys(tables.PositionCom.schema).forEach((key) => {
        if (tables.PositionCom.key.includes(key)) {
          return;
        }
        positionComSchema[key] = tables.PositionCom.schema[key].type;
      });

      const positionCom = encodeValueArgs(positionComSchema, {
        h: Number(augmentArgs.altitude),
        geohash: Geohash.encode(augmentArgs.coords.lat, augmentArgs.coords.lon),
      });

      let orientationComSchema: any = {};
      Object.keys(tables.OrientationCom.schema).forEach((key) => {
        if (tables.OrientationCom.key.includes(key)) {
          return;
        }
        orientationComSchema[key] = tables.OrientationCom.schema[key].type;
      });

      const q = Quaternion.fromAxisAngle(
        [0, 1, 0],
        Number(augmentArgs.orientation)
      );
      const orientationCom = encodeValueArgs(orientationComSchema, {
        x: Math.trunc(q.x * 1000),
        y: Math.trunc(q.y * 1000),
        z: Math.trunc(q.z * 1000),
        w: Math.trunc(q.w * 1000),
      });

      let scaleComSchema: any = {};
      Object.keys(tables.ScaleCom.schema).forEach((key) => {
        if (tables.ScaleCom.key.includes(key)) {
          return;
        }
        scaleComSchema[key] = tables.ScaleCom.schema[key].type;
      });

      const scaleCom = encodeValueArgs(scaleComSchema, {
        x: 10 * Number(augmentArgs.displayScale),
        y: 10 * Number(augmentArgs.displayScale),
        z: 10 * Number(augmentArgs.displayScale),
      });

      await worldContract.connect(signer).installAugment(
        getAugmentAddress(augmentType),
        namespaceId,
        encodeAbiParameters(
          [
            {
              name: "components",
              type: "tuple[][]",
              components: [
                { name: "staticData", type: "bytes" },
                { name: "encodedLengths", type: "bytes32" },
                { name: "dynamicData", type: "bytes" },
              ],
            },
          ],
          [[[modelCom, nameCom, positionCom, orientationCom, scaleCom]]]
        )
      );
    } catch (err) {
      /* eslint-disable @typescript-eslint/no-explicit-any */
      if (
        (err as any)?.code !== "TRANSACTION_REPLACED" ||
        (err as any).cancelled
      ) {
        console.error(err);
        setErrorMessage(
          (err as any).reason
            ? (err as any).reason.replace("execution reverted: ", "")
            : (err as Error).message
        );
        setDidFail(true);
        setIsActing(false);
        return;
      }
      /* eslint-enable @typescript-eslint/no-explicit-any */
    }

    setShouldMediaObjectsUpdate(true);
  }, [augmentArgs, tables, worldContract, signer]);

  useEffect(() => {
    if (isActing && !shouldMediaObjectsUpdate) {
      setIsActing(false);
      setShowForm(false);
    }
  }, [shouldMediaObjectsUpdate]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function captureFile(event: React.ChangeEvent<any>) {
    event.persist();
    event.stopPropagation();
    event.preventDefault();

    const file = event.target.files[0];

    if (!file || !w3Client) {
      return;
    }

    setIsUploading(true);

    // Upload to Web3 storage
    const added = await w3Client.uploadFile(file);

    setAugmentArgs((prev) => {
      return { ...prev, contentURI: `ipfs://${added.toString()}` };
    });

    setIsUploading(false);
  }

  useEffect(() => {
    setAugmentArgs({
      ...augmentArgs,
      coords: newAugmentCoords
        ? {
            lat: newAugmentCoords.lat,
            lon: newAugmentCoords.lng,
          }
        : {},
    });
  }, [newAugmentCoords]);

  const spinner = (
    <Spinner
      as="span"
      size="sm"
      animation="border"
      role="status"
      className="mx-2"
    >
      <span className="visually-hidden">Sending Transaction...</span>
    </Spinner>
  );

  return (
    <>
      {title}
      <small>
        Important: Geo-anchored augments rely on street mapping data for
        positioning. For best results, place your anchor within direct view of a
        publicly accessible road (i.e. front yards).
      </small>
      <Stack
        direction="vertical"
        gap={3}
        className="align-items-center my-3 px-3 py-4 text-center bg-blue border-0 rounded-3"
      >
        <AugmentPin fill="#CF3232" />
        Position your augment by clicking on the map
      </Stack>
      <Form className="mt-3" onSubmit={(e) => e.preventDefault()}>
        <Form.Group className="mb-3">
          <InputGroup className="mb-3">
            <Button
              as="label"
              variant="secondary"
              className="d-flex align-items-center p-0 m-0 px-1"
              htmlFor="upload-augment-uri"
              disabled={isUploading}
            >
              {!isUploading ? (
                <Image
                  src="upload.svg"
                  alt="upload"
                  width={24}
                  className="mx-1"
                />
              ) : (
                spinner
              )}
            </Button>
            <Form.Control
              hidden
              type="file"
              id="upload-augment-uri"
              disabled={isUploading}
              onChange={captureFile}
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
              variant={
                augmentArgs.coords.lat && augmentArgs.coords.lon
                  ? "secondary"
                  : "info"
              }
              className="d-flex justify-content-center p-0 m-0 px-1"
              style={{ width: 36 }}
              disabled={!augmentArgs.coords.lat || !augmentArgs.coords.lon}
              onClick={() => setNewAugmentCoords(null)}
            >
              <Image
                src={
                  augmentArgs.coords.lat && augmentArgs.coords.lon
                    ? "location-on.svg"
                    : "location-off.svg"
                }
                alt="upload"
                width={
                  augmentArgs.coords.lat && augmentArgs.coords.lon ? 20 : 24
                }
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
              disabled
              value={augmentArgs.coords.lat ?? ""}
              onChange={(e) =>
                setAugmentArgs({
                  ...augmentArgs,
                  coords: {
                    ...augmentArgs.coords,
                    lat: Number(e.target.value),
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
            disabled
            value={augmentArgs.coords.lon ?? ""}
            onChange={(e) =>
              setAugmentArgs({
                ...augmentArgs,
                coords: {
                  ...augmentArgs.coords,
                  lon: Number(e.target.value),
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
        <div className="justify-content-end gap-2 mt-1">
          <Button
            variant="danger"
            className="w-100 my-3"
            onClick={() => setShowForm(false)}
          >
            Cancel
          </Button>
          {isReady && (
            <ApproveAugmentButton
              {...props}
              isDisabled={!isReady}
              setErrorMessage={setErrorMessage}
              isActing={isActing}
              setIsActing={setIsActing}
              setDidFail={setDidFail}
              isAllowed={isAllowed}
              setIsAllowed={setIsAllowed}
            />
          )}
          <Button
            variant={!isAllowed ? "info" : "success"}
            className="w-100 mb-3"
            onClick={installAugment}
            disabled={!isAllowed || !isReady}
          >
            {isActing ? spinner : "Submit"}
          </Button>
          {didFail && !isActing ? (
            <TransactionError
              message={errorMessage}
              onClick={() => setDidFail(false)}
            />
          ) : null}
        </div>
      </Form>
    </>
  );
}
