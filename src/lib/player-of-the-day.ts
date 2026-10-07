import { api } from "@/lib/api";
import { formatQuizDate } from "@/lib/daily-quiz";

export type PlayerOfTheDayStatus = "pending" | "active" | "past";

export type PlayerOfTheDay = {
  id: string;
  play_date: string;
  player_id: string;
  name: string;
  country: string;
  photo_url: string | null;
  role: string;
  status: PlayerOfTheDayStatus;
  times_played: number;
  created_at?: string;
};

export type PlayerOfTheDayListResponse = {
  items: PlayerOfTheDay[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
};

export type PlayerOfTheDayPayload = {
  player_id: string;
  dates?: string[];
  play_date?: string;
};

export function listPlayersOfTheDay(params: {
  page?: number;
  pageSize?: number;
  q?: string;
  status?: string;
  from?: string;
  to?: string;
}) {
  const query = new URLSearchParams();
  query.set("page", String(params.page ?? 1));
  query.set("page_size", String(params.pageSize ?? 10));
  if (params.q) query.set("q", params.q);
  if (params.status) query.set("status", params.status);
  if (params.from) query.set("from", params.from);
  if (params.to) query.set("to", params.to);
  return api<PlayerOfTheDayListResponse>(`/api/v1/player-of-the-day?${query.toString()}`);
}

export function getPlayerOfTheDay(id: string) {
  return api<PlayerOfTheDay>(`/api/v1/player-of-the-day/${id}`);
}

export function createPlayersOfTheDay(input: PlayerOfTheDayPayload) {
  return api<{ items: PlayerOfTheDay[] }>("/api/v1/player-of-the-day", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updatePlayerOfTheDay(id: string, input: PlayerOfTheDayPayload) {
  return api<PlayerOfTheDay>(`/api/v1/player-of-the-day/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export function updatePlayerOfTheDayStatus(id: string, status: PlayerOfTheDayStatus) {
  return api<PlayerOfTheDay>(`/api/v1/player-of-the-day/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export function deletePlayerOfTheDay(id: string) {
  return api<void>(`/api/v1/player-of-the-day/${id}`, { method: "DELETE" });
}

export function formatPlayDate(iso: string) {
  return formatQuizDate(iso);
}

export function playerDayStatusLabel(status: PlayerOfTheDayStatus) {
  if (status === "pending") return "Pending";
  if (status === "past") return "Past";
  return "Active";
}
