import { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import CatalogFilters from '../components/catalog/CatalogFilters';
import LoadingState from '../components/common/LoadingState';
import ErrorState from '../components/common/ErrorState';
import { fetchHalls, fetchSections } from '../api/catalog';
import { useCatalogFilters } from '../hooks/useCatalogFilters';
import { formatCurrency } from '../utils/formatters';
import type { Section } from '../types/catalog';

const SectionsExplorerPage = () => {
  const { filters, updateFilter, resetFilters, viewMode, setViewMode } = useCatalogFilters();
  const [displayCount, setDisplayCount] = useState(10);

  // Fetch all sections without filters to get all available options
  const allSectionsQuery = useQuery({
    queryKey: ['sections', 'all'],
    queryFn: () => fetchSections({}),
  });

  // Fetch filtered sections for display
  const sectionsQuery = useQuery({
    queryKey: ['sections', filters],
    queryFn: () => fetchSections(filters),
  });

  const hallsQuery = useQuery({
    queryKey: ['halls'],
    queryFn: fetchHalls,
  });

  // Get options from ALL sections, not filtered ones
  const sportOptions = useMemo(() => {
    const set = new Set<string>();
    allSectionsQuery.data?.forEach((section) => set.add(section.sportType));
    return Array.from(set).sort();
  }, [allSectionsQuery.data]);

  const levelOptions = useMemo(() => {
    const set = new Set<string>();
    allSectionsQuery.data?.forEach((section) => set.add(section.level));
    return Array.from(set).sort();
  }, [allSectionsQuery.data]);

  const ageOptions = useMemo(() => {
    const set = new Set<string>();
    allSectionsQuery.data?.forEach((section) => set.add(section.ageCategory));
    return Array.from(set).sort();
  }, [allSectionsQuery.data]);

  const cityOptions = useMemo(() => {
    if (!hallsQuery.data) return [];
    
    // Group centers by city
    const centersByCity = new Map<string, Set<string>>();
    hallsQuery.data.forEach((hall) => {
      const city = hall.center.city;
      const centerName = hall.center.name;
      
      if (!centersByCity.has(city)) {
        centersByCity.set(city, new Set());
      }
      centersByCity.get(city)!.add(centerName);
    });
    
    // Build options: city (all centers) + individual centers
    const options: string[] = [];
    centersByCity.forEach((centers, city) => {
      // Add "City (any center)" option if there are multiple centers
      if (centers.size > 1) {
        options.push(city);
      }
      // Add individual center options
      centers.forEach((centerName) => {
        options.push(`${city} (${centerName})`);
      });
    });
    
    return options.sort();
  }, [hallsQuery.data]);

  const filteredSections = sectionsQuery.data ?? [];
  
  // Reset display count when filters change
  useEffect(() => {
    setDisplayCount(10);
  }, [filters]);

  if (sectionsQuery.isLoading || allSectionsQuery.isLoading || hallsQuery.isLoading) {
    return <LoadingState message="Завантаження секцій..." />;
  }

  if (sectionsQuery.isError || allSectionsQuery.isError || hallsQuery.isError) {
    return <ErrorState message="Не вдалося завантажити секції" retry={() => {
      sectionsQuery.refetch();
      allSectionsQuery.refetch();
    }} />;
  }

  return (
    <div className="detail-page">
      <section className="detail-card">
        <h1 className="detail-card__title">Секції та програми</h1>
        <p>
          Використайте фільтри, щоб знайти ідеальний формат тренувань. Вибрані картки показують
          ключові параметри заняття: зал, рівень, тренерів та базову ціну.
        </p>
      </section>

      <CatalogFilters
        filters={filters}
        sportOptions={sportOptions}
        levelOptions={levelOptions}
        ageOptions={ageOptions}
        cityOptions={cityOptions}
        onFilterChange={updateFilter}
        onReset={resetFilters}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        showViewToggle={false}
      />

      <div className="sections-grid sections-grid--wide">
        {filteredSections.length === 0 ? (
          <div className="empty-state">Нічого не знайдено. Спробуйте змінити фільтри.</div>
        ) : (
          filteredSections.slice(0, displayCount).map((section) => <SectionCard key={section.id} section={section} />)
        )}
      </div>
      {filteredSections.length > displayCount && (
        <div style={{ textAlign: 'center', marginTop: '2rem' }}>
          <button
            type="button"
            className="primary-button"
            onClick={() => setDisplayCount((prev) => prev + 10)}
          >
            Завантажити ще
          </button>
        </div>
      )}
    </div>
  );
};

const SectionCard = ({ section }: { section: Section }) => (
  <Link to={`/sections/${section.id}`} className="section-card section-card--wide section-card--clickable">
    <div className="section-card__info">
      <p className="section-card__title">{section.sportType}</p>
      <div className="section-card__meta">
        <span className="meta-pill">{section.level}</span>
        <span className="meta-pill">{section.ageCategory}</span>
        {section.hall_name && <span className="meta-pill">{section.hall_name}</span>}
        {section.center_name && (
          <span className="meta-pill" style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary)' }}>
            {section.center_city} · {section.center_name}
          </span>
        )}
      </div>
      <p style={{ margin: '0.25rem 0 0', color: 'var(--text-muted)' }}>{section.description}</p>
      <div className="trainer-chips" style={{ marginTop: '0.5rem' }}>
        {section.trainers.map((trainer) => (
          <span className="trainer-chip" key={trainer.id}>
            {trainer.first_name} {trainer.last_name}
          </span>
        ))}
        {section.trainers.length === 0 && <span className="trainer-chip">Тренер уточнюється</span>}
      </div>
    </div>
    <div className="section-card__summary">
      <p className="price-badge">{formatCurrency(section.base_price)}</p>
      <p className="highlight-text">{section.capacity} учасників</p>
    </div>
  </Link>
);

export default SectionsExplorerPage;

