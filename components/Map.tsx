import { gql, useQuery } from "@apollo/client";
import * as React from "react";
import { useRouter } from "next/router";
import { useEffect, useRef, useState } from "react";
import Col from "react-bootstrap/Col";
import ReactMapGL, {
  AttributionControl,
  NavigationControl,
} from "react-map-gl";
import type { ViewState, MapRef } from "react-map-gl";
import {
  MapLayerMouseEvent,
  MapLayerTouchEvent,
  LngLatBounds,
  LngLat,
} from "mapbox-gl";
import OffCanvasPanel from "./OffCanvasPanel";
import ClaimSource from "./sources/ClaimSource";
import CellHoverSource from "./sources/CellHoverSource";
import GridSource, { Grid } from "./sources/GridSource";
import Geocoder from "../lib/Geocoder";
import {
  DRAWER_PREVIEW_HEIGHT_PARCEL,
  DRAWER_CLAIM_HEIGHT,
} from "../lib/constants";
import ParcelSource, { parcelsToMultiPoly } from "./sources/ParcelSource";
import OpRewardAlert from "./OpRewardAlert";

import { Contracts } from "@geo-web/sdk/dist/contract/types";
import { GeoWebContent } from "@geo-web/content";

import Button from "react-bootstrap/Button";
import ButtonGroup from "react-bootstrap/ButtonGroup";
import Image from "react-bootstrap/Image";
import Alert from "react-bootstrap/Alert";

import { CeramicClient } from "@ceramicnetwork/http-client";
import "@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css";
import { ethers, BigNumber } from "ethers";
import "mapbox-gl/dist/mapbox-gl.css";

import { Client as W3Client } from "@web3-storage/w3up-client";
import { Framework, NativeAssetSuperToken } from "@superfluid-finance/sdk-core";
import firebase from "firebase/app";
import type { IPFS } from "ipfs-core-types";

import type { MultiPolygon, Polygon } from "@turf/turf";
import * as turf from "@turf/turf";

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import type { InvocationConfig } from "@web3-storage/upload-client";
import { SmartAccount } from "../pages/index";
import ParcelList from "./parcels/ParcelList";
import { useMediaQuery } from "../lib/mediaQuery";
import { useParcelNavigation } from "../lib/parcelNavigation";

export const GW_CELL_SIZE_LAT = 23;
export const GW_CELL_SIZE_LON = 24;
export const GW_MAX_LAT = (1 << (GW_CELL_SIZE_LAT - 1)) - 1;
export const GW_MAX_LON = (1 << (GW_CELL_SIZE_LON - 1)) - 1;
const ZOOM_QUERY_LEVEL = 8;
const QUERY_DIM = 0.025;

export enum STATE {
  VIEWING,
  CLAIM_SELECTING,
  CLAIM_SELECTED,
  PARCEL_SELECTED,
  PARCEL_EDITING_BID,
  PARCEL_PLACING_BID,
  PARCEL_ACCEPTING_BID,
  EDITING_METADATA,
  PUBLISHING,
  PARCEL_REJECTING_BID,
  PARCEL_RECLAIMING,
}

export type Coord = {
  x: number;
  y: number;
};

export type ParcelClaimInfo = {
  width: number;
  height: number;
};

export interface PolygonQuery {
  geoWebParcels: GeoWebParcel[];
}

export interface GeoWebParcel {
  id: string;
  createdAtBlock: number;
  bboxN: number;
  bboxS: number;
  bboxE: number;
  bboxW: number;
  coordinates: number[];
}

export interface GeoWebCoordinate {
  from_gps: (lon: number, lat: number, maxLat: number) => bigint;
  to_gps: (gwCoord: bigint, maxLat: number, maxLon: number) => number[][];
  get_x: (gwCoord: bigint) => number;
  get_y: (gwCoord: bigint) => number;
  make_gw_coord: (x: number, y: number) => bigint;
}

const query = gql`
  query Polygons(
    $lastBlock: BigInt
    $north: BigDecimal
    $south: BigDecimal
    $east: BigDecimal
    $west: BigDecimal
  ) {
    geoWebParcels(
      orderBy: createdAtBlock
      first: 1000
      where: {
        createdAtBlock_gt: $lastBlock
        bboxN_gt: $south
        bboxS_lt: $north
        bboxE_gt: $west
        bboxW_lt: $east
      }
    ) {
      id
      createdAtBlock
      bboxN
      bboxS
      bboxE
      bboxW
      coordinates
    }
  }
`;

export function coordToFeature(
  gwCoord: bigint,
  coords: number[][],
  gwCoordX: number,
  gwCoordY: number
): GeoJSON.Feature {
  return {
    type: "Feature",
    geometry: {
      type: "Polygon",
      coordinates: [coords],
    },
    properties: {
      gwCoord: gwCoord.toString(),
      gwCoordX: gwCoordX,
      gwCoordY: gwCoordY,
    },
  };
}

function normalizeQueryVariables(mapBounds: LngLatBounds) {
  return {
    north: mapBounds.getNorth(),
    south: mapBounds.getSouth(),
    east: mapBounds.getEast(),
    west: mapBounds.getWest(),
  };
}

