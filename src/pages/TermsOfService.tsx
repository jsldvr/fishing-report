import ContentPage, { type ContentPageSection } from "../components/ContentPage";

const sections: ContentPageSection[] = [
  {
    title: "Acceptance of Terms",
    paragraphs: [
      "By accessing Fishing Report, you agree that all forecasts and analyses are for entertainment and illustrative purposes only. The site provides scenario-based estimates and does not constitute certified meteorological, legal, or safety advice.",
      "Continued use means you take responsibility for interpreting the data, cross-checking it against local conditions, and making your own informed decisions before any real-world fishing trip.",
    ],
  },
  {
    title: "No Warranty or Guarantee",
    paragraphs: [
      'All services, visualizations, and recommendations are provided "as is" without warranties of accuracy, reliability, or suitability for any particular purpose. Environmental conditions change rapidly, and the platform cannot guarantee up-to-date or location-specific output.',
      "You acknowledge that Fishing Report is not liable for any direct, indirect, incidental, or consequential damages arising from reliance on the provided materials, including but not limited to lost catches or equipment damage.",
    ],
  },
  {
    title: "User Conduct",
    paragraphs: [
      "You agree to use the platform responsibly, to refrain from attempting unauthorized access, and to avoid introducing malicious code or interference. You also agree not to repurpose the content for unlawful, fraudulent, or deceptive purposes.",
      "Any violation of these terms may result in immediate suspension of access and potential reporting to relevant authorities, subject to applicable law.",
    ],
  },
  {
    title: "Modification of Terms",
    paragraphs: [
      "We reserve the right to modify these Terms of Service with or without notice. Material changes will be communicated through updates on this page, and the revised terms take effect immediately upon publication.",
      "Continued use of Fishing Report after modifications constitutes acceptance of the revised terms. If you don't agree with the updated terms, please stop using the site.",
    ],
  },
];

export default function TermsOfService() {
  return (
    <ContentPage
      pageId="page-terms-of-service"
      introId="terms-header"
      titleId="terms-title"
      subtitleId="terms-summary"
      sectionsId="terms-sections"
      sectionIdPrefix="terms"
      title="Terms of Service"
      subtitle="Fishing Report is an entertainment tool. Use of the site confirms you understand the information is non-binding."
      sections={sections}
    />
  );
}
