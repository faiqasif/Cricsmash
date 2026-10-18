import { deleteDocument, getDocument, listDocuments, queryDocuments, setDocument } from "@/lib/firebase";
import type { TeamOfTheDay, TeamOfTheDayListResponse, TeamOfTheDayStatus, TeamOfTheDayType } from "@/lib/team-of-the-day";
import { countryFromTeamTitle } from "@/data/cricket";

const COLLECTION = "teamsOfTheDay";
const TYPES = ["team", "squad"] as const;
const STATUSES = ["pending", "active", "past"] as const;
const COUNTS: Record<TeamOfTheDayType, number> = { team: 11, squad: 15 };

export class TeamInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TeamInputError";
  }
}

export class TeamNotFoundError extends Error {
  constructor(message = "Team of the day not found.") {
    super(message);
    this.name = "TeamNotFoundError";
  }
}

export class TeamConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TeamConflictError";
  }
}

type StoredTeam = {
  play_date: string;
  title: string;
  country: string;
  team_type: TeamOfTheDayType;
  status: TeamOfTheDayStatus;
  times_played: number;
  players: string[];
  created_at: string;
  updated_at: string;
};

function todayUTC() {
  return new Date().toISOString().slice(0, 10);
}

function defaultStatus(playDate: string, today = todayUTC()): TeamOfTheDayStatus {
  if (playDate > today) return "pending";
  if (playDate < today) return "past";
  return "active";
}

function asRecord(value: unknown, message: string) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new TeamInputError(message);
  return value as Record<string, unknown>;
}

