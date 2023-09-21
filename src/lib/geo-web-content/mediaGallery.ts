import { useState, useEffect } from "react";
import { useMUD } from "@geo-web/mud-world-base-setup";
import { useEntityQuery } from "@latticexyz/react";
import { Has, getComponentValue } from "@latticexyz/recs";
import { CID } from "multiformats";
import contentHash from "@ensdomains/content-hash";
import { MediaGalleryItem } from "../../components/gallery/GalleryForm";

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

function useMediaGallery() {
  const {
    components: { MediaObject },
  } = useMUD();

  const mediaObjectIds = useEntityQuery([Has(MediaObject)]);

  const [mediaGalleryItems, setMediaGalleryItems] = useState<
    MediaGalleryItem[] | null
  >(null);

  useEffect(() => {
    const items = mediaObjectIds
      .map((id) => {
        const mediaObject = getComponentValue(MediaObject, id);

        if (mediaObject === undefined) return undefined;

        const contentCid = CID.parse(
          contentHash.decode(mediaObject.contentHash as string)
        ).toV1();

        const encodingFormat =
          mediaObject.encodingFormat as MediaObjectEncodingFormat;
        let encoding;
        if (encodingFormat === MediaObjectEncodingFormat.Glb) {
          encoding = "Glb";
        } else if (encodingFormat === MediaObjectEncodingFormat.Usdz) {
          encoding = "Usdz";
        } else if (encodingFormat === MediaObjectEncodingFormat.Gif) {
          encoding = "Gif";
        } else if (encodingFormat === MediaObjectEncodingFormat.Jpeg) {
          encoding = "Jpeg";
        } else if (encodingFormat === MediaObjectEncodingFormat.Png) {
          encoding = "Png";
        } else if (encodingFormat === MediaObjectEncodingFormat.Svg) {
          encoding = "Svg";
        } else if (encodingFormat === MediaObjectEncodingFormat.Mpeg) {
          encoding = "Mpeg";
        } else if (encodingFormat === MediaObjectEncodingFormat.Mp4) {
          encoding = "Mp4";
        } else if (encodingFormat === MediaObjectEncodingFormat.Mp3) {
          encoding = "Mp3";
        }

        return {
          name: mediaObject.name,
          content: contentCid.toString(),
          contentSize: mediaObject.contentSize,
          encodingFormat: encoding,
        } as MediaGalleryItem;
      })
      .filter((v) => v !== undefined)
      .map((v) => v as MediaGalleryItem);

    setMediaGalleryItems(items);
  }, [mediaObjectIds]);

  return mediaGalleryItems;
}

export { useMediaGallery };
