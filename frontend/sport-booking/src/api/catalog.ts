import apiClient from './client';
import type { CatalogFilters, GymHall, ScheduleSlot, Section, SportCenter } from '../types/catalog';

const normalizeParams = (filters: CatalogFilters) => {
  const params: Record<string, string> = {};
  if (filters.sportType) params.sportType = filters.sportType;
  if (filters.level) params.level = filters.level;
  if (filters.ageCategory) params.ageCategory = filters.ageCategory;
  return params;
};

export const fetchSections = async (filters: CatalogFilters = {}) => {
  const { data } = await apiClient.get<Section[]>('/catalog/sections/', {
    params: normalizeParams(filters),
  });
  if (!filters.search && !filters.city) {
    return data;
  }
  const normalizedSearch = filters.search?.toLowerCase().trim();
  return data.filter((section) => {
    const matchesSearch = normalizedSearch
      ? [
          section.sportType,
          section.level,
          section.description ?? '',
          section.hall_name,
          ...section.trainers.map((trainer) => `${trainer.first_name} ${trainer.last_name}`),
        ]
          .join(' ')
          .toLowerCase()
          .includes(normalizedSearch)
      : true;
    
    // Handle city filter: can be "City" or "City (Center Name)"
    const matchesCity = filters.city
      ? (() => {
          // Check if it's a specific center format: "City (Center Name)"
          const centerMatch = filters.city.match(/^(.+?)\s*\((.+?)\)$/);
          if (centerMatch) {
            const [, city, centerName] = centerMatch;
            // Match both city and center name
            return section.trainers.some(
              (trainer) =>
                trainer.center_detail?.city === city &&
                trainer.center_detail?.name === centerName
            );
          } else {
            // Just city name - match any center in that city
            return section.trainers.some(
              (trainer) => trainer.center_detail?.city === filters.city
            );
          }
        })()
      : true;
    
    return matchesSearch && matchesCity;
  });
};

export const fetchCenters = async () => {
  const { data } = await apiClient.get<SportCenter[]>('/catalog/centers/');
  return data;
};

export const fetchHalls = async () => {
  const { data } = await apiClient.get<GymHall[]>('/catalog/halls/');
  return data;
};

export type ScheduleFilters = {
  sportType?: string;
  hallId?: number;
  city?: string;
  trainerId?: number;
};

export const fetchScheduleSlots = async (filters: ScheduleFilters = {}) => {
  const params: Record<string, string | number> = {};
  if (filters.sportType) params['section__sportType'] = filters.sportType;
  if (filters.hallId) params.hall = filters.hallId;
  if (filters.city) params['hall__center__city'] = filters.city;
  if (filters.trainerId) params.trainer = filters.trainerId;
  const { data } = await apiClient.get<ScheduleSlot[]>('/catalog/schedules/', { params });
  return data;
};

export const fetchScheduleSlotById = async (id: number) => {
  const { data } = await apiClient.get<ScheduleSlot>(`/catalog/schedules/${id}/`);
  return data;
};

export const fetchSectionById = async (id: string | number) => {
  const { data } = await apiClient.get<Section>(`/catalog/sections/${id}/`);
  return data;
};

