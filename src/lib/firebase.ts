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
  updateTime?: string;
};

function missing(name: string) {
  return new Error(
    `${name} is not set for this deployment. In Vercel, add it for Preview and Production, then redeploy.`,
  );
}

function projectId() {
  const value = process.env.FIREBASE_PROJECT_ID?.trim();
  if (!value) throw missing("FIREBASE_PROJECT_ID");
  return value;
}

function apiKey() {
  const value = process.env.FIREBASE_API_KEY?.trim();
  if (!value) throw missing("FIREBASE_API_KEY");
  return value;
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
  const parsed: unknown = text ? JSON.parse(text) : {};
  if (!res.ok) {
    throw firebaseError((parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {}) as Json, "Firebase request failed");
  }
  return parsed as Json;
}

function documentsBase() {
  return `https://firestore.googleapis.com/v1/projects/${projectId()}/databases/(default)/documents`;
}

function readDocument(body: Json): StoredDocument | null {
  if (typeof body.name !== "string" || !body.fields || typeof body.fields !== "object") return null;
  return {
    id: documentId(body.name),
    data: decode({ mapValue: { fields: body.fields as Record<string, FirestoreValue> } }) as Json,
    updateTime: typeof body.updateTime === "string" ? body.updateTime : undefined,
  };
}

export type QueryFilter = { field: string; value: string | number | boolean };
export type QueryOrder = { field: string; direction: "ASCENDING" | "DESCENDING" };

export async function queryDocuments(
  collectionName: string,
  options: { where?: QueryFilter[]; orderBy?: QueryOrder; select?: string[]; limit?: number } = {},
): Promise<StoredDocument[]> {
  const filters = (options.where ?? []).filter((item) => item.value !== "");
  const structured: Json = {
    from: [{ collectionId: collectionName }],
  };
  if (filters.length === 1) {
    structured.where = {
      fieldFilter: {
        field: { fieldPath: filters[0].field },
        op: "EQUAL",
        value: encode(filters[0].value),
      },
    };
  } else if (filters.length > 1) {
    structured.where = {
      compositeFilter: {
        op: "AND",
        filters: filters.map((item) => ({
          fieldFilter: {
            field: { fieldPath: item.field },
            op: "EQUAL",
            value: encode(item.value),
          },
        })),
      },
    };
  }
  if (options.orderBy) {
    structured.orderBy = [{ field: { fieldPath: options.orderBy.field }, direction: options.orderBy.direction }];
  }
  if (options.select?.length) {
    structured.select = { fields: options.select.map((fieldPath) => ({ fieldPath })) };
  }
  if (options.limit) structured.limit = options.limit;
  const url = new URL(`${documentsBase()}:runQuery`);
  let body: unknown;
  try {
    body = await firebaseFetch(url, { method: "POST", body: JSON.stringify({ structuredQuery: structured }) });
  } catch (err) {
    if (err instanceof Error && /index/i.test(err.message)) return listDocuments(collectionName);
    throw err;
  }
  const rows = Array.isArray(body) ? body : [];
  const docs: StoredDocument[] = [];
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const document = (row as Json).document;
    if (document && typeof document === "object") {
      const doc = readDocument(document as Json);
      if (doc) docs.push(doc);
    }
  }
  return docs;
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

export async function getDocument(
  collectionName: string,
  id: string,
  transaction?: string,
): Promise<StoredDocument | null> {
  const url = new URL(`${documentsBase()}/${collectionName}/${id}`);
  if (transaction) url.searchParams.set("transaction", transaction);
  try {
    const body = await firebaseFetch(url);
    return readDocument(body);
  } catch (err) {
    if (err instanceof Error && /not found/i.test(err.message)) return null;
    throw err;
  }
}

function documentName(collectionName: string, id: string) {
  return `projects/${projectId()}/databases/(default)/documents/${collectionName}/${id}`;
}

export function replaceWrite(collectionName: string, id: string, data: Json): Json {
  const encoded = encode(data);
  const fields = "mapValue" in encoded ? encoded.mapValue.fields ?? {} : {};
  return {
    update: {
      name: documentName(collectionName, id),
      fields,
    },
  };
}

export function deleteWrite(collectionName: string, id: string) {
  return { delete: documentName(collectionName, id) };
}

export async function commitWrites(writes: Json[]) {
  const url = new URL(`${documentsBase()}:commit`);
  await firebaseFetch(url, {
    method: "POST",
    body: JSON.stringify({ writes }),
  });
}

export async function setDocuments(collectionName: string, docs: { id: string; data: Json }[]) {
  for (let index = 0; index < docs.length; index += 400) {
    const writes = docs.slice(index, index + 400).map((doc) => {
      const encoded = encode(doc.data);
      const fields = "mapValue" in encoded ? encoded.mapValue.fields ?? {} : {};
      return {
        update: {
          name: `projects/${projectId()}/databases/(default)/documents/${collectionName}/${doc.id}`,
          fields,
        },
      };
    });
    const url = new URL(`${documentsBase()}:commit`);
    await firebaseFetch(url, { method: "POST", body: JSON.stringify({ writes }) });
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
