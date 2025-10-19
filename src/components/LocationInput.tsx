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

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const newLat = position.coords.latitude;
        const newLon = position.coords.longitude;

        if (validateNorthAmericaCoords(newLat, newLon)) {
          setLat(newLat.toFixed(4));
          setLon(newLon.toFixed(4));
          setLocationName("");
        } else {
          alert("Your current location is outside North America");
        }
      },
      (error) => {
        console.error("Geolocation error:", error);
        alert("Failed to get current location");
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000, // 5 minutes
      }
    );
  };

  return (
    <div className="card p-6">
      <h2 className="text-xl font-semibold mb-4">Location</h2>

      <div className="grid gap-4">
        {/* Location Name Search */}
        <div>
          <label
            htmlFor="location-name"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Search by City/Address
          </label>
          <div className="flex gap-2">
            <input
              id="location-name"
              type="text"
              className="input flex-1"
              placeholder="e.g., New York, NY or 35.3383, -97.4867"
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleGeocodeLocation()}
            />
            <button
              className="btn btn-primary"
              onClick={handleGeocodeLocation}
              disabled={!locationName.trim() || isGeocoding}
            >
              {isGeocoding ? <span className="spinner"></span> : "Search"}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Enter a city name or coordinates (lat, lon). If city search fails,
            try entering coordinates directly.
          </p>
        </div>

        {/* Manual Coordinates */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="latitude"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Latitude
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
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Longitude
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

        <button className="btn btn-primary" onClick={handleGetCurrentLocation}>
          📍 Use Current Location
        </button>

        {!isValid && (
          <p className="text-sm text-red-600">
            Please enter valid coordinates within North America (Lat: 14-83°N,
            Lon: -180 to -50°W)
          </p>
        )}
      </div>
    </div>
  );
}
