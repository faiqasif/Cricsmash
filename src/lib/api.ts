function usesNextApi(path: string) {
  return (
    path.startsWith("/api/v1/players") ||
    path.startsWith("/api/v1/player-fields") ||
    path.startsWith("/api/v1/auth") ||
    path.startsWith("/api/v1/team-of-the-day") ||
    path.startsWith("/api/v1/categories") ||
    path.startsWith("/api/v1/questions") ||
    path.startsWith("/api/v1/daily-quiz") ||
    path.startsWith("/api/v1/tournaments")
  );
}

function apiBaseUrl() {
  const fromEnv = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  if (process.env.NODE_ENV === "development") return "http://localhost:8080";
  return "";
}

const API_URL = apiBaseUrl();

import {
  clearSession,
  getAccessToken,
  getRefreshToken,
  saveSession,
  type TokenResponse,
} from "@/lib/auth";

export class ApiError extends Error {
  code: string;
  status: number;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

type Envelope<T> = {
  data?: T;
  error?: { code: string; message: string };
};

let refreshPromise: Promise<boolean> | null = null;

async function parseEnvelope<T>(res: Response): Promise<Envelope<T>> {
  if (res.status === 204) return {};
  return (await res.json()) as Envelope<T>;
}

function authHeaders(token: string | null, extra?: HeadersInit): Headers {
  const headers = new Headers(extra);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  return headers;
}

async function rawFetch(path: string, init: RequestInit | undefined, token: string | null) {
  const headers = authHeaders(token, init?.headers);
  if (!headers.has("Content-Type") && init?.body && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  const base = usesNextApi(path) ? "" : API_URL;
  return fetch(`${base}${path}`, { ...init, headers });
}

async function tryRefresh(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const res = await fetch("/api/v1/auth/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
      const body = await parseEnvelope<TokenResponse>(res);
      if (!res.ok || !body.data) {
        clearSession();
        return false;
      }
      saveSession(body.data);
      return true;
    } catch {
      clearSession();
      return false;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

function redirectToLogin() {
  if (typeof window !== "undefined" && window.location.pathname !== "/login") {
    window.location.href = "/login";
  }
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  let res = await rawFetch(path, init, getAccessToken());

  if (res.status === 401 && !path.startsWith("/api/v1/auth/")) {
    const ok = await tryRefresh();
    if (ok) {
      res = await rawFetch(path, init, getAccessToken());
    } else {
      redirectToLogin();
      throw new ApiError(401, "unauthorized", "Session expired. Please sign in again.");
    }
  }

  if (res.status === 204) {
    return undefined as T;
  }

  const body = await parseEnvelope<T>(res);
  if (!res.ok) {
    throw new ApiError(
      res.status,
      body.error?.code ?? "error",
      body.error?.message ?? "Request failed",
    );
  }
  return body.data as T;
}
