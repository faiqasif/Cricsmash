"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, CalendarDays, Menu, Pencil, Trash2 } from "lucide-react";
import { HeaderActions } from "@/components/layout/header-actions";
import { useOpenMenu } from "@/components/layout/admin-shell";
import { ConfirmDeleteModal } from "@/components/ui/confirm-delete-modal";
import { ApiError } from "@/lib/api";
import {
  deleteTeamOfTheDay,
  formatPlayDate,
  getTeamOfTheDay,
  playerCountForType,
  teamStatusLabel,
  type TeamOfTheDay,
} from "@/lib/team-of-the-day";

function statusClass(status: string) {
  if (status === "active") return "bg-emerald-500/15 text-emerald-300";
  if (status === "past") return "bg-red-500/15 text-red-300";
  return "bg-amber-500/15 text-amber-300";
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export default function TeamOfTheDayDetailPage() {
  const openMenu = useOpenMenu();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [team, setTeam] = useState<TeamOfTheDay | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setTeam(await getTeamOfTheDay(params.id));
    } catch (err) {
      setTeam(null);
      setError(err instanceof ApiError ? err.message : "Could not load this team.");
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const date = team ? formatPlayDate(team.play_date) : null;
  const players = team?.players ?? [];

  return (
    <div>
      <p className="mb-4 text-sm text-zinc-500">
        <Link href="/games" className="hover:text-zinc-300">
          Games
        </Link>
        <span className="mx-1.5">/</span>
        <Link href="/games/team-of-the-day" className="hover:text-zinc-300">
          Team of the day
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-white">Team of the Day Details</span>
      </p>

      <Link
        href="/games/team-of-the-day"
        className="mb-4 inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white"
      >
        <ArrowLeft className="size-4" />
        Back to Team of the day
      </Link>

      {error ? (
        <p className="mb-5 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      ) : null}

      {loading || !team || !date ? (
        <p className="text-sm text-zinc-500">{loading ? "Loading team…" : ""}</p>
      ) : (
        <>
          <div className="flex flex-col gap-4 rounded-[28px] bg-[#14141a] px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
            <div className="flex min-w-0 items-center gap-4">
              <button
                type="button"
                onClick={openMenu}
                className="rounded-lg p-2 text-zinc-400 hover:bg-white/5 lg:hidden"
                aria-label="Open menu"
              >
                <Menu className="size-5" />
              </button>
              <div className="relative size-16 shrink-0 overflow-hidden rounded-2xl bg-[#0c0c10]">
                <img src="/games/team-of-the-day.png" alt="" className="size-full object-cover" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-semibold tracking-tight text-white">{team.title}</h1>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusClass(team.status)}`}>
                    {teamStatusLabel(team.status, true)}
                  </span>
                </div>
                <p className="mt-1 flex items-center gap-2 text-sm text-zinc-400">
                  <CalendarDays className="size-4" />
                  Available {date.label}, 12:00 AM to 11:59 PM
                </p>
                <p className="mt-0.5 text-xs text-zinc-500">
                  Each team contain {playerCountForType(team.team_type)} Players
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <HeaderActions />
              <Link
                href={`/games/team-of-the-day/${team.id}/edit`}
                className="rounded-full p-2 text-zinc-400 hover:bg-white/5 hover:text-white"
                aria-label="Edit team"
              >
                <Pencil className="size-4" />
              </Link>
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="rounded-full p-2 text-zinc-400 hover:bg-white/5 hover:text-red-300"
                aria-label="Delete team"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          </div>

          <h2 className="mt-6 text-lg font-semibold text-white">All Players({players.length})</h2>
          <div className="mt-4 space-y-3 rounded-[28px] bg-[#14141a] px-5 py-5 sm:px-7">
            {players.map((player) => (
              <div key={player.player_id} className="flex items-center gap-3 py-1">
                {player.photo_url ? (
                  <img src={player.photo_url} alt="" className="size-10 rounded-full object-cover" />
                ) : (
                  <span className="flex size-10 items-center justify-center rounded-full bg-purple-soft text-xs font-semibold text-purple">
                    {initials(player.name)}
                  </span>
                )}
                <p className="text-sm font-medium text-white">{player.name}</p>
              </div>
            ))}
          </div>
        </>
      )}

      <ConfirmDeleteModal
        open={confirmDelete}
        title="Delete team?"
        description="This removes the team for this date."
        onClose={() => setConfirmDelete(false)}
        onConfirm={async () => {
          await deleteTeamOfTheDay(params.id);
          router.push("/games/team-of-the-day");
        }}
      />
    </div>
  );
}
