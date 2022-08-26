import { useState, ReactElement } from "react";
import { useControl, Marker } from "react-map-gl";
import type { MarkerProps, ControlPosition } from "react-map-gl";
import MapboxGeocoder, { GeocoderOptions } from "@mapbox/mapbox-gl-geocoder";

type GeocoderProps = Omit<
  GeocoderOptions,
  "accessToken" | "mapboxgl" | "marker"
> & {
  mapboxAccessToken: string;
  marker?: boolean | Omit<MarkerProps, "longitude" | "latitude">;

  position: ControlPosition;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onLoading: (...args: any[]) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onResults: (...args: any[]) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onResult: (...args: any[]) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onError: (...args: any[]) => void;
};

function Geocoder(props: GeocoderProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [marker, setMarker] = useState<ReactElement<any, any> | null>(null);

  const geocoder = useControl<MapboxGeocoder>(
    () => {
      const ctrl = new MapboxGeocoder({
        ...props,
        marker: false,
        accessToken: props.mapboxAccessToken,
      });
      ctrl.on("loading", props.onLoading);
      ctrl.on("results", props.onResults);
      ctrl.on("result", (evt) => {
        props.onResult(evt);

        const { result } = evt;
        const location =
          result &&
          (result.center ||
            (result.geometry?.type === "Point" && result.geometry.coordinates));
        if (location && props.marker) {
          setMarker(
            <Marker
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              {...(props.marker as any)}
              longitude={location[0]}
              latitude={location[1]}
              color="#2fc1c1"
            />
          );
        } else {
          setMarker(null);
        }
      });
      ctrl.on("error", props.onError);
      return ctrl;
    },
    {
      position: props.position,
    }
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((geocoder as any)._map) {
    if (
      geocoder.getProximity() !== props.proximity &&
      props.proximity !== undefined
    ) {
      geocoder.setProximity(props.proximity);
    }
    if (
      geocoder.getRenderFunction() !== props.render &&
      props.render !== undefined
    ) {
      geocoder.setRenderFunction(props.render);
    }
    if (
      geocoder.getLanguage() !== props.language &&
      props.language !== undefined
    ) {
      geocoder.setLanguage(props.language);
    }
    if (geocoder.getZoom() !== props.zoom && props.zoom !== undefined) {
      geocoder.setZoom(props.zoom);
    }
    if (geocoder.getFlyTo() !== props.flyTo && props.flyTo !== undefined) {
      geocoder.setFlyTo(props.flyTo);
    }
    if (
      geocoder.getPlaceholder() !== props.placeholder &&
      props.placeholder !== undefined
    ) {
      geocoder.setPlaceholder(props.placeholder);
    }
    if (
      geocoder.getCountries() !== props.countries &&
      props.countries !== undefined
    ) {
      geocoder.setCountries(props.countries);
    }
    if (geocoder.getTypes() !== props.types && props.types !== undefined) {
      geocoder.setTypes(props.types);
    }
    if (
      geocoder.getMinLength() !== props.minLength &&
      props.minLength !== undefined
    ) {
      geocoder.setMinLength(props.minLength);
    }
    if (geocoder.getLimit() !== props.limit && props.limit !== undefined) {
      geocoder.setLimit(props.limit);
    }
    if (geocoder.getFilter() !== props.filter && props.filter !== undefined) {
      geocoder.setFilter(props.filter);
    }
    if (geocoder.getOrigin() !== props.origin && props.origin !== undefined) {
      geocoder.setOrigin(props.origin);
    }
  }
  return marker;
}

const noop = () => undefined;

Geocoder.defaultProps = {
  marker: true,
  onLoading: noop,
  onResults: noop,
  onResult: noop,
  onError: noop,
};

export default Geocoder;
