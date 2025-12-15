const ACCESS_TOKEN_KEY = 'sb:token';
const REFRESH_TOKEN_KEY = 'sb:refresh';
const USERNAME_KEY = 'sb:username';

export type Tokens = {
  access: string;
  refresh: string;
};

export const tokenStorage = {
  getAccess(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  },
  getRefresh(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  },
  setTokens(tokens: Tokens) {
    localStorage.setItem(ACCESS_TOKEN_KEY, tokens.access);
    localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh);
  },
  setUsername(username: string) {
    localStorage.setItem(USERNAME_KEY, username);
  },
  getUsername(): string | null {
    return localStorage.getItem(USERNAME_KEY);
  },
  clear() {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USERNAME_KEY);
  },
  isAuthenticated() {
    return Boolean(this.getAccess());
  },
};

export default tokenStorage;

