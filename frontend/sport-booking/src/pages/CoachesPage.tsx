import { useMemo, useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useLocation } from 'react-router-dom';

import { fetchSections, fetchHalls } from '../api/catalog';
import LoadingState from '../components/common/LoadingState';
import ErrorState from '../components/common/ErrorState';
import CustomSelect from '../components/common/CustomSelect';
import PersonalTrainingModal from '../components/coaches/PersonalTrainingModal';
import { useAuth } from '../context/AuthContext';
import type { Trainer as CatalogTrainer } from '../types/catalog';

const CoachesPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sportFilter, setSportFilter] = useState<string>('');
  const [cityFilter, setCityFilter] = useState<string>('');
  const [selectedTrainerId, setSelectedTrainerId] = useState<number | null>(null);
  const [displayCount, setDisplayCount] = useState(10);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const { data: sections, isLoading: sectionsLoading, isError: sectionsError, refetch: refetchSections } = useQuery({
    queryKey: ['coaches'],
    queryFn: () => fetchSections({}),
  });

  const { data: halls, isLoading: hallsLoading } = useQuery({
    queryKey: ['halls'],
    queryFn: fetchHalls,
  });

  // Get all unique trainers from all sections
  const allTrainers = useMemo<CatalogTrainer[]>(() => {
    const map = new Map<number, CatalogTrainer>();
    sections?.forEach((section) => {
      section.trainers.forEach((trainer) => {
        if (!map.has(trainer.id)) {
          map.set(trainer.id, trainer);
        }
      });
    });
    return Array.from(map.values());
  }, [sections]);

  // Get filter options from all data
  const sportOptions = useMemo(() => {
    const set = new Set<string>();
    allTrainers.forEach((trainer) => set.add(trainer.specialization));
    return Array.from(set).sort();
  }, [allTrainers]);

  const cityOptions = useMemo(() => {
    if (!halls) return [];
    const centersByCity = new Map<string, Set<string>>();
    halls.forEach((hall) => {
      const city = hall.center.city;
      const centerName = hall.center.name;
      if (!centersByCity.has(city)) {
        centersByCity.set(city, new Set());
      }
      centersByCity.get(city)!.add(centerName);
    });
    const options: string[] = [];
    centersByCity.forEach((centers, city) => {
      if (centers.size > 1) {
        options.push(city);
      }
      centers.forEach((centerName) => {
        options.push(`${city} (${centerName})`);
      });
    });
    return options.sort();
  }, [halls]);

  // Reset display count when filters change
  useEffect(() => {
    setDisplayCount(10);
  }, [searchQuery, sportFilter, cityFilter]);

  // Filter trainers based on search, sport, and city
  const filteredTrainers = useMemo(() => {
    let filtered = allTrainers;

    // Search filter (case-insensitive)
    if (searchQuery.trim()) {
      const normalizedSearch = searchQuery.toLowerCase().trim();
      filtered = filtered.filter((trainer) => {
        const fullName = `${trainer.first_name} ${trainer.last_name}`.toLowerCase();
        const specialization = trainer.specialization.toLowerCase();
        return fullName.includes(normalizedSearch) || specialization.includes(normalizedSearch);
      });
    }

    // Sport filter
    if (sportFilter) {
      filtered = filtered.filter((trainer) => trainer.specialization === sportFilter);
    }

    // City filter
    if (cityFilter) {
      filtered = filtered.filter((trainer) => {
        if (!trainer.center_detail) return false;
        const centerMatch = cityFilter.match(/^(.+?)\s*\((.+?)\)$/);
        if (centerMatch) {
          const [, city, centerName] = centerMatch;
          return trainer.center_detail.city === city && trainer.center_detail.name === centerName;
        } else {
          return trainer.center_detail.city === cityFilter;
        }
      });
    }

    return filtered;
  }, [allTrainers, searchQuery, sportFilter, cityFilter]);

  const resetFilters = () => {
    setSearchQuery('');
    setSportFilter('');
    setCityFilter('');
  };

  if (sectionsLoading || hallsLoading) {
    return <LoadingState message="Завантаження тренерів..." />;
  }

  if (sectionsError) {
    return <ErrorState message="Не вдалося завантажити тренерів" retry={refetchSections} />;
  }

  return (
    <div className="detail-page">
      <section className="detail-card">
        <h1 className="detail-card__title">Тренери</h1>
        <p>
          Досвідчені тренери допоможуть обрати оптимальну програму та підтримають у досягненні
          спортивних цілей. Використайте фільтри для пошуку потрібного тренера.
        </p>
      </section>

      <section className="filters-panel">
        <div className="filters-grid">
          <label>
            Пошук
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Ім'я, прізвище або вид спорту"
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid var(--border-color)',
                borderRadius: '4px',
                fontSize: '1rem',
              }}
            />
          </label>
          <label>
            Вид спорту
            <CustomSelect
              value={sportFilter}
              onChange={(value) => setSportFilter(value === '' ? '' : String(value))}
              placeholder="Будь-який"
              options={sportOptions.map((option) => ({ value: option, label: option }))}
            />
          </label>
          <label>
            Місто
            <CustomSelect
              value={cityFilter}
              onChange={(value) => setCityFilter(value === '' ? '' : String(value))}
              placeholder="Вся мережа"
              options={cityOptions.map((option) => ({ value: option, label: option }))}
            />
          </label>
        </div>
        <div className="filters-row">
          <button type="button" className="secondary-button" onClick={resetFilters}>
            Скинути
          </button>
        </div>
      </section>

      <div className="sections-grid coaches-grid">
        {filteredTrainers.length === 0 ? (
          <div className="empty-state">Нічого не знайдено. Спробуйте змінити фільтри.</div>
        ) : (
          filteredTrainers.slice(0, displayCount).map((trainer) => (
            <article className="section-card coach-card" key={trainer.id}>
              <div className="section-card__header">
                <div>
                  <p className="section-card__title">
                    {trainer.first_name} {trainer.last_name}
                  </p>
                  <div className="section-card__meta">
                    <span className="meta-pill">{trainer.specialization}</span>
                    {trainer.center_detail && (
                      <span className="meta-pill">
                        {trainer.center_detail.city} · {trainer.center_detail.name}
                      </span>
                    )}
                  </div>
                  <p style={{ margin: '0.2rem 0 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    Досвід {trainer.experience_years}+ років
                  </p>
                </div>
              </div>
              <p style={{ margin: 0, flex: '1 1 auto' }}>{trainer.biography || 'Біографія буде додана найближчим часом.'}</p>
              <button
                type="button"
                className="primary-button"
                style={{ marginTop: 'auto', width: '100%', padding: '0.65rem 1rem', fontSize: '0.9rem' }}
                onClick={() => {
                  if (!isAuthenticated) {
                    setShowAuthPrompt(true);
                  } else {
                    setSelectedTrainerId(trainer.id);
                  }
                }}
              >
                Записатися на персональне тренування
              </button>
            </article>
          ))
        )}
      </div>
      {filteredTrainers.length > displayCount && (
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

      {showAuthPrompt && (
        <div className="modal-backdrop" onClick={() => setShowAuthPrompt(false)}>
          <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>Потрібна авторизація</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              Для запису на персональне тренування потрібно увійти або зареєструватися.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="ghost-button"
                onClick={() => setShowAuthPrompt(false)}
              >
                Скасувати
              </button>
              <button
                type="button"
                className="primary-button"
                onClick={() => {
                  setShowAuthPrompt(false);
                  navigate('/auth/login', { state: { from: location } });
                }}
              >
                Увійти
              </button>
              <button
                type="button"
                className="primary-button"
                onClick={() => {
                  setShowAuthPrompt(false);
                  navigate('/auth/register', { state: { from: location } });
                }}
              >
                Зареєструватися
              </button>
            </div>
          </div>
        </div>
      )}
      {selectedTrainerId && (
        <PersonalTrainingModal
          trainerId={selectedTrainerId}
          onClose={() => setSelectedTrainerId(null)}
        />
      )}
    </div>
  );
};

export default CoachesPage;

