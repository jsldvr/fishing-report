import type { FC } from "react";

const sections = [
  {
    title: "Purpose of This Policy",
    paragraphs: [
      "This Privacy Policy explains, in plain terms, that Fishing Report only uses functional cookies that support the core experience of generating weather-informed fishing forecasts. No marketing trackers, behavioral analytics, or unnecessary tags are used.",
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

const PrivacyPolicy: FC = () => (
  <section className="legal-page" id="page-privacy-policy">
    <header className="legal-header" id="privacy-header">
      <h1 className="legal-title" id="privacy-title">
        Privacy Policy
      </h1>
      <p className="legal-summary" id="privacy-summary">
        Effective October 19, 2025 — Fishing Report uses only functional
        cookies required to deliver forecasts.
      </p>
    </header>
    {sections.map((section, index) => (
      <article
        className="legal-section"
        id={`privacy-section-${index + 1}`}
        key={section.title}
      >
        <h2 className="legal-heading" id={`privacy-section-title-${index + 1}`}>
          {section.title}
        </h2>
        {section.paragraphs.map((paragraph, paragraphIndex) => (
          <p
            className="legal-paragraph"
            id={`privacy-section-${index + 1}-paragraph-${paragraphIndex + 1}`}
            key={`${section.title}-${paragraphIndex}`}
          >
            {paragraph}
          </p>
        ))}
      </article>
    ))}
  </section>
);

export default PrivacyPolicy;
