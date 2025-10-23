import { FormEvent, useState, useEffect, useCallback } from "react";
import WeatherOutlookPanel from "../components/WeatherOutlookPanel";
import { validateNorthAmericaCoords } from "../lib/time";

const DEFAULT_LAT = 40.7128;
const DEFAULT_LON = -74.006;

export default function Wx() {
  const [locationInput, setLocationInput] = useState(
    `${DEFAULT_LAT.toFixed(4)}, ${DEFAULT_LON.toFixed(4)}`
  );
  const [lat, setLat] = useState(DEFAULT_LAT);
  const [lon, setLon] = useState(DEFAULT_LON);
  const [inputError, setInputError] = useState<string | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  const formatCoords = useCallback(
    (latitude: number, longitude: number) =>
      `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
    []
  );

  const updateCoordinates = useCallback(
    (latitude: number, longitude: number) => {
      setLat(latitude);
      setLon(longitude);
      setLocationInput(formatCoords(latitude, longitude));
    },
    [formatCoords]
  );

  const applyCoordinates = useCallback(
    (latitude: number, longitude: number) => {
      if (!validateNorthAmericaCoords(latitude, longitude)) {
        setInputError(
          "Coordinates must be within North America (Lat 14°-83°N, Lon -180° to -50°W)."
        );
        return false;
      }

      updateCoordinates(latitude, longitude);
      setInputError(null);
      return true;
    },
    [updateCoordinates]
  );

  const tryIpLocation = useCallback(
    async (): Promise<boolean> => {
      const services = [
        "https://ipapi.co/json/",
        "https://ip-api.com/json/",
        "https://ipinfo.io/json",
      ];

      for (const service of services) {
        try {
          const response = await fetch(service);
          if (!response.ok) continue;

          const data = await response.json();
          let latitude: number | null = null;
          let longitude: number | null = null;

          if (service.includes("ipapi.co")) {
            latitude = parseFloat(data.latitude);
            longitude = parseFloat(data.longitude);
          } else if (service.includes("ip-api.com")) {
            latitude = parseFloat(data.lat);
            longitude = parseFloat(data.lon);
          } else if (service.includes("ipinfo.io")) {
            const [latStr, lonStr] = (data.loc || "").split(",");
            latitude = parseFloat(latStr);
            longitude = parseFloat(lonStr);
          }

          if (
            latitude !== null &&
            longitude !== null &&
            !Number.isNaN(latitude) &&
            !Number.isNaN(longitude) &&
            validateNorthAmericaCoords(latitude, longitude)
          ) {
            updateCoordinates(latitude, longitude);
            setInputError(null);
            setIsGettingLocation(false);
            return true;
          }
        } catch (error) {
          console.warn(`IP service ${service} failed:`, error);
        }
      }

      return false;
    },
    [updateCoordinates]
  );

  const attemptSmartLocation = useCallback(
    (silent = false) => {
      if (!("geolocation" in navigator)) {
        if (!silent) {
          setInputError("Geolocation not supported by this browser.");
        }
        setIsGettingLocation(false);
        updateCoordinates(DEFAULT_LAT, DEFAULT_LON);
        return;
      }

      if (!silent) {
        setIsGettingLocation(true);
      } else {
        setIsGettingLocation(false);
      }

      const finalizeError = (message: string) => {
        if (!silent) {
          setInputError(message);
        }
        setIsGettingLocation(false);
        if (silent) {
          updateCoordinates(DEFAULT_LAT, DEFAULT_LON);
        }
      };

      const handleSuccess = (position: GeolocationPosition) => {
        const { latitude, longitude } = position.coords;
        if (validateNorthAmericaCoords(latitude, longitude)) {
          updateCoordinates(latitude, longitude);
          setInputError(null);
          setIsGettingLocation(false);
        } else {
          finalizeError(
            "Current location is outside North America. Enter coordinates manually."
          );
        }
      };

      const handlePermissionDenied = () => {
        tryIpLocation()
          .then((success) => {
            if (!success) {
              finalizeError(
                "Location permission denied and IP lookup failed. Enter coordinates manually."
              );
            }
          })
          .catch(() => {
            finalizeError(
              "Location permission denied and IP lookup failed. Enter coordinates manually."
            );
          });
      };

      const tryLastResort = () => {
        navigator.geolocation.getCurrentPosition(
          handleSuccess,
          (error) => {
            console.error("All geolocation attempts failed:", error);

            if (error.code === error.PERMISSION_DENIED) {
              handlePermissionDenied();
              return;
            }

            let message = "Unable to get your location. ";
            switch (error.code) {
              case error.POSITION_UNAVAILABLE:
                message +=
                  "Location services are unavailable. Trying alternate method...";
                break;
              case error.TIMEOUT:
                message +=
                  "Location services timed out. Trying alternate method...";
                break;
              default:
                message += "Trying alternate method...";
                break;
            }

            tryIpLocation()
              .then((success) => {
                if (!success) {
                  finalizeError(
                    message.replace(
                      "Trying alternate method...",
                      "Please enter coordinates manually."
                    )
                  );
                }
              })
              .catch(() => {
                finalizeError(
                  message.replace(
                    "Trying alternate method...",
                    "Please enter coordinates manually."
                  )
                );
              });
          },
          {
            enableHighAccuracy: false,
            timeout: 1000,
            maximumAge: Infinity,
          }
        );
      };

      const tryWatchPosition = () => {
        let watchId: number;
        let hasResolved = false;

        const fallbackTimer = setTimeout(() => {
          if (!hasResolved) {
            navigator.geolocation.clearWatch(watchId);
            tryLastResort();
          }
        }, 5000);

        watchId = navigator.geolocation.watchPosition(
          (position) => {
            if (!hasResolved) {
              hasResolved = true;
              clearTimeout(fallbackTimer);
              navigator.geolocation.clearWatch(watchId);
              handleSuccess(position);
            }
          },
          (error) => {
            if (!hasResolved) {
              hasResolved = true;
              clearTimeout(fallbackTimer);
              navigator.geolocation.clearWatch(watchId);
              if (error.code === error.PERMISSION_DENIED) {
                handlePermissionDenied();
              } else {
                tryLastResort();
              }
            }
          },
          {
            enableHighAccuracy: false,
            timeout: 2000,
            maximumAge: 3600000,
          }
        );
      };

      const tryQuickLocation = () => {
        navigator.geolocation.getCurrentPosition(
          handleSuccess,
          (error) => {
            if (error.code === error.PERMISSION_DENIED) {
              handlePermissionDenied();
              return;
            }
            tryWatchPosition();
          },
          {
            enableHighAccuracy: false,
            timeout: 3000,
            maximumAge: 1800000,
          }
        );
      };

      tryQuickLocation();
    },
    [tryIpLocation, updateCoordinates]
  );

  // Auto-detect user location on page load (non-intrusive)
  useEffect(() => {
    attemptSmartLocation(true);
  }, [attemptSmartLocation]);

  const parseLocationInput = (input: string) => {
    // Try to parse coordinates from various formats
    const coordRegex = /(-?\d+\.?\d*)[,\s]+(-?\d+\.?\d*)/;
    const match = input.match(coordRegex);

    if (match) {
      const parsedLat = Number.parseFloat(match[1]);
      const parsedLon = Number.parseFloat(match[2]);

      if (
        Number.isFinite(parsedLat) &&
        Number.isFinite(parsedLon) &&
        validateNorthAmericaCoords(parsedLat, parsedLon)
      ) {
        return { lat: parsedLat, lon: parsedLon };
      }
    }
    return null;
  };

  const handleLocationSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const coords = parseLocationInput(locationInput);
    if (!coords) {
      setInputError(
        "Enter valid North American coordinates (e.g., 40.7128, -74.0060)."
      );
      return;
    }

    applyCoordinates(coords.lat, coords.lon);
  };

  const handleUseCurrentLocation = () => {
    setInputError(null);
    attemptSmartLocation(false);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8" id="wx-page">
      <div className="text-center mb-8" id="wx-intro">
        <h1 className="text-2xl font-bold text-gray-900 mb-4" id="wx-title">
          WX Intel Hub
        </h1>
        <p className="text-lg text-gray-600" id="wx-subtitle">
          Critical weather resources for situational awareness and field
          preparedness
        </p>
      </div>

      <div className="card p-6 mb-8" id="wx-location-card">
        <form
          className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-3"
          id="wx-location-form"
          onSubmit={handleLocationSubmit}
        >
          <div className="flex-1" id="wx-location-input-field">
            <input
              className="input w-full"
              id="wx-location-input"
              type="text"
              placeholder="Enter coordinates (e.g., 40.7128, -74.0060)"
              value={locationInput}
              onChange={(event) => setLocationInput(event.target.value)}
            />
          </div>

          <div className="flex gap-2" id="wx-location-actions">
            <button
              type="button"
              className="btn btn-secondary"
              id="wx-location-gps"
              onClick={handleUseCurrentLocation}
              disabled={isGettingLocation}
              title="Use your current location (requires browser permission)"
            >
              {isGettingLocation ? "📍..." : "📍 GPS"}
            </button>
            <button
              className="btn btn-primary"
              id="wx-location-apply"
              type="submit"
            >
              Get Forecast
            </button>
          </div>
        </form>

        <div
          className="mt-2 text-xs text-muted text-center"
          id="wx-location-help"
        >
          📍 GPS requires location permission • Format: latitude, longitude
        </div>

        {inputError && (
          <p
            className="mt-3 text-sm text-error text-center"
            id="wx-location-error"
          >
            {inputError}
          </p>
        )}
      </div>

      <WeatherOutlookPanel lat={lat} lon={lon} />

      <div className="grid gap-8" id="wx-sections">
        <div className="card p-6" id="wx-public-resources">
          <h2 className="text-xl font-semibold mb-4" id="wx-public-heading">
            Public Weather Resources
          </h2>
          <p
            className="text-gray-600 leading-relaxed mb-4"
            id="wx-public-intro"
          >
            Trusted sources for official forecasts, radar, and warnings across
            North America.
          </p>
          <ul className="text-sm text-gray-600 space-y-3" id="wx-public-list">
            <li className="leading-relaxed" id="wx-public-item-noaa">
              <a
                className="text-info font-medium"
                id="wx-link-noaa"
                href="https://www.weather.gov/"
                target="_blank"
                rel="noreferrer"
              >
                NOAA / National Weather Service
              </a>{" "}
              – National forecasts, radar loops, and local office briefings.
            </li>
            <li className="leading-relaxed" id="wx-public-item-radar">
              <a
                className="text-info font-medium"
                id="wx-link-radar"
                href="https://radar.weather.gov/"
                target="_blank"
                rel="noreferrer"
              >
                NWS Radar Mosaic
              </a>{" "}
              – High-resolution radar imagery with storm detail overlays.
            </li>
            <li className="leading-relaxed" id="wx-public-item-ec">
              <a
                className="text-info font-medium"
                id="wx-link-ec"
                href="https://weather.gc.ca/"
                target="_blank"
                rel="noreferrer"
              >
                Environment and Climate Change Canada
              </a>{" "}
              – National warnings and alerts for Canadian provinces and
              territories.
            </li>
            <li className="leading-relaxed" id="wx-public-item-noaa-marine">
              <a
                className="text-info font-medium"
                id="wx-link-noaa-marine"
                href="https://www.weather.gov/marine/"
                target="_blank"
                rel="noreferrer"
              >
                NOAA Marine Forecasts
              </a>{" "}
              – Coastal waters forecasts, buoy data, and marine advisories.
            </li>
          </ul>
        </div>

        <div className="card p-6" id="wx-preparedness">
          <h2
            className="text-xl font-semibold mb-4"
            id="wx-preparedness-heading"
          >
            Preparedness & Safety Guides
          </h2>
          <p
            className="text-gray-600 leading-relaxed mb-4"
            id="wx-preparedness-intro"
          >
            Pre-mission checklists and safety planning resources for severe
            weather readiness.
          </p>
          <ul
            className="text-sm text-gray-600 space-y-3"
            id="wx-preparedness-list"
          >
            <li className="leading-relaxed" id="wx-preparedness-item-ready">
              <a
                className="text-info font-medium"
                id="wx-link-ready"
                href="https://www.ready.gov/severe-weather"
                target="_blank"
                rel="noreferrer"
              >
                Ready.gov Severe Weather Playbook
              </a>{" "}
              – Family action plans, supply lists, and sheltering guidance.
            </li>
            <li className="leading-relaxed" id="wx-preparedness-item-fema">
              <a
                className="text-info font-medium"
                id="wx-link-fema"
                href="https://www.fema.gov/emergency-managers/risk-management"
                target="_blank"
                rel="noreferrer"
              >
                FEMA Risk Management Toolkit
              </a>{" "}
              – Hazard mitigation strategies and incident command templates.
            </li>
            <li className="leading-relaxed" id="wx-preparedness-item-redcross">
              <a
                className="text-info font-medium"
                id="wx-link-redcross"
                href="https://www.redcross.org/get-help/how-to-prepare-for-emergencies/types-of-emergencies.html"
                target="_blank"
                rel="noreferrer"
              >
                American Red Cross Preparedness Guides
              </a>{" "}
              – Hazard-specific briefings for storms, floods, and extreme heat.
            </li>
            <li className="leading-relaxed" id="wx-preparedness-item-public">
              <a
                className="text-info font-medium"
                id="wx-link-public-safety"
                href="https://www.publicsafety.gc.ca/cnt/rsrcs/pblctns/emer-prep-en.aspx"
                target="_blank"
                rel="noreferrer"
              >
                Public Safety Canada Emergency Planning
              </a>{" "}
              – Preparedness resources tailored to Canadian communities.
            </li>
          </ul>
        </div>

        <div className="card p-6" id="wx-awareness">
          <h2 className="text-xl font-semibold mb-4" id="wx-awareness-heading">
            Weather Awareness & Training
          </h2>
          <p
            className="text-gray-600 leading-relaxed mb-4"
            id="wx-awareness-intro"
          >
            Build your weather IQ with training programs and operational
            awareness guides.
          </p>
          <ul
            className="text-sm text-gray-600 space-y-3"
            id="wx-awareness-list"
          >
            <li className="leading-relaxed" id="wx-awareness-item-skywarn">
              <a
                className="text-info font-medium"
                id="wx-link-skywarn"
                href="https://www.weather.gov/skywarn/"
                target="_blank"
                rel="noreferrer"
              >
                NWS Skywarn Spotter Training
              </a>{" "}
              – Virtual and local spotter courses for severe weather reporting.
            </li>
            <li className="leading-relaxed" id="wx-awareness-item-safety">
              <a
                className="text-info font-medium"
                id="wx-link-safety"
                href="https://www.weather.gov/safety/"
                target="_blank"
                rel="noreferrer"
              >
                NWS Weather Safety Portal
              </a>{" "}
              – Hazard briefings with quick-reference safety infographics.
            </li>
            <li className="leading-relaxed" id="wx-awareness-item-cdc-heat">
              <a
                className="text-info font-medium"
                id="wx-link-cdc-heat"
                href="https://www.cdc.gov/disasters/extremeheat/index.html"
                target="_blank"
                rel="noreferrer"
              >
                CDC Heat & Climate Health Guidance
              </a>{" "}
              – Health-focused guidance for extreme heat events and dehydration
              risk.
            </li>
            <li className="leading-relaxed" id="wx-awareness-item-mets">
              <a
                className="text-info font-medium"
                id="wx-link-mets"
                href="https://www.meted.ucar.edu/"
                target="_blank"
                rel="noreferrer"
              >
                UCAR MetEd Modules
              </a>{" "}
              – Free meteorology lessons covering radar interpretation and
              mesoscale analysis.
            </li>
          </ul>
        </div>

        <div
          className="bg-accent p-4 rounded-lg border border-primary text-sm text-gray-600 leading-relaxed"
          id="wx-disclaimer"
        >
          <strong className="text-primary" id="wx-disclaimer-label">
            Mission Reminder:
          </strong>{" "}
          These external resources supplement the Fishing Forecast intel. Always
          consult official warnings and follow local emergency directives.
        </div>
      </div>
    </div>
  );
}
