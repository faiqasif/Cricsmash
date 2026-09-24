import { AsyncLocalStorage } from "node:async_hooks";

type Json = Record<string, unknown>;

type FirestoreValue =
  | { nullValue: null }
  | { stringValue: string }
  | { integerValue: string }
  | { doubleValue: number }
  | { booleanValue: boolean }
  | { mapValue: { fields?: Record<string, FirestoreValue> } }
  | { arrayValue: { values?: FirestoreValue[] } };

export type StoredDocument = {
  id: string;
  data: Json;
};

function required(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing ${name}. Add the Firebase web config to .env.local.`);
  }
  return value;
}

function projectId() {
  return required("FIREBASE_PROJECT_ID");
}

function apiKey() {
  return required("FIREBASE_API_KEY");
}

const firebaseUserToken = new AsyncLocalStorage<string>();

export function withFirebaseUser<T>(idToken: string, run: () => Promise<T>) {
  return firebaseUserToken.run(idToken, run);
}

function firebaseError(body: Json, fallback: string) {
  const raw = body.error && typeof body.error === "object" ? String((body.error as Json).message ?? "") : "";
  const message = /has not been used|SERVICE_DISABLED|Cloud Firestore API|does not exist/i.test(raw)
    ? "Cloud Firestore is not enabled for this project. In the Firebase console, create a Firestore database for cricstreak-c7ccf, then try again."
    : raw || fallback;
  const error = new Error(message);
  error.name = "FirebaseError";
  return error;
}

function encode(value: unknown): FirestoreValue {
  if (value == null) return { nullValue: null };
  if (typeof value === "string") return { stringValue: value };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return { nullValue: null };
    return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  }
  if (Array.isArray(value)) {
    return { arrayValue: { values: value.map(encode) } };
  }
  if (typeof value === "object") {
    const fields: Record<string, FirestoreValue> = {};
    for (const [key, item] of Object.entries(value as Json)) {
      fields[key] = encode(item);
    }
    return { mapValue: { fields } };
  }
  return { nullValue: null };
}

function decode(value: FirestoreValue | undefined): unknown {
  if (!value) return null;
  if ("nullValue" in value) return null;
  if ("stringValue" in value) return value.stringValue;
  if ("booleanValue" in value) return value.booleanValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return value.doubleValue;
  if ("arrayValue" in value) return (value.arrayValue.values ?? []).map((item) => decode(item));
  if ("mapValue" in value) {
    const out: Json = {};
    for (const [key, item] of Object.entries(value.mapValue.fields ?? {})) {
      out[key] = decode(item);
    }
    return out;
  }
  return null;
}

function documentId(name: string) {
  const parts = name.split("/");
  return parts[parts.length - 1] ?? "";
}

async function firebaseFetch(url: URL, init?: RequestInit) {
  url.searchParams.set("key", apiKey());
  const headers = new Headers(init?.headers);
  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const token = firebaseUserToken.getStore();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const res = await fetch(url, { ...init, headers });
  const text = await res.text();
  const body = text ? (JSON.parse(text) as Json) : {};
  if (!res.ok) {
    throw firebaseError(body, "Firebase request failed");
  }
  return body;
}

function documentsBase() {
  return `https://firestore.googleapis.com/v1/projects/${projectId()}/databases/(default)/documents`;
}

function readDocument(body: Json): StoredDocument | null {
  if (typeof body.name !== "string" || !body.fields || typeof body.fields !== "object") return null;
  return {
    id: documentId(body.name),
    data: decode({ mapValue: { fields: body.fields as Record<string, FirestoreValue> } }) as Json,
  };
}

export async function listDocuments(collectionName: string): Promise<StoredDocument[]> {
  const docs: StoredDocument[] = [];
  let pageToken = "";
  do {
    const url = new URL(`${documentsBase()}/${collectionName}`);
    url.searchParams.set("pageSize", "300");
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    const body = await firebaseFetch(url);
    const documents = Array.isArray(body.documents) ? body.documents : [];
    for (const item of documents) {
      if (item && typeof item === "object") {
        const doc = readDocument(item as Json);
        if (doc) docs.push(doc);
      }
    }
    pageToken = typeof body.nextPageToken === "string" ? body.nextPageToken : "";
  } while (pageToken);
  return docs;
}

export async function getDocument(collectionName: string, id: string): Promise<StoredDocument | null> {
  const url = new URL(`${documentsBase()}/${collectionName}/${id}`);
  try {
    const body = await firebaseFetch(url);
    return readDocument(body);
  } catch (err) {
    if (err instanceof Error && /not found/i.test(err.message)) return null;
    throw err;
  }
}

export async function setDocument(collectionName: string, id: string, data: Json) {
  const encoded = encode(data);
  if (!("mapValue" in encoded)) throw new Error("Player document must be an object");
  const url = new URL(`${documentsBase()}/${collectionName}/${id}`);
  await firebaseFetch(url, {
    method: "PATCH",
    body: JSON.stringify({ fields: encoded.mapValue.fields ?? {} }),
  });
}

export async function deleteDocument(collectionName: string, id: string) {
  const url = new URL(`${documentsBase()}/${collectionName}/${id}`);
  await firebaseFetch(url, { method: "DELETE" });
}

export async function patchDocuments(
  collectionName: string,
  updates: { id: string; data: Json }[],
) {
  for (let index = 0; index < updates.length; index += 400) {
    const writes = updates.slice(index, index + 400).map((update) => {
      const encoded = encode(update.data);
      const fields = "mapValue" in encoded ? encoded.mapValue.fields ?? {} : {};
      return {
        update: {
          name: `projects/${projectId()}/databases/(default)/documents/${collectionName}/${update.id}`,
          fields,
        },
        updateMask: { fieldPaths: Object.keys(update.data) },
      };
    });
    const url = new URL(`${documentsBase()}:commit`);
    await firebaseFetch(url, { method: "POST", body: JSON.stringify({ writes }) });
  }
}
