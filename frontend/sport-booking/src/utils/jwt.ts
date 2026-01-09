export type DecodedJwt = {
  username?: string;
  role?: string;
  exp?: number;
  [key: string]: unknown;
};

const padBase64 = (input: string) => {
  const padding = (4 - (input.length % 4)) % 4;
  return input + '='.repeat(padding);
};

export const decodeJwt = (token: string): DecodedJwt | null => {
  try {
    const payload = token.split('.')[1];
    if (!payload) {
      return null;
    }
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = atob(padBase64(normalized));
    return JSON.parse(decoded);
  } catch (error) {
    console.error('Failed to decode JWT', error);
    return null;
  }
};

