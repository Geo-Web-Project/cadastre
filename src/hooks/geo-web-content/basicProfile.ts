import { useState, useEffect } from "react";
import { Contracts } from "@geo-web/sdk/dist/contract/types";
import { IPFS_GATEWAYS } from "../../lib/constants";
import { ethers } from "ethers";
import { createVerifiedFetch } from "@helia/verified-fetch";

export type BasicProfile = { name?: string; external_url?: string };

function useBasicProfile(
  registryContract: Contracts["registryDiamondContract"],
  parcelId?: string
) {
  const [basicProfile, setBasicProfile] = useState<BasicProfile | null>(null);
  const [shouldParcelContentUpdate, setShouldBasicProfileUpdate] =
    useState<boolean>(false);

  useEffect(() => {
    if (!parcelId) {
      return;
    }

    setBasicProfile(null);

    (async () => {
      try {
        const _basicProfile = await getBasicProfile(parcelId);

        setBasicProfile(_basicProfile);
      } catch (err) {
        setBasicProfile({});
        console.error(err);
      }
    })();
  }, [parcelId]);

  useEffect(() => {
    if (!parcelId || !shouldParcelContentUpdate) {
      return;
    }

    const prevParcelContent = { ...basicProfile };

    setBasicProfile(null);

    const timerId = setInterval(async () => {
      try {
        const _basicProfile = await getBasicProfile(parcelId);
        setBasicProfile(_basicProfile);

        if (
          JSON.stringify(_basicProfile) !== JSON.stringify(prevParcelContent)
        ) {
          setBasicProfile(_basicProfile);
          setShouldBasicProfileUpdate(false);
          clearInterval(timerId);
        }
      } catch (err) {
        setBasicProfile({});
        setShouldBasicProfileUpdate(false);
        clearInterval(timerId);
        console.error(err);
      }
    }, 5000);

    return () => clearInterval(timerId);
  }, [parcelId, shouldParcelContentUpdate]);

  const getBasicProfile = async (parcelId: string) => {
    let basicProfile: BasicProfile = {};

    try {
      const tokenURI = await registryContract.tokenURI(
        ethers.BigNumber.from(parcelId)
      );

      if (!tokenURI || !tokenURI.startsWith("ipfs://")) {
        return basicProfile;
      }

      const verifiedFetch = await createVerifiedFetch({
        gateways: IPFS_GATEWAYS,
      });
      const basicProfileRes = await verifiedFetch(tokenURI);

      basicProfile = await basicProfileRes.json();
    } catch (err) {
      console.warn(err);
    }

    return basicProfile;
  };

  return {
    basicProfile,
    setShouldBasicProfileUpdate,
    getBasicProfile,
  };
}

export { useBasicProfile };
