import { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import { fetchSections } from '../api/catalog';
import LoadingState from '../components/common/LoadingState';
import ErrorState from '../components/common/ErrorState';
import SectionList from '../components/catalog/SectionList';
import { formatCurrency } from '../utils/formatters';

const TrainerPage = () => {
  const { trainerId } = useParams<{ trainerId: string }>();
  const numericId = Number(trainerId);

  const {
    data: sections,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['sections', 'trainer-detail'],
    queryFn: () => fetchSections({}),
  });

  const trainer = useMemo(() => {
    if (!sections) return undefined;
    for (const section of sections) {
      const match = section.trainers.find((t) => t.id === numericId);
      if (match) {
        return match;
      }
    }
    return undefined;
  }, [numericId, sections]);

  const trainerSections = useMemo(
    () => sections?.filter((section) => section.trainers.some((t) => t.id === numericId)) ?? [],
    [sections, numericId],
  );

  if (isError) {
    return <ErrorState message="Не вдалося завантажити інформацію про тренера" retry={refetch} />;
  }

  if (isLoading || !trainer) {
    return <LoadingState message="Завантаження тренера..." />;
  }

  return (
    <div className="detail-page">
      <section className="detail-card detail-card--hero">
        <h1 className="detail-card__title">
          {trainer.first_name} {trainer.last_name}
        </h1>
        <div className="detail-meta">
          <span>Спеціалізація: {trainer.specialization}</span>
          <span>Досвід: {trainer.experience_years} років</span>
          {trainer.center_detail && (
            <span>
              Центр:{' '}
              <Link to={`/centers/${trainer.center_detail.id}`}>{trainer.center_detail.name}</Link>
            </span>
          )}
          <span style={{ fontWeight: 600, color: 'var(--primary)' }}>
            Персональне тренування: {formatCurrency(1500)}
          </span>
        </div>
        {trainer.biography && <p>{trainer.biography}</p>}
      </section>

      <section className="detail-card">
        <h2>Секції тренера</h2>
        <SectionList sections={trainerSections} />
      </section>
    </div>
  );
};

export default TrainerPage;

