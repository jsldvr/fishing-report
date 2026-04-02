import { useState, useEffect, useCallback, type KeyboardEvent } from "react";
import { getCurrentDateISO, addDaysToDate } from "../lib/time";
import Icon from "./Icon";

interface DateRangePickerProps {
  onDateRangeChange: (startDate: string, days: number) => void;
  maxDays?: number;
  embedded?: boolean;
}

export default function DateRangePicker({
  onDateRangeChange,
  maxDays = 7,
  embedded = false,
}: DateRangePickerProps) {
  const [startDate, setStartDate] = useState(getCurrentDateISO());
  const [days, setDays] = useState(3);
  const [isTimelineOpen, setTimelineOpen] = useState(embedded);

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

  const timelineContentId = "forecast-window-content";

  return (
    <div className={embedded ? "planner-band__section" : "card p-6"}>
      <h2
        className="text-xl font-semibold text-primary mission-timeline-toggle"
        id="mission-timeline-toggle"
        role={embedded ? undefined : "button"}
        tabIndex={embedded ? undefined : 0}
        aria-expanded={isTimelineOpen}
        aria-controls={timelineContentId}
        data-open={isTimelineOpen}
        onClick={embedded ? undefined : toggleTimeline}
        onKeyDown={embedded ? undefined : handleTimelineKeyDown}
      >
        <span className="inline-flex items-center gap-2">
          <Icon name="calendar" />
          Date Range
        </span>
        {!embedded && (
          <span
            className="mission-toggle-indicator"
            id="mission-toggle-indicator"
            aria-hidden="true"
            data-open={isTimelineOpen}
          >
            <Icon name="caret" />
          </span>
        )}
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
            Start date
          </label>
          <input
            className="input"
            id="start-date"
            type="date"
            value={startDate}
            min={getCurrentDateISO()}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>

        <div>
          <label htmlFor="num-days" className="block text-sm font-medium mb-2">
            Duration: {days} day{days !== 1 ? "s" : ""}
          </label>
          <input
            className="range-input w-full"
            id="num-days"
            type="range"
            min="1"
            max={maxDays.toString()}
            step="1"
            value={days.toString()}
            onChange={(e) => setDays(parseInt(e.target.value, 10))}
            style={{
              background: `linear-gradient(to right, var(--button-primary) 0%, var(--button-primary) ${
                (days / maxDays) * 100
              }%, var(--border-primary) ${
                (days / maxDays) * 100
              }%, var(--border-primary) 100%)`,
            }}
          />
          <div className="flex justify-between text-sm text-muted mt-1">
            <span>Short range</span>
            <span>Extended range</span>
          </div>
        </div>

        <div className="bg-accent p-3 rounded-lg border border-primary">
          <p className="text-sm text-secondary">
            <strong className="text-primary">Forecast window:</strong>{" "}
            {startDate}
            <Icon name="arrowRight" className="mx-2" />
            {endDate}
          </p>
          <p className="text-xs text-muted mt-1">
            <span className="inline-flex items-center gap-2">
              <Icon name="calendar" />
              {days} day planning period
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
