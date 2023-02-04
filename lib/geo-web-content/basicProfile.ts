import { useState, useEffect } from "react";
import { AssetId, AccountId } from "caip";
import BN from "bn.js";
import { GeoWebContent } from "@geo-web/content";
import type { BasicProfile } from "@geo-web/types";
import { NETWORK_ID } from "../constants";

function useBasicProfile(
  geoWebContent: GeoWebContent | null,
  licenseContractAddress?: string,
  licenseOwner?: string,
  parcelId?: string
) {
  const [parcelContent, setParcelContent] = useState<BasicProfile | null>(null);
  const [rootCid, setRootCid] = useState<string | null>("");
  const [shouldParcelContentUpdate, setShouldParcelContentUpdate] =
    useState<boolean>(true);

  useEffect(() => {
    (async () => {
      try {
        if (
          !geoWebContent ||
          !licenseContractAddress ||
          !licenseOwner ||
          !parcelId ||
          !shouldParcelContentUpdate
        ) {
          return;
        }

        const assetId = new AssetId({
          chainId: `eip155:${NETWORK_ID}`,
          assetName: {
            namespace: "erc721",
            reference: licenseContractAddress.toLowerCase(),
          },
          tokenId: new BN(parcelId.slice(2), "hex").toString(10),
        });

        const ownerId = new AccountId({
          chainId: `eip155:${NETWORK_ID}`,
          address: licenseOwner,
        });
        const _parcelContent = await geoWebContent.raw.getPath(
          "/basicProfile",
          { parcelId: assetId, ownerId }
        );
        const _rootCid = await geoWebContent.raw.resolveRoot({
          parcelId: assetId,
          ownerId,
        });
        const root = await geoWebContent.raw.getPath("/", {
          parcelId: assetId,
          ownerId,
        });

        setParcelContent(_parcelContent);
        setRootCid(
          root?.basicProfile || root?.mediaGallery ? _rootCid.toString() : null
        );
        setShouldParcelContentUpdate(false);
      } catch (err) {
        setParcelContent({});
        setRootCid(null);
        setShouldParcelContentUpdate(false);
        console.error(err);
      }
    })();
  }, [
    geoWebContent,
    licenseContractAddress,
    licenseOwner,
    parcelId,
    shouldParcelContentUpdate,
  ]);

  return { parcelContent, rootCid, setRootCid, setShouldParcelContentUpdate };
}

export { useBasicProfile };
