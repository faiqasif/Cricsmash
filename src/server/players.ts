import { rankByName } from "@/lib/fuzzy";
import { deleteDocument, getDocument, listDocuments, patchDocuments, queryDocuments, setDocument } from "@/lib/firebase";
import type {
  FormatStats,
  Player,
  PlayerCustomField,
  PlayerCustomFieldValue,
  PlayerListItem,
  PlayerListResponse,
  PlayerPayload,
} from "@/lib/players";

const PLAYERS = "players";
const FIELDS = "playerFields";
const ROLES = ["batsman", "bowler", "all-rounder", "wicketkeeper"] as const;
const APPLIES_TO = ["batter", "bowler", "all-rounder", "wicketkeeper"] as const;

const FORMAT_TEXT = new Set<keyof FormatStats>([
  "debut_team",
  "last_match_team",
  "most_hundreds_against",
  "best_bowling_figures",
]);

const NUMBER_KEYS = [
  "tournaments_won",
  "catches",
  "most_dismissals_against_bowler_count",
  "batting_avg_home_test",
  "batting_avg_away_test",
  "batting_avg_in_india_test",
  "batting_avg_in_australia_test",
  "batting_avg_in_england_test",
  "batting_avg_in_south_africa_test",
  "batting_avg_vs_india_test",
  "batting_avg_vs_australia_test",
  "batting_avg_vs_england_test",
  "batting_avg_vs_south_africa_test",
  "wickets_home_test",
  "wickets_away_test",
  "wickets_vs_india",
  "wickets_vs_australia",
  "wickets_vs_england",
  "wickets_vs_south_africa",
  "wickets_in_india",
  "wickets_in_australia",
  "wickets_in_england",
  "wickets_in_south_africa",
  "hundreds_vs_india_test",
  "hundreds_vs_australia_test",
  "hundreds_vs_england_test",
  "hundreds_vs_south_africa_test",
  "hundreds_in_india_test",
  "hundreds_in_australia_test",
  "hundreds_in_england_test",
  "hundreds_in_south_africa_test",
  "hundreds_vs_india_odi",
  "hundreds_vs_australia_odi",
  "hundreds_vs_england_odi",
  "hundreds_vs_south_africa_odi",
  "balls_played_test",
  "odi_wc_batting_average",
  "odi_wc_strike_rate",
  "odi_wc_hundreds",
  "odi_wc_fifties",
  "odi_wc_player_of_match",
  "odi_wc_highest_score",
  "odi_wc_wickets",
  "odi_wc_bowling_strike_rate",
  "t20_wc_batting_average",
  "t20_wc_strike_rate",
  "t20_wc_hundreds",
  "t20_wc_fifties",
  "t20_wc_player_of_match",
  "t20_wc_highest_score",
  "t20_wc_wickets",
  "t20_wc_bowling_strike_rate",
] as const satisfies readonly (keyof PlayerPayload)[];

export class PlayerInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PlayerInputError";
  }
}

export class PlayerNotFoundError extends Error {
  constructor(message = "Player not found.") {
    super(message);
    this.name = "PlayerNotFoundError";
  }
}

export function emptyFormat(): FormatStats {
  return {
    debut_year: null,
    debut_team: null,
    last_match_year: null,
    last_match_team: null,
    matches: null,
    runs: null,
    most_hundreds_against: null,
    batting_average: null,
    batting_strike_rate: null,
    hundreds: null,
    fifties: null,
    highest_score: null,
    sixes: null,
    batting_position: null,
    wickets: null,
    bowling_average: null,
    bowling_strike_rate: null,
    bowling_economy: null,
    wicket_hauls: null,
    best_bowling_figures: null,
    man_of_the_match: null,
    catches: null,
    stumpings: null,
  };
}

function asRecord(value: unknown, message: string) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new PlayerInputError(message);
  }
  return value as Record<string, unknown>;
}

function text(value: unknown, max: number, label: string, required = false) {
  if (value == null) {
    if (required) throw new PlayerInputError(`${label} is required`);
    return null;
  }
  if (typeof value !== "string") throw new PlayerInputError(`${label} is invalid`);
  const trimmed = value.trim();
  if (!trimmed) {
    if (required) throw new PlayerInputError(`${label} is required`);
    return null;
  }
  if (trimmed.length > max) throw new PlayerInputError(`${label} is too long`);
  return trimmed;
}

