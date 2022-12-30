import { useState, useEffect } from "react";
import { AssetId, AccountId } from "caip";
import BN from "bn.js";
import { CeramicClient } from "@ceramicnetwork/http-client";
import { GeoWebContent } from "@geo-web/content";
import type { MediaGallery, MediaObject } from "@geo-web/types";
import { NETWORK_ID } from "../constants";

function useMediaGallery(
  geoWebContent: GeoWebContent,
  ceramic: CeramicClient,
  licenseContractAddress: string,
  parcelId: string,
  setRootCid: React.Dispatch<React.SetStateAction<string | null>>
) {
  const [mediaGalleryItems, setMediaGalleryItems] =
    useState<MediaObject[] | null>(null);
  const [shouldMediaGalleryUpdate, setShouldMediaGalleryUpdate] =
    useState<boolean>(true);

  useEffect(() => {
    (async () => {
      try {
        if (!parcelId || !shouldMediaGalleryUpdate) {
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
        const root = await geoWebContent.raw.getPath("/", {
          parcelId: assetId,
          ownerId,
        });

        if (root?.mediaGallery) {
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
        } else {
          const mediaGallery: MediaGallery = [];
          const rootCid = await geoWebContent.raw.resolveRoot({
            ownerId,
            parcelId: assetId,
          });
          const newRoot = await geoWebContent.raw.putPath(
            rootCid,
            "/mediaGallery",
            mediaGallery,
            {
              parentSchema: "ParcelRoot",
              pin: true,
            }
          );

          await geoWebContent.raw.commit(newRoot, {
            ownerId,
            parcelId: assetId,
          });

          const newRootCid = await geoWebContent.raw.resolveRoot({
            ownerId,
            parcelId: assetId,
          });

          setMediaGalleryItems([]);
          setRootCid(newRootCid.toString());
        }

        setShouldMediaGalleryUpdate(false);
      } catch (err) {
        setMediaGalleryItems(null);
        console.error(err);
      }
    })();
  }, [parcelId, shouldMediaGalleryUpdate]);

  return { mediaGalleryItems, setShouldMediaGalleryUpdate };
}

export { useMediaGallery };
