import type { FC } from "react";

const sections = [
  {
    title: "Acceptance of Mission Parameters",
    paragraphs: [
      "By accessing Tactical Fishing Intel, you enter into a binding agreement stipulating that all forecasts, analyses, and mission briefings are for entertainment and illustrative purposes only. The site delivers scenario-based intelligence and does not constitute certified meteorological, legal, or safety advice.",
      "Continued use signifies that you assume full responsibility for interpreting the data, cross-checking the information against local conditions, and making informed decisions before deploying to any real-world fishing operation.",
    ],
  },
  {
    title: "No Warranty or Operational Guarantee",
    paragraphs: [
      "All services, visualizations, and recommendations are provided “as is,” without warranties of accuracy, reliability, or suitability for any particular mission profile. Environmental conditions change rapidly; the platform cannot guarantee up-to-date or location-specific compliance output.",
      "You acknowledge that Tactical Fishing Intel shall not be liable for any direct, indirect, incidental, or consequential damages arising from reliance on the provided materials, including but not limited to lost catches, equipment damage, or inter-agency reprimands.",
    ],
  },
  {
    title: "User Conduct and Mission Discipline",
    paragraphs: [
      "You agree to deploy the platform responsibly, to refrain from attempting unauthorized access, and to avoid introducing malicious code or interference. You also agree not to repurpose the content for unlawful, fraudulent, or deceptive operations.",
      "Any breach of mission discipline may result in immediate suspension of access privileges and potential reporting to relevant authorities, subject to applicable law.",
    ],
  },
  {
    title: "Modification of Terms",
    paragraphs: [
      "We reserve the right to modify these Terms of Service with or without notice. Material changes will be communicated through updates on this page, and the revised terms will become effective immediately upon publication.",
      "Your continued engagement with Tactical Fishing Intel after modifications constitutes acceptance of the revised terms. If you reject the updated provisions, your mission parameters require you to disengage from the platform.",
    ],
  },
];

const TermsOfService: FC = () => (
  <section className="legal-page" id="page-terms-of-service">
    <header className="legal-header" id="terms-header">
      <h1 className="legal-title" id="terms-title">
        Terms of Service
      </h1>
      <p className="legal-summary" id="terms-summary">
        Tactical Fishing Intel operates as an entertainment briefing. Use of the site confirms you understand the information is non-binding.
      </p>
    </header>
    {sections.map((section, index) => (
      <article
        className="legal-section"
        id={`terms-section-${index + 1}`}
        key={section.title}
      >
        <h2
          className="legal-heading"
          id={`terms-section-title-${index + 1}`}
        >
          {section.title}
        </h2>
        {section.paragraphs.map((paragraph, paragraphIndex) => (
          <p
            className="legal-paragraph"
            id={`terms-section-${index + 1}-paragraph-${paragraphIndex + 1}`}
            key={`${section.title}-${paragraphIndex}`}
          >
            {paragraph}
          </p>
        ))}
      </article>
    ))}
  </section>
);

export default TermsOfService;