export type MapProps = {
  registryContract: Contracts["registryDiamondContract"];
  selectedParcelId: string;
  setSelectedParcelId: React.Dispatch<React.SetStateAction<string>>;
  interactionState: STATE;
  setInteractionState: React.Dispatch<React.SetStateAction<STATE>>;
  account: string;
  authStatus: string;
  smartAccount: SmartAccount | null;
  setSmartAccount: React.Dispatch<React.SetStateAction<SmartAccount | null>>;
  signer: ethers.Signer | null;
  ceramic: CeramicClient;
  setCeramic: React.Dispatch<React.SetStateAction<CeramicClient | null>>;
  ipfs: IPFS;
  geoWebContent: GeoWebContent;
  w3Client: W3Client | null;
  setGeoWebContent: React.Dispatch<React.SetStateAction<GeoWebContent | null>>;
  w3InvocationConfig: InvocationConfig;
  setW3InvocationConfig: React.Dispatch<React.SetStateAction<InvocationConfig>>;
  geoWebCoordinate: GeoWebCoordinate;
  firebasePerf: firebase.performance.Performance;
  paymentToken: NativeAssetSuperToken;
  sfFramework: Framework;
  setPortfolioNeedActionCount: React.Dispatch<React.SetStateAction<number>>;
  shouldRefetchParcelsData: boolean;
  setShouldRefetchParcelsData: React.Dispatch<React.SetStateAction<boolean>>;
  auctionStart: BigNumber;
  auctionEnd: BigNumber;
  startingBid: BigNumber;
  endingBid: BigNumber;
  isFullScreen: boolean;
  setIsFullScreen: React.Dispatch<React.SetStateAction<boolean>>;
};

const MAP_STYLE_KEY = "storedMapStyleName";

enum MapStyleName {
  satellite = "satellite",
  street = "street",
}

const mapStyleUrlByName: Record<MapStyleName, string> = {
  [MapStyleName.satellite]: "mapbox://styles/mapbox/satellite-streets-v12",
  [MapStyleName.street]: "mapbox://styles/codynhat/ckrwf327s69zk17mrdkej5fln",
};

