import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import LocationInput from "../components/LocationInput";
import DateRangePicker from "../components/DateRangePicker";

export default function Home() {
  const navigate = useNavigate();
  const [location, setLocation] = useState({
    lat: 40.7128,
    lon: -74.006,
    name: "",
  });
  const [dateRange, setDateRange] = useState({ startDate: "", days: 3 });

  const handleLocationChange = useCallback(
    (lat: number, lon: number, name?: string) => {
      setLocation({ lat, lon, name: name || "" });
    },
    []
  );

  const handleDateRangeChange = useCallback(
    (startDate: string, days: number) => {
      setDateRange({ startDate, days });
    },
    []
  );

  const handleGenerateForecast = () => {
    const params = new URLSearchParams({
      lat: location.lat.toString(),
      lon: location.lon.toString(),
      startDate: dateRange.startDate,
      days: dateRange.days.toString(),
    });

    if (location.name) {
      params.set("name", location.name);
    }

    navigate(`/results?${params.toString()}`);
  };

  const isValid =
    location.lat && location.lon && dateRange.startDate && dateRange.days > 0;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-primary mb-4">
          🎣 Tactical Fishing Intel
        </h1>
        <p className="text-lg text-secondary mb-2">
          Military-grade precision for North American fishing operations
        </p>
        <p className="text-sm text-muted">
          Advanced algorithms combining lunar cycles, meteorological data, and
          field intelligence
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 mb-8">
        <LocationInput
          onLocationChange={handleLocationChange}
          initialLat={location.lat}
          initialLon={location.lon}
        />

        <DateRangePicker
          onDateRangeChange={handleDateRangeChange}
          maxDays={7}
        />
      </div>

      <div className="text-center">
        <button
          className="btn btn-primary text-lg px-8 py-3"
          onClick={handleGenerateForecast}
          disabled={!isValid}
        >
          🎯 Execute Mission Brief
        </button>

        {!isValid && (
          <p className="text-sm text-muted mt-2">
            ⚠️ Coordinates and operational window required for intel generation
          </p>
        )}
      </div>

      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <div className="card p-6 text-center">
          <div className="text-3xl mb-3">🌙</div>
          <h3 className="font-semibold mb-2 text-primary">Lunar Intel</h3>
          <p className="text-sm text-secondary">
            Solunar theory deployment: moon phase tracking and illumination
            analysis for optimal engagement windows
          </p>
        </div>

        <div className="card p-6 text-center">
          <div className="text-3xl mb-3">⛈️</div>
          <h3 className="font-semibold mb-2 text-primary">Weather Recon</h3>
          <p className="text-sm text-secondary">
            Live meteorological surveillance: temperature, wind vectors,
            precipitation, and cloud cover assessment
          </p>
        </div>

        <div className="card p-6 text-center">
          <div className="text-3xl mb-3">🎯</div>
          <h3 className="font-semibold mb-2 text-primary">Tactical Analysis</h3>
          <p className="text-sm text-secondary">
            Multi-factor algorithmic assessment providing precision strike
            recommendations with confidence metrics
          </p>
        </div>
      </div>
    </div>
  );
}
