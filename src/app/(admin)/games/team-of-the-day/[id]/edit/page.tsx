"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Menu } from "lucide-react";
import { HeaderActions } from "@/components/layout/header-actions";
import { useOpenMenu } from "@/components/layout/admin-shell";
import { TeamOfTheDayForm } from "@/components/games/team-of-the-day-form";
import { ApiError } from "@/lib/api";
import { getTeamOfTheDay, type TeamOfTheDay } from "@/lib/team-of-the-day";

export default function EditTeamOfTheDayPage() {
  const openMenu = useOpenMenu();
  const params = useParams<{ id: string }>();
  const [team, setTeam] = useState<TeamOfTheDay | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getTeamOfTheDay(params.id)
      .then(setTeam)
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : "Could not load this team."),
      );
  }, [params.id]);

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
        <span className="text-white">Edit</span>
      </p>

      <div className="mb-5 flex items-center justify-between gap-4 rounded-[28px] bg-[#14141a] px-5 py-5 sm:px-7">
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
            <h1 className="text-[28px] font-semibold tracking-tight text-white">Edit Team of the Day</h1>
            <p className="mt-1 text-sm text-zinc-500">Update this daily team and its players.</p>
          </div>
        </div>
        <HeaderActions />
      </div>

      {error ? (
        <p className="mb-5 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      ) : null}

      {team ? <TeamOfTheDayForm team={team} /> : <p className="text-sm text-zinc-500">Loading…</p>}
    </div>
  );
}
