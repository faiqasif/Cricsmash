import { createSign } from "node:crypto";
import { listDocuments } from "@/lib/firebase";

const SCOPE = "https://www.googleapis.com/auth/devstorage.read_write";

type ServiceAccount = {
  client_email: string;
  private_key: string;
};

let cachedToken: { value: string; expiresAt: number } | null = null;

export function playersJsonPath(version: number) {
  return `players/v${version}.json`;
}

export const PLAYERS_LATEST_JSON = "players/latest.json";

function storageBucket() {
  const bucket = process.env.FIREBASE_STORAGE_BUCKET?.trim();
  if (!bucket) throw new Error("FIREBASE_STORAGE_BUCKET is not set.");
  return bucket;
}

export function playersJsonDownloadUrl(objectPath: string) {
  return `https://firebasestorage.googleapis.com/v0/b/${storageBucket()}/o/${encodeURIComponent(objectPath)}?alt=media`;
}

function serviceAccount(): ServiceAccount {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (!raw) throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON is not set.");
  const json = raw.startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8");
  const parsed = JSON.parse(json) as { client_email?: string; private_key?: string };
  if (!parsed.client_email || !parsed.private_key) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON is missing client_email or private_key.");
  }
  return {
    client_email: parsed.client_email,
    private_key: parsed.private_key.replace(/\\n/g, "\n"),
  };
}

async function storageToken() {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now + 60_000) return cachedToken.value;
  const account = serviceAccount();
  const issued = Math.floor(now / 1000);
  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(
    JSON.stringify({
      iss: account.client_email,
      scope: SCOPE,
      aud: "https://oauth2.googleapis.com/token",
      iat: issued,
      exp: issued + 3600,
    }),
  ).toString("base64url");
  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${payload}`);
  signer.end();
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${header}.${payload}.${signer.sign(account.private_key, "base64url")}`,
    }),
  });
  const body = (await response.json()) as { access_token?: string; expires_in?: number; error_description?: string };
  if (!response.ok || !body.access_token) {
    throw new Error(body.error_description || "Could not authorize Firebase Storage.");
  }
  cachedToken = { value: body.access_token, expiresAt: now + (body.expires_in ?? 3600) * 1000 };
  return body.access_token;
}

export function playersSnapshot(
  version: number,
  release: string,
  docs: { id: string; data: Record<string, unknown> }[],
) {
  const players = docs
    .map((doc) => {
      const player: Record<string, unknown> = { id: doc.id };
      for (const [key, value] of Object.entries(doc.data)) {
        if (value == null || key === "version" || key === "release_version") continue;
        player[key] = value;
      }
      return player;
    })
    .sort((left, right) => String(left.name ?? "").localeCompare(String(right.name ?? "")));
  return {
    version,
    player_version_number: version,
    release_version: release,
    players,
  };
}

async function putJson(objectPath: string, json: string, cacheControl: string) {
  const boundary = `playersjson${Date.now()}`;
  const body = [
    `--${boundary}`,
    "Content-Type: application/json; charset=UTF-8",
    "",
    JSON.stringify({ contentType: "application/json", cacheControl }),
    `--${boundary}`,
    "Content-Type: application/json",
    "",
    json,
    `--${boundary}--`,
    "",
  ].join("\r\n");
  const url = new URL(`https://storage.googleapis.com/upload/storage/v1/b/${storageBucket()}/o`);
  url.searchParams.set("uploadType", "multipart");
  url.searchParams.set("name", objectPath);
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${await storageToken()}`,
      "Content-Type": `multipart/related; boundary=${boundary}`,
    },
    body,
  });
  if (!response.ok) {
    const text = await response.text();
    let message = text.slice(0, 240);
    try {
      const parsed = JSON.parse(text) as { error?: { message?: string } };
      message = parsed.error?.message || message;
    } catch {
      // The storage API returned a non-JSON error page.
    }
    throw new Error(message || "Could not save the players JSON file.");
  }
}

export async function uploadPlayersSnapshot(version: number, release: string) {
  const docs = await listDocuments("players");
  const json = JSON.stringify(playersSnapshot(version, release, docs));
  const path = playersJsonPath(version);
  await putJson(path, json, "public, max-age=31536000, immutable");
  await putJson(PLAYERS_LATEST_JSON, json, "no-cache");
  return path;
}
