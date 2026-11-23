import {
  useState,
  useEffect,
  useRef,
  useCallback,
  type FocusEvent,
  type KeyboardEvent,
} from "react";
import { validateNorthAmericaCoords } from "../lib/time";
import {
  describePositionFailure,
  getCoordinateError,
  lookupIpLocation,
  LOCATION_PERMISSION_DENIED_MESSAGE,
  type CoordinateField,
} from "../lib/locationLookup";
import Icon from "./Icon";

interface LocationInputProps {
  onLocationChange: (lat: number, lon: number, name?: string) => void;
  /**
   * Reports whether the coordinates currently visible in the fields form a
   * valid North American location. A parent must not submit while false.
   */
  onValidityChange?: (valid: boolean) => void;
  initialLat?: number;
  initialLon?: number;
  initialName?: string;
  prefillToken?: number;
}

/** Delay before an error is announced, so it does not talk over the next field. */
const ERROR_ANNOUNCE_DELAY_MS = 500;

const ERROR_IDS: Record<CoordinateField, string> = {
  latitude: "latitude-error",
  longitude: "longitude-error",
};

const FIELD_LABELS: Record<CoordinateField, string> = {
  latitude: "Latitude",
  longitude: "Longitude",
};

const COMMON_LOCATIONS: Record<string, [number, number]> = {
  "moore, ok": [35.3383, -97.4867],
  "moore, oklahoma": [35.3383, -97.4867],
  "oklahoma city, ok": [35.4676, -97.5164],
  "oklahoma city, oklahoma": [35.4676, -97.5164],
  "new york, ny": [40.7128, -74.006],
  "new york, new york": [40.7128, -74.006],
  "los angeles, ca": [34.0522, -118.2437],
  "los angeles, california": [34.0522, -118.2437],
  "chicago, il": [41.8781, -87.6298],
  "chicago, illinois": [41.8781, -87.6298],
  "houston, tx": [29.7604, -95.3698],
  "houston, texas": [29.7604, -95.3698],
  "miami, fl": [25.7617, -80.1918],
  "miami, florida": [25.7617, -80.1918],
  "seattle, wa": [47.6062, -122.3321],
  "seattle, washington": [47.6062, -122.3321],
  "denver, co": [39.7392, -104.9903],
  "denver, colorado": [39.7392, -104.9903],
  "toronto, on": [43.6532, -79.3832],
  "toronto, ontario": [43.6532, -79.3832],
  "vancouver, bc": [49.2827, -123.1207],
  "vancouver, british columbia": [49.2827, -123.1207],
};

const COORDINATE_TEXT_PATTERN = /(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)/;

/** Coordinates typed into the search box, when they are a valid location. */
function parseCoordinateText(text: string): [number, number] | null {
  const match = text.match(COORDINATE_TEXT_PATTERN);
  if (!match) {
    return null;
  }
  const lat = parseFloat(match[1]);
  const lon = parseFloat(match[2]);
  return validateNorthAmericaCoords(lat, lon) ? [lat, lon] : null;
}

type PhotonResult =
  | { kind: "found"; lat: number; lon: number }
  | { kind: "outside" }
  | { kind: "none" };