function dateKey(value: string) {
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) throw new TeamInputError("Choose a valid date");
  const parsed = new Date(`${trimmed}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== trimmed) {
    throw new TeamInputError("Choose a valid date");
  }
  return trimmed;
}

function uniqueDates(values: string[], allowPast: boolean) {
  if (values.length === 0) throw new TeamInputError("Select at least one date");
  const today = todayUTC();
  const seen = new Set<string>();
  const dates: string[] = [];
  for (const value of values) {
    const day = dateKey(value);
    if (seen.has(day)) continue;
    if (day < today && !allowPast) throw new TeamInputError("Team dates cannot be in the past");
    seen.add(day);
    dates.push(day);
  }
  if (dates.length === 0) throw new TeamInputError("Select at least one date");
  return dates;
}

function prepareRoster(title: string, teamType: string, playerNames: string[]) {
  const name = title.trim();
  if (name.length < 2 || name.length > 200) throw new TeamInputError("Title must be between 2 and 200 characters");
  const type = teamType.trim().toLowerCase();
  if (type !== "team" && type !== "squad") throw new TeamInputError("Team type must be team or squad");
  const want = COUNTS[type];
  if (playerNames.length !== want) {
    throw new TeamInputError(`${type === "squad" ? "Squad" : "Team"} must have ${want} players`);
  }
  const seen = new Set<string>();
  const players: string[] = [];
  for (const raw of playerNames) {
    const playerName = raw.trim();
    if (playerName.length < 2 || playerName.length > 150) throw new TeamInputError("Each player name must be between 2 and 150 characters");
    const key = playerName.toLowerCase();
    if (seen.has(key)) throw new TeamInputError("Players must be unique");
    seen.add(key);
    players.push(playerName);
  }
  return {
    title: name,
    teamType: type as TeamOfTheDayType,
    players,
    country: countryFromTeamTitle(name) ?? "International",
  };
}

function readPlayers(value: unknown) {
  if (!Array.isArray(value)) return { names: [] as string[], trim: false };
  let trim = false;
  const names: string[] = [];
  for (const item of value) {
    if (typeof item === "string") {
      const name = item.trim();
      if (name) names.push(name);
      else trim = true;
      continue;
    }
    trim = true;
    if (!item || typeof item !== "object") continue;
    const name = typeof (item as { name?: unknown }).name === "string" ? (item as { name: string }).name.trim() : "";
    if (name) names.push(name);
  }
  return { names, trim };
}

function readTeam(id: string, data: Record<string, unknown>): StoredTeam & { id: string; playersNeedTrim: boolean } {
  const teamType = data.team_type === "squad" ? "squad" : "team";
  const status = STATUSES.includes(data.status as TeamOfTheDayStatus) ? (data.status as TeamOfTheDayStatus) : "pending";
  const players = readPlayers(data.players);
  return {
    id,
    play_date: typeof data.play_date === "string" ? data.play_date : "",
    title: typeof data.title === "string" ? data.title : "",
    country: typeof data.country === "string" ? data.country : "",
    team_type: teamType,
    status,
    times_played: typeof data.times_played === "number" ? data.times_played : 0,
    players: players.names,
    playersNeedTrim: players.trim,
    created_at: typeof data.created_at === "string" ? data.created_at : "",
    updated_at: typeof data.updated_at === "string" ? data.updated_at : "",
  };
}

function toResponse(team: StoredTeam & { id: string }, includePlayers: boolean): TeamOfTheDay {
  const response: TeamOfTheDay = {
    id: team.id,
    play_date: team.play_date,
    title: team.title,
    country: team.country,
    team_type: team.team_type,
    status: team.status,
    times_played: team.times_played,
    player_count: team.players.length,
    created_at: team.created_at,
  };
  if (includePlayers) response.players = team.players;
  return response;
}

async function allTeams() {
  const docs = await listDocuments(COLLECTION);
  return docs.map((item) => readTeam(item.id, item.data));
}

async function refreshPast(team: StoredTeam & { id: string; playersNeedTrim: boolean }) {
  const desired = defaultStatus(team.play_date);
  const statusChanged = team.status === "active" && desired === "past";
  if (!statusChanged && !team.playersNeedTrim) return team;
  if (statusChanged) team.status = "past";
  team.updated_at = new Date().toISOString();
  const { id, playersNeedTrim: _trim, ...data } = team;
  await setDocument(COLLECTION, id, data);
  team.playersNeedTrim = false;
  return team;
}

export function parseTeamPayload(value: unknown, editing: boolean) {
  const body = asRecord(value, "Team body is invalid");
  const title = typeof body.title === "string" ? body.title : "";
  const teamType = typeof body.team_type === "string" ? body.team_type : "";
  const playerNames = Array.isArray(body.player_names)
    ? body.player_names.filter((item): item is string => typeof item === "string")
    : [];
  const rawDates = Array.isArray(body.dates)
    ? body.dates.filter((item): item is string => typeof item === "string")
    : typeof body.play_date === "string"
      ? [body.play_date]
      : [];
  const dates = uniqueDates(rawDates, editing);
  if (editing && dates.length !== 1) throw new TeamInputError("Choose exactly one date when editing");
  return { title, teamType, playerNames, dates };
}

export async function listTeams(input: {
  q: string;
  teamType: string;
  status: string;
  from: string;
  to: string;
  page: number;
  pageSize: number;
}): Promise<TeamOfTheDayListResponse> {
  if (input.teamType && !TYPES.includes(input.teamType as TeamOfTheDayType)) {
    throw new TeamInputError("Invalid team type");
  }
  if (input.status && !STATUSES.includes(input.status as TeamOfTheDayStatus)) {
    throw new TeamInputError("Invalid status");
  }
  const page = Number.isFinite(input.page) && input.page > 0 ? Math.floor(input.page) : 1;
  const pageSize = Number.isFinite(input.pageSize) && input.pageSize > 0 ? Math.min(Math.floor(input.pageSize), 50) : 10;
  const q = input.q.trim().toLowerCase();
  const from = input.from ? dateKey(input.from) : "";
  const to = input.to ? dateKey(input.to) : "";
  const where = [
    ...(input.teamType ? [{ field: "team_type", value: input.teamType }] : []),
    ...(input.status ? [{ field: "status", value: input.status }] : []),
  ];
  const teams = await Promise.all(
    (
      await queryDocuments(COLLECTION, {
        where,
        orderBy: { field: "play_date", direction: "DESCENDING" },
      })
    )
      .map((item) => readTeam(item.id, item.data))
      .map((team) => refreshPast(team)),
  );
  const filtered = teams.filter((team) => {
    if (q) {
      const haystack = `${team.title} ${team.country} ${team.play_date}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    if (input.teamType && team.team_type !== input.teamType) return false;
    if (input.status && team.status !== input.status) return false;
    if (from && team.play_date < from) return false;
    if (to && team.play_date > to) return false;
    return true;
  });
  filtered.sort((a, b) => (a.play_date < b.play_date ? 1 : a.play_date > b.play_date ? -1 : 0));
  const total = filtered.length;
  const totalPages = pageSize > 0 ? Math.ceil(total / pageSize) : 0;
  const start = (page - 1) * pageSize;
  return {
    items: filtered.slice(start, start + pageSize).map((team) => toResponse(team, false)),
    total,
    page,
    page_size: pageSize,
    total_pages: totalPages,
  };
}

