import { useState, useEffect } from "react";
import { AssetId, AccountId } from "caip";
import BN from "bn.js";
import { GeoWebContent } from "@geo-web/content";
import type { BasicProfile } from "@geo-web/types";
import { NETWORK_ID } from "../constants";
import { ethers } from "ethers";

function useBasicProfile(
  geoWebContent: GeoWebContent | null,
  licenseContractAddress?: string,
  licenseOwner?: string,
  parcelId?: string
) {
  const [parcelContent, setParcelContent] = useState<BasicProfile | null>(null);
  const [rootCid, setRootCid] = useState<string | null>(null);
  const [shouldParcelContentUpdate, setShouldParcelContentUpdate] =
    useState<boolean>(true);

  useEffect(() => {
    if (
      !geoWebContent ||
      !licenseContractAddress ||
      !licenseOwner ||
      !parcelId ||
      !shouldParcelContentUpdate
    ) {
      return;
    }

    const prevParcelContent = parcelContent ? { ...parcelContent } : null;

    setParcelContent(null);
    setRootCid(null);

    const timerId = setInterval(async () => {
      try {
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
          address: ethers.utils.getAddress(licenseOwner),
        });
        const _rootCid = await geoWebContent.raw.resolveRoot({
          parcelId: assetId,
          ownerDID: `did:pkh:${ownerId}`,
        });
        const _parcelContent = await geoWebContent.raw.get(
          _rootCid,
          "/basicProfile",
          {
            schema: "BasicProfile",
          }
        );
        const root = await geoWebContent.raw.get(_rootCid, "/", {
          schema: "ParcelRoot",
        });

        if (
          JSON.stringify(_parcelContent) !== JSON.stringify(prevParcelContent)
        ) {
          setParcelContent(_parcelContent);
          setRootCid(
            root?.basicProfile || root?.mediaGallery ? _rootCid.toString() : ""
          );
          setShouldParcelContentUpdate(false);
          clearInterval(timerId);
        }
      } catch (err) {
        setParcelContent({});
        setRootCid("");
        setShouldParcelContentUpdate(false);
        clearInterval(timerId);
        console.error(err);
      }
    }, 5000);

    return () => clearInterval(timerId);
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