function numberOrNull(value: unknown, label: string) {
  if (value == null || value === "") return null;
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new PlayerInputError(`${label} must be a number`);
  }
  return value;
}

function boolOrNull(value: unknown, label: string) {
  if (value == null) return null;
  if (typeof value !== "boolean") throw new PlayerInputError(`${label} is invalid`);
  return value;
}

function parseFormat(value: unknown, label: string): FormatStats {
  const source = value == null ? {} : asRecord(value, `${label} stats are invalid`);
  const out = emptyFormat();
  (Object.keys(out) as (keyof FormatStats)[]).forEach((key) => {
    const raw = source[key];
    if (raw == null || raw === "") {
      out[key] = null;
      return;
    }
    if (FORMAT_TEXT.has(key)) {
      if (typeof raw !== "string") throw new PlayerInputError(`${label} ${key} is invalid`);
      const trimmed = raw.trim();
      (out[key] as string | null) = trimmed || null;
      return;
    }
    if (typeof raw !== "number" || !Number.isFinite(raw)) {
      throw new PlayerInputError(`${label} ${key} must be a number`);
    }
    (out[key] as number | null) = raw;
  });
  return out;
}

function parseCustomFields(value: unknown): PlayerCustomFieldValue[] {
  if (value == null) return [];
  if (!Array.isArray(value)) throw new PlayerInputError("Custom fields are invalid");
  return value.map((item) => {
    const row = asRecord(item, "Custom fields are invalid");
    const fieldId = text(row.field_id, 80, "Custom field id", true);
    return {
      field_id: fieldId ?? "",
      odi: text(row.odi, 200, "Custom field value"),
      t20: text(row.t20, 200, "Custom field value"),
      test: text(row.test, 200, "Custom field value"),
    };
  });
}

export function parsePlayerPayload(value: unknown): PlayerPayload {
  const body = asRecord(value, "Player body is invalid");
  const name = text(body.name, 150, "Player name", true);
  const country = text(body.country, 80, "Country", true);
  const role = text(body.role, 40, "Role", true);
  const status = text(body.status, 20, "Status", true);
  if (!name || name.length < 2) throw new PlayerInputError("Player name must be at least 2 characters");
  if (!role || !ROLES.includes(role as (typeof ROLES)[number])) {
    throw new PlayerInputError("Select a playing role");
  }
  if (status !== "active" && status !== "inactive") throw new PlayerInputError("Select a status");
  const dateOfBirth = text(body.date_of_birth, 10, "Date of birth");
  if (dateOfBirth && !/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)) {
    throw new PlayerInputError("Enter a valid date of birth");
  }
  const playingHand = text(body.playing_hand, 20, "Playing hand");
  if (playingHand && playingHand !== "righty" && playingHand !== "lefty") {
    throw new PlayerInputError("Playing hand must be righty or lefty");
  }
  const bowler = text(body.most_dismissals_against_bowler, 150, "Most dismissals against bowler") ?? "";

  const payload: PlayerPayload = {
    name,
    country: country ?? "",
    role,
    date_of_birth: dateOfBirth,
    playing_hand: playingHand,
    photo_url: text(body.photo_url, 4000, "Photo"),
    captained_international: boolOrNull(body.captained_international, "Captain"),
    most_dismissed_batter: text(body.most_dismissed_batter, 150, "Most dismissed batter"),
    most_dismissals_against_bowler: bowler,
    status,
    odi: parseFormat(body.odi, "ODI"),
    t20: parseFormat(body.t20, "T20"),
    test: parseFormat(body.test, "Test"),
    custom_fields: parseCustomFields(body.custom_fields),
  };

  for (const key of NUMBER_KEYS) {
    payload[key] = numberOrNull(body[key], key);
  }
  return payload;
}

function readLooseFormat(value: unknown): FormatStats {
  if (!value || typeof value !== "object" || Array.isArray(value)) return emptyFormat();
  try {
    return parseFormat(value, "Format");
  } catch {
    return emptyFormat();
  }
}