export async function getTeam(id: string) {
  const snap = await getDocument(COLLECTION, id);
  if (!snap) throw new TeamNotFoundError();
  const team = await refreshPast(readTeam(snap.id, snap.data));
  return toResponse(team, true);
}

export async function createTeams(value: unknown) {
  const input = parseTeamPayload(value, false);
  const roster = prepareRoster(input.title, input.teamType, input.playerNames);
  const existing = await allTeams();
  const taken = new Set(existing.map((team) => team.play_date));
  if (input.dates.some((day) => taken.has(day))) {
    throw new TeamConflictError("A team already exists for one of the selected dates");
  }
  const now = new Date().toISOString();
  const created = [];
  for (const day of input.dates) {
    const id = crypto.randomUUID();
    const stored: StoredTeam = {
      play_date: day,
      title: roster.title,
      country: roster.country,
      team_type: roster.teamType,
      status: defaultStatus(day),
      times_played: 0,
      players: roster.players,
      created_at: now,
      updated_at: now,
    };
    await setDocument(COLLECTION, id, stored);
    created.push(toResponse({ ...stored, id }, true));
  }
  return { items: created };
}

export async function updateTeam(id: string, value: unknown) {
  const snap = await getDocument(COLLECTION, id);
  if (!snap) throw new TeamNotFoundError();
  const { id: existingId, playersNeedTrim: _trim, ...existing } = readTeam(snap.id, snap.data);
  const input = parseTeamPayload(value, true);
  const roster = prepareRoster(input.title, input.teamType, input.playerNames);
  const day = input.dates[0];
  const clash = (await allTeams()).some((team) => team.play_date === day && team.id !== existingId);
  if (clash) throw new TeamConflictError("A team already exists for one of the selected dates");
  const stored: StoredTeam = {
    ...existing,
    play_date: day,
    title: roster.title,
    country: roster.country,
    team_type: roster.teamType,
    status: defaultStatus(day),
    players: roster.players,
    updated_at: new Date().toISOString(),
  };
  await setDocument(COLLECTION, id, stored);
  return toResponse({ ...stored, id }, true);
}

export async function updateTeamStatus(id: string, value: unknown) {
  const body = asRecord(value, "Status body is invalid");
  const status = typeof body.status === "string" ? body.status.trim() : "";
  if (!STATUSES.includes(status as TeamOfTheDayStatus)) throw new TeamInputError("Invalid status");
  const snap = await getDocument(COLLECTION, id);
  if (!snap) throw new TeamNotFoundError();
  const { id: _existingId, playersNeedTrim: _trim, ...existing } = readTeam(snap.id, snap.data);
  const stored: StoredTeam = { ...existing, status: status as TeamOfTheDayStatus, updated_at: new Date().toISOString() };
  await setDocument(COLLECTION, id, stored);
  return toResponse({ ...stored, id }, true);
}

export async function deleteTeam(id: string) {
  const snap = await getDocument(COLLECTION, id);
  if (!snap) throw new TeamNotFoundError();
  await deleteDocument(COLLECTION, id);
}
