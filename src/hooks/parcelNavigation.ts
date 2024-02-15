import { gql, useQuery } from "@apollo/client";
import { LngLatLike } from "mapbox-gl";
import { useMap } from "react-map-gl";
import { DRAWER_PREVIEW_HEIGHT_PARCEL } from "../lib/constants";
import { useMediaQuery } from "./mediaQuery";

export interface GeoWebParcel {
  id: string;
  bboxE: string;
  bboxN: string;
  bboxS: string;
  bboxW: string;
}

export interface ParcelQuery {
  geoWebParcel?: GeoWebParcel;
}

const parcelQuery = gql`
  query GeoWebParcel($id: String) {
    geoWebParcel(id: $id) {
      id
      bboxE
      bboxN
      bboxS
      bboxW
    }
  }
`;

function useParcelNavigation(parcelId?: string) {
  const { data, refetch } = useQuery<ParcelQuery>(parcelQuery, {
    variables: {
      id: parcelId,
    },
    skip: !parcelId,
  });
  const { isMobile, isTablet } = useMediaQuery();
  const { default: map } = useMap();

  const getParcelCenter = (geoWebParcel: GeoWebParcel): [number, number] => {
    const { bboxE, bboxN, bboxS, bboxW } = geoWebParcel;

    return [
      (Number(bboxE) + Number(bboxW)) / 2,
      (Number(bboxN) + Number(bboxS)) / 2,
    ];
  };

  const getParcelCoords = (): [number, number] | null => {
    if (!data?.geoWebParcel) {
      return null;
    }

    return getParcelCenter(data.geoWebParcel);
  };

  const parcelIdToCoords = async (
    parcelId: string
  ): Promise<[number, number] | null> => {
    const res = await refetch({ id: parcelId });

    if (!res.data?.geoWebParcel) {
      return null;
    }

    return getParcelCenter(res.data.geoWebParcel);
  };

  const flyToParcel = ({
    center,
    duration,
  }: {
    center: LngLatLike;
    duration: number;
  }): void => {
    if (!map) {
      throw new Error("Map was not found");
    }

    const mapPadding = map.getPadding();
    const zoomLevel = isMobile || isTablet ? 16 : 17;

    map.flyTo({
      center,
      duration,
      zoom: zoomLevel,
      padding: {
        ...mapPadding,
        left: !isMobile && !isTablet ? document.body.offsetWidth * 0.25 : 0,
        bottom: isMobile || isTablet ? DRAWER_PREVIEW_HEIGHT_PARCEL : 0,
      },
    });
  };

  return { getParcelCoords, parcelIdToCoords, flyToParcel };
}

export { useParcelNavigation };
