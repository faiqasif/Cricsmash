import { deleteDocument, getDocument, listDocuments, setDocument } from "@/lib/firebase";
import type { PlayerDayFormat, PlayerOfTheDay, PlayerOfTheDayListResponse, PlayerOfTheDayStatus } from "@/lib/player-of-the-day";
import { getPlayer } from "@/server/players";

const COLLECTION = "playerOfTheDay";
const STATUSES = ["pending", "active", "past"] as const;
const ROLES = ["batsman", "bowler", "all-rounder", "wicketkeeper"] as const;
const FORMATS = ["odi", "t20", "test"] as const;

export class PlayerDayInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PlayerDayInputError";
  }
}

export class PlayerDayNotFoundError extends Error {
  constructor(message = "Player of the day not found.") {
    super(message);
    this.name = "PlayerDayNotFoundError";
  }
}

export class PlayerDayConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PlayerDayConflictError";
  }
}

type StoredDay = {
  play_date: string;
  player_id: string;
  name: string;
  country: string;
  photo_url: string | null;
  role: string;
  debut_format: PlayerDayFormat;
  wickets_format: PlayerDayFormat;
  matches_format: PlayerDayFormat;
  hundreds_format: PlayerDayFormat;
  status: PlayerOfTheDayStatus;
  times_played: number;
  created_at: string;
  updated_at: string;
};

function todayUTC() {
  return new Date().toISOString().slice(0, 10);
}

function defaultStatus(playDate: string, today = todayUTC()): PlayerOfTheDayStatus {
  if (playDate > today) return "pending";
  if (playDate < today) return "past";
  return "active";
}

function asRecord(value: unknown, message: string) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new PlayerDayInputError(message);
  return value as Record<string, unknown>;
}

