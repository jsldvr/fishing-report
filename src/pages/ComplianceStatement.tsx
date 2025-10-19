import type { FC } from "react";

const sections = [
  {
    title: "Local, Regional, and Federal Obligations",
    paragraphs: [
      "Fishing operations are governed by layered regulatory authorities, including municipal ordinances, state wildlife codes, regional management councils, and federal conservation statutes. Tactical Fishing Intel delivers entertainment-grade briefings and does not supplant statutory mandates.",
      "Users must consult the controlling agency for licensing, catch limits, seasonal closures, protected species advisories, and any emergency orders in effect. Failure to comply may result in fines, permit revocation, or criminal liability.",
    ],
  },
  {
    title: "Ethical Harvest and Conservation",
    paragraphs: [
      "Compliance extends beyond numerical quotas. Ethical conduct includes promptly releasing prohibited species, respecting habitat restoration zones, and employing gear consistent with local regulations.",
      "The platform’s guidance should be interpreted as situational awareness, not a substitute for field manuals issued by conservation authorities. Responsibility for lawful and ethical execution rests entirely with the operator.",
    ],
  },
  {
    title: "Reporting and Documentation",
    paragraphs: [
      "Certain jurisdictions require catch reporting, logbook maintenance, or electronic submission of trip data. Ensure that all mandated documentation is completed accurately and within prescribed time frames.",
      "In the event of an enforcement inquiry, retain proof of licensing, catch reports, and any correspondence with authorities. Tactical Fishing Intel does not mediate compliance disputes and cannot intervene on your behalf.",
    ],
  },
  {
    title: "International Deployments",
    paragraphs: [
      "Cross-border expeditions introduce additional layers of customs, immigration, and treaty obligations. Operators are responsible for securing permissions from both origin and destination jurisdictions before engaging in transnational fishing activity.",
      "International maritime law and bilateral agreements may supersede local customs. Always coordinate with the relevant coast guard or maritime authority when conducting offshore or international missions.",
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
        All operators remain responsible for observing the fishing regulations issued by their governing authorities, regardless of Tactical Fishing Intel briefings.
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
