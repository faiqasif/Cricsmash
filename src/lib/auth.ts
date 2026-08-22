const ACCESS_KEY = "cricket.access_token";
const REFRESH_KEY = "cricket.refresh_token";
const USER_KEY = "cricket.user";

export type AuthUser = {
  id: string;
  email: string;
  display_name: string;
  role: string;
  created_at: string;
};

export type TokenResponse = {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: AuthUser;
};

export function getAccessToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(ACCESS_KEY);
}

export function getRefreshToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(REFRESH_KEY);
}

export function getStoredUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function saveSession(data: TokenResponse) {
  window.localStorage.setItem(ACCESS_KEY, data.access_token);
  window.localStorage.setItem(REFRESH_KEY, data.refresh_token);
  window.localStorage.setItem(USER_KEY, JSON.stringify(data.user));
}

export function clearSession() {
  window.localStorage.removeItem(ACCESS_KEY);
  window.localStorage.removeItem(REFRESH_KEY);
  window.localStorage.removeItem(USER_KEY);
}
