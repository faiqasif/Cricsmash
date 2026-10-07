"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, Menu, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { HeaderActions } from "@/components/layout/header-actions";
import { useOpenMenu } from "@/components/layout/admin-shell";
import { ConfirmDeleteModal, openConfirm } from "@/components/ui/confirm-delete-modal";
import { flagUrl } from "@/data/cricket";
import { ApiError } from "@/lib/api";
import {
  deletePlayerOfTheDay,
  formatPlayDate,
  listPlayersOfTheDay,
  updatePlayerOfTheDayStatus,
  type PlayerOfTheDay,
  type PlayerOfTheDayStatus,
} from "@/lib/player-of-the-day";

function padIndex(index: number) {
  return String(index).padStart(2, "0");
}

function statusClass(status: PlayerOfTheDayStatus) {
  if (status === "active") return "bg-emerald-500/15 text-emerald-300";
  if (status === "past") return "bg-red-500/15 text-red-300";
  return "bg-purple/20 text-purple";
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export default function PlayerOfTheDayListPage() {
  const openMenu = useOpenMenu();
  const [items, setItems] = useState<PlayerOfTheDay[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pendingDelete, setPendingDelete] = useState<PlayerOfTheDay | null>(null);
  const pageSize = 10;

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await listPlayersOfTheDay({ page, pageSize, q: query.trim(), status, from, to });
      if (data.total_pages > 0 && page > data.total_pages) {
        setPage(data.total_pages);
        return;
      }
      setItems(data.items);
      setTotal(data.total);
      setTotalPages(data.total_pages);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load players of the day.");
      setItems([]);
      setTotal(0);
      setTotalPages(0);
    } finally {
      setLoading(false);
    }
  }, [from, page, query, status, to]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void load();
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [load]);

  const fromRow = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const toRow = Math.min(page * pageSize, total);
  const empty = !loading && items.length === 0;
  const rangeLabel = useMemo(() => {
    if (!from && !to) return "Select date range";
    return `${from || "…"} – ${to || "…"}`;
  }, [from, to]);

  async function changeStatus(item: PlayerOfTheDay, next: PlayerOfTheDayStatus) {
    try {
      await updatePlayerOfTheDayStatus(item.id, next);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not update status.");
    }
  }

  return (
    <div>
      <p className="mb-4 text-sm text-zinc-500">
        <Link href="/games" className="hover:text-zinc-300">
          Games
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-white">Player of the day</span>
      </p>

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
            <img src="/games/player-of-the-day.png" alt="" className="size-full object-cover" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight text-white">Player of the day</h1>
              <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-medium text-emerald-300">Active</span>
            </div>
            <p className="mt-1 text-sm text-zinc-400">Select a player for each day.</p>
            <p className="mt-0.5 text-xs text-zinc-500">Users have to guess the player of that day.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <HeaderActions />
          <Link
            href="/games/player-of-the-day/new"
            className="inline-flex h-12 items-center gap-2 rounded-full bg-purple px-5 text-sm font-medium text-white"
          >
            <Plus className="size-4" />
            Select Player For A Day
          </Link>
        </div>
      </div>

      {error ? (
        <p className="mt-5 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p>
      ) : null}

      <div className="mt-5 flex flex-col gap-3 lg:flex-row">
        <label className="relative flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
            placeholder="Search by date or player name"
            className="h-12 w-full rounded-full border border-white/8 bg-[#14141a] pl-11 pr-4 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-purple/50"
          />
        </label>
        <div className="relative">
          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
            className="h-12 appearance-none rounded-full border border-white/8 bg-[#14141a] px-5 pr-10 text-sm text-white outline-none [color-scheme:dark]"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="past">Past</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            type="date"
            value={from}
            onChange={(event) => {
              setFrom(event.target.value);
              setPage(1);
            }}
            className="h-12 rounded-full border border-white/8 bg-[#14141a] px-4 text-sm text-white outline-none [color-scheme:dark]"
            aria-label="From date"
          />
          <input
            type="date"
            value={to}
            onChange={(event) => {
              setTo(event.target.value);
              setPage(1);
            }}
            className="h-12 rounded-full border border-white/8 bg-[#14141a] px-4 text-sm text-white outline-none [color-scheme:dark]"
            aria-label="To date"
          />
          <p className="text-xs text-zinc-500 sm:ml-2">{rangeLabel}</p>
        </div>
      </div>

      <div className="mt-5 overflow-x-auto rounded-[28px] bg-[#14141a]">
        <table className="min-w-full text-left text-sm">
          <thead className="text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-6 py-4 font-medium">#</th>
              <th className="px-6 py-4 font-medium">Date</th>
              <th className="px-6 py-4 font-medium">Player Name</th>
              <th className="px-6 py-4 font-medium">Country</th>
              <th className="px-6 py-4 font-medium">No of times played</th>
              <th className="px-6 py-4 font-medium">Status</th>
              <th className="px-6 py-4 font-medium" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-6 py-10 text-center text-zinc-500">
                  Loading players…
                </td>
              </tr>
            ) : empty ? (
              <tr>
                <td colSpan={7} className="px-6 py-10 text-center text-zinc-500">
                  No players of the day yet. Pick one for today or a future date.
                </td>
              </tr>
            ) : (
              items.map((item, index) => {
                const date = formatPlayDate(item.play_date);
                return (
                  <tr key={item.id} className="border-t border-white/5">
                    <td className="px-6 py-4 text-zinc-400">{padIndex(fromRow + index)}</td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-white">{date.label}</p>
                      <p className="text-xs text-zinc-500">{date.weekday}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {item.photo_url ? (
                          <img src={item.photo_url} alt="" className="size-9 rounded-full object-cover" />
                        ) : (
                          <span className="flex size-9 items-center justify-center rounded-full bg-purple/20 text-xs font-semibold text-purple">
                            {initials(item.name)}
                          </span>
                        )}
                        <span className="font-medium text-white">{item.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-zinc-300">
                        <img src={flagUrl(item.country)} alt="" className="h-3.5 w-5 rounded-sm object-cover" />
                        {item.country}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-zinc-300">{item.times_played}</td>
                    <td className="px-6 py-4">
                      <div className="relative inline-flex">
                        <select
                          value={item.status}
                          onChange={(event) => void changeStatus(item, event.target.value as PlayerOfTheDayStatus)}
                          className={`h-8 appearance-none rounded-full px-3 pr-7 text-xs font-medium outline-none [color-scheme:dark] ${statusClass(item.status)}`}
                        >
                          <option value="active">Active</option>
                          <option value="pending">Pending</option>
                          <option value="past">Past</option>
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-2 top-1/2 size-3 -translate-y-1/2 opacity-70" />
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2">
                        <Link
                          href={`/games/player-of-the-day/${item.id}/edit`}
                          className="rounded-full p-2 text-zinc-400 hover:bg-white/5 hover:text-white"
                          aria-label={`Edit ${item.name}`}
                        >
                          <Pencil className="size-4" />
                        </Link>
                        <button
                          type="button"
                          onClick={() => openConfirm(setPendingDelete, item)}
                          className="rounded-full p-2 text-zinc-400 hover:bg-white/5 hover:text-red-300"
                          aria-label={`Delete ${item.name}`}
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 ? (
        <div className="mt-4 flex items-center justify-between text-sm text-zinc-500">
          <p>
            {fromRow}-{toRow} of {total}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((value) => value - 1)}
              className="rounded-full p-2 hover:bg-white/5 disabled:opacity-40"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((value) => value + 1)}
              className="rounded-full p-2 hover:bg-white/5 disabled:opacity-40"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      ) : null}

      <ConfirmDeleteModal
        open={Boolean(pendingDelete)}
        title="Delete player of the day?"
        description={`This removes ${pendingDelete?.name ?? "this player"} for ${pendingDelete ? formatPlayDate(pendingDelete.play_date).label : "this date"}.`}
        onClose={() => setPendingDelete(null)}
        onConfirm={async () => {
          if (!pendingDelete) return;
          await deletePlayerOfTheDay(pendingDelete.id);
          await load();
        }}
      />
    </div>
  );
}
