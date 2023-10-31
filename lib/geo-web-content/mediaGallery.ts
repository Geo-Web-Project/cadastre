import { useState, useEffect } from "react";
import { AssetId } from "caip";
import BN from "bn.js";
import { CeramicClient } from "@ceramicnetwork/http-client";
import { GeoWebContent } from "@geo-web/content";
import type { MediaGallery, MediaObject } from "@geo-web/types";
import { NETWORK_ID } from "../constants";

function useMediaGallery(
  geoWebContent: GeoWebContent,
  ceramic: CeramicClient,
  licenseContractAddress: string,
  parcelId: string
) {
  const [mediaGalleryItems, setMediaGalleryItems] = useState<
    MediaObject[] | null
  >(null);
  const [shouldMediaGalleryUpdate, setShouldMediaGalleryUpdate] =
    useState<boolean>(true);

  useEffect(() => {
    if (!parcelId || !shouldMediaGalleryUpdate || !ceramic.did) {
      return;
    }

    const ownerDID = ceramic.did.parent;

    const timerId = setInterval(async () => {
      try {
        const _mediaGalleryItems = [];
        const assetId = new AssetId({
          chainId: `eip155:${NETWORK_ID}`,
          assetName: {
            namespace: "erc721",
            reference: licenseContractAddress.toLowerCase(),
          },
          tokenId: new BN(parcelId.slice(2), "hex").toString(10),
        });

        const rootCid = await geoWebContent.raw.resolveRoot({
          ownerDID,
          parcelId: assetId,
        });
        const root = await geoWebContent.raw.get(rootCid, "/", {
          schema: "ParcelRoot",
        });

        if (root?.mediaGallery) {
          const mediaGalleryPath = await geoWebContent.raw.get(
            rootCid,
            "/mediaGallery",
            { schema: "MediaGallery" }
          );

          for (const i in mediaGalleryPath) {
            const mediaGalleryItem = await geoWebContent.raw.get(
              rootCid,
              `/mediaGallery/${i}`,
              {}
            );
            _mediaGalleryItems.push(mediaGalleryItem);
          }
        } else if (mediaGalleryItems === null) {
          const mediaGallery: MediaGallery = [];
          await geoWebContent.raw.putPath(
            rootCid,
            "/mediaGallery",
            mediaGallery,
            {
              parentSchema: "ParcelRoot",
              pin: true,
            }
          );

          setMediaGalleryItems([]);
          setShouldMediaGalleryUpdate(false);
          clearInterval(timerId);

          return;
        }

        if (
          JSON.stringify(_mediaGalleryItems) !==
          JSON.stringify(mediaGalleryItems)
        ) {
          setMediaGalleryItems(_mediaGalleryItems);
          setShouldMediaGalleryUpdate(false);
          clearInterval(timerId);
        }
      } catch (err) {
        setMediaGalleryItems(null);
        console.error(err);
        clearInterval(timerId);
      }
    }, 5000);

    return () => clearInterval(timerId);
  }, [parcelId, shouldMediaGalleryUpdate]);

  return {
    mediaGalleryItems,
    shouldMediaGalleryUpdate,
    setShouldMediaGalleryUpdate,
  };
}

export { useMediaGallery };
