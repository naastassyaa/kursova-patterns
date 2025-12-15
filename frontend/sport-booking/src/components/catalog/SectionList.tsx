import type { Section } from '../../types/catalog';
import SectionCard from './SectionCard';

type SectionListProps = {
  sections: Section[];
  getSectionCity?: (section: Section) => string | undefined;
};

const SectionList = ({ sections, getSectionCity }: SectionListProps) => {
  if (sections.length === 0) {
    return <div className="empty-state">Не знайдено секцій за заданими критеріями.</div>;
  }
  return (
    <div className="sections-grid">
      {sections.map((section) => (
        <SectionCard
          key={section.id}
          section={section}
          city={getSectionCity ? getSectionCity(section) : undefined}
        />
      ))}
    </div>
  );
};

export default SectionList;

