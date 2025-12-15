import { useCallback, useState } from 'react';
import type { CatalogFilters } from '../types/catalog';

export type ViewMode = 'list' | 'map';

const defaultFilters: CatalogFilters = {
  sportType: undefined,
  level: undefined,
  ageCategory: undefined,
  city: undefined,
  search: undefined,
};

export const useCatalogFilters = () => {
  const [filters, setFilters] = useState<CatalogFilters>(defaultFilters);
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  const updateFilter = useCallback((key: keyof CatalogFilters, value?: string) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value && value.length > 0 ? value : undefined,
    }));
  }, []);

  const resetFilters = useCallback(() => setFilters(defaultFilters), []);

  return {
    filters,
    viewMode,
    setViewMode,
    updateFilter,
    resetFilters,
  };
};