function dateKey(value: string) {
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) throw new PlayerDayInputError("Choose a valid date");
  const parsed = new Date(`${trimmed}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== trimmed) {
    throw new PlayerDayInputError("Choose a valid date");
  }
  return trimmed;
}

function uniqueDates(values: string[], allowPast: boolean) {
  if (values.length === 0) throw new PlayerDayInputError("Select at least one date");
  const today = todayUTC();
  const seen = new Set<string>();
  const dates: string[] = [];
  for (const value of values) {
    const day = dateKey(value);
    if (seen.has(day)) continue;
    if (day < today && !allowPast) throw new PlayerDayInputError("Player of the day dates cannot be in the past");
    seen.add(day);
    dates.push(day);
  }
  if (dates.length === 0) throw new PlayerDayInputError("Select at least one date");
  return dates;
}

function readFormat(value: unknown): PlayerDayFormat {
  return FORMATS.includes(value as PlayerDayFormat) ? (value as PlayerDayFormat) : "odi";
}

function requireFormat(value: unknown, label: string): PlayerDayFormat {
  const text = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (FORMATS.includes(text as PlayerDayFormat)) return text as PlayerDayFormat;
  throw new PlayerDayInputError(`${label} format must be ODI, T20, or Test`);
}

function readDay(id: string, data: Record<string, unknown>): StoredDay & { id: string } {
  const role = ROLES.includes(data.role as (typeof ROLES)[number]) ? (data.role as (typeof ROLES)[number]) : "batsman";
  const status = STATUSES.includes(data.status as PlayerOfTheDayStatus) ? (data.status as PlayerOfTheDayStatus) : "pending";
  return {
    id,
    play_date: typeof data.play_date === "string" ? data.play_date : "",
    player_id: typeof data.player_id === "string" ? data.player_id : "",
    name: typeof data.name === "string" ? data.name : "",
    country: typeof data.country === "string" ? data.country : "",
    photo_url: typeof data.photo_url === "string" ? data.photo_url : null,
    role,
    debut_format: readFormat(data.debut_format),
    wickets_format: readFormat(data.wickets_format),
    matches_format: readFormat(data.matches_format),
    hundreds_format: readFormat(data.hundreds_format),
    status,
    times_played: typeof data.times_played === "number" ? data.times_played : 0,
    created_at: typeof data.created_at === "string" ? data.created_at : "",
    updated_at: typeof data.updated_at === "string" ? data.updated_at : "",
  };
}

function toResponse(day: StoredDay & { id: string }): PlayerOfTheDay {
  return {
    id: day.id,
    play_date: day.play_date,
    player_id: day.player_id,
    name: day.name,
    country: day.country,
    photo_url: day.photo_url,
    role: day.role,
    debut_format: day.debut_format,
    wickets_format: day.wickets_format,
    matches_format: day.matches_format,
    hundreds_format: day.hundreds_format,
    status: day.status,
    times_played: day.times_played,
    created_at: day.created_at,
  };
}

async function allDays() {
  const docs = await listDocuments(COLLECTION);
  return docs.map((item) => readDay(item.id, item.data));
}

function storedFields(day: StoredDay & { id?: string }): StoredDay {
  return {
    play_date: day.play_date,
    player_id: day.player_id,
    name: day.name,
    country: day.country,
    photo_url: day.photo_url,
    role: day.role,
    debut_format: day.debut_format,
    wickets_format: day.wickets_format,
    matches_format: day.matches_format,
    hundreds_format: day.hundreds_format,
    status: day.status,
    times_played: day.times_played,
    created_at: day.created_at,
    updated_at: day.updated_at,
  };
}

async function refreshPast(day: StoredDay & { id: string }) {
  const desired = defaultStatus(day.play_date);
  if (day.status === "active" && desired === "past") {
    day.status = "past";
    day.updated_at = new Date().toISOString();
    await setDocument(COLLECTION, day.id, storedFields(day));
  }
  return day;
}

async function playerSnapshot(playerId: string) {
  const id = playerId.trim();
  if (!id) throw new PlayerDayInputError("Select a player");
  try {
    const player = await getPlayer(id);
    return {
      player_id: player.id,
      name: player.name,
      country: player.country,
      photo_url: player.photo_url,
      role: player.role,
    };
  } catch {
    throw new PlayerDayInputError("Player was not found");
  }
}

export function parsePlayerDayPayload(value: unknown, editing: boolean) {
  const body = asRecord(value, "Player of the day body is invalid");
  const playerId = typeof body.player_id === "string" ? body.player_id : "";
  const rawDates = Array.isArray(body.dates)
    ? body.dates.filter((item): item is string => typeof item === "string")
    : typeof body.play_date === "string"
      ? [body.play_date]
      : [];
  const dates = uniqueDates(rawDates, editing);
  if (editing && dates.length !== 1) throw new PlayerDayInputError("Choose exactly one date when editing");
  return {
    playerId,
    dates,
    debut_format: requireFormat(body.debut_format, "Debut"),
    wickets_format: requireFormat(body.wickets_format, "Wickets"),
    matches_format: requireFormat(body.matches_format, "Matches"),
    hundreds_format: requireFormat(body.hundreds_format, "Hundreds"),
  };
}

export async function listPlayerDays(input: {
  q: string;
  status: string;
  from: string;
  to: string;
  page: number;
  pageSize: number;
}): Promise<PlayerOfTheDayListResponse> {
  if (input.status && !STATUSES.includes(input.status as PlayerOfTheDayStatus)) {
    throw new PlayerDayInputError("Invalid status");
  }
  const page = Number.isFinite(input.page) && input.page > 0 ? Math.floor(input.page) : 1;
  const pageSize = Number.isFinite(input.pageSize) && input.pageSize > 0 ? Math.min(Math.floor(input.pageSize), 50) : 10;
  const q = input.q.trim().toLowerCase();
  const from = input.from ? dateKey(input.from) : "";
  const to = input.to ? dateKey(input.to) : "";
  const days = await Promise.all((await allDays()).map((day) => refreshPast(day)));
  const filtered = days.filter((day) => {
    if (q) {
      const haystack = `${day.name} ${day.country} ${day.play_date}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    if (input.status && day.status !== input.status) return false;
    if (from && day.play_date < from) return false;
    if (to && day.play_date > to) return false;
    return true;
  });
  filtered.sort((left, right) => (left.play_date < right.play_date ? 1 : left.play_date > right.play_date ? -1 : left.name.localeCompare(right.name)));
  const total = filtered.length;
  const totalPages = pageSize > 0 ? Math.ceil(total / pageSize) : 0;
  const start = (page - 1) * pageSize;
  return {
    items: filtered.slice(start, start + pageSize).map(toResponse),
    total,
    page,
    page_size: pageSize,
    total_pages: totalPages,
  };
}

