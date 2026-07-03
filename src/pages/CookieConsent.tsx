import ContentPage, { type ContentPageSection } from "../components/ContentPage";

const sections: ContentPageSection[] = [
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

export default function CookieConsent() {
  return (
    <ContentPage
      pageId="page-cookie-consent"
      introId="cookie-header"
      titleId="cookie-title"
      subtitleId="cookie-summary"
      sectionsId="cookie-sections"
      sectionIdPrefix="cookie"
      title="Cookie Consent"
      subtitle="Fishing Report uses functional cookies exclusively to run the app. No other tracking is used."
      sections={sections}
    />
  );
}
