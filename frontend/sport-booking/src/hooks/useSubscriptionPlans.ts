import { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { fetchSubscriptionPlans } from '../api/customer';
import type { SubscriptionPlan } from '../types/auth';

const STORAGE_KEY = 'sb:subscriptions-cache';

const readCache = (): SubscriptionPlan[] => {
  if (typeof window === 'undefined') {
    return [];
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    return JSON.parse(raw) as SubscriptionPlan[];
  } catch {
    return [];
  }
};

export const useSubscriptionPlans = () => {
  const cached = useMemo(() => readCache(), []);

  const query = useQuery({
    queryKey: ['catalog', 'subscriptions'],
    queryFn: fetchSubscriptionPlans,
    retry: false,
    staleTime: 1000 * 60 * 10,
  });

  useEffect(() => {
    if (query.data && typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(query.data));
    }
  }, [query.data]);

  const rawPlans = query.data ?? cached;
  const plans = rawPlans.filter((plan) => plan.type !== 'SINGLE');

  return {
    plans,
    isLoading: query.isLoading && cached.length === 0,
    isError: query.isError && cached.length === 0,
    fromCache: !query.data && cached.length > 0,
    error: query.error,
  };
};

export default useSubscriptionPlans;

