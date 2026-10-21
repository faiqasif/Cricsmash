import { commitWrites, deleteWrite, getDocument, listDocuments, replaceWrite, type StoredDocument } from "@/lib/firebase";
import { compareReleaseVersions, isReleaseVersion, nextReleaseVersion } from "@/lib/players";
export class PlayerVersionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PlayerVersionError";
  }
}

const PLAYERS = "players";
const CATALOG = "playerCatalog";
const CATALOG_ID = "current";
const CHANGES = "playerChanges";
const PENDING = "playerPending";
const FORMAT_MAPS = new Set(["odi", "t20", "test"]);
const BOOKKEEPING = new Set(["version", "release_version", "updated_at", "created_at"]);

export type PlayerWrite = {
  id: string;
  op: "upsert" | "delete";
  data?: Record<string, unknown>;
  previous?: Record<string, unknown> | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function same(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true;
  if (left == null || right == null) return left == null && right == null;
  if (typeof left !== typeof right) return false;
  if (typeof left !== "object") return false;
  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) return false;
    return left.every((item, index) => same(item, right[index]));
  }
  const before = left as Record<string, unknown>;
  const after = right as Record<string, unknown>;
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  for (const key of keys) {
    if (!same(before[key], after[key])) return false;
  }
  return true;
}

export function diffStoredPlayer(previous: Record<string, unknown> | null, next: Record<string, unknown>) {
  if (!previous) return { fields: next, removed: [] as string[] };
  const fields: Record<string, unknown> = {};
  const removed: string[] = [];
  const keys = new Set([...Object.keys(previous), ...Object.keys(next)]);
  for (const key of keys) {
    const before = previous[key];
    const after = next[key];
    if (FORMAT_MAPS.has(key)) {
      const beforeMap = isRecord(before) ? before : {};
      const afterMap = isRecord(after) ? after : {};
      const nested: Record<string, unknown> = {};
      const nestedKeys = new Set([...Object.keys(beforeMap), ...Object.keys(afterMap)]);
      for (const child of nestedKeys) {
        if (!(child in afterMap)) removed.push(`${key}.${child}`);
        else if (!same(beforeMap[child], afterMap[child])) nested[child] = afterMap[child];
      }
      if (Object.keys(nested).length) fields[key] = nested;
      continue;
    }
    if (!(key in next)) removed.push(key);
    else if (!same(before, after)) fields[key] = after;
  }
  return { fields, removed };
}

function catalogVersion(doc: StoredDocument | null) {
  const value = doc?.data.version;
  return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : 0;
}

function releaseLabel(value: unknown) {
  if (typeof value !== "string") return null;
  const text = value.trim();
  return text && isReleaseVersion(text) ? text : null;
}

function newerRelease(current: string | null, candidate: string | null) {
  if (!candidate) return current;
  if (!current || compareReleaseVersions(candidate, current) > 0) return candidate;
  return current;
}

function playerBody(data: Record<string, unknown> | null | undefined) {
  if (!data) return null;
  const next: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (BOOKKEEPING.has(key) || value == null) continue;
    if (FORMAT_MAPS.has(key) && isRecord(value)) {
      const nested: Record<string, unknown> = {};
      for (const [child, childValue] of Object.entries(value)) {
        if (childValue != null) nested[child] = childValue;
      }
      if (Object.keys(nested).length) next[key] = nested;
      continue;
    }
    next[key] = value;
  }
  return next;
}

function mergeFields(base: unknown, extra: Record<string, unknown>) {
  const fields: Record<string, unknown> = isRecord(base) ? { ...base } : {};
  for (const [key, value] of Object.entries(extra)) {
    if (FORMAT_MAPS.has(key) && isRecord(value)) {
      const current = isRecord(fields[key]) ? fields[key] : {};
      fields[key] = { ...current, ...value };
      continue;
    }
    fields[key] = value;
  }
  return fields;
}

function mergeRemoved(base: unknown, extra: string[], fields: Record<string, unknown>) {
  const paths = new Set<string>();
  if (Array.isArray(base)) {
    for (const item of base) if (typeof item === "string") paths.add(item);
  }
  for (const item of extra) paths.add(item);
  return [...paths].filter((path) => {
    const [head, child] = path.split(".");
    if (!head) return false;
    if (child) return !(isRecord(fields[head]) && child in (fields[head] as Record<string, unknown>));
    return !(head in fields);
  });
}

function pendingUpsert(write: PlayerWrite, stored: Record<string, unknown>, pending: StoredDocument | null, now: string) {
  const created = pending?.data.created === true || !write.previous;
  const body = playerBody(stored) ?? {};
  const fields = created
    ? body
    : mergeFields(pending?.data.fields, diffStoredPlayer(playerBody(write.previous ?? null), body).fields);
  const removed = created
    ? []
    : mergeRemoved(pending?.data.removed, diffStoredPlayer(playerBody(write.previous ?? null), body).removed, fields);
  if (!created && Object.keys(fields).length === 0 && removed.length === 0) {
    return pending ? deleteWrite(PENDING, write.id) : null;
  }
  return replaceWrite(PENDING, write.id, {
    player_id: write.id,
    op: "upsert",
    fields,
    removed,
    created,
    updated_at: now,
  });
}

function pendingDelete(write: PlayerWrite, pending: StoredDocument | null, now: string) {
  if (pending?.data.created === true) return deleteWrite(PENDING, write.id);
  return replaceWrite(PENDING, write.id, {
    player_id: write.id,
    op: "delete",
    fields: {},
    removed: [],
    created: false,
    updated_at: now,
  });
}

