import { api } from "@/lib/api";
import { formatQuizDate } from "@/lib/daily-quiz";

export type TeamOfTheDayType = "team" | "squad";
export type TeamOfTheDayStatus = "pending" | "active" | "past";

export type TeamOfTheDayPlayer = {
  player_id: string;
  name: string;
  country: string;
  photo_url: string | null;
  role: string;
  sort_order: number;
};

export type TeamOfTheDay = {
  id: string;
  play_date: string;
  title: string;
  country: string;
  team_type: TeamOfTheDayType;
  status: TeamOfTheDayStatus;
  times_played: number;
  player_count: number;
  players?: TeamOfTheDayPlayer[];
  created_at?: string;
};

export type TeamOfTheDayListResponse = {
  items: TeamOfTheDay[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
};

export type TeamOfTheDayPayload = {
  title: string;
  team_type: TeamOfTheDayType;
  dates?: string[];
  play_date?: string;
  player_ids: string[];
};

export const TEAM_PLAYER_COUNTS: Record<TeamOfTheDayType, number> = {
  team: 11,
  squad: 15,
};

export function teamTypeLabel(type: TeamOfTheDayType) {
  return type === "squad" ? "Squad" : "Team";
}

export function playerCountForType(type: TeamOfTheDayType) {
  return TEAM_PLAYER_COUNTS[type];
}

export function listTeamsOfTheDay(params: {
  page?: number;
  pageSize?: number;
  q?: string;
  teamType?: string;
  status?: string;
  from?: string;
  to?: string;
}) {
  const query = new URLSearchParams();
  query.set("page", String(params.page ?? 1));
  query.set("page_size", String(params.pageSize ?? 10));
  if (params.q) query.set("q", params.q);
  if (params.teamType) query.set("team_type", params.teamType);
  if (params.status) query.set("status", params.status);
  if (params.from) query.set("from", params.from);
  if (params.to) query.set("to", params.to);
  return api<TeamOfTheDayListResponse>(`/api/v1/team-of-the-day?${query.toString()}`);
}

export function getTeamOfTheDay(id: string) {
  return api<TeamOfTheDay>(`/api/v1/team-of-the-day/${id}`);
}

export function createTeamOfTheDay(input: TeamOfTheDayPayload) {
  return api<{ items: TeamOfTheDay[] }>("/api/v1/team-of-the-day", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateTeamOfTheDay(id: string, input: TeamOfTheDayPayload) {
  return api<TeamOfTheDay>(`/api/v1/team-of-the-day/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export function updateTeamOfTheDayStatus(id: string, status: TeamOfTheDayStatus) {
  return api<TeamOfTheDay>(`/api/v1/team-of-the-day/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export function deleteTeamOfTheDay(id: string) {
  return api<void>(`/api/v1/team-of-the-day/${id}`, { method: "DELETE" });
}

export function formatPlayDate(iso: string) {
  return formatQuizDate(iso);
}

export function teamStatusLabel(status: TeamOfTheDayStatus, detailed = false) {
  if (detailed && status === "active") return "Published";
  if (status === "pending") return "Pending";
  if (status === "past") return "Past";
  return "Active";
}

export function emptyPlayerSlots(count: number) {
  return Array.from({ length: count }, () => ({ id: "", name: "", photo_url: null as string | null }));
}
