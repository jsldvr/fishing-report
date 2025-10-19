import { useState, useEffect } from 'react';
import { validateNorthAmericaCoords } from '../lib/time';

interface LocationInputProps {
  onLocationChange: (lat: number, lon: number, name?: string) => void;
  initialLat?: number;
  initialLon?: number;
}

export default function LocationInput({ onLocationChange, initialLat = 40.7128, initialLon = -74.0060 }: LocationInputProps) {
  const [lat, setLat] = useState(initialLat.toString());
  const [lon, setLon] = useState(initialLon.toString());
  const [locationName, setLocationName] = useState('');
  const [isValid, setIsValid] = useState(true);
  const [isGeocoding, setIsGeocoding] = useState(false);

  useEffect(() => {
    const latNum = parseFloat(lat);
    const lonNum = parseFloat(lon);
    const valid = !isNaN(latNum) && !isNaN(lonNum) && validateNorthAmericaCoords(latNum, lonNum);
    setIsValid(valid);
    
    if (valid) {
      onLocationChange(latNum, lonNum, locationName || undefined);
    }
  }, [lat, lon, locationName, onLocationChange]);

  const handleGeocodeLocation = async () => {
    if (!locationName.trim()) return;
    
    setIsGeocoding(true);
    try {
      // Use Nominatim for geocoding (no API key required)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationName)}&countrycodes=us,ca,mx&limit=1`,
        {
          headers: {
            'User-Agent': 'FishingForecast/1.0'
          }
        }
      );
      const results = await response.json();
      
      if (results.length > 0) {
        const result = results[0];
        const newLat = parseFloat(result.lat);
        const newLon = parseFloat(result.lon);
        
        if (validateNorthAmericaCoords(newLat, newLon)) {
          setLat(newLat.toFixed(4));
          setLon(newLon.toFixed(4));
        } else {
          alert('Location is outside North America');
        }
      } else {
        alert('Location not found');
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      alert('Failed to find location');
    } finally {
      setIsGeocoding(false);
    }
  };

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by this browser');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const newLat = position.coords.latitude;
        const newLon = position.coords.longitude;
        
        if (validateNorthAmericaCoords(newLat, newLon)) {
          setLat(newLat.toFixed(4));
          setLon(newLon.toFixed(4));
          setLocationName('');
        } else {
          alert('Your current location is outside North America');
        }
      },
      (error) => {
        console.error('Geolocation error:', error);
        alert('Failed to get current location');
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5 minutes
      }
    );
  };

  return (
    <div className="card p-6">
      <h2 className="text-xl font-semibold mb-4">Location</h2>
      
      <div className="grid gap-4">
        {/* Location Name Search */}
        <div>
          <label htmlFor="location-name" className="block text-sm font-medium text-gray-700 mb-2">
            Search by City/Address
          </label>
          <div className="flex gap-2">
            <input
              id="location-name"
              type="text"
              className="input flex-1"
              placeholder="e.g., New York, NY"
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleGeocodeLocation()}
            />
            <button
              className="btn btn-primary"
              onClick={handleGeocodeLocation}
              disabled={!locationName.trim() || isGeocoding}
            >
              {isGeocoding ? <span className="spinner"></span> : 'Search'}
            </button>
          </div>
        </div>

        {/* Manual Coordinates */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="latitude" className="block text-sm font-medium text-gray-700 mb-2">
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
            <label htmlFor="longitude" className="block text-sm font-medium text-gray-700 mb-2">
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

        <button
          className="btn btn-primary"
          onClick={handleGetCurrentLocation}
        >
          📍 Use Current Location
        </button>

        {!isValid && (
          <p className="text-sm text-red-600">
            Please enter valid coordinates within North America (Lat: 14-83°N, Lon: -180 to -50°W)
          </p>
        )}
      </div>
    </div>
  );
}
