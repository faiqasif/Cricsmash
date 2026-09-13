"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { ErrorText } from "@/components/form/error-text";
import { PlayerSuggestField, type SelectedPlayer } from "@/components/games/player-suggest-field";
import { TeamCalendar } from "@/components/games/team-calendar";
import { countryFromTeamTitle } from "@/data/cricket";
import { ApiError } from "@/lib/api";
import { suggestPlayers, type PlayerListItem } from "@/lib/players";
import {
  createTeamOfTheDay,
  emptyPlayerSlots,
  playerCountForType,
  updateTeamOfTheDay,
  type TeamOfTheDay,
  type TeamOfTheDayType,
} from "@/lib/team-of-the-day";

const inputClass =
  "h-12 w-full appearance-none rounded-full border border-white/8 bg-[#0c0c10] px-5 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-purple/50";
const labelClass = "mb-2 block text-sm font-medium text-white";

type TeamOfTheDayFormProps = {
  team?: TeamOfTheDay;
};

export function TeamOfTheDayForm({ team }: TeamOfTheDayFormProps) {
  const router = useRouter();
  const editing = Boolean(team);
  const [teamType, setTeamType] = useState<TeamOfTheDayType | "">(team?.team_type ?? "");
  const [title, setTitle] = useState(team?.title ?? "");
  const [dates, setDates] = useState<string[]>(team?.play_date ? [team.play_date] : []);
  const [players, setPlayers] = useState<SelectedPlayer[]>(() => {
    const count = playerCountForType(team?.team_type ?? "team");
    const slots = emptyPlayerSlots(count);
    (team?.players ?? []).forEach((player, index) => {
      if (index < slots.length) {
        slots[index] = { id: player.player_id, name: player.name, photo_url: player.photo_url };
      }
    });
    return slots;
  });
  const [roster, setRoster] = useState<PlayerListItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const today = useMemo(() => {
    const now = new Date();
    return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-${String(now.getUTCDate()).padStart(2, "0")}`;
  }, []);
  const minDate = editing && team && team.play_date < today ? team.play_date : today;
  const country = useMemo(() => countryFromTeamTitle(title), [title]);
  const needed = playerCountForType(teamType || "team");

  useEffect(() => {
    setPlayers((current) => {
      if (current.length === needed) return current;
      if (current.length < needed) return [...current, ...emptyPlayerSlots(needed - current.length)];
      return current.slice(0, needed);
    });
  }, [needed]);

  useEffect(() => {
    if (!country) {
      setRoster([]);
      return;
    }
    const timeout = window.setTimeout(() => {
      void suggestPlayers({ country, limit: 300 })
        .then((data) => setRoster(data.items))
        .catch(() => setRoster([]));
    }, 200);
    return () => window.clearTimeout(timeout);
  }, [country]);

  function setPlayerAt(index: number, value: SelectedPlayer) {
    setPlayers((current) => current.map((player, i) => (i === index ? value : player)));
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (!teamType) nextErrors.teamType = "Select a team type.";
    if (title.trim().length < 2) nextErrors.title = "Enter a team title.";
    if (!country) nextErrors.title = "Use a team name we can match, e.g. Pakistan - 2023 ODI World Cup.";
    if (dates.length === 0) nextErrors.dates = "Select at least one date.";
    const missing = players.filter((player) => !player.id);
    if (missing.length) nextErrors.players = `Select ${needed} players from the suggested names.`;
    const ids = players.map((player) => player.id).filter(Boolean);
    if (new Set(ids).size !== ids.length) nextErrors.players = "Players must be unique.";
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setSubmitting(true);
    setError("");
    try {
      if (editing && team) {
        await updateTeamOfTheDay(team.id, {
          title: title.trim(),
          team_type: teamType as TeamOfTheDayType,
          play_date: dates[0],
          player_ids: ids,
        });
        router.push(`/games/team-of-the-day/${team.id}`);
      } else {
        await createTeamOfTheDay({
          title: title.trim(),
          team_type: teamType as TeamOfTheDayType,
          dates,
          player_ids: ids,
        });
        router.push("/games/team-of-the-day");
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save this team.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={(event) => void onSubmit(event)} className="rounded-[28px] bg-[#14141a] px-5 py-6 sm:px-7">
      {error ? (
        <p className="mb-5 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      ) : null}

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div>
          <label className="mb-5 block">
            <span className={labelClass}>Team Type*</span>
            <p className="mb-2 text-xs text-zinc-500">Select a type of team</p>
            <div className="relative">
              <select
                value={teamType}
                onChange={(event) => setTeamType(event.target.value as TeamOfTheDayType | "")}
                className={inputClass}
              >
                <option value="">Select Type</option>
                <option value="team">Team (11 players)</option>
                <option value="squad">Squad (15 players)</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
            </div>
            <ErrorText message={fieldErrors.teamType} />
          </label>

          <label className="mb-5 block">
            <span className={labelClass}>Team Title*</span>
            <p className="mb-2 text-xs text-zinc-500">Enter a title for this team</p>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="e.g., Pakistan - 2023 ODI World Cup"
              className={inputClass}
            />
            {country ? (
              <p className="mt-1.5 text-xs text-emerald-300">Suggesting {country} players</p>
            ) : (
              <p className="mt-1.5 text-xs text-zinc-500">
                Start the title with a team name so we can filter players from that side.
              </p>
            )}
            <ErrorText message={fieldErrors.title} />
          </label>

          <div>
            <p className={labelClass}>Add Players*</p>
            <p className="mb-3 text-xs text-zinc-500">Enter {needed} players</p>
            <div className="space-y-3">
              {players.map((player, index) => (
                <PlayerSuggestField
                  key={`${teamType}-${index}`}
                  index={index + 1}
                  value={player}
                  country={country}
                  roster={roster}
                  excludeIds={players.map((item) => item.id).filter(Boolean)}
                  onChange={(value) => setPlayerAt(index, value)}
                />
              ))}
            </div>
            <ErrorText message={fieldErrors.players} />
          </div>
        </div>

        <div>
          <TeamCalendar selected={dates} onChange={setDates} single={editing} minDate={minDate} />
          <ErrorText message={fieldErrors.dates} />
        </div>
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href={editing && team ? `/games/team-of-the-day/${team.id}` : "/games/team-of-the-day"}
          className="inline-flex h-12 items-center rounded-full border border-purple px-8 text-sm font-medium text-purple"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex h-12 items-center rounded-full bg-purple px-8 text-sm font-medium text-white disabled:opacity-60"
        >
          {submitting ? "Saving…" : editing ? "Save Team" : "Create Team"}
        </button>
      </div>
    </form>
  );
}
