import { useState, useEffect } from "react";
import { useMUD } from "../../context/MUD";

export enum MediaObjectType {
  Model,
  Image,
  Audio,
  Video,
}

export enum MediaObjectEncodingFormat {
  Glb,
  Usdz,
  Gif,
  Jpeg,
  Png,
  Svg,
  Mpeg,
  Mp4,
  Mp3,
}

export type MediaObject = {
  mediaType: MediaObjectType;
  contentURI: string;
  name: string;
  encodingFormat: MediaObjectEncodingFormat;
  position: { h: number; geohash: string };
  orientation: { x: number; y: number; z: number; w: number };
  contentSize: { x: number; y: number; z: number };
};

export type Augments = { anchored: MediaObject[]; unanchored: MediaObject[] };

function useWorld() {
  const [mediaObjects, setMediaObjects] = useState<Augments>({
    anchored: [],
    unanchored: [],
  });
  const [shouldMediaObjectsUpdate, setShouldMediaObjectsUpdate] =
    useState<boolean>(true);

  const { tables, useStore, stopSync } = useMUD();

  const modelComponents = useStore((state: any) =>
    Object.values(state.getRecords(tables.ModelCom))
  );
  // const imageComponents = useStore((state: any) =>
  //   Object.values(state.getRecords(tables.ImageCom))
  // );

  useEffect(() => {
    const mediaObjects: Augments = { anchored: [], unanchored: [] };

    for (const modelComponent of modelComponents) {
      const mediaObject = buildMediaObject(
        MediaObjectType.Model,
        modelComponent
      );

      if (mediaObject.position) {
        mediaObjects.anchored.push(mediaObject);
      } else {
        mediaObjects.unanchored.push(mediaObject);
      }
    }

    // for (const imageComponent of imageComponents) {
    //   const mediaObject = buildMediaObject(
    //     MediaObjectType.Image,
    //     imageComponent
    //   );
    //   mediaObjects.push(mediaObject);
    // }

    setMediaObjects(mediaObjects);
    setShouldMediaObjectsUpdate(false);
  }, [modelComponents.length]);

  const getValue = (table: string, key: { key: string }) =>
    useStore.getState().getValue(tables[table], key);

  const buildMediaObject = (
    mediaObjectType: MediaObjectType,
    component: any
  ) => {
    return {
      mediaType: mediaObjectType,
      contentURI: component.value.contentURI,
      name: getValue("NameCom", component.key).value,
      encodingFormat: component.value.encodingFormat,
      position: getValue("PositionCom", component.key),
      orientation: getValue("OrientationCom", component.key),
      contentSize: getValue("ScaleCom", component.key),
    };
  };

  return {
    mediaObjects,
    shouldMediaObjectsUpdate,
    setShouldMediaObjectsUpdate,
    stopSync,
  };
}

export { useWorld };