function retryable(err: unknown) {
  return (
    err instanceof Error &&
    err.name === "FirebaseError" &&
    /aborted|contention|expired|unavailable|try again|too much|precondition|already exists/i.test(err.message)
  );
}

export async function commitPlayerWrites(
  build: (ctx: {
    now: string;
    get: (collection: string, id: string) => Promise<StoredDocument | null>;
  }) => Promise<PlayerWrite[]>,
  options?: { releaseVersion?: string; autoRelease?: boolean },
): Promise<{ version: number; releaseVersion: string | null }> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const now = new Date().toISOString();
      const get = (collection: string, id: string) => getDocument(collection, id);
      const catalog = await get(CATALOG, CATALOG_ID);
      const writes = await build({ now, get });
      if (writes.length === 0) return { version: catalogVersion(catalog), releaseVersion: releaseLabel(catalog?.data.release_version) };
      const groupedRelease = options?.autoRelease
        ? nextReleaseVersion(releaseLabel(catalog?.data.release_version))
        : (options?.releaseVersion?.trim() ?? "");
      let version = catalogVersion(catalog);
      let release = releaseLabel(catalog?.data.release_version);
      const committed = [];
      if (groupedRelease) {
        if (!isReleaseVersion(groupedRelease)) throw new Error("Version must look like 1.1");
        version += 1;
        const players: Record<string, unknown>[] = [];
        for (const write of writes) {
          if (write.op === "delete") {
            committed.push(deleteWrite(PLAYERS, write.id));
            players.push({ player_id: write.id, op: "delete", fields: {}, removed: [] });
            continue;
          }
          const data: Record<string, unknown> = {
            ...(write.data ?? {}),
            version,
          };
          delete data.release_version;
          const diff = diffStoredPlayer(write.previous ?? null, data);
          committed.push(replaceWrite(PLAYERS, write.id, data));
          players.push({ player_id: write.id, op: "upsert", fields: diff.fields, removed: diff.removed });
        }
        committed.push(
          replaceWrite(CHANGES, String(version), {
            version,
            release_version: groupedRelease,
            players,
            created_at: now,
          }),
        );
        release = newerRelease(release, groupedRelease);
      } else {
        const playerVersion = Math.max(version, 1);
        for (const write of writes) {
          const pending = await get(PENDING, write.id);
          if (write.op === "delete") {
            committed.push(deleteWrite(PLAYERS, write.id));
            committed.push(pendingDelete(write, pending, now));
            continue;
          }
          const data: Record<string, unknown> = { ...(write.data ?? {}), version: playerVersion };
          delete data.release_version;
          committed.push(replaceWrite(PLAYERS, write.id, data));
          const queued = pendingUpsert(write, data, pending, now);
          if (queued) committed.push(queued);
        }
        if (committed.length) await commitWrites(committed);
        return { version, releaseVersion: release };
      }
      const catalogWrite = replaceWrite(
        CATALOG,
        CATALOG_ID,
        release ? { version, release_version: release, updated_at: now } : { version, updated_at: now },
      );
      catalogWrite.currentDocument = catalog?.updateTime ? { updateTime: catalog.updateTime } : { exists: false };
      committed.push(catalogWrite);
      await commitWrites(committed);
      return { version, releaseVersion: groupedRelease || release };
    } catch (err) {
      lastError = err;
      if (!retryable(err) || attempt === 4) throw err;
    }
  }
  throw lastError;
}

export async function pendingPlayerCount() {
  return (await listDocuments(PENDING)).length;
}

export async function publishQueuedVersion() {
  let lastError: unknown;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const now = new Date().toISOString();
      const catalog = await getDocument(CATALOG, CATALOG_ID);
      const ready = (await listDocuments(PENDING)).filter((item) => item.data.op === "upsert" || item.data.op === "delete");
      if (!ready.length) throw new PlayerVersionError("No player changes are waiting for a version.");
      if (ready.length > 300) throw new PlayerVersionError("Create a version before more than 300 players are waiting.");
      const release = nextReleaseVersion(releaseLabel(catalog?.data.release_version));
      const version = catalogVersion(catalog) + 1;
      const players = ready.map((item) => ({
        player_id: typeof item.data.player_id === "string" ? item.data.player_id : item.id,
        op: item.data.op === "delete" ? "delete" : "upsert",
        fields: isRecord(item.data.fields) ? item.data.fields : {},
        removed: Array.isArray(item.data.removed) ? item.data.removed.filter((entry) => typeof entry === "string") : [],
      }));
      const committed = [
        replaceWrite(CHANGES, String(version), {
          version,
          release_version: release,
          players,
          created_at: now,
        }),
      ];
      const catalogWrite = replaceWrite(CATALOG, CATALOG_ID, {
        version,
        release_version: release,
        updated_at: now,
      });
      catalogWrite.currentDocument = catalog?.updateTime ? { updateTime: catalog.updateTime } : { exists: false };
      committed.push(catalogWrite);
      for (const item of ready) committed.push(deleteWrite(PENDING, item.id));
      await commitWrites(committed);
      return { version, release_version: release, count: ready.length };
    } catch (err) {
      lastError = err;
      if (err instanceof PlayerVersionError || !retryable(err) || attempt === 4) throw err;
    }
  }
  throw lastError;
}
