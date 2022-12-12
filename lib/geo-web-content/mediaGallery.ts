import { useState, useEffect } from "react";
import { AssetId, AccountId } from "caip";
import BN from "bn.js";
import { CeramicClient } from "@ceramicnetwork/http-client";
import { GeoWebContent } from "@geo-web/content";
import type { MediaObject } from "@geo-web/types";
import { NETWORK_ID } from "../constants";

function useMediaGallery(
  geoWebContent: GeoWebContent | null,
  ceramic: CeramicClient,
  licenseContractAddress: string,
  parcelId: string
) {
  const [mediaGalleryItems, setMediaGalleryItems] =
    useState<MediaObject[] | null>(null);
  const [shouldMediaGalleryUpdate, setShouldMediaGalleryUpdate] =
    useState<boolean>(true);

  useEffect(() => {
    (async () => {
      try {
        if (!ceramic || !geoWebContent || !shouldMediaGalleryUpdate) {
          return;
        }

        const _mediaGalleryItems = [];
        const assetId = new AssetId({
          chainId: `eip155:${NETWORK_ID}`,
          assetName: {
            namespace: "erc721",
            reference: licenseContractAddress.toLowerCase(),
          },
          tokenId: new BN(parcelId.slice(2), "hex").toString(10),
        });

        const ownerId = new AccountId(
          AccountId.parse(ceramic.did?.parent.split("did:pkh:")[1] ?? "")
        );
        const mediaGalleryPath = await geoWebContent.raw.getPath(
          "/mediaGallery",
          { parcelId: assetId, ownerId }
        );

        for (const i in mediaGalleryPath) {
          const mediaGalleryItem = await geoWebContent.raw.getPath(
            `/mediaGallery/${i}`,
            {
              parcelId: assetId,
              ownerId,
            }
          );
          _mediaGalleryItems.push(mediaGalleryItem);
        }

        setMediaGalleryItems(_mediaGalleryItems);
        setShouldMediaGalleryUpdate(false);
      } catch (err) {
        setMediaGalleryItems(null);
        console.error(err);
      }
    })();
  }, [geoWebContent, shouldMediaGalleryUpdate]);

  return { mediaGalleryItems, setShouldMediaGalleryUpdate };
}

export { useMediaGallery };