function readPlayer(id: string, data: Record<string, unknown>): Player {
  let payload: PlayerPayload;
  try {
    payload = parsePlayerPayload(data);
  } catch {
    payload = {
      name: typeof data.name === "string" ? data.name : "Unknown",
      country: typeof data.country === "string" ? data.country : "",
      role: typeof data.role === "string" ? data.role : "",
      status: data.status === "inactive" ? "inactive" : "active",
      most_dismissals_against_bowler: "",
      odi: readLooseFormat(data.odi),
      t20: readLooseFormat(data.t20),
      test: readLooseFormat(data.test),
      custom_fields: [],
    };
  }
  const stats = {} as Pick<Player, (typeof NUMBER_KEYS)[number]>;
  for (const key of NUMBER_KEYS) {
    stats[key] = payload[key] ?? null;
  }
  return {
    id,
    name: payload.name,
    country: payload.country,
    role: payload.role,
    status: payload.status,
    date_of_birth: payload.date_of_birth ?? null,
    playing_hand: payload.playing_hand ?? null,
    photo_url: payload.photo_url ?? null,
    captained_international: payload.captained_international ?? null,
    most_dismissed_batter: payload.most_dismissed_batter ?? null,
    most_dismissals_against_bowler: payload.most_dismissals_against_bowler ?? "",
    ...stats,
    odi: payload.odi ?? emptyFormat(),
    t20: payload.t20 ?? emptyFormat(),
    test: payload.test ?? emptyFormat(),
    custom_fields: payload.custom_fields ?? [],
    created_at: typeof data.created_at === "string" ? data.created_at : "",
    updated_at: typeof data.updated_at === "string" ? data.updated_at : "",
  };
}

function toStored(payload: PlayerPayload, createdAt: string, updatedAt: string) {
  return {
    ...payload,
    custom_fields: payload.custom_fields ?? [],
    odi: payload.odi ?? emptyFormat(),
    t20: payload.t20 ?? emptyFormat(),
    test: payload.test ?? emptyFormat(),
    created_at: createdAt,
    updated_at: updatedAt,
  };
}

function earliestDebut(player: Player) {
  const years = [player.odi.debut_year, player.t20.debut_year, player.test.debut_year].filter(
    (year): year is number => typeof year === "number",
  );
  return years.length ? Math.min(...years) : null;
}

function toListItem(player: Player): PlayerListItem {
  return {
    id: player.id,
    name: player.name,
    photo_url: player.photo_url ?? null,
    country: player.country,
    role: player.role,
    debut_year: earliestDebut(player),
    status: player.status,
  };
}

async function allPlayers() {
  const docs = await listDocuments(PLAYERS);
  return docs
    .map((item) => readPlayer(item.id, item.data))
    .sort((a, b) => (a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0));
}

export async function listPlayers(input: {
  q: string;
  role: string;
  country: string;
  page: number;
  pageSize: number;
}): Promise<PlayerListResponse> {
  const page = Number.isFinite(input.page) && input.page > 0 ? Math.floor(input.page) : 1;
  const pageSize = Number.isFinite(input.pageSize) && input.pageSize > 0 ? Math.min(Math.floor(input.pageSize), 100) : 5;
  const q = input.q.trim().toLowerCase();
  const role = input.role.trim();
  const country = input.country.trim();
  const where = [
    ...(role ? [{ field: "role", value: role }] : []),
    ...(country ? [{ field: "country", value: country }] : []),
  ];
  const docs = await queryDocuments(PLAYERS, {
    where,
    orderBy: { field: "created_at", direction: "DESCENDING" },
    select: ["name", "country", "role", "status", "photo_url", "created_at", "odi.debut_year", "t20.debut_year", "test.debut_year"],
  });
  const countryKey = country.toLowerCase();
  const filtered = docs
    .map((item) => readPlayer(item.id, item.data))
    .filter((player) => {
      if (q && !player.name.toLowerCase().includes(q)) return false;
      if (countryKey && player.country.toLowerCase() !== countryKey) return false;
      return true;
    });
  const total = filtered.length;
  const totalPages = pageSize > 0 ? Math.ceil(total / pageSize) : 0;
  const start = (page - 1) * pageSize;
  return {
    items: filtered.slice(start, start + pageSize).map(toListItem),
    total,
    page,
    page_size: pageSize,
    total_pages: totalPages,
  };
}

