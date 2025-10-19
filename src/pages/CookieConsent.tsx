import type { FC } from "react";

const sections = [
  {
    title: "Mission-Critical Cookie Usage",
    paragraphs: [
      "This Cookie Consent Statement explains, in direct operational terms, that Tactical Fishing Intel deploys narrowly-scoped functional cookies to keep the mission console active. These cookies lock in navigation preferences, remember instrumentation settings, and prevent redundant loading cycles.",
      "No marketing pixels or behavioral dossiers are created. Functional cookies are the lone assets, and their deployment is aligned with the site’s entertainment briefing charter.",
    ],
  },
  {
    title: "Control Over Your Console",
    paragraphs: [
      "You may tailor cookie behavior using your browser’s security panel, clearing, disabling, or tightening controls at any time. Doing so may degrade elements of the interface and could disrupt the persistence of preferred units or saved waypoints.",
      "For full functionality, we recommend allowing the default functional cookies to remain active so that the tactical experience remains synchronized across sessions.",
    ],
  },
  {
    title: "Additional Information",
    paragraphs: [
      "Should you require clarifications or wish to transmit a cookie-related request, contact nospam@sldvr.com. Communications will receive a formal acknowledgement and response consistent with governing privacy obligations.",
      "This statement operates alongside our Privacy Policy, which expands on data minimization and disclosure practices. Both documents should be reviewed for complete situational awareness.",
    ],
  },
];

const CookieConsent: FC = () => (
  <section className="legal-page" id="page-cookie-consent">
    <header className="legal-header" id="cookie-header">
      <h1 className="legal-title" id="cookie-title">
        Cookie Consent
      </h1>
      <p className="legal-summary" id="cookie-summary">
        Tactical Fishing Intel uses functional cookies exclusively to sustain
        the console experience. No auxiliary tracking is deployed.
      </p>
    </header>
    {sections.map((section, index) => (
      <article
        className="legal-section"
        id={`cookie-section-${index + 1}`}
        key={section.title}
      >
        <h2 className="legal-heading" id={`cookie-section-title-${index + 1}`}>
          {section.title}
        </h2>
        {section.paragraphs.map((paragraph, paragraphIndex) => (
          <p
            className="legal-paragraph"
            id={`cookie-section-${index + 1}-paragraph-${paragraphIndex + 1}`}
            key={`${section.title}-${paragraphIndex}`}
          >
            {paragraph}
          </p>
        ))}
      </article>
    ))}
  </section>
);

export default CookieConsent;
