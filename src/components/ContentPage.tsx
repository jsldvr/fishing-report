export interface ContentPageSection {
  title: string;
  paragraphs: string[];
}

interface ContentPageProps {
  pageId: string;
  introId: string;
  titleId: string;
  subtitleId: string;
  sectionsId: string;
  sectionIdPrefix: string;
  title: string;
  subtitle: string;
  sections: ContentPageSection[];
}

export default function ContentPage({
  pageId,
  introId,
  titleId,
  subtitleId,
  sectionsId,
  sectionIdPrefix,
  title,
  subtitle,
  sections,
}: ContentPageProps) {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8" id={pageId}>
      <div className="text-center mb-8" id={introId}>
        <h1 className="text-2xl font-bold text-gray-900 mb-4" id={titleId}>
          {title}
        </h1>
        <p className="text-lg text-gray-600" id={subtitleId}>
          {subtitle}
        </p>
      </div>

      <div className="grid gap-8" id={sectionsId}>
        {sections.map((section, index) => (
          <article
            className="card p-6"
            id={`${sectionIdPrefix}-section-${index + 1}`}
            key={section.title}
          >
            <h2
              className="text-xl font-semibold mb-4"
              id={`${sectionIdPrefix}-section-title-${index + 1}`}
            >
              {section.title}
            </h2>
            <div
              className="space-y-4 text-sm text-gray-600 leading-relaxed"
              id={`${sectionIdPrefix}-section-${index + 1}-content`}
            >
              {section.paragraphs.map((paragraph, paragraphIndex) => (
                <p
                  id={`${sectionIdPrefix}-section-${index + 1}-paragraph-${
                    paragraphIndex + 1
                  }`}
                  key={`${section.title}-${paragraphIndex}`}
                >
                  {paragraph}
                </p>
              ))}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
