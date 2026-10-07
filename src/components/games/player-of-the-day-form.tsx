"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Info, Shuffle, X } from "lucide-react";
import { ErrorText } from "@/components/form/error-text";
import { TeamCalendar } from "@/components/games/team-calendar";
import { ApiError } from "@/lib/api";
import { listAllPlayers, type PlayerListItem } from "@/lib/players";
import { createPlayersOfTheDay, updatePlayerOfTheDay, type PlayerOfTheDay } from "@/lib/player-of-the-day";

const inputClass =
  "h-12 w-full appearance-none rounded-full border border-white/8 bg-[#0c0c10] px-5 text-sm text-white outline-none focus:border-purple/50 [color-scheme:dark]";
const labelClass = "mb-2 block text-sm font-medium text-white";

type PlayerOfTheDayFormProps = {
  entry?: PlayerOfTheDay;
};

export function PlayerOfTheDayForm({ entry }: PlayerOfTheDayFormProps) {
  const router = useRouter();
  const editing = Boolean(entry);
  const [players, setPlayers] = useState<PlayerListItem[]>([]);
  const [playerId, setPlayerId] = useState(entry?.player_id ?? "");
  const [dates, setDates] = useState<string[]>(entry?.play_date ? [entry.play_date] : []);
  const [loadingPlayers, setLoadingPlayers] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const minDate = editing && entry && entry.play_date < today ? entry.play_date : today;
  const selected = players.find((player) => player.id === playerId) ?? null;

  useEffect(() => {
    let cancelled = false;
    listAllPlayers()
      .then((items) => {
        if (!cancelled) setPlayers(items);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Could not load players.");
      })
      .finally(() => {
        if (!cancelled) setLoadingPlayers(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function pickRandom() {
    if (!players.length) return;
    const pool = players.filter((player) => player.id !== playerId);
    const next = pool[Math.floor(Math.random() * pool.length)] ?? players[0];
    if (next) setPlayerId(next.id);
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (!playerId) nextErrors.player = "Select a player.";
    if (dates.length === 0) nextErrors.dates = "Select at least one date.";
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setSubmitting(true);
    setError("");
    try {
      if (editing && entry) {
        await updatePlayerOfTheDay(entry.id, { player_id: playerId, dates });
      } else {
        await createPlayersOfTheDay({ player_id: playerId, dates });
      }
      router.push("/games/player-of-the-day");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save player of the day.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
      <div className="space-y-6">
        {error ? (
          <p className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p>
        ) : null}
        <div>
          <label className={labelClass} htmlFor="player-of-the-day">
            Select Player*
          </label>
          <div className="relative">
            <select
              id="player-of-the-day"
              value={playerId}
              onChange={(event) => setPlayerId(event.target.value)}
              className={inputClass}
              disabled={loadingPlayers}
            >
              <option value="">{loadingPlayers ? "Loading players…" : "Select Player"}</option>
              {players.map((player) => (
                <option key={player.id} value={player.id}>
                  {player.name} · {player.country}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
          </div>
          <ErrorText message={fieldErrors.player} />
        </div>

        <div>
          <p className="mb-3 text-sm text-zinc-500">Or</p>
          <p className={labelClass}>Random Picker</p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex h-12 min-w-0 flex-1 items-center justify-between rounded-full border border-white/8 bg-[#0c0c10] px-4">
              <span className="truncate text-sm text-white">{selected?.name ?? "No player picked"}</span>
              {selected ? (
                <button
                  type="button"
                  onClick={() => setPlayerId("")}
                  className="rounded-full p-1 text-zinc-400 hover:text-white"
                  aria-label="Clear player"
                >
                  <X className="size-4" />
                </button>
              ) : null}
            </div>
            <button
              type="button"
              onClick={pickRandom}
              disabled={!players.length}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-purple px-5 text-sm font-medium text-white disabled:opacity-50"
            >
              <Shuffle className="size-4" />
              Generate Random
            </button>
          </div>
        </div>

        <div className="flex gap-3 rounded-[24px] border border-white/8 bg-[#14141a] px-5 py-4">
          <Info className="mt-0.5 size-5 shrink-0 text-zinc-400" />
          <div>
            <p className="text-sm font-medium text-white">About Game Date</p>
            <p className="mt-1 text-sm text-zinc-400">
              This game will be available to users on the selected date from 12:00 AM to 11:59 PM (users local time).
            </p>
          </div>
        </div>

        <ErrorText message={fieldErrors.dates} />

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => router.push("/games/player-of-the-day")}
            className="h-12 rounded-full border border-white/10 px-6 text-sm font-medium text-white"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="h-12 rounded-full bg-purple px-6 text-sm font-medium text-white disabled:opacity-60"
          >
            {submitting ? "Saving…" : editing ? "Save" : "Create Players"}
          </button>
        </div>
      </div>

      <TeamCalendar selected={dates} onChange={setDates} minDate={minDate} single={editing} />
    </form>
  );
}
