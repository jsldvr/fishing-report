import type { FC } from "react";

const sections = [
  {
    title: "Local, Regional, and Federal Obligations",
    paragraphs: [
      "Fishing is governed by layered regulatory authorities, including municipal ordinances, state wildlife codes, regional management councils, and federal conservation statutes. Fishing Report provides entertainment-grade forecasts and does not replace statutory requirements.",
      "You must consult the controlling agency for licensing, catch limits, seasonal closures, protected species advisories, and any emergency orders in effect. Failure to comply may result in fines, permit revocation, or criminal liability.",
    ],
  },
  {
    title: "Ethical Harvest and Conservation",
    paragraphs: [
      "Compliance extends beyond numerical quotas. Ethical conduct includes promptly releasing prohibited species, respecting habitat restoration zones, and using gear consistent with local regulations.",
      "This app's guidance is informational, not a substitute for field manuals issued by conservation authorities. Responsibility for lawful and ethical fishing rests entirely with you.",
    ],
  },
  {
    title: "Reporting and Documentation",
    paragraphs: [
      "Certain jurisdictions require catch reporting, logbook maintenance, or electronic submission of trip data. Make sure any required documentation is completed accurately and on time.",
      "If you're subject to an enforcement inquiry, retain proof of licensing, catch reports, and any correspondence with authorities. Fishing Report does not mediate compliance disputes and cannot intervene on your behalf.",
    ],
  },
  {
    title: "International Trips",
    paragraphs: [
      "Cross-border trips add customs, immigration, and treaty obligations. You are responsible for securing permissions from both origin and destination jurisdictions before fishing across borders.",
      "International maritime law and bilateral agreements may override local customs. Always coordinate with the relevant coast guard or maritime authority when fishing offshore or internationally.",
    ],
  },
];

const ComplianceStatement: FC = () => (
  <section className="legal-page" id="page-compliance-statement">
    <header className="legal-header" id="compliance-header">
      <h1 className="legal-title" id="compliance-title">
        Compliance Statement
      </h1>
      <p className="legal-summary" id="compliance-summary">
        You remain responsible for observing the fishing regulations issued by your governing authorities, regardless of what Fishing Report shows.
      </p>
    </header>
    {sections.map((section, index) => (
      <article
        className="legal-section"
        id={`compliance-section-${index + 1}`}
        key={section.title}
      >
        <h2
          className="legal-heading"
          id={`compliance-section-title-${index + 1}`}
        >
          {section.title}
        </h2>
        {section.paragraphs.map((paragraph, paragraphIndex) => (
          <p
            className="legal-paragraph"
            id={`compliance-section-${index + 1}-paragraph-${paragraphIndex + 1}`}
            key={`${section.title}-${paragraphIndex}`}
          >
            {paragraph}
          </p>
        ))}
      </article>
    ))}
  </section>
);

export default ComplianceStatement;
