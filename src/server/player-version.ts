import { commitWrites, deleteWrite, getDocument, replaceWrite, type StoredDocument } from "@/lib/firebase";
import { compareReleaseVersions, isReleaseVersion, nextReleaseVersion } from "@/lib/players";

const PLAYERS = "players";
const CATALOG = "playerCatalog";
const CATALOG_ID = "current";
const CHANGES = "playerChanges";
const FORMAT_MAPS = new Set(["odi", "t20", "test"]);

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
            release_version: groupedRelease,
          };
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
      } else for (const write of writes) {
        version += 1;
        if (write.op === "delete") {
          committed.push(deleteWrite(PLAYERS, write.id));
          committed.push(
            replaceWrite(CHANGES, String(version), {
              version,
              player_id: write.id,
              op: "delete",
              fields: {},
              removed: [],
              created_at: now,
            }),
          );
          continue;
        }
        const data: Record<string, unknown> = { ...(write.data ?? {}), version };
        release = newerRelease(release, releaseLabel(data.release_version));
        const diff = diffStoredPlayer(write.previous ?? null, data);
        committed.push(replaceWrite(PLAYERS, write.id, data));
        committed.push(
          replaceWrite(CHANGES, String(version), {
            version,
            player_id: write.id,
            op: "upsert",
            fields: diff.fields,
            removed: diff.removed,
            created_at: now,
          }),
        );
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
