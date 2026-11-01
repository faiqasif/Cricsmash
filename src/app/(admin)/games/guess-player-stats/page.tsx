"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Menu, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { HeaderActions } from "@/components/layout/header-actions";
import { useOpenMenu } from "@/components/layout/admin-shell";
import { ConfirmDeleteModal, openConfirm } from "@/components/ui/confirm-delete-modal";
import { TablePagination } from "@/components/ui/table-pagination";
import { ApiError } from "@/lib/api";
import { deleteGuessPlayerStat, listGuessPlayerStats, type GuessPlayerStat } from "@/lib/guess-player-stats";

function padIndex(index: number) {
  return String(index).padStart(2, "0");
}

export default function GuessPlayerStatsPage() {
  const openMenu = useOpenMenu();
  const [items, setItems] = useState<GuessPlayerStat[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pendingDelete, setPendingDelete] = useState<GuessPlayerStat | null>(null);
  const pageSize = 10;

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await listGuessPlayerStats({ page, pageSize, q: query.trim() });
      if (data.total_pages > 0 && page > data.total_pages) {
        setPage(data.total_pages);
        return;
      }
      setItems(data.items);
      setTotal(data.total);
      setTotalPages(data.total_pages);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load questions.");
      setItems([]);
      setTotal(0);
      setTotalPages(0);
    } finally {
      setLoading(false);
    }
  }, [page, query]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void load();
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [load]);

  const fromRow = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const toRow = Math.min(page * pageSize, total);
  const empty = !loading && items.length === 0;

  return (
    <div>
      <p className="mb-4 text-sm text-zinc-500">
        <Link href="/games" className="hover:text-zinc-300">
          Games
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-white">Guess the Player Stats</span>
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
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight text-white">Guess the Player Stats</h1>
            <p className="mt-1 text-sm text-zinc-400">Write a question and the correct answer. Phones store both locally.</p>
            <p className="mt-0.5 text-xs text-zinc-500">
              New, edited, and deleted questions are included the next time you create a stat version.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <HeaderActions />
          <Link
            href="/games/guess-player-stats/new"
            className="inline-flex h-12 items-center gap-2 rounded-full bg-purple px-5 text-sm font-medium text-white"
          >
            <Plus className="size-4" />
            Add question
          </Link>
        </div>
      </div>

      {error ? (
        <p className="mt-5 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p>
      ) : null}

      <label className="relative mt-5 block">
        <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
        <input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setPage(1);
          }}
          placeholder="Search by question or answer"
          className="h-12 w-full rounded-full border border-white/8 bg-[#14141a] pl-11 pr-4 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-purple/50"
        />
      </label>

      <div className="mt-5 overflow-x-auto rounded-[28px] bg-[#14141a]">
        <table className="min-w-full text-left text-sm">
          <thead className="text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-6 py-4 font-medium">#</th>
              <th className="px-6 py-4 font-medium">Question</th>
              <th className="px-6 py-4 font-medium">Correct answer</th>
              <th className="px-6 py-4 font-medium" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="px-6 py-10 text-center text-zinc-500">
                  Loading questions…
                </td>
              </tr>
            ) : empty ? (
              <tr>
                <td colSpan={4} className="px-6 py-10 text-center text-zinc-500">
                  No questions yet. Add one, then create a stat version so phones can download it.
                </td>
              </tr>
            ) : (
              items.map((item, index) => (
                <tr key={item.id} className="border-t border-white/5">
                  <td className="px-6 py-4 text-zinc-400">{padIndex(fromRow + index)}</td>
                  <td className="max-w-md px-6 py-4 text-white">{item.question}</td>
                  <td className="px-6 py-4 font-medium text-zinc-200">{item.answer}</td>
                  <td className="px-6 py-4">
                    <div className="flex justify-end gap-2">
                      <Link
                        href={`/games/guess-player-stats/${item.id}/edit`}
                        className="rounded-full p-2 text-zinc-400 hover:bg-white/5 hover:text-white"
                        aria-label={`Edit ${item.question}`}
                      >
                        <Pencil className="size-4" />
                      </Link>
                      <button
                        type="button"
                        onClick={() => openConfirm(setPendingDelete, item)}
                        className="rounded-full p-2 text-zinc-400 hover:bg-white/5 hover:text-red-300"
                        aria-label={`Delete ${item.question}`}
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 ? (
        <div className="mt-4 flex items-center justify-between text-sm text-zinc-500">
          <p>
            {fromRow}-{toRow} of {total}
          </p>
          <TablePagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      ) : null}

      <ConfirmDeleteModal
        open={Boolean(pendingDelete)}
        title="Delete question?"
        description="Phones remove this question when you create the next version. If it was never published, it is dropped and the app never sees it."
        onClose={() => setPendingDelete(null)}
        onConfirm={async () => {
          if (!pendingDelete) return;
          await deleteGuessPlayerStat(pendingDelete.id);
          await load();
        }}
      />
    </div>
  );
}
