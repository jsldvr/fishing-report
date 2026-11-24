import ContentPage, { type ContentPageSection } from "../components/ContentPage";

const sections: ContentPageSection[] = [
  {
    title: "Purpose of This Policy",
    paragraphs: [
      "This Privacy Policy explains, in plain terms, that Fishing Forecast only uses functional cookies that support the core experience of generating weather-informed fishing forecasts. No marketing trackers, behavioral analytics, or unnecessary tags are used.",
      "By continuing to use the site, you acknowledge that functional cookies are essential to keep your session working, remember your unit preferences, and maintain continuity across visits. If these cookies are disabled, key features may degrade or stop working reliably.",
    ],
  },
  {
    title: "Data Minimization and Retention",
    paragraphs: [
      "We minimize data collection to the greatest extent practicable under prevailing privacy standards. Functional cookies store configuration flags, timezone selections, and caching signals needed to prepare forecast data. They do not collect personal identifiers, demographic profiles, or marketing segments.",
      "Stored cookie values are kept only as long as needed to maintain feature continuity, then expire automatically through standard browser expiration policies. No separate databases or shadow profiles are built from cookie contents.",
    ],
  },
  {
    title: "Location Lookup and Third-Party Services",
    paragraphs: [
      "When you select Use my location, your browser asks for permission to share your device location. If you allow it, the coordinates stay in your browser and fill the latitude and longitude fields.",
      "If you deny location access, or your device cannot provide a location, the app falls back to an approximate location based on your IP address. Your browser sends a request directly to a third-party lookup service, trying ipapi.co, then ip-api.com, then ipinfo.io until one responds. That service receives your IP address and returns an approximate city, region, and coordinates. Fishing Forecast is a static site with no application server, so it does not receive or store this response; the app keeps only the coordinates and the city and region name, and does not write the response or your coordinates to the browser console.",
      "Searching for a place name sends the text you type to the Photon geocoding service (photon.komoot.io). Generating a forecast or weather outlook sends the selected coordinates to the public weather and tide services that supply the data: the National Weather Service (api.weather.gov), NOAA (api.tidesandcurrents.noaa.gov and mapservices.weather.noaa.gov), Open-Meteo (api.open-meteo.com), and, only when a deployment configures it as a fallback, OpenWeatherMap (api.openweathermap.org). These services operate under their own privacy policies.",
      "Saved spots, recent forecasts, offline forecast copies, and an optional light or dark theme choice are stored in your browser's local storage on this device. You can remove them at any time by clearing this site's data in your browser.",
    ],
  },
  {
    title: "Third-Party Access and Disclosure",
    paragraphs: [
      "We do not license, rent, or otherwise disclose cookie contents to third parties, except where required by applicable law or a lawful government request. Functional cookies are scoped to the fishing-report domain and are not shared with advertising networks or unrelated platforms.",
      "In the unlikely event of a lawful disclosure request, we will limit the scope to only the functional cookie data required and provide notice where legally permissible. No proactive sharing programs exist, and no tracking overlays are integrated.",
    ],
  },
  {
    title: "User Controls and Contact",
    paragraphs: [
      "You can manage cookies through your browser settings. Disabling functional cookies is fine to do, though it will degrade the experience since core features rely on them. Continued use of the site means you consent to the functional cookie use described here.",
      "For questions about this Privacy Policy or to exercise applicable data rights, contact us at nospam@sldvr.com. Requests will be evaluated promptly and resolved in accordance with governing law.",
    ],
  },
];

export default function PrivacyPolicy() {
  return (
    <ContentPage
      pageId="page-privacy-policy"
      introId="privacy-header"
      titleId="privacy-title"
      subtitleId="privacy-summary"
      sectionsId="privacy-sections"
      sectionIdPrefix="privacy"
      title="Privacy Policy"
      subtitle="Effective October 19, 2025; updated November 21, 2026 - Fishing Forecast uses only functional cookies required to deliver forecasts, plus the location services described below."
      sections={sections}
    />
  );
}
