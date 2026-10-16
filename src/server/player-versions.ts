import { getDocument, listDocuments } from "@/lib/firebase";
import { nextReleaseVersion } from "@/lib/players";
import { PlayerNotFoundError } from "@/server/players";

const CHANGES = "playerChanges";
const CATALOG = "playerCatalog";
const SKIPPED = new Set(["version", "updated_at", "created_at", "release_version"]);
const FORMATS: Record<string, string> = { odi: "ODI", t20: "T20", test: "Test" };

export type PlayerVersionSummary = {
  id: string;
  release_version: string;
  created_at: string;
  player_count: number;
};

export type PlayerVersionChange = {
  field: string;
  value: string;
};

export type PlayerVersionPlayer = {
  player_id: string;
  name: string;
  country: string;
  op: "upsert" | "delete";
  changes: PlayerVersionChange[];
};

export type PlayerVersionDetail = PlayerVersionSummary & {
  players: PlayerVersionPlayer[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function releaseLabel(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function fieldLabel(path: string) {
  const [head, ...rest] = path.split(".");
  const raw = (rest.length ? rest : [head]).join(" ").replaceAll("_", " ");
  const pretty = raw.replace(/\b\w/g, (letter) => letter.toUpperCase());
  if (rest.length && FORMATS[head]) return `${FORMATS[head]} ${pretty}`;
  return pretty;
}

function formatValue(value: unknown) {
  if (value == null || value === "") return "Empty";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value);
}

function flattenFields(fields: Record<string, unknown>, prefix = ""): PlayerVersionChange[] {
  const changes: PlayerVersionChange[] = [];
  for (const [key, value] of Object.entries(fields)) {
    if (!prefix && SKIPPED.has(key)) continue;
    const path = prefix ? `${prefix}.${key}` : key;
    if (isRecord(value)) {
      changes.push(...flattenFields(value, path));
      continue;
    }
    changes.push({ field: fieldLabel(path), value: formatValue(value) });
  }
  return changes;
}

function readPlayers(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!isRecord(item) || typeof item.player_id !== "string") return [];
    return [
      {
        player_id: item.player_id,
        op: item.op === "delete" ? ("delete" as const) : ("upsert" as const),
        fields: isRecord(item.fields) ? item.fields : {},
        removed: Array.isArray(item.removed) ? item.removed.filter((path): path is string => typeof path === "string") : [],
      },
    ];
  });
}

function readSummary(id: string, data: Record<string, unknown>): PlayerVersionSummary | null {
  const release = releaseLabel(data.release_version);
  const players = readPlayers(data.players);
  if (!release || players.length === 0) return null;
  return {
    id,
    release_version: release,
    created_at: typeof data.created_at === "string" ? data.created_at : "",
    player_count: players.length,
  };
}

export async function nextPlayerVersion() {
  const catalog = await getDocument(CATALOG, "current");
  return nextReleaseVersion(releaseLabel(catalog?.data.release_version));
}

export async function listPlayerVersions() {
  const docs = await listDocuments(CHANGES);
  const items = docs
    .flatMap((item) => {
      const summary = readSummary(item.id, item.data);
      return summary ? [summary] : [];
    })
    .sort((left, right) => (left.created_at < right.created_at ? 1 : left.created_at > right.created_at ? -1 : 0));
  return { items, next_version: await nextPlayerVersion() };
}

export async function getPlayerVersion(id: string): Promise<PlayerVersionDetail> {
  const snap = await getDocument(CHANGES, id);
  const summary = snap ? readSummary(snap.id, snap.data) : null;
  if (!snap || !summary) throw new PlayerNotFoundError("Version not found.");
  const entries = readPlayers(snap.data.players);
  const players = await Promise.all(
    entries.map(async (entry) => {
      const player = await getDocument("players", entry.player_id);
      const nameFromChange = typeof entry.fields.name === "string" ? entry.fields.name : "";
      const name = typeof player?.data.name === "string" ? player.data.name : nameFromChange || "Unknown player";
      const country = typeof player?.data.country === "string" ? player.data.country : "";
      const changes = [
        ...flattenFields(entry.fields),
        ...entry.removed.map((path) => ({ field: fieldLabel(path), value: "Removed" })),
      ];
      return {
        player_id: entry.player_id,
        name,
        country,
        op: entry.op,
        changes,
      };
    }),
  );
  return { ...summary, players };
}
