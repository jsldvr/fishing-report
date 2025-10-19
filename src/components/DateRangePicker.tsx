import { useState, useEffect } from 'react';
import { getCurrentDateISO, addDaysToDate } from '../lib/time';

interface DateRangePickerProps {
  onDateRangeChange: (startDate: string, days: number) => void;
  maxDays?: number;
}

export default function DateRangePicker({ onDateRangeChange, maxDays = 7 }: DateRangePickerProps) {
  const [startDate, setStartDate] = useState(getCurrentDateISO());
  const [days, setDays] = useState(3);

  useEffect(() => {
    onDateRangeChange(startDate, days);
  }, [startDate, days, onDateRangeChange]);

  const endDate = addDaysToDate(startDate, days - 1);

  return (
    <div className="card p-6">
      <h2 className="text-xl font-semibold mb-4">Date Range</h2>
      
      <div className="grid gap-4">
        <div>
          <label htmlFor="start-date" className="block text-sm font-medium text-gray-700 mb-2">
            Start Date
          </label>
          <input
            id="start-date"
            type="date"
            className="input"
            value={startDate}
            min={getCurrentDateISO()}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        
        <div>
          <label htmlFor="num-days" className="block text-sm font-medium text-gray-700 mb-2">
            Number of Days ({days})
          </label>
          <input
            id="num-days"
            type="range"
            min="1"
            max={maxDays.toString()}
            step="1"
            className="w-full"
            value={days.toString()}
            onChange={(e) => setDays(parseInt(e.target.value, 10))}
          />
          <div className="flex justify-between text-sm text-gray-500 mt-1">
            <span>1 day</span>
            <span>{maxDays} days</span>
          </div>
        </div>

        <div className="bg-gray-50 p-3 rounded">
          <p className="text-sm text-gray-700">
            <strong>Forecast period:</strong> {startDate} to {endDate} ({days} day{days !== 1 ? 's' : ''})
          </p>
        </div>
      </div>
    </div>
  );
}
