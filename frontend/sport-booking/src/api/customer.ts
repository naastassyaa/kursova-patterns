import apiClient from './client';
import type {
  Booking,
  BookingPayload,
  LoyaltyAccount,
  Membership,
  MembershipInvitation,
  Notification,
  SubscriptionPlan,
} from '../types/auth';

export const fetchMyMemberships = async () => {
  const { data } = await apiClient.get<Membership[]>('/me/memberships/');
  return data;
};

export const fetchMyLoyalty = async () => {
  const { data } = await apiClient.get<LoyaltyAccount[]>('/me/loyalty/');
  return data[0] ?? null;
};

export const fetchMyBookings = async () => {
  const { data } = await apiClient.get<Booking[]>('/me/bookings/');
  return data;
};

export const createBooking = async (payload: BookingPayload) => {
  const { data } = await apiClient.post<Booking>('/me/bookings/', payload);
  return data;
};

export const cancelBooking = async (bookingId: number) => {
  const { data } = await apiClient.post<Booking>(`/me/bookings/${bookingId}/cancel/`);
  return data;
};

export const createMembership = async (payload: {
  subscription: number;
  start_date: string;
  end_date: string;
  auto_renew?: boolean;
  payment_method?: string;
}) => {
  const { data } = await apiClient.post<Membership>('/me/memberships/', {
    subscription: payload.subscription,
    start_date: payload.start_date,
    end_date: payload.end_date,
    auto_renew: payload.auto_renew,
    payment_method: payload.payment_method ?? 'CARD',
  });
  return data;
};

export const updateMembership = async (
  membershipId: number,
  payload: Partial<Pick<Membership, 'auto_renew' | 'status'>>,
) => {
  const { data } = await apiClient.patch<Membership>(`/me/memberships/${membershipId}/`, payload);
  return data;
};

export const deleteMembership = async (membershipId: number) => {
  await apiClient.delete(`/me/memberships/${membershipId}/`);
};

export const inviteUserToMembership = async (membershipId: number, email: string) => {
  const { data } = await apiClient.post<MembershipInvitation>(
    `/me/memberships/${membershipId}/invite_user/`,
    { email },
  );
  return data;
};

export const acceptInvitation = async (token: string) => {
  const { data } = await apiClient.post<Membership>(
    '/me/memberships/accept_invitation/',
    { token },
  );
  return data;
};

export const fetchSubscriptionPlans = async () => {
  const { data } = await apiClient.get<SubscriptionPlan[]>('/catalog/subscriptions/');
  return data;
};

export const fetchNotifications = async () => {
  const { data } = await apiClient.get<Notification[]>('/me/notifications/');
  return data;
};

export const markNotificationRead = async (id: number) => {
  const { data } = await apiClient.post<Notification>(`/me/notifications/${id}/mark_read/`);
  return data;
};

export type UserProfile = {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  date_of_birth: string | null;
  preferred_sports: string;
  training_level: string;
};

export const fetchMyProfile = async () => {
  const { data } = await apiClient.get<UserProfile>('/me/profile/me/');
  return data;
};

export const updateMyProfile = async (payload: Partial<UserProfile>) => {
  const { data } = await apiClient.patch<UserProfile>('/me/profile/me/', payload);
  return data;
};

export type Promotion = {
  id: number;
  title: string;
  description: string;
  scope: 'GENERAL' | 'PERSONAL';
  discount_type: 'BOOKING' | 'SUBSCRIPTION' | 'INFO';
  discount_value_type: 'PERCENTAGE' | 'FIXED';
  discount_value: number | null;
  start_date: string;
  end_date: string;
  target_section?: number | null;
  target_center?: number | null;
  target_age_category?: string | null;
   target_subscription?: number | null;
   target_subscription_type?: string | null;
};

export const fetchMyPromotions = async () => {
  const { data } = await apiClient.get<Promotion[]>('/me/promotions/');
  return data;
};

