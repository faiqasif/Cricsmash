import { api } from "@/lib/api";

export type GuessPlayerStat = {
  id: string;
  question: string;
  answer: string;
  created_at: string;
  updated_at: string;
};

export type GuessPlayerStatList = {
  items: GuessPlayerStat[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
};

export function listGuessPlayerStats(params: { page?: number; pageSize?: number; q?: string }) {
  const query = new URLSearchParams();
  query.set("page", String(params.page ?? 1));
  query.set("page_size", String(params.pageSize ?? 10));
  if (params.q) query.set("q", params.q);
  return api<GuessPlayerStatList>(`/api/v1/guess-player-stats?${query.toString()}`);
}

export function getGuessPlayerStat(id: string) {
  return api<GuessPlayerStat>(`/api/v1/guess-player-stats/${id}`);
}

export function createGuessPlayerStat(input: { question: string; answer: string }) {
  return api<GuessPlayerStat>("/api/v1/guess-player-stats", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateGuessPlayerStat(id: string, input: { question: string; answer: string }) {
  return api<GuessPlayerStat>(`/api/v1/guess-player-stats/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export function deleteGuessPlayerStat(id: string) {
  return api<void>(`/api/v1/guess-player-stats/${id}`, { method: "DELETE" });
}
