import { createSign } from "node:crypto";

const TOPIC = "users";
const SCOPE = "https://www.googleapis.com/auth/firebase.messaging";

type ServiceAccount = {
  client_email: string;
  private_key: string;
  project_id: string;
};

let cachedToken: { value: string; expiresAt: number } | null = null;

export function notificationTopic() {
  return TOPIC;
}

function serviceAccount(): ServiceAccount {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (!raw) {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT_JSON is not set. Add the Firebase service account JSON on the server, then send again.",
    );
  }
  const json = raw.startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8");
  let parsed: { client_email?: string; private_key?: string; project_id?: string };
  try {
    parsed = JSON.parse(json) as { client_email?: string; private_key?: string; project_id?: string };
  } catch {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON.");
  }
  if (!parsed.client_email || !parsed.private_key) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON is missing client_email or private_key.");
  }
  const projectId = parsed.project_id?.trim() || process.env.FIREBASE_PROJECT_ID?.trim() || "";
  if (!projectId) throw new Error("FIREBASE_PROJECT_ID is not set.");
  return {
    client_email: parsed.client_email,
    private_key: parsed.private_key.replace(/\\n/g, "\n"),
    project_id: projectId,
  };
}

function signJwt(account: ServiceAccount) {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(
    JSON.stringify({
      iss: account.client_email,
      scope: SCOPE,
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    }),
  ).toString("base64url");
  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${payload}`);
  signer.end();
  return `${header}.${payload}.${signer.sign(account.private_key, "base64url")}`;
}

async function accessToken(account: ServiceAccount) {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now + 60_000) return cachedToken.value;
  const assertion = signJwt(account);
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  const body = (await response.json()) as { access_token?: string; expires_in?: number; error_description?: string };
  if (!response.ok || !body.access_token) {
    throw new Error(body.error_description || "Could not authorize Firebase messaging.");
  }
  cachedToken = { value: body.access_token, expiresAt: now + (body.expires_in ?? 3600) * 1000 };
  return body.access_token;
}

const MESSAGE_LIMIT = 3800;

type GameMessageInput = {
  title: string;
  body: string;
  game: string;
  gameTitle: string;
  playDate: string;
  gameOption: string;
  gameData: Record<string, unknown>;
};

function messageData(input: GameMessageInput) {
  return {
    type: "game",
    game: input.game,
    game_title: input.gameTitle,
    play_date: input.playDate,
    game_option: input.gameOption,
    title: input.title,
    body: input.body,
    game_data: JSON.stringify(input.gameData),
  };
}

export function gameMessageFits(input: GameMessageInput) {
  const data = messageData(input);
  let bytes = Buffer.byteLength(input.title, "utf8") + Buffer.byteLength(input.body, "utf8");
  for (const [key, value] of Object.entries(data)) {
    bytes += Buffer.byteLength(key, "utf8") + Buffer.byteLength(value, "utf8");
  }
  return bytes <= MESSAGE_LIMIT;
}

export async function sendGameNotification(input: GameMessageInput) {
  if (!gameMessageFits(input)) {
    throw new Error("This game is too large to include in a notification. Shorten the quiz and send again.");
  }
  const account = serviceAccount();
  const token = await accessToken(account);
  const data = messageData(input);
  const response = await fetch(`https://fcm.googleapis.com/v1/projects/${account.project_id}/messages:send`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: {
        topic: TOPIC,
        notification: {
          title: input.title,
          body: input.body,
        },
        data,
        android: { priority: "HIGH" },
        apns: { payload: { aps: { sound: "default" } } },
      },
    }),
  });
  const payload = (await response.json()) as { name?: string; error?: { message?: string } };
  if (!response.ok || !payload.name) {
    throw new Error(payload.error?.message || "Firebase could not send the notification.");
  }
  return payload.name;
}
