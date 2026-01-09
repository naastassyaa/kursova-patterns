export type SportCenter = {
  id: number;
  name: string;
  city: string;
  address: string;
  contact_phone: string;
  email?: string;
  description?: string;
  opening_hours?: string;
};

export type GymHall = {
  id: number;
  name: string;
  type: string;
  capacity: number;
  availability?: string;
  equipment?: string;
  center: SportCenter;
};

export type Trainer = {
  id: number;
  first_name: string;
  last_name: string;
  specialization: string;
  experience_years: number;
  biography?: string;
  photo?: string;
  center_detail?: SportCenter;
};

export type Section = {
  id: number;
  sportType: string;
  level: string;
  ageCategory: string;
  capacity: number;
  base_price: string;
  description?: string;
  hall_name: string;
  center_name?: string;
  center_city?: string;
  trainers: Trainer[];
};

export type ScheduleSlot = {
  id: number;
  section: Section;
  hall: GymHall;
  trainer?: Trainer | null;
  start_time: string;
  end_time: string;
  available_spots: number;
  price: string;
  final_price?: number;
  discount_amount?: number;
  discount_percentage?: number;
  promotion?: {
    id: number;
    title: string;
    description: string;
  } | null;
};

export type CatalogFilters = {
  sportType?: string;
  level?: string;
  ageCategory?: string;
  city?: string;
  search?: string;
};