export async function suggestPlayers(input: { q: string; country: string; exclude: string[]; limit: number }) {
  const country = input.country.trim();
  if (!country) throw new PlayerInputError("Enter a team title so we can suggest players from that team");
  const limit = Number.isFinite(input.limit) && input.limit > 0 ? Math.min(Math.floor(input.limit), 300) : 12;
  const excluded = new Set(input.exclude);
  const countryKey = country.toLowerCase();
  const pool = (
    await queryDocuments(PLAYERS, {
      where: [{ field: "status", value: "active" }],
      orderBy: { field: "name", direction: "ASCENDING" },
      select: ["name", "country", "role", "status", "photo_url", "created_at", "odi.debut_year", "t20.debut_year", "test.debut_year"],
    })
  )
    .map((item) => readPlayer(item.id, item.data))
    .filter((player) => player.country.toLowerCase() === countryKey && !excluded.has(player.id));
  const query = input.q.trim();
  const ranked = query
    ? rankByName(pool, query, (player) => player.name, 0.35)
    : [...pool].sort((a, b) => a.name.localeCompare(b.name)).map((item) => ({ item, score: 1 }));
  return { items: ranked.slice(0, limit).map((entry) => toListItem(entry.item)) };
}

export async function getPlayer(id: string) {
  const snap = await getDocument(PLAYERS, id);
  if (!snap) throw new PlayerNotFoundError();
  return readPlayer(snap.id, snap.data);
}

export async function createPlayer(payload: PlayerPayload) {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await setDocument(PLAYERS, id, toStored(payload, now, now));
  return getPlayer(id);
}

export async function updatePlayer(id: string, payload: PlayerPayload) {
  const existing = await getDocument(PLAYERS, id);
  if (!existing) throw new PlayerNotFoundError();
  const createdAt = typeof existing.data.created_at === "string" ? existing.data.created_at : new Date().toISOString();
  await setDocument(PLAYERS, id, toStored(payload, createdAt, new Date().toISOString()));
  return getPlayer(id);
}

export async function deletePlayer(id: string) {
  const existing = await getDocument(PLAYERS, id);
  if (!existing) throw new PlayerNotFoundError();
  await deleteDocument(PLAYERS, id);
}

function readField(id: string, data: Record<string, unknown>): PlayerCustomField {
  const applies = typeof data.applies_to === "string" ? data.applies_to : "batter";
  return {
    id,
    name: typeof data.name === "string" ? data.name : "",
    applies_to: APPLIES_TO.includes(applies as (typeof APPLIES_TO)[number])
      ? (applies as PlayerCustomField["applies_to"])
      : "batter",
  };
}

export async function listPlayerFields() {
  const docs = await listDocuments(FIELDS);
  return docs
    .map((item) => readField(item.id, item.data))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function createPlayerField(value: unknown) {
  const body = asRecord(value, "Field body is invalid");
  const name = text(body.name, 120, "Field name", true);
  const appliesTo = text(body.applies_to, 40, "Applies to", true);
  if (!name || name.length < 2) throw new PlayerInputError("Field name must be at least 2 characters");
  if (!appliesTo || !APPLIES_TO.includes(appliesTo as (typeof APPLIES_TO)[number])) {
    throw new PlayerInputError("Associate the field with batter, bowler, all-rounder, or wicketkeeper");
  }
  const id = crypto.randomUUID();
  const field: PlayerCustomField = {
    id,
    name,
    applies_to: appliesTo as PlayerCustomField["applies_to"],
  };
  await setDocument(FIELDS, id, {
    name: field.name,
    applies_to: field.applies_to,
    created_at: new Date().toISOString(),
  });
  return field;
}

export async function deletePlayerField(id: string) {
  const existing = await getDocument(FIELDS, id);
  if (!existing) throw new PlayerNotFoundError("Custom field not found.");
  const players = await listDocuments(PLAYERS);
  const updates = players.flatMap((item) => {
    const fields = item.data.custom_fields;
    if (!Array.isArray(fields)) return [];
    const next = fields.filter((entry) => {
      if (!entry || typeof entry !== "object") return false;
      return (entry as { field_id?: string }).field_id !== id;
    });
    if (next.length === fields.length) return [];
    return [{ id: item.id, data: { custom_fields: next, updated_at: new Date().toISOString() } }];
  });
  await patchDocuments(PLAYERS, updates);
  await deleteDocument(FIELDS, id);
}
