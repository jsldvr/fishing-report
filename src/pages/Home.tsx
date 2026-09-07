import LocationInput from "../components/LocationInput";
import DateRangePicker from "../components/DateRangePicker";
import Icon from "../components/Icon";
import { useMissionContext } from "../state/missionContext";
import { useMissionActions } from "../state/useMissionActions";

export default function Home() {
  const { draft, locationPrefillToken, setDraftLocation, setDraftDateRange } =
    useMissionContext();
  const { runDraft } = useMissionActions();

  const hasLocationCoordinates =
    Number.isFinite(draft.lat) && Number.isFinite(draft.lon);

  const isValid =
    hasLocationCoordinates && Boolean(draft.startDate) && draft.days > 0;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="card hero-panel mb-6">
        <h1 className="hero-title mb-2">Fishing Report</h1>
        <p className="hero-tagline mb-6">
          Plan around verified weather, water, and solunar conditions.
        </p>

        <div className="grid gap-6 lg:grid-cols-2 mb-6">
          <LocationInput
            onLocationChange={setDraftLocation}
            initialLat={draft.lat}
            initialLon={draft.lon}
            initialName={draft.name}
            prefillToken={locationPrefillToken}
          />

          <DateRangePicker
            onDateRangeChange={setDraftDateRange}
            startDate={draft.startDate}
            days={draft.days}
            maxDays={7}
          />
        </div>

        <div className="text-center">
          <button
            className="btn btn-primary btn-lg"
            id="generate-forecast-button"
            onClick={runDraft}
            disabled={!isValid}
          >
            <Icon name="fish" className="mr-2" />
            Get fishing outlook
          </button>

          {!isValid && (
            <p className="text-sm text-muted mt-2">
              <Icon name="warning" className="mr-2" />
              Choose a location and forecast window to continue.
            </p>
          )}
        </div>
      </div>

      <div className="trust-strip mb-8" id="trust-strip">
        <span className="trust-strip__label">Sources checked:</span>
        <span className="trust-strip__sources">
          NWS &middot; Open-Meteo &middot; NOAA marine &middot; Alerts
        </span>
        <span className="trust-strip__note">
          Every forecast shows its data quality plainly — never a false
          100%. If weather can't be verified, we say so instead of guessing.
        </span>
      </div>

      <div className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <div className="card p-6 text-center">
          <div className="text-3xl mb-3">
            <Icon name="moon" className="text-3xl" />
          </div>
          <h3 className="font-semibold mb-2 text-primary">Moon phase</h3>
          <p className="text-sm text-secondary">
            Solunar theory: moon phase and illumination help predict when fish
            feed most actively.
          </p>
        </div>

        <div className="card p-6 text-center">
          <div className="text-3xl mb-3">
            <Icon name="storm" className="text-3xl" />
          </div>
          <h3 className="font-semibold mb-2 text-primary">
            Weather conditions
          </h3>
          <p className="text-sm text-secondary">
            Live temperature, wind, precipitation, and cloud cover from NWS
            and Open-Meteo.
          </p>
        </div>

        <div className="card p-6 text-center">
          <div className="text-3xl mb-3">
            <Icon name="chart" className="text-3xl" />
          </div>
          <h3 className="font-semibold mb-2 text-primary">
            Combined outlook
          </h3>
          <p className="text-sm text-secondary">
            Moon and weather combined into one score, with data quality shown
            plainly.
          </p>
        </div>
      </div>
    </div>
  );
}
