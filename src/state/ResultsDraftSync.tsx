import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { validateNorthAmericaCoords } from "../lib/time";
import { useMissionContext } from "./missionContext";

/**
 * Watches the route. Whenever the app is on a valid `/results` URL, that query's
 * location, start date, duration, and name become the active shared draft
 * (requirement 13). Other routes retain the last active draft (requirement 14).
 * Loading a Results URL never records forecast history (requirement 17).
 *
 * "Valid" mirrors the existing Results guard clauses exactly: lat, lon, start
 * date, and days must all be truthy, coordinates must be within North America,
 * and days must be between 1 and 7.
 */
export default function ResultsDraftSync() {
  const location = useLocation();
  const { applyDraft } = useMissionContext();

  useEffect(() => {
    if (location.pathname !== "/results") {
      return;
    }

    const params = new URLSearchParams(location.search);
    const lat = parseFloat(params.get("lat") || "0");
    const lon = parseFloat(params.get("lon") || "0");
    const startDate = params.get("startDate") || "";
    const days = parseInt(params.get("days") || "0", 10);
    const name = params.get("name") || "";

    const queryIsValid =
      Boolean(lat) &&
      Boolean(lon) &&
      Boolean(startDate) &&
      Boolean(days) &&
      validateNorthAmericaCoords(lat, lon) &&
      days >= 1 &&
      days <= 7;

    if (queryIsValid) {
      applyDraft({ lat, lon, name, startDate, days });
    }
  }, [applyDraft, location.pathname, location.search]);

  return null;
}
