"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Menu } from "lucide-react";
import { useOpenMenu } from "@/components/layout/admin-shell";
import { api, ApiError } from "@/lib/api";

type VersionDetail = {
  id: string;
  release_version: string;
  created_at: string;
  player_count: number;
  players: {
    player_id: string;
    name: string;
    country: string;
    op: "upsert" | "delete";
    changes: { field: string; value: string }[];
  }[];
};

function formatWhen(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || "—";
  return date.toLocaleString();
}

export default function PlayerVersionDetailPage() {
  const params = useParams<{ id: string }>();
  const openMenu = useOpenMenu();
  const [version, setVersion] = useState<VersionDetail | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void api<VersionDetail>(`/api/v1/player-versions/${params.id}`)
      .then((data) => {
        if (active) setVersion(data);
      })
      .catch((err) => {
        if (active) setError(err instanceof ApiError ? err.message : "Could not load this version.");
      });
    return () => {
      active = false;
    };
  }, [params.id]);

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
            <Link href="/player-versions" className="mb-2 inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white">
              <ArrowLeft className="size-4" />
              Version Numbers
            </Link>
            <h1 className="text-[28px] font-semibold tracking-tight text-white sm:text-[32px]">
              {version ? `Version ${version.release_version}` : "Version"}
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              {version
                ? `${version.player_count} player${version.player_count === 1 ? "" : "s"} · ${formatWhen(version.created_at)}`
                : "Players and fields updated in this release."}
            </p>
          </div>
        </div>
      </div>

      {error ? (
        <p className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p>
      ) : null}

      {!version && !error ? <p className="mt-6 text-sm text-zinc-500">Loading version...</p> : null}

      {version ? (
        <div className="mt-5 space-y-4">
          {version.players.map((player) => (
            <section key={player.player_id} className="overflow-hidden rounded-[28px] bg-card">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/8 px-5 py-4">
                <div>
                  <h2 className="text-lg font-medium text-white">{player.name}</h2>
                  <p className="text-sm text-zinc-500">{player.country || "No country"}</p>
                </div>
                {player.op === "delete" ? (
                  <span className="rounded-full bg-red-500/15 px-3 py-1 text-xs font-medium text-red-300">Deleted</span>
                ) : null}
              </div>
              {player.op === "delete" ? (
                <p className="px-5 py-4 text-sm text-zinc-400">This player was removed in this version.</p>
              ) : player.changes.length === 0 ? (
                <p className="px-5 py-4 text-sm text-zinc-400">No stat fields changed.</p>
              ) : (
                <table className="min-w-full text-left">
                  <thead>
                    <tr className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                      <th className="px-5 py-3 font-medium">Field</th>
                      <th className="px-5 py-3 font-medium">Updated value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {player.changes.map((change) => (
                      <tr key={`${player.player_id}-${change.field}`} className="border-t border-white/5">
                        <td className="px-5 py-3 text-sm text-zinc-300">{change.field}</td>
                        <td className="px-5 py-3 text-sm text-white">{change.value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
          ))}
        </div>
      ) : null}
    </div>
  );
}
