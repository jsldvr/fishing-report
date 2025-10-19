import { useState, useEffect } from "react";
import { validateNorthAmericaCoords } from "../lib/time";

interface LocationInputProps {
  onLocationChange: (lat: number, lon: number, name?: string) => void;
  initialLat?: number;
  initialLon?: number;
}

export default function LocationInput({
  onLocationChange,
  initialLat = 40.7128,
  initialLon = -74.006,
}: LocationInputProps) {
  const [lat, setLat] = useState(initialLat.toString());
  const [lon, setLon] = useState(initialLon.toString());
  const [locationName, setLocationName] = useState("");
  const [isValid, setIsValid] = useState(true);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [isGeolocating, setIsGeolocating] = useState(false);

  useEffect(() => {
    const latNum = parseFloat(lat);
    const lonNum = parseFloat(lon);
    const valid =
      !isNaN(latNum) &&
      !isNaN(lonNum) &&
      validateNorthAmericaCoords(latNum, lonNum);
    setIsValid(valid);

    if (valid) {
      onLocationChange(latNum, lonNum, locationName || undefined);
    }
  }, [lat, lon, locationName, onLocationChange]);

  const handleGeocodeLocation = async () => {
    if (!locationName.trim()) return;

    setIsGeocoding(true);
    try {
      // Strategy 1: Check if input looks like coordinates first
      const coordMatch = locationName.match(
        /(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)/
      );
      if (coordMatch) {
        const newLat = parseFloat(coordMatch[1]);
        const newLon = parseFloat(coordMatch[2]);

        if (
          !isNaN(newLat) &&
          !isNaN(newLon) &&
          validateNorthAmericaCoords(newLat, newLon)
        ) {
          setLat(newLat.toFixed(4));
          setLon(newLon.toFixed(4));
          return;
        }
      }

      // Strategy 2: Use Photon API (by Komoot) - supports CORS and is free
      try {
        const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(
          locationName
        )}&bbox=-180,14,-50,83&limit=1`;
        const response = await fetch(photonUrl);

        if (response.ok) {
          const data = await response.json();
          if (data.features && data.features.length > 0) {
            const feature = data.features[0];
            const [lon, lat] = feature.geometry.coordinates;

            if (validateNorthAmericaCoords(lat, lon)) {
              setLat(lat.toFixed(4));
              setLon(lon.toFixed(4));
              return;
            } else {
              alert("Location is outside North America");
              return;
            }
          }
        }
      } catch (photonError) {
        console.log("Photon API failed, trying fallback...");
      }

      // Strategy 3: Hardcoded lookup for common cities as fallback
      const commonLocations: Record<string, [number, number]> = {
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

      const searchKey = locationName.toLowerCase().trim();
      if (commonLocations[searchKey]) {
        const [lat, lon] = commonLocations[searchKey];
        setLat(lat.toFixed(4));
        setLon(lon.toFixed(4));
        return;
      }

      // If all strategies fail, show helpful message
      alert(
        `Location "${locationName}" not found. Try:\n` +
          `• Common city format: "Oklahoma City, OK"\n` +
          `• Coordinates: "35.3383, -97.4867"\n` +
          `• Use the coordinate fields below\n` +
          `• Try the "Use Current Location" button`
      );
    } catch (error) {
      console.error("Geocoding error:", error);
      alert(
        'Failed to find location. Try entering coordinates like "35.3383, -97.4867"'
      );
    } finally {
      setIsGeocoding(false);
    }
  };

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by this browser");
      return;
    }

    setIsGeolocating(true);

    // Success handler - shared across all attempts
    const handleSuccess = (position: GeolocationPosition) => {
      const newLat = position.coords.latitude;
      const newLon = position.coords.longitude;

      if (validateNorthAmericaCoords(newLat, newLon)) {
        setLat(newLat.toFixed(4));
        setLon(newLon.toFixed(4));
        setLocationName("");
      } else {
        alert("Your current location is outside North America");
      }
      setIsGeolocating(false);
    };

    // First attempt: Quick network location with cached data
    const tryQuickLocation = () => {
      navigator.geolocation.getCurrentPosition(
        handleSuccess,
        (error) => {
          console.warn("Quick location failed:", error);

          // If permission denied, skip other geolocation attempts and go straight to IP
          if (error.code === error.PERMISSION_DENIED) {
            console.log(
              "Permission denied on first attempt, skipping to IP location..."
            );
            tryIpLocation().catch((ipError) => {
              console.error("IP location also failed:", ipError);
              alert(
                "Location permission denied. We tried to get your approximate location using your IP address, but that also failed. Please enter coordinates manually or allow location access and try again."
              );
              setIsGeolocating(false);
            });
            return;
          }

          tryWatchPosition();
        },
        {
          enableHighAccuracy: false,
          timeout: 3000, // 3 seconds - very fast
          maximumAge: 1800000, // 30 minutes - use older cached data
        }
      );
    };

    // Second attempt: Use watchPosition for continuous updates
    const tryWatchPosition = () => {
      let watchId: number;
      let hasSucceeded = false;

      // Set a fallback timeout
      const fallbackTimer = setTimeout(() => {
        if (!hasSucceeded) {
          navigator.geolocation.clearWatch(watchId);
          tryLastResort();
        }
      }, 5000); // 5 second fallback

      watchId = navigator.geolocation.watchPosition(
        (position) => {
          if (!hasSucceeded) {
            hasSucceeded = true;
            clearTimeout(fallbackTimer);
            navigator.geolocation.clearWatch(watchId);
            handleSuccess(position);
          }
        },
        (error) => {
          console.warn("Watch position failed:", error);
          if (!hasSucceeded) {
            hasSucceeded = true;
            clearTimeout(fallbackTimer);
            navigator.geolocation.clearWatch(watchId);
            tryLastResort();
          }
        },
        {
          enableHighAccuracy: false,
          timeout: 2000, // 2 seconds per attempt
          maximumAge: 3600000, // 1 hour - very old cached data is fine
        }
      );
    };

    // Final attempt: Aggressive cached location
    const tryLastResort = () => {
      navigator.geolocation.getCurrentPosition(
        handleSuccess,
        (error) => {
          console.error("All geolocation attempts failed:", error);

          // For permission denied or any other error, try IP location immediately
          if (error.code === error.PERMISSION_DENIED) {
            console.log("Permission denied, trying IP location...");
            tryIpLocation().catch((ipError) => {
              console.error("IP location also failed:", ipError);
              alert(
                "Location permission denied. We tried to get your approximate location using your IP address, but that also failed. Please enter coordinates manually or allow location access and try again."
              );
              setIsGeolocating(false);
            });
            return;
          }

          // For other errors, provide specific messages and try IP fallback
          let errorMessage = "Unable to get your location. ";
          switch (error.code) {
            case error.POSITION_UNAVAILABLE:
              errorMessage +=
                "Location services are unavailable. Trying alternative method...";
              break;
            case error.TIMEOUT:
              errorMessage +=
                "Location services are too slow. Trying alternative method...";
              break;
            default:
              errorMessage += "Trying alternative method...";
              break;
          }

          console.log(errorMessage);
          tryIpLocation().catch((ipError) => {
            console.error("IP location failed:", ipError);
            alert(
              errorMessage.replace(
                "Trying alternative method...",
                "Please enter coordinates manually."
              )
            );
            setIsGeolocating(false);
          });
        },
        {
          enableHighAccuracy: false,
          timeout: 1000, // 1 second - extremely fast
          maximumAge: Infinity, // Accept any cached data, no matter how old
        }
      );
    };

    // Absolute last resort: IP-based location
    const tryIpLocation = async () => {
      console.log("Attempting IP-based location...");

      try {
        // Try multiple IP geolocation services for better reliability
        const services = [
          "https://ipapi.co/json/",
          "https://ip-api.com/json/",
          "https://ipinfo.io/json",
        ];

        for (const service of services) {
          try {
            console.log(`Trying IP service: ${service}`);
            const response = await fetch(service);

            if (response.ok) {
              const data = await response.json();
              console.log("IP location response:", data);

              let lat: number = NaN,
                lon: number = NaN,
                city: string = "",
                region: string = "";

              // Handle different response formats
              if (service.includes("ipapi.co")) {
                lat = parseFloat(data.latitude);
                lon = parseFloat(data.longitude);
                city = data.city || "";
                region = data.region || "";
              } else if (service.includes("ip-api.com")) {
                lat = parseFloat(data.lat);
                lon = parseFloat(data.lon);
                city = data.city || "";
                region = data.regionName || "";
              } else if (service.includes("ipinfo.io")) {
                const [latStr, lonStr] = (data.loc || "").split(",");
                lat = parseFloat(latStr);
                lon = parseFloat(lonStr);
                city = data.city || "";
                region = data.region || "";
              }
              if (!isNaN(lat) && !isNaN(lon)) {
                console.log(`Found IP location: ${lat}, ${lon}`);

                if (validateNorthAmericaCoords(lat, lon)) {
                  setLat(lat.toFixed(4));
                  setLon(lon.toFixed(4));
                  setLocationName(city && region ? `${city}, ${region}` : "");
                  console.log("IP location set successfully");
                  setIsGeolocating(false);
                  return;
                } else {
                  console.warn(
                    `IP location ${lat}, ${lon} is outside North America`
                  );
                  // Continue to next service
                }
              }
            }
          } catch (serviceError) {
            console.warn(`IP service ${service} failed:`, serviceError);
            // Continue to next service
          }
        }

        throw new Error(
          "All IP location services failed or returned invalid coordinates"
        );
      } catch (error) {
        console.error("IP location completely failed:", error);
        throw error;
      }
    };

    // Start with quick location attempt
    tryQuickLocation();
  };

  return (
    <div className="card p-6">
      <h2 className="text-xl font-semibold mb-4 text-primary">
        🎯 Target Coordinates
      </h2>

      <div className="grid gap-4">
        {/* Location Name Search */}
        <div>
          <label
            htmlFor="location-name"
            className="block text-sm font-medium mb-2"
          >
            Location Intel Search
          </label>
          <div className="flex gap-2">
            <input
              id="location-name"
              type="text"
              className="input flex-1"
              placeholder="e.g., Oklahoma City, OK or 35.3383, -97.4867"
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleGeocodeLocation()}
            />
            <button
              className="btn btn-primary"
              onClick={handleGeocodeLocation}
              disabled={!locationName.trim() || isGeocoding}
            >
              {isGeocoding ? <span className="spinner"></span> : "🔍 Recon"}
            </button>
          </div>
          <p className="text-xs text-muted mt-1">
            Enter target designation or precise coordinates (lat, lon). Multiple
            search vectors available for target acquisition.
          </p>
        </div>

        {/* Manual Coordinates */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="latitude"
              className="block text-sm font-medium mb-2"
            >
              Latitude (°N)
            </label>
            <input
              id="latitude"
              type="number"
              step="0.0001"
              min="14"
              max="83"
              className="input"
              placeholder="40.7128"
              value={lat}
              onChange={(e) => setLat(e.target.value)}
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
              id="longitude"
              type="number"
              step="0.0001"
              min="-180"
              max="-50"
              className="input"
              placeholder="-74.0060"
              value={lon}
              onChange={(e) => setLon(e.target.value)}
            />
          </div>
        </div>

        <button
          className="btn btn-primary"
          onClick={handleGetCurrentLocation}
          disabled={isGeolocating}
        >
          {isGeolocating ? (
            <>
              <span className="spinner"></span>
              Acquiring Position...
            </>
          ) : (
            <>�️ GPS Lock</>
          )}
        </button>

        {!isValid && (
          <p className="text-sm text-error mt-2">
            ⚠️ Invalid coordinates. AO must be within North America (Lat:
            14-83°N, Lon: -180 to -50°W)
          </p>
        )}
      </div>
    </div>
  );
}
