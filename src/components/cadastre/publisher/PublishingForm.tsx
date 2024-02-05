import { useCallback, useEffect, useMemo, useState } from "react";
import Button from "react-bootstrap/Button";
import Image from "react-bootstrap/Image";
import Form from "react-bootstrap/Form";
import InputGroup from "react-bootstrap/InputGroup";
import { AugmentType } from "./AugmentPublisher";
import Stack from "react-bootstrap/Stack";
import { useMap } from "react-map-gl";
import ApproveAugmentButton from "./actions/ApproveAugmentButton";
import { OffCanvasPanelProps } from "../OffCanvasPanel";
import TransactionError from "../cards/TransactionError";
import { getAugmentAddress } from "./AugmentPublisher";
import { encodeAbiParameters, stringToHex } from "viem";
import { useMUD } from "../../../context/MUD";
import { encodeValueArgs } from "@latticexyz/protocol-parser";
import Geohash from "latlon-geohash";
import Quaternion from "quaternion";

type PublishingFormProps = {
  augmentType: AugmentType;
  setShowForm: React.Dispatch<React.SetStateAction<boolean>>;
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
  const { augmentType, setShowForm, signer, worldContract, selectedParcelId } =
    props;
  const { default: map } = useMap();

  const { tables } = useMUD();

  const [isAllowed, setIsAllowed] = useState(false);
  const [isActing, setIsActing] = useState(false);
  const [didFail, setDidFail] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [augmentArgs, setAugmentArgs] = useState<AugmentArgs>({
    contentURI: undefined,
    name: undefined,
    coords: {},
    altitude: undefined,
    orientation: undefined,
    displayScale: undefined,
    displayWidth: undefined,
    audioVolume: undefined,
  });

  const isLocationOn = false;

  const namespaceId = useMemo(() => {
    return stringToHex(Number(selectedParcelId).toString(), { size: 14 });
  }, [selectedParcelId]);

  const isReady =
    augmentArgs.contentURI !== undefined &&
    augmentArgs.name !== undefined &&
    augmentArgs.coords.lat !== undefined &&
    augmentArgs.coords.lon !== undefined &&
    augmentArgs.orientation !== undefined &&
    augmentArgs.displayScale !== undefined;

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
      Object.keys(tables.ModelCom.valueSchema).forEach((key) => {
        modelComSchema[key] = tables.ModelCom.valueSchema[key].type;
      });

      // TODO: Support GLB
      const modelCom = encodeValueArgs(modelComSchema, {
        encodingFormat: 1,
        contentURI: augmentArgs.contentURI ?? "",
      });

      let nameComSchema: any = {};
      Object.keys(tables.NameCom.valueSchema).forEach((key) => {
        nameComSchema[key] = tables.NameCom.valueSchema[key].type;
      });

      const nameCom = encodeValueArgs(nameComSchema, {
        value: augmentArgs.name ?? "",
      });

      let positionComSchema: any = {};
      Object.keys(tables.PositionCom.valueSchema).forEach((key) => {
        positionComSchema[key] = tables.PositionCom.valueSchema[key].type;
      });

      const positionCom = encodeValueArgs(positionComSchema, {
        h: Number(augmentArgs.altitude),
        geohash: Geohash.encode(augmentArgs.coords.lat, augmentArgs.coords.lon),
      });

      let orientationComSchema: any = {};
      Object.keys(tables.OrientationCom.valueSchema).forEach((key) => {
        orientationComSchema[key] = tables.OrientationCom.valueSchema[key].type;
      });

      const q = Quaternion.fromAxisAngle(
        [0, 1, 0],
        Number(augmentArgs.orientation)
      );
      const orientationCom = encodeValueArgs(orientationComSchema, {
        x: q.x,
        y: q.y,
        z: q.z,
        w: q.w,
      });

      let scaleComSchema: any = {};
      Object.keys(tables.ScaleCom.valueSchema).forEach((key) => {
        scaleComSchema[key] = tables.ScaleCom.valueSchema[key].type;
      });

      const scaleCom = encodeValueArgs(scaleComSchema, {
        x: 10 * Number(augmentArgs.displayScale),
        y: 10 * Number(augmentArgs.displayScale),
        z: 10 * Number(augmentArgs.displayScale),
      });

      const txn = await worldContract.connect(signer).installAugment(
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
      await txn.wait();
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

    setIsActing(false);
    setShowForm(false);
  }, [augmentArgs, tables, worldContract, signer]);

  useEffect(() => {
    map?.on(`click`, (ev) => {
      setAugmentArgs({
        ...augmentArgs,
        coords: {
          lat: ev.lngLat.lat,
          lon: ev.lngLat.lng,
        },
      });
    });
  }, [map]);

  return (
    <>
      {title}
      <small>
        Important: Geo-anchored augments rely on street mapping data for
        positioning. For best results, place your anchor within direct view of a
        publicly accessible road (i.e. front yards).
      </small>
      <Stack className="my-3 px-3 py-5 text-center bg-blue border-0 rounded">
        <Image
          src="markerAdd.svg"
          width={30}
          className="mb-3 mx-auto col-md-1"
        />
        <div>Position your augment by clicking on the map</div>
      </Stack>
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
              disabled
              // onClick={() => setIsLocationOn(!isLocationOn)}
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
            Submit
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
