export type LoginPayload = {
  email: string;
  password: string;
};

export type RegisterPayload = {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
};

export type TokenResponse = {
  access: string;
  refresh: string;
};

export type LoyaltyAccount = {
  id: number;
  points: number;
  tier: {
    name: string;
    code: string;
    multiplier: string;
  };
};

export type SubscriptionDetail = {
  id: number;
  type: string;
  price: string;
  duration: number;
  description?: string;
  perks?: Record<string, unknown>;
};

export type MembershipInvitation = {
  id: number;
  email: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';
  invited_by: number;
  invited_by_name?: string;
  token: string;
  created_at: string;
  expires_at: string;
};

export type TeamMember = {
  id: number;
  username: string;
  email: string;
};

export type Membership = {
  id: number;
  status: string;
  start_date: string;
  end_date: string;
  auto_renew: boolean;
  subscription_detail: SubscriptionDetail;
  owner?: number;
  owner_name?: string;
  invitations?: MembershipInvitation[];
  is_corporate?: boolean;
  team_members?: TeamMember[];
};

export type ScheduleSlotDetail = {
  id: number;
  start_time: string;
  end_time: string;
  hall: {
    name: string;
    center_name?: string;
  };
  section: {
    id: number;
    sportType: string;
    level: string;
  };
};

export type PaymentMethod = 'CARD' | 'APPLE_PAY' | 'GOOGLE_PAY' | 'CASH';

export type Payment = {
  method: PaymentMethod;
  status: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
};

export type Booking = {
  id: number;
  status: string;
  price: string;
  created_at: string;
  schedule_slot_detail: ScheduleSlotDetail;
  payment?: Payment;
  notes?: string;
};

export type SubscriptionPlan = {
  id: number;
  type: string;
  price: string;
  duration: number;
  description?: string;
  perks?: Record<string, unknown>;
};

export type BookingPayload = {
  schedule_slot: number;
  payment_method: PaymentMethod;
  notes?: string;
};

export type NotificationType = 'REMINDER' | 'PROMO' | 'LOYALTY' | 'SYSTEM';

export type Notification = {
  id: number;
  title: string;
  message: string;
  type: NotificationType;
  is_read: boolean;
  created_at: string;
  scheduled_for?: string | null;
};


