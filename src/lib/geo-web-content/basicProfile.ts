import type { BasicProfile } from "@geo-web/types";
/* eslint-disable import/no-unresolved */
import { useMUD } from "@geo-web/mud-world-base-setup";
import { useComponentValue } from "@latticexyz/react";
import { singletonEntity } from "@latticexyz/store-sync/recs";
/* eslint-enable */

function useBasicProfile() {
  const {
    components: { Name, Url },
  } = useMUD();

  const name = useComponentValue(Name, singletonEntity);
  const url = useComponentValue(Url, singletonEntity);

  const parcelContent: BasicProfile = {
    name: name?.value as string,
    url: url?.value as string,
  };
  return parcelContent;
}

export { useBasicProfile };
