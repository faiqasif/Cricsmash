"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronDown, Menu } from "lucide-react";
import { HeaderActions } from "@/components/layout/header-actions";
import { useOpenMenu } from "@/components/layout/admin-shell";
import { GAME_CARDS } from "@/data/games";
import { ApiError } from "@/lib/api";
import { formatQuizDate, listDailyQuizzes } from "@/lib/daily-quiz";
import { listNotifications, sendGameNotification, type GameNotification } from "@/lib/notifications";
import { listPlayersOfTheDay } from "@/lib/player-of-the-day";
import { listTeamsOfTheDay } from "@/lib/team-of-the-day";

const inputClass =
  "h-12 w-full appearance-none rounded-full border border-white/8 bg-[#0c0c10] px-5 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-purple/50";

function formatWhen(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function todayKey() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

export default function NotificationsPage() {
  const openMenu = useOpenMenu();
  const [game, setGame] = useState(GAME_CARDS[0]?.slug ?? "");
  const [playDate, setPlayDate] = useState(todayKey);
  const [schedule, setSchedule] = useState("");
  const [scheduleReady, setScheduleReady] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [items, setItems] = useState<GameNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listNotifications();
      setItems(data.items);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load notifications.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const selected = GAME_CARDS.find((card) => card.slug === game);

  useEffect(() => {
    let active = true;
    setSchedule("");
    setScheduleReady(false);
    if (!selected || !/^\d{4}-\d{2}-\d{2}$/.test(playDate)) return;
    const dateLabel = formatQuizDate(playDate).label;
    if (!selected.scheduled) {
      setSchedule(`${selected.title} will open for ${dateLabel}.`);
      setScheduleReady(true);
      return;
    }
    void (async () => {
      try {
        let detail = "";
        if (selected.slug === "daily-quiz") {
          const data = await listDailyQuizzes({ page: 1, pageSize: 5, from: playDate, to: playDate });
          const match = data.items.find((item) => item.quiz_date === playDate);
          detail = match ? `${match.question_count} question${match.question_count === 1 ? "" : "s"}` : "";
        } else if (selected.slug === "player-of-the-day") {
          const data = await listPlayersOfTheDay({ page: 1, pageSize: 5, from: playDate, to: playDate });
          const match = data.items.find((item) => item.play_date === playDate);
          detail = match ? `${match.name} · ${match.country}` : "";
        } else if (selected.slug === "team-of-the-day") {
          const data = await listTeamsOfTheDay({ page: 1, pageSize: 5, from: playDate, to: playDate });
          const match = data.items.find((item) => item.play_date === playDate);
          detail = match ? `${match.title} · ${match.country}` : "";
        }
        if (!active) return;
        setSchedule(detail ? `${selected.title} for ${dateLabel}: ${detail}` : `No ${selected.title} is scheduled for ${dateLabel}.`);
        setScheduleReady(Boolean(detail));
      } catch (err) {
        if (!active) return;
        setSchedule(err instanceof ApiError ? err.message : "Could not check this date.");
        setScheduleReady(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [playDate, selected]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSending(true);
    setError("");
    setNotice("");
    try {
      await sendGameNotification({ title: title.trim(), body: body.trim(), game, play_date: playDate });
      setTitle("");
      setBody("");
      setNotice("Notification sent.");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not send the notification.");
      await load();
    } finally {
      setSending(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-4 rounded-[28px] bg-[#14141a] px-5 py-5 sm:px-7">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={openMenu}
            className="rounded-lg p-2 text-zinc-400 hover:bg-white/5 lg:hidden"
            aria-label="Open menu"
          >
            <Menu className="size-5" />
          </button>
          <div>
            <h1 className="text-[28px] font-semibold tracking-tight text-white sm:text-[32px]">Notifications</h1>
            <p className="mt-1 text-sm text-zinc-500">Send a game to users through Firebase.</p>
          </div>
        </div>
        <HeaderActions />
      </div>

      <form onSubmit={(event) => void onSubmit(event)} className="mt-5 rounded-[28px] bg-[#14141a] px-5 py-6 sm:px-7">
        {error ? (
          <p className="mb-5 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p>
        ) : null}
        {notice ? (
          <p className="mb-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
            {notice}
          </p>
        ) : null}

        <div className="mb-5 grid gap-5 md:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-white">Game*</span>
            <div className="relative">
              <select value={game} onChange={(event) => setGame(event.target.value)} className={inputClass}>
                {GAME_CARDS.map((card) => (
                  <option key={card.slug} value={card.slug}>
                    {card.title}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
            </div>
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-white">Date*</span>
            <input
              type="date"
              value={playDate}
              onChange={(event) => setPlayDate(event.target.value)}
              className={`${inputClass} [color-scheme:dark]`}
            />
          </label>
        </div>
        {schedule ? (
          <p
            className={`mb-5 rounded-2xl border px-4 py-3 text-sm ${
              scheduleReady
                ? "border-white/10 bg-white/5 text-zinc-200"
                : "border-amber-500/30 bg-amber-500/10 text-amber-200"
            }`}
          >
            {schedule}
          </p>
        ) : null}

        <label className="mb-5 block">
          <span className="mb-2 block text-sm font-medium text-white">Title*</span>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Today's game is ready"
            className={inputClass}
          />
        </label>

        <label className="mb-6 block">
          <span className="mb-2 block text-sm font-medium text-white">Message*</span>
          <textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder="Play Player of the day and guess today's cricketer."
            rows={4}
            className="w-full rounded-[24px] border border-white/8 bg-[#0c0c10] px-5 py-4 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-purple/50"
          />
        </label>

        <button
          type="submit"
          disabled={sending || !scheduleReady}
          className="inline-flex h-12 items-center rounded-full bg-purple px-8 text-sm font-medium text-white disabled:opacity-60"
        >
          {sending ? "Sending…" : "Send notification"}
        </button>
      </form>

      <div className="mt-5 overflow-x-auto rounded-[28px] bg-[#14141a]">
        <table className="min-w-full text-left text-sm">
          <thead className="text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-6 py-4 font-medium">When</th>
              <th className="px-6 py-4 font-medium">Game</th>
              <th className="px-6 py-4 font-medium">Date</th>
              <th className="px-6 py-4 font-medium">Title</th>
              <th className="px-6 py-4 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-6 py-10 text-center text-zinc-500">
                  Loading notifications…
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-10 text-center text-zinc-500">
                  No notifications sent yet.
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} className="border-t border-white/5">
                  <td className="px-6 py-4 text-zinc-400">{formatWhen(item.created_at)}</td>
                  <td className="px-6 py-4">
                    <p className="text-white">{item.game_title}</p>
                    {item.game_option ? <p className="mt-1 text-xs text-zinc-500">{item.game_option}</p> : null}
                  </td>
                  <td className="px-6 py-4 text-zinc-300">
                    {item.play_date ? formatQuizDate(item.play_date).label : "—"}
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-medium text-white">{item.title}</p>
                    <p className="mt-1 text-xs text-zinc-500">{item.body}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className={item.status === "sent" ? "text-emerald-300" : "text-red-300"}>{item.status}</span>
                    {item.error ? <p className="mt-1 max-w-xs text-xs text-red-300">{item.error}</p> : null}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
