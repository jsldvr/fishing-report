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
  const { office, distance, servingArea } = localOffice;

  return (
    <div
      className={`p-4 bg-blue-50 rounded-lg border border-blue-200 ${className}`}
      id={id}
    >
      <h3
        className="font-semibold text-lg mb-2 flex items-center gap-2"
        id={id ? `${id}-title` : "nws-office-title"}
      >
        <span>🏢</span>
        Your Local NWS Office
      </h3>

      <div
        className="space-y-2 text-sm"
        id={id ? `${id}-content` : "nws-office-content"}
      >
        <div id={id ? `${id}-basic-info` : "nws-office-basic-info"}>
          <p
            className="font-medium text-blue-900"
            id={id ? `${id}-name` : "nws-office-name"}
          >
            {office.name}
          </p>
          <p
            className="text-blue-700"
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
            className="text-blue-600"
            id={id ? `${id}-distance` : "nws-office-distance"}
          >
            📍 {distance.toFixed(0)}km away
          </span>
          <span
            className="text-blue-600"
            id={id ? `${id}-serving-area` : "nws-office-serving-area"}
          >
            🗺️ Serving: {servingArea}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-3 pt-2 border-t border-blue-200">
          <div>
            <p className="text-xs font-medium text-blue-800">Address:</p>
            <p className="text-xs text-blue-700">
              {office.address.streetAddress}
              <br />
              {office.address.addressLocality}, {office.address.addressRegion}{" "}
              {office.address.postalCode}
            </p>
          </div>

          <div>
            <p className="text-xs font-medium text-blue-800">Contact:</p>
            <p className="text-xs text-blue-700">
              📞 {office.telephone}
              <br />
              📧 {office.email}
            </p>
          </div>
        </div>

        <div className="mt-2 pt-2 border-t border-blue-200">
          <p className="text-xs font-medium text-blue-800">Coverage Area:</p>
          <div className="text-xs text-blue-600 grid grid-cols-2 gap-1 mt-1">
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

        <div className="mt-2 pt-2 border-t border-blue-200">
          <p className="text-xs text-blue-700">
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
