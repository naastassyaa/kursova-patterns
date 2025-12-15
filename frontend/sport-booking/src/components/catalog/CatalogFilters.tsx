import type { CatalogFilters as CatalogFilterState } from '../../types/catalog';
import type { ViewMode } from '../../hooks/useCatalogFilters';
import CustomSelect from '../common/CustomSelect';

type CatalogFiltersProps = {
  filters: CatalogFilterState;
  sportOptions: string[];
  levelOptions: string[];
  ageOptions: string[];
  cityOptions: string[];
  onFilterChange: (key: keyof CatalogFilterState, value?: string) => void;
  onReset: () => void;
  viewMode?: ViewMode;
  onViewModeChange?: (mode: ViewMode) => void;
  showViewToggle?: boolean;
};

export const CatalogFilters = ({
  filters,
  sportOptions,
  levelOptions,
  ageOptions,
  cityOptions,
  onFilterChange,
  onReset,
  viewMode,
  onViewModeChange,
  showViewToggle = true,
}: CatalogFiltersProps) => (
  <section className="filters-panel">
    <div className="filters-grid">
      <label>
        Вид спорту
        <CustomSelect
          value={filters.sportType ?? ''}
          onChange={(value) => onFilterChange('sportType', value === '' ? undefined : String(value))}
          placeholder="Будь-який"
          options={sportOptions.map((option) => ({ value: option, label: option }))}
        />
      </label>
      <label>
        Рівень
        <CustomSelect
          value={filters.level ?? ''}
          onChange={(value) => onFilterChange('level', value === '' ? undefined : String(value))}
          placeholder="Будь-який"
          options={levelOptions.map((option) => ({ value: option, label: option }))}
        />
      </label>
      <label>
        Вікова категорія
        <CustomSelect
          value={filters.ageCategory ?? ''}
          onChange={(value) => onFilterChange('ageCategory', value === '' ? undefined : String(value))}
          placeholder="Будь-яка"
          options={ageOptions.map((option) => ({ value: option, label: option }))}
        />
      </label>
      <label>
        Місто
        <CustomSelect
          value={filters.city ?? ''}
          onChange={(value) => onFilterChange('city', value === '' ? undefined : String(value))}
          placeholder="Вся мережа"
          options={cityOptions.map((option) => ({ value: option, label: option }))}
        />
      </label>
    </div>
    <div className="filters-row">
      <button type="button" className="secondary-button" onClick={onReset}>
        Скинути
      </button>
      {showViewToggle && viewMode && onViewModeChange && (
        <div className="view-toggle">
          <button
            type="button"
            className={viewMode === 'list' ? 'active' : ''}
            onClick={() => onViewModeChange('list')}
          >
            Список
          </button>
          <button
            type="button"
            className={viewMode === 'map' ? 'active' : ''}
            onClick={() => onViewModeChange('map')}
          >
            Мапа
          </button>
        </div>
      )}
    </div>
  </section>
);

export default CatalogFilters;

