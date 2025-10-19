import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import LocationInput from '../components/LocationInput';
import DateRangePicker from '../components/DateRangePicker';

export default function Home() {
  const navigate = useNavigate();
  const [location, setLocation] = useState({ lat: 40.7128, lon: -74.0060, name: '' });
  const [dateRange, setDateRange] = useState({ startDate: '', days: 3 });
  
  const handleLocationChange = useCallback((lat: number, lon: number, name?: string) => {
    setLocation({ lat, lon, name: name || '' });
  }, []);
  
  const handleDateRangeChange = useCallback((startDate: string, days: number) => {
    setDateRange({ startDate, days });
  }, []);
  
  const handleGenerateForecast = () => {
    const params = new URLSearchParams({
      lat: location.lat.toString(),
      lon: location.lon.toString(),
      startDate: dateRange.startDate,
      days: dateRange.days.toString(),
    });
    
    if (location.name) {
      params.set('name', location.name);
    }
    
    navigate(`/results?${params.toString()}`);
  };
  
  const isValid = location.lat && location.lon && dateRange.startDate && dateRange.days > 0;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          🎣 Fishing Forecast
        </h1>
        <p className="text-lg text-gray-600 mb-2">
          Get science-based fishing predictions for North America
        </p>
        <p className="text-sm text-gray-500">
          Combines lunar phase, weather conditions, and optional almanac data
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
          Generate Fishing Forecast
        </button>
        
        {!isValid && (
          <p className="text-sm text-gray-500 mt-2">
            Please select a valid location and date range
          </p>
        )}
      </div>

      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <div className="card p-6 text-center">
          <div className="text-2xl mb-2">🌙</div>
          <h3 className="font-semibold mb-2">Lunar Phase</h3>
          <p className="text-sm text-gray-600">
            Based on solunar theory, tracking moon phase and illumination for optimal fishing times
          </p>
        </div>
        
        <div className="card p-6 text-center">
          <div className="text-2xl mb-2">🌤️</div>
          <h3 className="font-semibold mb-2">Weather Data</h3>
          <p className="text-sm text-gray-600">
            Real-time weather from Open-Meteo: temperature, wind, precipitation, cloud cover
          </p>
        </div>
        
        <div className="card p-6 text-center">
          <div className="text-2xl mb-2">📊</div>
          <h3 className="font-semibold mb-2">Science-Based</h3>
          <p className="text-sm text-gray-600">
            Algorithmic scoring combining multiple factors for accurate fishing predictions
          </p>
        </div>
      </div>
    </div>
  );
}
