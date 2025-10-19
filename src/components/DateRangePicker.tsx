import { useState, useEffect, useCallback, type KeyboardEvent } from "react";
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
  const [isTimelineOpen, setTimelineOpen] = useState(false);

  useEffect(() => {
    onDateRangeChange(startDate, days);
  }, [startDate, days, onDateRangeChange]);

  const endDate = addDaysToDate(startDate, days - 1);

  const toggleTimeline = useCallback(() => {
    setTimelineOpen((prev) => !prev);
  }, []);

  const handleTimelineKeyDown = useCallback(
    (event: KeyboardEvent<HTMLHeadingElement>) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        toggleTimeline();
      }
    },
    [toggleTimeline]
  );

  const timelineContentId = "mission-timeline-content";

  return (
    <div className="card p-6">
      <h2
        className="text-xl font-semibold text-primary mission-timeline-toggle"
        id="mission-timeline-toggle"
        role="button"
        tabIndex={0}
        aria-expanded={isTimelineOpen}
        aria-controls={timelineContentId}
        data-open={isTimelineOpen}
        onClick={toggleTimeline}
        onKeyDown={handleTimelineKeyDown}
      >
        ⏱️ Mission Timeline
        <span
          className="mission-toggle-indicator"
          aria-hidden="true"
          data-open={isTimelineOpen}
        >
          ▾
        </span>
      </h2>

      <div
        className="grid gap-4 mission-timeline-content"
        id={timelineContentId}
        data-open={isTimelineOpen}
        aria-hidden={!isTimelineOpen}
      >
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
            className="range-input w-full accent-forest-600"
            id="num-days"
            type="range"
            min="1"
            max={maxDays.toString()}
            step="1"
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
