import { FormEvent, useState, useEffect } from "react";
import WeatherOutlookPanel from "../components/WeatherOutlookPanel";

export default function Wx() {
  const [locationInput, setLocationInput] = useState("");
  const [lat, setLat] = useState(40.7128);
  const [lon, setLon] = useState(-74.006);
  const [inputError, setInputError] = useState<string | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  // Auto-detect user location on page load (non-intrusive)
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setLat(latitude);
          setLon(longitude);
          setLocationInput(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        },
        () => {
          // Silently fail - user may have denied permission or location unavailable
          setLocationInput("40.7128, -74.0060"); // Default to NYC
        },
        {
          timeout: 3000,
          enableHighAccuracy: false, // Less battery drain, faster response
          maximumAge: 600000, // Accept cached position up to 10 minutes old
        }
      );
    } else {
      setLocationInput("40.7128, -74.0060"); // Default to NYC
    }
  }, []);

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
        parsedLat >= -90 &&
        parsedLat <= 90 &&
        parsedLon >= -180 &&
        parsedLon <= 180
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
      setInputError("Enter valid coordinates (e.g., 40.7128, -74.0060)");
      return;
    }

    setInputError(null);
    setLat(coords.lat);
    setLon(coords.lon);
  };

  const handleUseCurrentLocation = async () => {
    if (!("geolocation" in navigator)) {
      setInputError("Geolocation not supported by this browser");
      return;
    }

    setIsGettingLocation(true);
    setInputError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setLat(latitude);
        setLon(longitude);
        setLocationInput(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        setIsGettingLocation(false);
      },
      (error) => {
        let message = "Unable to get current location";
        if (error.code === error.PERMISSION_DENIED) {
          message =
            "Location access denied. Click the location icon in your browser's address bar to enable, then try again.";
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          message =
            "Location information unavailable. Please enter coordinates manually.";
        } else if (error.code === error.TIMEOUT) {
          message =
            "Location request timed out. Check your connection and try again.";
        }
        setInputError(message);
        setIsGettingLocation(false);
      },
      {
        timeout: 15000,
        enableHighAccuracy: false, // Less strict for better compatibility
        maximumAge: 300000, // Accept cached position up to 5 minutes old
      }
    );
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
