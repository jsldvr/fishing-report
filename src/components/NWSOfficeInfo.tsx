import { useState, useCallback } from "react";
import type { LocalWeatherOfficeInfo } from "../types/forecast.js";

interface NWSOfficeInfoProps {
  localOffice: LocalWeatherOfficeInfo;
  className?: string;
  id?: string;
}

export default function NWSOfficeInfo({
  localOffice,
  className = "",
  id,
}: NWSOfficeInfoProps) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleAccordion = useCallback(() => {
    setIsOpen(!isOpen);
  }, [isOpen]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        toggleAccordion();
      }
    },
    [toggleAccordion]
  );
  const { office, distance, servingArea } = localOffice;
  const contentId = id ? `${id}-content` : "nws-office-content";

  return (
    <div className={`card p-6 ${className}`} id={id}>
      <h3
        className="font-semibold text-lg flex items-center gap-2 mission-timeline-toggle"
        id={id ? `${id}-title` : "nws-office-title"}
        role="button"
        tabIndex={0}
        aria-expanded={isOpen}
        aria-controls={contentId}
        data-open={isOpen}
        onClick={toggleAccordion}
        onKeyDown={handleKeyDown}
      >
        <span>🏢</span>
        Local NWS Office
        <span
          className="mission-toggle-indicator"
          id={id ? `${id}-toggle-indicator` : "nws-office-toggle-indicator"}
          aria-hidden="true"
          data-open={isOpen}
        >
          ▾
        </span>
      </h3>

      <div
        className="space-y-2 text-sm mission-timeline-content"
        id={contentId}
        data-open={isOpen}
        aria-hidden={!isOpen}
      >
        <div id={id ? `${id}-basic-info` : "nws-office-basic-info"}>
          <p
            className="font-medium text-primary"
            id={id ? `${id}-name` : "nws-office-name"}
          >
            {office.name}
          </p>
          <p
            className="text-secondary"
            id={id ? `${id}-office-id` : "nws-office-office-id"}
          >
            Office ID: {office.id}
          </p>
        </div>

        <div
          className="flex items-center gap-4"
          id={id ? `${id}-location-info` : "nws-office-location-info"}
        >
          <span
            className="text-secondary"
            id={id ? `${id}-distance` : "nws-office-distance"}
          >
            📍 {distance.toFixed(0)}km away
          </span>
          <span
            className="text-secondary"
            id={id ? `${id}-serving-area` : "nws-office-serving-area"}
          >
            🗺️ Serving: {servingArea}
          </span>
        </div>

        <div
          className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-3 pt-2 border-t"
          style={{ borderColor: "var(--border-primary)" }}
        >
          <div>
            <p className="text-xs font-medium text-primary">Address:</p>
            <p className="text-xs text-secondary">
              {office.address.streetAddress}
              <br />
              {office.address.addressLocality}, {office.address.addressRegion}{" "}
              {office.address.postalCode}
            </p>
          </div>

          <div>
            <p className="text-xs font-medium text-primary">Contact:</p>
            <p className="text-xs text-secondary">
              📞 {office.telephone}
              <br />
              📧 {office.email}
            </p>
          </div>
        </div>

        <div
          className="mt-2 pt-2 border-t"
          style={{ borderColor: "var(--border-primary)" }}
        >
          <p className="text-xs font-medium text-primary">Coverage Area:</p>
          <div className="text-xs text-secondary grid grid-cols-2 gap-1 mt-1">
            <span>Counties: {office.responsibleCounties.length}</span>
            <span>
              Forecast Zones: {office.responsibleForecastZones.length}
            </span>
            <span>Fire Zones: {office.responsibleFireZones.length}</span>
            <span>
              Weather Stations: {office.approvedObservationStations.length}
            </span>
          </div>
        </div>

        <div
          className="mt-2 pt-2 border-t"
          style={{ borderColor: "var(--border-primary)" }}
        >
          <p className="text-xs text-secondary">
            <span className="font-medium">Region:</span> {office.nwsRegion}
            <br />
            <span className="font-medium">Organization:</span>{" "}
            {office.parentOrganization}
          </p>
        </div>
      </div>
    </div>
  );
}
