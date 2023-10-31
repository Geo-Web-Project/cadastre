import { useState, useEffect } from "react";
import { Contracts } from "@geo-web/sdk/dist/contract/types";
import { IPFS_GATEWAY } from "../constants";
import { ethers } from "ethers";

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
        const _basicProfile = await getBasicProfile(parcelId, {
          nocache: true,
        });
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

  const getBasicProfile = async (
    parcelId: string,
    opts?: { nocache?: boolean }
  ) => {
    let basicProfile: BasicProfile = {};

    try {
      const tokenURI = await registryContract.tokenURI(
        ethers.BigNumber.from(parcelId)
      );
      const basicProfileRes = await fetch(
        `${IPFS_GATEWAY}/ipfs/${tokenURI.slice(7)}`,
        {
          cache: opts?.nocache ? "no-cache" : "default",
        }
      );
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
