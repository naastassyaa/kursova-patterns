import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { loginUser } from '../api/auth';
import { fetchMyBookings, fetchMyLoyalty, fetchMyMemberships } from '../api/customer';
import type { LoginPayload } from '../types/auth';
import tokenStorage from '../utils/tokenStorage';
import { decodeJwt, type DecodedJwt } from '../utils/jwt';
import { clearCurrentProfile, ensureProfileForEmail } from '../utils/profileStorage';

type AuthUser = {
  username: string;
  role?: string;
  exp?: number;
};

type AuthContextState = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isLoading: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextState | undefined>(undefined);

const mapDecodedUser = (decoded: DecodedJwt | null, fallbackUsername?: string): AuthUser | null => {
  if (!decoded) {
    return fallbackUsername
      ? {
          username: fallbackUsername,
        }
      : null;
  }
  const username =
    (typeof decoded.username === 'string' && decoded.username) ||
    (typeof decoded.user === 'string' && decoded.user) ||
    (typeof decoded.sub === 'string' && decoded.sub) ||
    (typeof decoded.user_id === 'number' && `user-${decoded.user_id}`) ||
    fallbackUsername;
  if (!username) {
    return null;
  }
  return {
    username,
    role: typeof decoded.role === 'string' ? decoded.role : undefined,
    exp: typeof decoded.exp === 'number' ? decoded.exp : undefined,
  };
};

const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = useQueryClient();
  const [isAdmin, setIsAdmin] = useState(false);

  const prefetchCustomerContext = useCallback(async () => {
    await Promise.all([
      queryClient.prefetchQuery({ queryKey: ['me', 'memberships'], queryFn: fetchMyMemberships }),
      queryClient.prefetchQuery({ queryKey: ['me', 'loyalty'], queryFn: fetchMyLoyalty }),
      queryClient.prefetchQuery({ queryKey: ['me', 'bookings'], queryFn: fetchMyBookings }),
    ]).catch((error) => {
      console.warn('Prefetch customer context failed', error);
    });
  }, [queryClient]);

  useEffect(() => {
    const access = tokenStorage.getAccess();
    if (access) {
      const decodedToken = decodeJwt(access);
      const mappedUser = mapDecodedUser(decodedToken, tokenStorage.getUsername() ?? undefined);
      setUser(mappedUser);
      setIsAdmin(mappedUser?.role === 'ADMIN');
      prefetchCustomerContext();
    }
    setIsLoading(false);
  }, [prefetchCustomerContext]);

  const login = useCallback(
    async (payload: LoginPayload) => {
      const tokens = await loginUser(payload);
      tokenStorage.setTokens(tokens);
      tokenStorage.setUsername(payload.email);
      const decodedToken = decodeJwt(tokens.access);
      const mappedUser = mapDecodedUser(decodedToken, payload.email);
      setUser(mappedUser);
      setIsAdmin(mappedUser?.role === 'ADMIN');
      if (mappedUser?.username) {
        ensureProfileForEmail(mappedUser.username);
      }
      await prefetchCustomerContext();
    },
    [prefetchCustomerContext],
  );

  const logout = useCallback(() => {
    tokenStorage.clear();
    clearCurrentProfile();
    setUser(null);
    setIsAdmin(false);
    queryClient.clear();
  }, [queryClient]);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isAdmin,
      isLoading,
      login,
      logout,
    }),
    [isAdmin, isLoading, login, logout, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export default AuthProvider;

