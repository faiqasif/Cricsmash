import { api } from "@/lib/api";

export type GameNotification = {
  id: string;
  title: string;
  body: string;
  game: string;
  game_title: string;
  play_date: string;
  game_option: string;
  topic: string;
  status: "sent" | "failed";
  message_id?: string;
  error?: string;
  created_at: string;
};

export function listNotifications() {
  return api<{ items: GameNotification[] }>("/api/v1/notifications");
}

export function sendGameNotification(input: { title: string; body: string; game: string; play_date: string }) {
  return api<GameNotification>("/api/v1/notifications", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
