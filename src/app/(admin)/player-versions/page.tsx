"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";
import { useOpenMenu } from "@/components/layout/admin-shell";
import { api, ApiError } from "@/lib/api";

type VersionRow = {
  id: string;
  release_version: string;
  created_at: string;
  player_count: number;
};

function formatWhen(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || "—";
  return date.toLocaleString();
}

export default function PlayerVersionsPage() {
  const openMenu = useOpenMenu();
  const [items, setItems] = useState<VersionRow[]>([]);
  const [nextVersion, setNextVersion] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void api<{ items: VersionRow[]; next_version: string }>("/api/v1/player-versions")
      .then((data) => {
        if (!active) return;
        setItems(data.items);
        setNextVersion(data.next_version);
      })
      .catch((err) => {
        if (active) setError(err instanceof ApiError ? err.message : "Could not load versions.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

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
            <h1 className="text-[28px] font-semibold tracking-tight text-white sm:text-[32px]">Version Numbers</h1>
            <p className="mt-1 text-sm text-zinc-500">
              Every published release. The next version is {nextVersion || "1.0"}.
            </p>
          </div>
        </div>
      </div>

      {error ? (
        <p className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p>
      ) : null}

      <div className="mt-5 overflow-x-auto rounded-[28px] bg-card">
        <table className="min-w-full text-left">
          <thead>
            <tr className="bg-[#16122A] text-xs font-medium uppercase tracking-wide text-zinc-400">
              <th className="px-5 py-4 font-medium">Version</th>
              <th className="px-5 py-4 font-medium">Players</th>
              <th className="px-5 py-4 font-medium">Created</th>
              <th className="px-5 py-4 font-medium">Details</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="px-5 py-12 text-center text-sm text-zinc-500">
                  Loading versions...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-5 py-12 text-center text-sm text-zinc-500">
                  No versions yet. Publish a bulk update to create 1.0.
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} className="border-b border-border last:border-0">
                  <td className="px-5 py-4 text-sm font-medium text-white">{item.release_version}</td>
                  <td className="px-5 py-4 text-sm text-zinc-300">{item.player_count}</td>
                  <td className="px-5 py-4 text-sm text-zinc-300">{formatWhen(item.created_at)}</td>
                  <td className="px-5 py-4">
                    <Link href={`/player-versions/${item.id}`} className="text-sm font-medium text-purple hover:text-white">
                      View
                    </Link>
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
