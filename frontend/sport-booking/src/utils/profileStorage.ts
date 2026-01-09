export type StoredProfile = {
  firstName: string;
  lastName: string;
  dob: string;
  email: string;
  phone: string;
};

const CURRENT_KEY = 'sb:profile';
const MAP_KEY = 'sb:profile:map';

const readMap = (): Record<string, StoredProfile> => {
  if (typeof window === 'undefined') {
    return {};
  }
  try {
    const raw = window.localStorage.getItem(MAP_KEY);
    return raw ? (JSON.parse(raw) as Record<string, StoredProfile>) : {};
  } catch {
    return {};
  }
};

const writeMap = (map: Record<string, StoredProfile>) => {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.setItem(MAP_KEY, JSON.stringify(map));
};

export const loadProfile = (): StoredProfile | null => {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(CURRENT_KEY);
    return raw ? (JSON.parse(raw) as StoredProfile) : null;
  } catch {
    return null;
  }
};

export const saveProfile = (profile: StoredProfile) => {
  if (typeof window === 'undefined') {
    return;
  }
  const map = readMap();
  if (profile.email) {
    map[profile.email] = profile;
    writeMap(map);
  }
  window.localStorage.setItem(CURRENT_KEY, JSON.stringify(profile));
};

export const clearCurrentProfile = () => {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.removeItem(CURRENT_KEY);
};

export const ensureProfileForEmail = (
  email: string,
  defaults: Partial<StoredProfile> = {},
): StoredProfile | null => {
  if (typeof window === 'undefined') {
    return null;
  }
  const map = readMap();
  if (email && map[email]) {
    const profile = map[email];
    window.localStorage.setItem(CURRENT_KEY, JSON.stringify(profile));
    return profile;
  }
  if (!email) {
    return null;
  }
  const profile: StoredProfile = {
    firstName: '',
    lastName: '',
    dob: '',
    email,
    phone: '',
    ...defaults,
  };
  saveProfile(profile);
  return profile;
};

