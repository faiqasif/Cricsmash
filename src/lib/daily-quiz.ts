import { api } from "@/lib/api";

export type DailyQuizPlayer = {
  player_id: string;
  name: string;
  country: string;
  photo_url: string | null;
};

export type DailyQuizItem = {
  id: string;
  title: string;
  format: string;
  options: DailyQuizPlayer[];
};

export type DailyQuiz = {
  id: string;
  quiz_date: string;
  items: DailyQuizItem[];
};

export type DailyQuizAnswer = {
  correct: boolean;
  selected_player_id: string;
  correct_player_ids: string[];
};

export function getTodayDailyQuiz() {
  return api<DailyQuiz>("/api/v1/daily-quiz/today");
}

export function generateDailyQuiz() {
  return api<DailyQuiz>("/api/v1/daily-quiz/generate", { method: "POST" });
}

export function answerDailyQuizItem(itemId: string, playerId: string) {
  return api<DailyQuizAnswer>(`/api/v1/daily-quiz/items/${itemId}/answer`, {
    method: "POST",
    body: JSON.stringify({ player_id: playerId }),
  });
}
