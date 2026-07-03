import type { FC } from "react";

const sections = [
  {
    title: "Cookie Usage",
    paragraphs: [
      "This Cookie Consent Statement explains that Fishing Report uses narrowly-scoped functional cookies to keep the app working. These cookies remember navigation preferences, unit settings, and prevent redundant loading.",
      "No marketing pixels or behavioral profiles are created. Functional cookies are the only ones used, consistent with the site's entertainment purpose.",
    ],
  },
  {
    title: "Control Over Cookies",
    paragraphs: [
      "You can adjust cookie behavior using your browser's settings, clearing, disabling, or restricting them at any time. Doing so may degrade parts of the interface, including saved unit preferences or saved spots.",
      "For full functionality, we recommend allowing the default functional cookies to remain active so preferences stay in sync across sessions.",
    ],
  },
  {
    title: "Additional Information",
    paragraphs: [
      "If you have questions or a cookie-related request, contact nospam@sldvr.com. Communications will receive an acknowledgement and response consistent with governing privacy obligations.",
      "This statement works alongside our Privacy Policy, which expands on data minimization and disclosure practices. Both documents should be reviewed together.",
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
        Fishing Report uses functional cookies exclusively to run the app. No
        other tracking is used.
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