function Map(props: MapProps) {
  const {
    geoWebCoordinate,
    selectedParcelId,
    setSelectedParcelId,
    interactionState,
    setInteractionState,
    isFullScreen,
    setIsFullScreen,
  } = props;
  const { data, fetchMore, refetch } = useQuery<PolygonQuery>(query, {
    variables: {
      lastBlock: 0,
      north: 0,
      south: 0,
      east: 0,
      west: 0,
    },
  });

  const mapRef = useRef<MapRef>();

  const [mapStyleName, setMapStyleName] = React.useState(
    (localStorage.getItem(MAP_STYLE_KEY) as MapStyleName) ||
      MapStyleName.satellite
  );

  const handleMapstyle = (newStyle: MapStyleName) => {
    localStorage.setItem(MAP_STYLE_KEY, newStyle);
    setMapStyleName(newStyle);

    /*
     * NOTE: This is a workaround for a bug in mapbox-gl happening only when
     * the projection is "globe".
     * The circle layer is lost when the style change, but after zooming out
     * and then in the layer is rendered again.
     * We should be able to remove this if
     * https://github.com/visgl/react-map-gl/issues/2136 is fixed.
     */
    const zoom = viewport.zoom;
    mapRef?.current?.easeTo({
      center: [viewport.longitude, viewport.latitude],
      zoom: 1,
      duration: 500,
    });
    setTimeout(
      () =>
        mapRef?.current?.easeTo({
          center: [viewport.longitude, viewport.latitude],
          zoom,
          duration: 500,
        }),
      1000
    );
  };

  const mapPadding = {
    top: isFullScreen ? 0 : 120,
    bottom: 0,
    left: 0,
    right: 0,
  };

  const [viewport, setViewport] = useState<ViewState>({
    latitude: 40.780503,
    longitude: -73.96663,
    zoom: 1,
    bearing: 0,
    pitch: 0,
    padding: mapPadding,
  });
  const [shouldUpdateOnNextZoom, setShouldUpdateOnNextZoom] = useState(true);
  const [oldCoord, setOldCoord] = useState<LngLat | null>(null);
  const [grid, setGrid] = useState<Grid | null>(null);
  const [parcelHoverId, setParcelHoverId] = useState("");

  const [cellHoverCoord, setCellHoverCoord] = useState<Coord | null>(null);
  const [claimBase1Coord, setClaimBase1Coord] = useState<Coord | null>(null);
  const [claimBase2Coord, setClaimBase2Coord] = useState<Coord | null>(null);

  const [existingMultiPoly, setExistingMultiPoly] = useState<
    MultiPolygon | Polygon
  >(turf.multiPolygon([]).geometry);

  const [isValidClaim, setIsValidClaim] = React.useState(true);
  const [isParcelAvailable, setIsParcelAvailable] = React.useState(true);
  const [parcelClaimInfo, setParcelClaimInfo] = React.useState({
    width: 0,
    height: 0,
  });
  const [interactiveLayerIds, setInteractiveLayerIds] = React.useState<
    string[]
  >([]);
  const [invalidLicenseId, setInvalidLicenseId] = React.useState("");
  const [newParcel, setNewParcel] = React.useState<{
    id: string;
    timerId: number | null;
  }>({ id: "", timerId: null });
  const [showParcelList, setShowParcelList] = React.useState<boolean>(false);
  const [showSearchBar, setShowSearchBar] = useState<boolean>(false);

  const { isMobile, isTablet } = useMediaQuery();
  const router = useRouter();
  const { parcelIdToCoords, flyToParcel } = useParcelNavigation();

  const gridZoomLevel = isMobile ? 16 : 17;
  const isGridVisible =
    viewport.zoom >= gridZoomLevel &&
    (interactionState === STATE.VIEWING ||
      interactionState === STATE.CLAIM_SELECTING);

  // Fetch more until none left
  useEffect(() => {
    if (newParcel.id) {
      const lastParcel = data?.geoWebParcels[data.geoWebParcels?.length - 1];

      if (lastParcel?.id === newParcel.id) {
        clearInterval(newParcel.timerId ?? undefined);
        setNewParcel({ id: "", timerId: null });
        setClaimBase1Coord(null);
        setClaimBase2Coord(null);
        return;
      }

      if (!newParcel.timerId) {
        setNewParcel({
          ...newParcel,
          timerId: Number(setInterval(_fetchMoreParcels, 2000)),
        });
      }
    }

    _fetchMoreParcels();

    return () => {
      if (newParcel.timerId) {
        clearInterval(newParcel.timerId);
      }
    };
  }, [data, newParcel.id, fetchMore]);

  function updateGrid(
    lat: number,
    lon: number,
    oldGrid: Grid | null,
    setGrid: React.Dispatch<React.SetStateAction<Grid | null>>
  ) {
    const gwCoord = geoWebCoordinate.from_gps(lon, lat, GW_MAX_LAT);
    const x = geoWebCoordinate.get_x(gwCoord);
    const y = geoWebCoordinate.get_y(gwCoord);
    const gridDimLat = isMobile ? 100 : 140;
    const gridDimLon = isMobile ? 120 : 80;

    if (
      oldGrid != null &&
      Math.abs(oldGrid.center.x - x) < gridDimLat / 4 &&
      Math.abs(oldGrid.center.y - y) < gridDimLon / 4
    ) {
      return;
    }

    const features = [];
    for (let _x = x - gridDimLat; _x < x + gridDimLat; _x++) {
      for (let _y = y - gridDimLon; _y < y + gridDimLon; _y++) {
        const gwCoord = geoWebCoordinate.make_gw_coord(_x, _y);
        const coords = geoWebCoordinate.to_gps(gwCoord, GW_MAX_LAT, GW_MAX_LON);
        const gwCoordX = geoWebCoordinate.get_x(gwCoord);
        const gwCoordY = geoWebCoordinate.get_y(gwCoord);

        features.push(coordToFeature(gwCoord, coords, gwCoordX, gwCoordY));
      }
    }

    setGrid({
      center: {
        x: x,
        y: y,
      },
      features: features,
    });
  }

  function coordToPolygon(gwCoord: bigint): Polygon {
    const coords = geoWebCoordinate.to_gps(gwCoord, GW_MAX_LAT, GW_MAX_LON);
    return turf.polygon([[...coords, coords[0]]]).geometry;
  }

  function _fetchMoreParcels() {
    if (data == null || viewport == null || mapRef.current == null) {
      return;
    }

    let newLastBlock;

    if (data.geoWebParcels.length > 0) {
      newLastBlock =
        data.geoWebParcels[data.geoWebParcels.length - 1].createdAtBlock;
    } else if (newParcel.id) {
      newLastBlock = 0;
    } else {
      return;
    }

    const mapBounds = mapRef.current.getBounds();
    const params = normalizeQueryVariables(mapBounds);

    fetchMore({
      variables: {
        lastBlock: newLastBlock,
        ...params,
      },
    });
  }

  async function _onLoad() {
    if (mapRef.current == null) {
      return;
    }

    const { query } = router;

    if (process.env.NEXT_PUBLIC_APP_ENV === "testnet" && !query.id) {
      mapRef.current.easeTo({
        center: [viewport.longitude, viewport.latitude],
        zoom: 13,
        duration: 500,
      });
    }

    const mapBounds = mapRef.current.getBounds();
    const params = normalizeQueryVariables(mapBounds);

    const opts = {
      lastBlock: 0,
      ...params,
    };
    refetch(opts);

    setOldCoord(mapBounds.getCenter());
    setInteractiveLayerIds(["parcels-layer"]);

    if (query.id) {
      const parcelId = typeof query.id === "string" ? query.id : query.id[0];
      const coords = await parcelIdToCoords(parcelId);

      if (coords) {
        flyToParcel({
          center: coords,
          duration: 500,
        });

        setSelectedParcelId(parcelId);
        setInteractionState(STATE.PARCEL_SELECTED);
      }
    }
  }

  function _onMove(nextViewport: ViewState) {
    if (interactionState == STATE.PUBLISHING || mapRef.current == null) {
      return;
    }
    setViewport(nextViewport);

    const mapBounds = mapRef.current.getBounds();
    const params = normalizeQueryVariables(mapBounds);

    if (nextViewport.zoom >= ZOOM_QUERY_LEVEL && shouldUpdateOnNextZoom) {
      const opts = {
        lastBlock: 0,
        ...params,
      };
      refetch(opts);

      setShouldUpdateOnNextZoom(false);
    }

    if (nextViewport.zoom < ZOOM_QUERY_LEVEL) {
      setShouldUpdateOnNextZoom(true);
    }

    if (
      oldCoord &&
      nextViewport.zoom >= ZOOM_QUERY_LEVEL &&
      (Math.abs(mapBounds.getCenter().lng - oldCoord.lng) > QUERY_DIM ||
        Math.abs(mapBounds.getCenter().lat - oldCoord.lat) > QUERY_DIM)
    ) {
      const opts = {
        lastBlock: 0,
        ...params,
      };
      refetch(opts);

      setOldCoord(mapBounds.getCenter());
    }
  }

  function _onMoveEnd(viewState: ViewState) {
    if (viewState.zoom >= gridZoomLevel) {
      updateGrid(viewport.latitude, viewport.longitude, grid, setGrid);
      setInteractiveLayerIds(["parcels-layer", "grid-layer"]);
    } else if (interactionState === STATE.VIEWING) {
      setCellHoverCoord(null);
    }
  }

  function _onMouseMove(event: MapLayerMouseEvent) {
    if (event.features == null || viewport.zoom < 5) {
      return;
    }

    function _checkParcelHover(gwCoord: bigint) {
      const parcelFeature = event.features?.find(
        (f) => f.layer.id === "parcels-layer"
      );

      if (parcelFeature) {
        setParcelHoverId(parcelFeature.properties?.parcelId);

        return true;
      } else {
        if (!turf.intersect(existingMultiPoly, coordToPolygon(gwCoord))) {
          setParcelHoverId("");
        }

        return false;
      }
    }

    const gwCoord = geoWebCoordinate.from_gps(
      event.lngLat.lng,
      event.lngLat.lat,
      GW_MAX_LAT
    );

    switch (interactionState) {
      case STATE.VIEWING:
        if (_checkParcelHover(gwCoord)) {
          setCellHoverCoord(null);
        } else if (isGridVisible) {
          setCellHoverCoord({
            x: geoWebCoordinate.get_x(gwCoord),
            y: geoWebCoordinate.get_y(gwCoord),
          });
        }
        break;
      case STATE.PARCEL_SELECTED:
        _checkParcelHover(gwCoord);
        break;
      default:
        break;
    }
  }

  function _onMouseOut() {
    if (interactionState === STATE.VIEWING) {
      setCellHoverCoord(null);
    }
  }

  function _onClick(event: MapLayerMouseEvent) {
    if (viewport.zoom < 5) {
      return;
    }

    const parcelFeature = event.features?.find(
      (f) => f.layer.id === "parcels-layer"
    );

    function _checkParcelClick() {
      if (parcelFeature) {
        setSelectedParcelId(parcelFeature.properties?.parcelId);
        setInteractionState(STATE.PARCEL_SELECTED);
        return true;
      } else if (parcelHoverId) {
        setSelectedParcelId(parcelHoverId);
        setInteractionState(STATE.PARCEL_SELECTED);
        return true;
      } else {
        const gwCoord = geoWebCoordinate.from_gps(
          event.lngLat.lng,
          event.lngLat.lat,
          GW_MAX_LAT
        );

        if (turf.intersect(existingMultiPoly, coordToPolygon(gwCoord))) {
          return true;
        }
      }

      return false;
    }

    const sidebarPixelWidth = document.body.offsetWidth * 0.25;

    switch (interactionState) {
      case STATE.VIEWING:
        if (_checkParcelClick()) {
          if (parcelFeature?.geometry.type === "Polygon") {
            const parcelCoordSw = parcelFeature.geometry.coordinates[0][0];
            const parcelCoordSe = parcelFeature.geometry.coordinates[0][2];
            const parcelPointSe = mapRef.current?.project(
              new LngLat(parcelCoordSe[0], parcelCoordSe[1])
            );
            const parcelPointSw = mapRef.current?.project(
              new LngLat(parcelCoordSw[0], parcelCoordSw[1])
            );
            const parcelWidth =
              parcelPointSe && parcelPointSw
                ? parcelPointSe.x - parcelPointSw.x
                : 0;
            const parcelHeight =
              parcelPointSe && parcelPointSw
                ? parcelPointSe.y - parcelPointSw.y
                : 0;
            const shouldOffsetOffCanvasPanelWidth =
              !isMobile &&
              !isTablet &&
              parcelPointSw &&
              parcelPointSw.x < sidebarPixelWidth;
            const shouldOffsetOffCanvasPanelHeight =
              (isMobile || isTablet) &&
              parcelPointSw &&
              parcelPointSw.y >
                document.body.offsetHeight - DRAWER_PREVIEW_HEIGHT_PARCEL;

            mapRef.current?.panBy(
              [
                shouldOffsetOffCanvasPanelWidth
                  ? sidebarPixelWidth * -1 - parcelWidth + event.point.x
                  : 0,
                shouldOffsetOffCanvasPanelHeight
                  ? DRAWER_PREVIEW_HEIGHT_PARCEL -
                    parcelHeight +
                    event.point.y -
                    document.body.offsetHeight
                  : 0,
              ],
              {
                duration: 0,
              }
            );
          }

          return;
        }

        if (isGridVisible) {
          const gwCoord = geoWebCoordinate.from_gps(
            event.lngLat.lng,
            event.lngLat.lat,
            GW_MAX_LAT
          );
          const x = geoWebCoordinate.get_x(gwCoord);
          const y = geoWebCoordinate.get_y(gwCoord);
          const gwCoord2 = geoWebCoordinate.make_gw_coord(x + 5, y + 5);
          const coord1 = {
            x,
            y,
          };
          const coord2 = {
            x: geoWebCoordinate.get_x(gwCoord2),
            y: geoWebCoordinate.get_y(gwCoord2),
          };
          const cellCoords = geoWebCoordinate.to_gps(
            gwCoord,
            GW_MAX_LAT,
            GW_MAX_LON
          );
          const cellPointSw = mapRef.current?.project(
            new LngLat(cellCoords[0][0], cellCoords[0][1])
          );
          const cellPointSe = mapRef.current?.project(
            new LngLat(cellCoords[2][0], cellCoords[2][1])
          );
          const cellWidth =
            cellPointSe && cellPointSw ? cellPointSe.x - cellPointSw.x : 0;
          const cellHeight =
            cellPointSe && cellPointSw ? cellPointSw.y - cellPointSe.y : 0;
          const shouldOffsetOffCanvasPanelWidth =
            !isMobile &&
            !isTablet &&
            cellPointSw &&
            cellPointSw.x < sidebarPixelWidth;
          const shouldOffsetOffCanvasPanelHeight =
            (isMobile || isTablet) &&
            cellPointSw &&
            cellPointSw.y > document.body.offsetHeight - DRAWER_CLAIM_HEIGHT;

          setTimeout(
            () =>
              mapRef.current?.panBy(
                [
                  shouldOffsetOffCanvasPanelWidth
                    ? sidebarPixelWidth * -1 - cellWidth + event.point.x
                    : 0,
                  shouldOffsetOffCanvasPanelHeight
                    ? DRAWER_CLAIM_HEIGHT +
                      cellHeight +
                      event.point.y -
                      document.body.offsetHeight
                    : 0,
                ],
                {
                  duration:
                    shouldOffsetOffCanvasPanelWidth ||
                    shouldOffsetOffCanvasPanelHeight
                      ? 400
                      : 0,
                }
              ),
            100
          );

          setClaimBase1Coord(coord1);
          setClaimBase2Coord(coord2);
          setCellHoverCoord(null);
          setInteractionState(STATE.CLAIM_SELECTING);
        } else {
          mapRef.current?.easeTo({
            center: [event.lngLat.lng, event.lngLat.lat],
            zoom: gridZoomLevel,
            duration: 500,
          });
        }

        mapRef.current?.moveLayer("claim-point-layer");
        break;
      case STATE.CLAIM_SELECTED:
        setInteractionState(STATE.VIEWING);
        break;
      case STATE.PARCEL_SELECTED:
        if (_checkParcelClick()) {
          return;
        }
        break;
      case STATE.PARCEL_EDITING_BID:
      case STATE.PARCEL_RECLAIMING:
      case STATE.PARCEL_PLACING_BID:
      case STATE.PARCEL_REJECTING_BID:
        setInteractionState(STATE.VIEWING);
        break;
      default:
        break;
    }
  }

  function handleClaimSelection(e: MapLayerMouseEvent | MapLayerTouchEvent) {
    if (
      !mapRef?.current ||
      !claimBase1Coord ||
      !claimBase2Coord ||
      viewport.zoom < gridZoomLevel ||
      interactionState !== STATE.CLAIM_SELECTING
    ) {
      return;
    }

    const dragStartedGwCoord = geoWebCoordinate.from_gps(
      e.lngLat.lng,
      e.lngLat.lat,
      GW_MAX_LAT
    );
    const dragStartedX = geoWebCoordinate.get_x(dragStartedGwCoord);
    const dragStartedY = geoWebCoordinate.get_y(dragStartedGwCoord);

    const getClaimBaseCoordSw = (
      claimBase1Coord: Coord,
      claimBase2Coord: Coord
    ): Coord => {
      return {
        x: Math.min(claimBase1Coord.x, claimBase2Coord.x),
        y: Math.min(claimBase1Coord.y, claimBase2Coord.y),
      };
    };

    const getClaimBaseCoordNe = (
      claimBase1Coord: Coord,
      claimBase2Coord: Coord
    ): Coord => {
      return {
        x: Math.max(claimBase1Coord.x, claimBase2Coord.x),
        y: Math.max(claimBase1Coord.y, claimBase2Coord.y),
      };
    };

    const onDrag = (e: MapLayerMouseEvent | MapLayerTouchEvent) => {
      const gwCoord = geoWebCoordinate.from_gps(
        e.lngLat.lng,
        e.lngLat.lat,
        GW_MAX_LAT
      );
      const x = geoWebCoordinate.get_x(gwCoord);
      const y = geoWebCoordinate.get_y(gwCoord);
      const deltaX = dragStartedX - x;
      const deltaY = dragStartedY - y;

      if (deltaX !== 0 || deltaY !== 0) {
        const claimBaseCoordSw = getClaimBaseCoordSw(
          claimBase1Coord,
          claimBase2Coord
        );
        const claimBaseCoordNe = getClaimBaseCoordNe(
          claimBase1Coord,
          claimBase2Coord
        );

        if (resizePoint) {
          const claimBase1DeltaX =
            resizePoint === "SW" || resizePoint === "NW" ? deltaX : 0;
          const claimBase1DeltaY =
            resizePoint === "SW" || resizePoint === "SE" ? deltaY : 0;
          const claimBase2DeltaX =
            resizePoint === "NE" || resizePoint === "SE" ? deltaX : 0;
          const claimBase2DeltaY =
            resizePoint === "NE" || resizePoint === "NW" ? deltaY : 0;

          setClaimBase1Coord({
            x: claimBaseCoordSw.x - claimBase1DeltaX,
            y: claimBaseCoordSw.y - claimBase1DeltaY,
          });
          setClaimBase2Coord({
            x: claimBaseCoordNe.x - claimBase2DeltaX,
            y: claimBaseCoordNe.y - claimBase2DeltaY,
          });
        } else {
          setClaimBase1Coord({
            x: claimBaseCoordSw.x - deltaX,
            y: claimBaseCoordSw.y - deltaY,
          });
          setClaimBase2Coord({
            x: claimBaseCoordNe.x - deltaX,
            y: claimBaseCoordNe.y - deltaY,
          });
        }
      }
    };

    const resizePointFeatures = mapRef.current.queryRenderedFeatures(void 0, {
      layers: ["claim-point-layer"],
    });
    let resizePoint = "";

    if (!resizePointFeatures || resizePointFeatures.length === 0) {
      return;
    }

    for (const feature of resizePointFeatures) {
      if (feature?.geometry.type !== "Point") {
        break;
      }

      const featureCenter = mapRef.current.project(
        new LngLat(
          feature.geometry.coordinates[0],
          feature.geometry.coordinates[1]
        )
      );

      if (featureCenter) {
        const featureRadius = feature.layer.paint
          ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (feature.layer.paint as any)["circle-radius"]
          : 0;
        const tolerance = isMobile ? 4 : 0;
        const isInsideClaimPoint =
          e.point.x > featureCenter.x - featureRadius - tolerance &&
          e.point.x < featureCenter.x + featureRadius + tolerance &&
          e.point.y > featureCenter.y - featureRadius - tolerance &&
          e.point.y < featureCenter.y + featureRadius + tolerance;

        if (isInsideClaimPoint) {
          resizePoint = feature.properties?.direction;
          break;
        }
      }
    }

    const claimBaseCoordSw = getClaimBaseCoordSw(
      claimBase1Coord,
      claimBase2Coord
    );
    const claimBaseCoordNe = getClaimBaseCoordNe(
      claimBase1Coord,
      claimBase2Coord
    );
    const claimCoordSw = geoWebCoordinate.to_gps(
      geoWebCoordinate.make_gw_coord(claimBaseCoordSw.x, claimBaseCoordSw.y),
      GW_MAX_LAT,
      GW_MAX_LON
    );
    const claimCoordNe = geoWebCoordinate.to_gps(
      geoWebCoordinate.make_gw_coord(claimBaseCoordNe.x, claimBaseCoordNe.y),
      GW_MAX_LAT,
      GW_MAX_LON
    );
    const claimCornerSw = mapRef.current.project(
      new LngLat(claimCoordSw[0][0], claimCoordSw[0][1])
    );
    const claimCornerNe = mapRef.current.project(
      new LngLat(claimCoordNe[2][0], claimCoordNe[2][1])
    );
    const isInsideClaimSelection =
      claimCornerSw &&
      claimCornerNe &&
      e.point.x > claimCornerSw.x &&
      e.point.x < claimCornerNe.x &&
      e.point.y > claimCornerNe.y &&
      e.point.y < claimCornerSw.y;

    if (isInsideClaimSelection || resizePoint) {
      e.preventDefault();
      mapRef.current.on("mousemove", onDrag);
      mapRef.current.on("touchmove", onDrag);
      mapRef.current.once("mouseup", () =>
        mapRef.current?.off("mousemove", onDrag)
      );
      mapRef.current.once("touchend", () =>
        mapRef.current?.off("touchmove", onDrag)
      );
    }
  }

  useEffect(() => {
    switch (interactionState) {
      case STATE.VIEWING:
        setClaimBase1Coord(null);
        setClaimBase2Coord(null);
        setSelectedParcelId("");
        setParcelHoverId("");
        break;
      case STATE.PARCEL_SELECTED:
        setClaimBase1Coord(null);
        setClaimBase2Coord(null);
        setParcelHoverId(selectedParcelId);
        break;
      case STATE.CLAIM_SELECTING:
        setInteractiveLayerIds([
          "parcels-layer",
          "grid-layer",
          "claim-layer",
          "claim-point-layer",
        ]);
        break;
      default:
        if (isGridVisible) {
          setInteractiveLayerIds(["parcels-layer", "grid-layer"]);
        }
        break;
    }
  }, [interactionState]);

  useEffect(() => {
    if (data != null) {
      const _existingMultiPoly = parcelsToMultiPoly(data);
      setExistingMultiPoly(_existingMultiPoly);
    }

    const listener = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setInteractionState(STATE.VIEWING);
      }
    };
    window.addEventListener("keydown", listener);

    return () => {
      window.removeEventListener("keydown", listener);
    };
  }, [data]);

  useEffect(() => {
    if (!showSearchBar) {
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const onFocusOut = (e: any) => {
      const { relatedTarget } = e;

      if (
        relatedTarget instanceof HTMLElement &&
        relatedTarget.className.includes("parcel-list-btn")
      ) {
        setShowParcelList(true);
      }

      setTimeout(() => setShowSearchBar(false), 1000);
    };

    const searchInput: HTMLInputElement | null = document.querySelector(
      ".mapboxgl-ctrl-geocoder--input"
    );

    if (searchInput) {
      searchInput.focus();
      searchInput.addEventListener("focusout", onFocusOut);
    }

    return () => {
      if (searchInput) {
        searchInput.removeEventListener("onfocusout", onFocusOut);
      }
    };
  }, [showSearchBar]);

  return (
    <>
      <OpRewardAlert />
      {interactionState === STATE.CLAIM_SELECTING &&
        viewport.zoom < gridZoomLevel && (
          <Alert
            className="position-absolute top-50 start-50 text-center"
            variant="warning"
            style={{
              zIndex: 1,
              width: "256px",
              transform:
                isMobile || isTablet ? "translateX(-50%)" : "translateX(0)",
            }}
          >
            Zoom to Continue Your Claim
            <div className="d-none d-lg-block">
              <br />
              or
              <br />
              Hit Esc to Cancel
            </div>
          </Alert>
        )}
      {interactionState != STATE.VIEWING ? (
        <OffCanvasPanel
          {...props}
          interactionState={interactionState}
          setInteractionState={setInteractionState}
          claimBase1Coord={claimBase1Coord}
          claimBase2Coord={claimBase2Coord}
          selectedParcelId={selectedParcelId}
          setSelectedParcelId={setSelectedParcelId}
          setIsParcelAvailable={setIsParcelAvailable}
          parcelClaimInfo={parcelClaimInfo}
          invalidLicenseId={invalidLicenseId}
          setInvalidLicenseId={setInvalidLicenseId}
          setNewParcel={setNewParcel}
          isValidClaim={isValidClaim}
          delay={interactionState === STATE.CLAIM_SELECTING}
        ></OffCanvasPanel>
      ) : null}
      <Col sm={interactionState != STATE.VIEWING ? "9" : "12"} className="px-0">
        <ReactMapGL
          style={{
            width: "100vw",
            height: isMobile || isTablet ? "100svh" : "100vh",
          }}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ref={mapRef as any}
          {...viewport}
          attributionControl={false}
          mapboxAccessToken={process.env.NEXT_PUBLIC_REACT_APP_MAPBOX_TOKEN}
          mapStyle={mapStyleUrlByName[mapStyleName]}
          interactiveLayerIds={interactiveLayerIds}
          projection="globe"
          fog={{}}
          dragRotate={false}
          touchZoomRotate={true}
          onLoad={_onLoad}
          onMove={(e) => _onMove(e.viewState)}
          onMoveEnd={(e) => _onMoveEnd(e.viewState)}
          onMouseMove={_onMouseMove}
          onMouseOut={_onMouseOut}
          onMouseDown={handleClaimSelection}
          onTouchStart={handleClaimSelection}
          onClick={_onClick}
          dragPan={
            (!isMobile && !isTablet) ||
            interactionState === STATE.VIEWING ||
            interactionState === STATE.CLAIM_SELECTING ||
            interactionState === STATE.PARCEL_SELECTED
          }
        >
          <AttributionControl compact={false} />
          <GridSource grid={grid} isGridVisible={isGridVisible}></GridSource>
          <ParcelSource
            data={data ?? null}
            isAvailable={isParcelAvailable}
            parcelHoverId={parcelHoverId}
            selectedParcelId={selectedParcelId}
            invalidLicenseId={invalidLicenseId}
          ></ParcelSource>
          <CellHoverSource
            geoWebCoordinate={geoWebCoordinate}
            cellHoverCoord={cellHoverCoord}
          ></CellHoverSource>
          <ClaimSource
            geoWebCoordinate={geoWebCoordinate}
            existingMultiPoly={existingMultiPoly}
            claimBase1Coord={claimBase1Coord}
            claimBase2Coord={claimBase2Coord}
            isValidClaim={isValidClaim}
            setIsValidClaim={setIsValidClaim}
            setParcelClaimInfo={setParcelClaimInfo}
            interactionState={interactionState}
          ></ClaimSource>
          {!isMobile || showSearchBar ? (
            <Geocoder
              mapboxAccessToken={
                process.env.NEXT_PUBLIC_REACT_APP_MAPBOX_TOKEN ?? ""
              }
              position="top-right"
              hideSearchBar={() => setShowSearchBar(false)}
            />
          ) : (!isMobile && !isTablet) || !isFullScreen ? (
            <Button
              variant="light"
              className="search-map-btn"
              onClick={() => setShowSearchBar(true)}
            >
              <Image src="search.svg" alt="search" width={24} />
            </Button>
          ) : null}

          <NavigationControl
            position="bottom-right"
            showCompass={false}
            style={{
              bottom:
                (isMobile || isTablet) &&
                interactionState === STATE.CLAIM_SELECTING
                  ? `calc(90px + ${DRAWER_CLAIM_HEIGHT}px)`
                  : isMobile || isTablet
                  ? "123px"
                  : "119px",
              visibility:
                (isMobile || isTablet) &&
                interactionState !== STATE.VIEWING &&
                interactionState !== STATE.CLAIM_SELECTING
                  ? "hidden"
                  : "visible",
            }}
          />
        </ReactMapGL>
      </Col>
      <Button
        variant="dark"
        className="border border-secondary border-top-0 grid-switch"
        style={{
          position: "absolute",
          bottom:
            (isMobile || isTablet) && interactionState === STATE.CLAIM_SELECTING
              ? `calc(56px + ${DRAWER_CLAIM_HEIGHT}px)`
              : isMobile || isTablet
              ? "88px"
              : "90px",
          right: "2vw",
          zIndex: 1,
          width: isMobile || isTablet ? "38px" : "31px",
          height: isMobile || isTablet ? "36px" : "29px",
          borderRadius: "0 0 4px 4px",
          visibility:
            (isMobile || isTablet) &&
            interactionState !== STATE.VIEWING &&
            interactionState !== STATE.CLAIM_SELECTING
              ? "hidden"
              : "visible",
        }}
        onClick={() =>
          mapRef.current?.easeTo({
            center: [viewport.longitude, viewport.latitude],
            zoom: gridZoomLevel,
            duration: 500,
          })
        }
      >
        <Image
          alt="grid switch"
          src="grid-light.svg"
          width={30}
          className="position-absolute top-50 start-50 translate-middle"
        />
      </Button>
      <ButtonGroup
        className={isMobile || isTablet ? "px-0 justify-content-end" : ""}
        style={{
          position: "absolute",
          bottom:
            (isMobile || isTablet) && interactionState === STATE.CLAIM_SELECTING
              ? `${DRAWER_CLAIM_HEIGHT}px`
              : "4svh",
          right: "2%",
          width: "123px",
          borderRadius: 12,
          visibility:
            (isMobile || isTablet) &&
            interactionState !== STATE.VIEWING &&
            interactionState !== STATE.CLAIM_SELECTING
              ? "hidden"
              : "visible",
        }}
      >
        <Button
          className={isMobile || isTablet ? "map-style-btn" : ""}
          style={{
            backgroundColor: mapStyleName === "street" ? "#2fc1c1" : "#202333",
          }}
          variant="secondary"
          onClick={() => handleMapstyle(MapStyleName.street)}
        >
          <Image src={"street_ic.png"} width={isMobile || isTablet ? 28 : 30} />
        </Button>
        <Button
          className={isMobile || isTablet ? "map-style-btn" : ""}
          style={{
            backgroundColor:
              mapStyleName === "satellite" ? "#2fc1c1" : "#202333",
          }}
          variant="secondary"
          onClick={() => handleMapstyle(MapStyleName.satellite)}
        >
          <Image
            src={"satellite_ic.png"}
            width={isMobile || isTablet ? 28 : 30}
          />
        </Button>
      </ButtonGroup>
      {(!isMobile && !isTablet) || !isFullScreen ? (
        <Button
          variant="primary"
          className={`p-0 border-0 parcel-list-btn ${
            isMobile && !showSearchBar ? "mobile" : ""
          }`}
          onClick={() => setShowParcelList(true)}
        >
          <Image src="list.svg" alt="parcel list" width={38} />
        </Button>
      ) : null}
      <ParcelList
        showParcelList={showParcelList}
        handleCloseModal={() => setShowParcelList(false)}
        {...props}
      />
    </>
  );
}

export default Map;