export async function getPlayerDay(id: string) {
  const snap = await getDocument(COLLECTION, id);
  if (!snap) throw new PlayerDayNotFoundError();
  return toResponse(await refreshPast(readDay(snap.id, snap.data)));
}

export async function createPlayerDays(value: unknown) {
  const input = parsePlayerDayPayload(value, false);
  const player = await playerSnapshot(input.playerId);
  const existing = await allDays();
  const taken = new Set(existing.map((day) => day.play_date));
  if (input.dates.some((day) => taken.has(day))) {
    throw new PlayerDayConflictError("A player of the day already exists for one of the selected dates");
  }
  const now = new Date().toISOString();
  const created = [];
  for (const day of input.dates) {
    const id = crypto.randomUUID();
    const stored: StoredDay = {
      play_date: day,
      ...player,
      debut_format: input.debut_format,
      wickets_format: input.wickets_format,
      matches_format: input.matches_format,
      hundreds_format: input.hundreds_format,
      status: defaultStatus(day),
      times_played: 0,
      created_at: now,
      updated_at: now,
    };
    await setDocument(COLLECTION, id, storedFields(stored));
    created.push(toResponse({ ...stored, id }));
  }
  return { items: created };
}

export async function updatePlayerDay(id: string, value: unknown) {
  const snap = await getDocument(COLLECTION, id);
  if (!snap) throw new PlayerDayNotFoundError();
  const existing = readDay(snap.id, snap.data);
  const input = parsePlayerDayPayload(value, true);
  const player = await playerSnapshot(input.playerId);
  const day = input.dates[0];
  const clash = (await allDays()).some((item) => item.play_date === day && item.id !== existing.id);
  if (clash) throw new PlayerDayConflictError("A player of the day already exists for one of the selected dates");
  const stored: StoredDay = {
    ...existing,
    play_date: day,
    ...player,
    debut_format: input.debut_format,
    wickets_format: input.wickets_format,
    matches_format: input.matches_format,
    hundreds_format: input.hundreds_format,
    status: defaultStatus(day),
    updated_at: new Date().toISOString(),
  };
  await setDocument(COLLECTION, id, storedFields(stored));
  return toResponse({ ...stored, id });
}

export async function updatePlayerDayStatus(id: string, value: unknown) {
  const body = asRecord(value, "Status body is invalid");
  const status = typeof body.status === "string" ? body.status.trim() : "";
  if (!STATUSES.includes(status as PlayerOfTheDayStatus)) throw new PlayerDayInputError("Invalid status");
  const snap = await getDocument(COLLECTION, id);
  if (!snap) throw new PlayerDayNotFoundError();
  const existing = readDay(snap.id, snap.data);
  const stored: StoredDay = { ...existing, status: status as PlayerOfTheDayStatus, updated_at: new Date().toISOString() };
  await setDocument(COLLECTION, id, storedFields(stored));
  return toResponse({ ...stored, id });
}

export async function deletePlayerDay(id: string) {
  const snap = await getDocument(COLLECTION, id);
  if (!snap) throw new PlayerDayNotFoundError();
  await deleteDocument(COLLECTION, id);
}
