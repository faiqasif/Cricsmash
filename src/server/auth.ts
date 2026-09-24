import type { AuthUser, TokenResponse } from "@/lib/auth";
import { withFirebaseUser } from "@/lib/firebase";

type Json = Record<string, unknown>;

export class AuthError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "AuthError";
    this.status = status;
  }
}

function apiKey() {
  const value = process.env.FIREBASE_API_KEY?.trim();
  if (!value) throw new AuthError(500, "Firebase config is missing.");
  return value;
}

function authMessage(code: string) {
  if (
    code.includes("INVALID_LOGIN_CREDENTIALS") ||
    code.includes("EMAIL_NOT_FOUND") ||
    code.includes("INVALID_PASSWORD") ||
    code.includes("INVALID_EMAIL")
  ) {
    return "Email or password is incorrect.";
  }
  if (code.includes("USER_DISABLED")) return "This account is disabled.";
  if (code.includes("TOO_MANY_ATTEMPTS")) return "Too many attempts. Try again later.";
  if (code.includes("OPERATION_NOT_ALLOWED") || code.includes("CONFIGURATION_NOT_FOUND")) {
    return "Email and password sign-in is not enabled in Firebase Authentication yet.";
  }
  if (code.includes("TOKEN_EXPIRED") || code.includes("INVALID_ID_TOKEN") || code.includes("INVALID_REFRESH_TOKEN") || code.includes("invalid_grant")) {
    return "Session expired. Please sign in again.";
  }
  return "Could not sign in.";
}

async function identityFetch(url: URL, init?: RequestInit) {
  url.searchParams.set("key", apiKey());
  const res = await fetch(url, init);
  const body = (await res.json().catch(() => ({}))) as Json;
  if (!res.ok) {
  const raw =
    typeof body.error === "string"
      ? body.error
      : body.error && typeof body.error === "object"
        ? String((body.error as Json).message ?? "")
        : "";
  const expired = /TOKEN_EXPIRED|INVALID_ID_TOKEN|INVALID_REFRESH_TOKEN|invalid_grant/i.test(raw);
  const rejected = expired || /INVALID_LOGIN_CREDENTIALS|EMAIL_NOT_FOUND|INVALID_PASSWORD/i.test(raw);
  throw new AuthError(rejected ? 401 : 400, authMessage(raw));
  }
  return body;
}

function displayName(email: string, name: unknown) {
  if (typeof name === "string" && name.trim()) return name.trim();
  const local = email.split("@")[0]?.replace(/[._-]+/g, " ").trim();
  return local ? local.replace(/\b\w/g, (letter) => letter.toUpperCase()) : "Admin";
}

function toUser(record: Json): AuthUser {
  const email = typeof record.email === "string" ? record.email : "";
  const created = typeof record.createdAt === "string" ? Number(record.createdAt) : Number.NaN;
  return {
    id: typeof record.localId === "string" ? record.localId : typeof record.user_id === "string" ? record.user_id : "",
    email,
    display_name: displayName(email, record.displayName),
    role: "admin",
    created_at: Number.isFinite(created) ? new Date(created).toISOString() : new Date().toISOString(),
  };
}

function session(idToken: string, refreshToken: string, expiresIn: string, user: AuthUser): TokenResponse {
  return {
    access_token: idToken,
    refresh_token: refreshToken,
    token_type: "Bearer",
    expires_in: Number(expiresIn) || 3600,
    user,
  };
}

export async function signIn(email: string, password: string) {
  const trimmed = email.trim();
  if (!trimmed || !password) throw new AuthError(400, "Email and password are required.");
  const body = await identityFetch(new URL("https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: trimmed, password, returnSecureToken: true }),
  });
  const idToken = String(body.idToken ?? "");
  const refreshToken = String(body.refreshToken ?? "");
  if (!idToken || !refreshToken) throw new AuthError(502, "Firebase did not return a session.");
  const user = toUser({
    localId: body.localId,
    email: body.email ?? trimmed,
    displayName: body.displayName,
  });
  return session(idToken, refreshToken, String(body.expiresIn ?? "3600"), user);
}

export async function refreshSession(refreshToken: string) {
  if (!refreshToken.trim()) throw new AuthError(401, "Session expired. Please sign in again.");
  const url = new URL("https://securetoken.googleapis.com/v1/token");
  const body = await identityFetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: refreshToken }),
  });
  const idToken = String(body.id_token ?? body.access_token ?? "");
  const nextRefresh = String(body.refresh_token ?? refreshToken);
  if (!idToken) throw new AuthError(401, "Session expired. Please sign in again.");
  const user = await lookupUser(idToken);
  return session(idToken, nextRefresh, String(body.expires_in ?? "3600"), user);
}

export async function lookupUser(idToken: string) {
  const body = await identityFetch(new URL("https://identitytoolkit.googleapis.com/v1/accounts:lookup"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  });
  const users = Array.isArray(body.users) ? body.users : [];
  const record = users[0];
  if (!record || typeof record !== "object") throw new AuthError(401, "Session expired. Please sign in again.");
  return toUser(record as Json);
}

export async function requireUser(request: Request) {
  const header = request.headers.get("authorization") ?? "";
  const idToken = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!idToken) throw new AuthError(401, "Sign in to continue.");
  const user = await lookupUser(idToken);
  return { idToken, user };
}

export function asUser(request: Request, run: () => Promise<Response>) {
  return requireUser(request).then(({ idToken }) => withFirebaseUser(idToken, run));
}
