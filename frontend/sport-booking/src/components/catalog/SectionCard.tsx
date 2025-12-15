import { Link } from 'react-router-dom';
import type { Section } from '../../types/catalog';
import { formatCurrency } from '../../utils/formatters';

type SectionCardProps = {
  section: Section;
  city?: string;
};

const SectionCard = ({ section, city }: SectionCardProps) => {
  const priceLabel = formatCurrency(section.base_price);
  return (
    <article className="section-card">
      <div className="section-card__header">
        <div>
          <p className="section-card__title">{section.sportType}</p>
          <div className="section-card__meta">
            <span className="meta-pill">{section.level}</span>
            <span className="meta-pill">{section.ageCategory}</span>
            {city && <span className="meta-pill">{city}</span>}
          </div>
          <p style={{ margin: '0.2rem 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            {section.hall_name}
          </p>
        </div>
        <span className="price-badge">{priceLabel}</span>
      </div>
      {section.description && (
        <p style={{ margin: 0, color: 'var(--text-muted)', flex: '1 1 auto' }}>{section.description}</p>
      )}
      <div>
        <p style={{ fontWeight: 600, marginBottom: '0.35rem' }}>Тренери</p>
        <div className="trainer-chips">
          {section.trainers.map((trainer) => (
            <Link className="trainer-chip" key={trainer.id} to={`/trainers/${trainer.id}`}>
              {trainer.first_name} {trainer.last_name}
            </Link>
          ))}
          {section.trainers.length === 0 && (
            <span className="trainer-chip" style={{ opacity: 0.7 }}>
              Тренер не вказаний
            </span>
          )}
        </div>
      </div>
      <div className="badges-row" style={{ marginTop: 'auto' }}>
        <span className="badge ghost">Вмістимість: {section.capacity} осіб</span>
        <Link className="badge primary" to={`/sections/${section.id}`}>
          Деталі секції
        </Link>
      </div>
    </article>
  );
};

export default SectionCard;

