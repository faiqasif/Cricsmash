import { api } from "@/lib/api";

export type DailyQuizStatus = "pending" | "active" | "past";

export type DailyQuizPlayer = {
  player_id: string;
  name: string;
  country: string;
  photo_url: string | null;
  value?: string;
  correct?: boolean;
  option?: number;
};

export type DailyQuizItem = {
  id: string;
  title: string;
  format: string;
  metric?: string;
  kind?: "player_stat" | "general" | "tournament";
  category_name?: string;
  country?: string;
  options: DailyQuizPlayer[];
};

export type DailyQuiz = {
  id: string;
  quiz_date: string;
  status: DailyQuizStatus;
  times_played: number;
  items: DailyQuizItem[];
};

export type DailyQuizListItem = {
  id: string;
  quiz_date: string;
  status: DailyQuizStatus;
  times_played: number;
  question_count: number;
};

export type DailyQuizListResponse = {
  items: DailyQuizListItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
};

export type DailyQuizAnswer = {
  correct: boolean;
  selected_player_id?: string;
  correct_player_ids?: string[];
  selected_option?: number;
  correct_option?: number;
};

export type DailyQuizGenerateCategory = {
  category_id: string;
  count: number;
};

export function listDailyQuizzes(params: {
  page?: number;
  pageSize?: number;
  status?: string;
  from?: string;
  to?: string;
}) {
  const query = new URLSearchParams();
  query.set("page", String(params.page ?? 1));
  query.set("page_size", String(params.pageSize ?? 10));
  if (params.status) query.set("status", params.status);
  if (params.from) query.set("from", params.from);
  if (params.to) query.set("to", params.to);
  return api<DailyQuizListResponse>(`/api/v1/daily-quiz?${query.toString()}`);
}

export function getTodayDailyQuiz() {
  return api<DailyQuiz>("/api/v1/daily-quiz/today");
}

export function getDailyQuiz(id: string) {
  return api<DailyQuiz>(`/api/v1/daily-quiz/${id}`);
}

export function generateDailyQuiz(input: {
  quiz_date?: string;
  categories: DailyQuizGenerateCategory[];
}) {
  return api<DailyQuiz>("/api/v1/daily-quiz/generate", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateDailyQuizStatus(id: string, status: DailyQuizStatus) {
  return api<DailyQuiz>(`/api/v1/daily-quiz/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export function deleteDailyQuiz(id: string) {
  return api<void>(`/api/v1/daily-quiz/${id}`, { method: "DELETE" });
}

export function isPlayerStatItem(item: DailyQuizItem) {
  return item.kind === "player_stat" || item.kind === "general" || item.kind === "tournament" || item.options.some((option) => !option.player_id);
}

export function answerDailyQuizItem(itemId: string, playerId?: string, option?: number) {
  const body: Record<string, unknown> = {};
  if (playerId) body.player_id = playerId;
  if (option != null) body.option = option;
  return api<DailyQuizAnswer>(`/api/v1/daily-quiz/items/${itemId}/answer`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function formatQuizDate(iso: string) {
  const date = new Date(`${iso}T00:00:00Z`);
  return {
    label: date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    }),
    weekday: date.toLocaleDateString("en-GB", { weekday: "long", timeZone: "UTC" }),
  };
}

export function quizStatusLabel(status: DailyQuizStatus, detailed = false) {
  if (detailed && status === "active") return "Published";
  if (status === "pending") return "Pending";
  if (status === "past") return "Past";
  return "Active";
}
