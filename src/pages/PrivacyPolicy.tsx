import type { FC } from "react";

const sections = [
  {
    title: "Purpose of This Policy",
    paragraphs: [
      "This Privacy Policy clarifies, in exacting legal terminology, that Tactical Fishing Intel only deploys functional cookies that enable the core experience of generating weather-informed fishing forecasts. No marketing trackers, behavioral analytics suites, or unnecessary tags are introduced into the mission stack.",
      "By continuing to access the site, you acknowledge that the functional cookies are essential to authenticate sessions, preserve unit preferences, and maintain operational continuity across visits. Should these functional cookies be disabled, key features will degrade or become unavailable, and the briefing cannot guarantee reliable output.",
    ],
  },
  {
    title: "Data Minimization and Retention",
    paragraphs: [
      "We minimize data collection to the greatest extent practicable under prevailing privacy standards. Functional cookies persist configuration flags, timezone selections, and caching signals required to pre-stage forecast data. They do not collect personal identifiers, demographic profiles, or marketing segments.",
      "Stored cookie values are retained only for the duration necessary to maintain feature continuity. Once the operational need expires, the cookie automatically lapses through standard browser expiration policies. No parallel databases or shadow profiles are constructed from cookie contents.",
    ],
  },
  {
    title: "Third-Party Access and Disclosure",
    paragraphs: [
      "We do not license, rent, or otherwise disclose cookie contents to third parties, save for instances mandated by applicable law or lawful governmental request. Functional cookies are scoped to the fishing-report domain and are not made accessible to advertising networks or unrelated platforms.",
      "In the unlikely event of a lawful disclosure request, we will limit the scope solely to the functional cookie artifacts required to satisfy the request, and we will provide notice where legally permissible. No proactive sharing programs exist, and no tracking overlays are integrated.",
    ],
  },
  {
    title: "User Controls and Contact",
    paragraphs: [
      "You may manage cookies through your browser security console. Disabling functional cookies is permissible, though it will result in a degraded experience as mission-critical features rely on them. Continued use of the site constitutes consent to the functional cookie deployment described herein.",
      "For questions regarding this Privacy Policy or to exercise applicable data rights, contact the Tactical Fishing Intel compliance channel at privacy@tacticalfishingintel.example. Requests will be evaluated promptly and resolved in accordance with governing law and operational constraints.",
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
        Effective October 19, 2025 — Tactical Fishing Intel deploys only functional cookies required to sustain forecast delivery.
      </p>
    </header>
    {sections.map((section, index) => (
      <article
        className="legal-section"
        id={`privacy-section-${index + 1}`}
        key={section.title}
      >
        <h2
          className="legal-heading"
          id={`privacy-section-title-${index + 1}`}
        >
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