/** Photon (Komoot) geocoding, bounded to North America. Sends only the query text. */
async function geocodeWithPhoton(query: string): Promise<PhotonResult> {
  try {
    const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(
      query
    )}&bbox=-180,14,-50,83&limit=1`;
    const response = await fetch(url);
    if (!response.ok) {
      return { kind: "none" };
    }
    const data = await response.json();
    const feature = data.features?.[0];
    if (!feature) {
      return { kind: "none" };
    }
    const [lon, lat] = feature.geometry.coordinates;
    return validateNorthAmericaCoords(lat, lon)
      ? { kind: "found", lat, lon }
      : { kind: "outside" };
  } catch {
    return { kind: "none" };
  }
}

/** Enter in a composing IME confirms a candidate; it must never submit. */
function isImeComposing(event: KeyboardEvent<HTMLInputElement>): boolean {
  // keyCode 229 covers Safari, which delivers compositionend before keydown.
  return event.nativeEvent.isComposing || event.keyCode === 229;
}

function notFoundMessage(query: string): string {
  return (
    `Location "${query}" not found. Try a common city format such as ` +
    `"Oklahoma City, OK", coordinates such as "35.3383, -97.4867", the ` +
    `coordinate fields below, or the "Use my location" button.`
  );
}

export default function LocationInput({
  onLocationChange,
  onValidityChange,
  initialLat = 40.7128,
  initialLon = -74.006,
  initialName = "",
  prefillToken = 0,
}: LocationInputProps) {
  const [lat, setLat] = useState(initialLat.toString());
  const [lon, setLon] = useState(initialLon.toString());
  const [locationName, setLocationName] = useState(initialName);
  const [touched, setTouched] = useState<Record<CoordinateField, boolean>>({
    latitude: false,
    longitude: false,
  });
  const [statusMessage, setStatusMessage] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [isGeolocating, setIsGeolocating] = useState(false);
  const announceTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const announcedRef = useRef(new Set<CoordinateField>());

  const errors: Record<CoordinateField, string> = {
    latitude: getCoordinateError("latitude", lat),
    longitude: getCoordinateError("longitude", lon),
  };
  const isValid = !errors.latitude && !errors.longitude;

  useEffect(() => {
    onValidityChange?.(isValid);
    if (isValid) {
      onLocationChange(Number(lat), Number(lon), locationName || undefined);
    }
  }, [isValid, lat, lon, locationName, onLocationChange, onValidityChange]);

  useEffect(() => {
    setLat(initialLat.toString());
    setLon(initialLon.toString());
    setLocationName(initialName);
  }, [initialLat, initialLon, initialName, prefillToken]);

  // A fixed field may be announced again if it later becomes invalid.
  useEffect(() => {
    for (const field of ["latitude", "longitude"] as const) {
      if (!errors[field]) {
        announcedRef.current.delete(field);
      }
    }
  });

  useEffect(() => () => clearTimeout(announceTimerRef.current), []);

  const applyCoordinates = useCallback(
    (nextLat: number, nextLon: number, nextName?: string) => {
      setLat(nextLat.toFixed(4));
      setLon(nextLon.toFixed(4));
      if (nextName !== undefined) {
        setLocationName(nextName);
      }
    },
    []
  );

  const handleCoordinateBlur = (event: FocusEvent<HTMLInputElement>) => {
    const field = event.currentTarget.name as CoordinateField;
    setTouched((previous) => ({ ...previous, [field]: true }));
    const error = getCoordinateError(field, event.currentTarget.value);
    if (!error || announcedRef.current.has(field)) {
      return;
    }
    announcedRef.current.add(field);
    clearTimeout(announceTimerRef.current);
    setAnnouncement("");
    announceTimerRef.current = setTimeout(
      () => setAnnouncement(`${FIELD_LABELS[field]}: ${error}`),
      ERROR_ANNOUNCE_DELAY_MS
    );
  };

  const handleGeocodeLocation = async () => {
    const query = locationName.trim();
    if (!query) return;

    setStatusMessage("");
    const typedCoordinates = parseCoordinateText(locationName);
    if (typedCoordinates) {
      applyCoordinates(typedCoordinates[0], typedCoordinates[1]);
      return;
    }

    setIsGeocoding(true);
    try {
      const photon = await geocodeWithPhoton(locationName);
      if (photon.kind === "found") {
        applyCoordinates(photon.lat, photon.lon);
        return;
      }
      if (photon.kind === "outside") {
        setStatusMessage("Location is outside North America.");
        return;
      }

      const common = COMMON_LOCATIONS[query.toLowerCase()];
      if (common) {
        applyCoordinates(common[0], common[1]);
        return;
      }

      setStatusMessage(notFoundMessage(locationName));
    } finally {
      setIsGeocoding(false);
    }
  };

  const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") {
      return;
    }
    event.preventDefault();
    if (isImeComposing(event)) {
      return;
    }
    void handleGeocodeLocation();
  };

  const handleGetCurrentLocation = () => {
    setStatusMessage("");
    if (!navigator.geolocation) {
      setStatusMessage("Geolocation is not supported by this browser.");
      return;
    }

    setIsGeolocating(true);

    const finish = (message = "") => {
      setStatusMessage(message);
      setIsGeolocating(false);
    };

    const handleSuccess = (position: GeolocationPosition) => {
      const { latitude, longitude } = position.coords;
      if (!validateNorthAmericaCoords(latitude, longitude)) {
        finish("Your current location is outside North America.");
        return;
      }
      applyCoordinates(latitude, longitude, "");
      finish();
    };

    // Approximate location from the IP address; disclosed next to the button.
    const tryIpLocation = async (failureMessage: string) => {
      const location = await lookupIpLocation();
      if (!location) {
        finish(failureMessage);
        return;
      }
      applyCoordinates(location.lat, location.lon, location.name);
      finish();
    };

    // Final attempt: accept any cached device location, then fall back to IP.
    const tryLastResort = () => {
      navigator.geolocation.getCurrentPosition(
        handleSuccess,
        (error) => void tryIpLocation(describePositionFailure(error)),
        { enableHighAccuracy: false, timeout: 1000, maximumAge: Infinity }
      );
    };

    // Second attempt: watchPosition, abandoned after five seconds.
    const tryWatchPosition = () => {
      let settled = false;
      let watchId: number | undefined;
      const settle = () => {
        settled = true;
        clearTimeout(fallbackTimer);
        if (watchId !== undefined) {
          navigator.geolocation.clearWatch(watchId);
        }
      };
      const fallbackTimer = setTimeout(() => {
        if (settled) return;
        settle();
        tryLastResort();
      }, 5000);
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          if (settled) return;
          settle();
          handleSuccess(position);
        },
        () => {
          if (settled) return;
          settle();
          tryLastResort();
        },
        { enableHighAccuracy: false, timeout: 2000, maximumAge: 3600000 }
      );
    };

    // First attempt: quick network location with cached data. A denial skips
    // straight to the IP fallback.
    navigator.geolocation.getCurrentPosition(
      handleSuccess,
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          void tryIpLocation(LOCATION_PERMISSION_DENIED_MESSAGE);
          return;
        }
        tryWatchPosition();
      },
      { enableHighAccuracy: false, timeout: 3000, maximumAge: 1800000 }
    );
  };

  const fieldProps = (field: CoordinateField) => {
    const showError = touched[field] && Boolean(errors[field]);
    return {
      showError,
      "aria-invalid": showError,
      "aria-describedby": showError ? ERROR_IDS[field] : undefined,
    };
  };
  const latitudeField = fieldProps("latitude");
  const longitudeField = fieldProps("longitude");

  return (
    <div className="location-input hero-panel__section">
      <h2 className="text-xl font-semibold mb-4 text-primary flex items-center gap-2">
        <Icon name="mapPin" />
        Location
      </h2>

      <div className="grid gap-4">
        {/* Location Name Search */}
        <div>
          <label
            htmlFor="location-name"
            className="block text-sm font-medium mb-2"
          >
            Search
          </label>
          <div className="flex gap-2">
            <input
              className="location-input__search-field input flex-1"
              id="location-name"
              type="text"
              placeholder="City, lake, or coordinates"
              aria-describedby="location-search-hint"
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              onKeyDown={handleSearchKeyDown}
            />
            <button
              className="location-input__search-button btn btn-primary"
              id="location-search-button"
              type="button"
              onClick={handleGeocodeLocation}
              disabled={!locationName.trim() || isGeocoding}
            >
              {isGeocoding ? (
                <span className="spinner"></span>
              ) : (
                <>
                  <Icon name="search" className="mr-2" />
                  Search
                </>
              )}
            </button>
          </div>
          <p className="text-xs text-muted mt-1" id="location-search-hint">
            Coordinates improve marine and local weather matching.
          </p>
        </div>

        {/* Manual Coordinates + Use my location */}
        <div className="location-row">
          <div>
            <label
              htmlFor="latitude"
              className="block text-sm font-medium mb-2"
            >
              Latitude (°N)
            </label>
            <input
              className="location-input__coordinate input"
              id="latitude"
              name="latitude"
              type="number"
              step="0.0001"
              min="14"
              max="83"
              placeholder="40.7128"
              value={lat}
              aria-invalid={latitudeField["aria-invalid"]}
              aria-describedby={latitudeField["aria-describedby"]}
              onChange={(e) => setLat(e.target.value)}
              onBlur={handleCoordinateBlur}
            />
          </div>
          <div>
            <label
              htmlFor="longitude"
              className="block text-sm font-medium mb-2"
            >
              Longitude (°W)
            </label>
            <input
              className="location-input__coordinate input"
              id="longitude"
              name="longitude"
              type="number"
              step="0.0001"
              min="-180"
              max="-50"
              placeholder="-74.0060"
              value={lon}
              aria-invalid={longitudeField["aria-invalid"]}
              aria-describedby={longitudeField["aria-describedby"]}
              onChange={(e) => setLon(e.target.value)}
              onBlur={handleCoordinateBlur}
            />
          </div>
          <button
            className="location-input__locate-button btn btn-primary"
            id="use-my-location-button"
            type="button"
            aria-describedby="location-privacy-notice"
            onClick={handleGetCurrentLocation}
            disabled={isGeolocating}
          >
            {isGeolocating ? (
              <>
                <span className="spinner"></span>
                Finding your location…
              </>
            ) : (
              <>
                <Icon name="locationTarget" className="mr-2" />
                Use my location
              </>
            )}
          </button>
        </div>

        {latitudeField.showError && (
          <p
            className="location-input__error text-sm text-error"
            id={ERROR_IDS.latitude}
          >
            <Icon name="warning" className="mr-2" />
            {errors.latitude}
          </p>
        )}
        {longitudeField.showError && (
          <p
            className="location-input__error text-sm text-error"
            id={ERROR_IDS.longitude}
          >
            <Icon name="warning" className="mr-2" />
            {errors.longitude}
          </p>
        )}

        <p
          className="location-input__privacy-notice text-xs text-muted"
          id="location-privacy-notice"
        >
          Use my location asks your browser for your device location. If you
          deny access or it is unavailable, your IP address is sent to a
          third-party lookup service (ipapi.co, then ip-api.com, then
          ipinfo.io) to estimate an approximate location.{" "}
          <a
            className="location-input__privacy-link"
            id="location-privacy-link"
            href="#/privacy"
          >
            Privacy Policy
          </a>
        </p>

        <p
          className="location-input__status text-sm text-secondary"
          id="location-status"
          role="status"
        >
          {statusMessage}
        </p>
        <div
          className="location-input__announcer sr-only"
          id="location-error-announcer"
          aria-live="polite"
        >
          {announcement}
        </div>
      </div>
    </div>
  );
}
