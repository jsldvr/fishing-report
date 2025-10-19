import { useState, useEffect } from "react";
import { getCurrentDateISO, addDaysToDate } from "../lib/time";

interface DateRangePickerProps {
  onDateRangeChange: (startDate: string, days: number) => void;
  maxDays?: number;
}

export default function DateRangePicker({
  onDateRangeChange,
  maxDays = 7,
}: DateRangePickerProps) {
  const [startDate, setStartDate] = useState(getCurrentDateISO());
  const [days, setDays] = useState(3);

  useEffect(() => {
    onDateRangeChange(startDate, days);
  }, [startDate, days, onDateRangeChange]);

  const endDate = addDaysToDate(startDate, days - 1);

  return (
    <div className="card p-6">
      <h2 className="text-xl font-semibold mb-4 text-primary">
        ⏱️ Mission Timeline
      </h2>

      <div className="grid gap-4">
        <div>
          <label
            htmlFor="start-date"
            className="block text-sm font-medium mb-2"
          >
            Operation Commencement
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
          <label htmlFor="num-days" className="block text-sm font-medium mb-2">
            Duration: {days} Day{days !== 1 ? "s" : ""}
          </label>
          <input
            id="num-days"
            type="range"
            min="1"
            max={maxDays.toString()}
            step="1"
            className="w-full accent-forest-600"
            value={days.toString()}
            onChange={(e) => setDays(parseInt(e.target.value, 10))}
            style={{
              background: `linear-gradient(to right, var(--color-forest-500) 0%, var(--color-forest-500) ${
                (days / maxDays) * 100
              }%, var(--border-primary) ${
                (days / maxDays) * 100
              }%, var(--border-primary) 100%)`,
            }}
          />
          <div className="flex justify-between text-sm text-muted mt-1">
            <span>Short Op</span>
            <span>Extended Mission</span>
          </div>
        </div>

        <div className="bg-accent p-3 rounded-lg border border-primary">
          <p className="text-sm text-secondary">
            <strong className="text-primary">Mission Window:</strong>{" "}
            {startDate} → {endDate}
          </p>
          <p className="text-xs text-muted mt-1">
            📅 {days} day operational period with tactical assessment intervals
          </p>
        </div>
      </div>
    </div>
  );
}
