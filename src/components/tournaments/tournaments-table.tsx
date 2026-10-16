"use client";

import Link from "next/link";
import { ChevronDown, Menu, Pencil, Plus, RefreshCw, RotateCcw, Search, Trash2 } from "lucide-react";
import { HeaderActions } from "@/components/layout/header-actions";
import { useOpenMenu } from "@/components/layout/admin-shell";
import { TablePagination } from "@/components/ui/table-pagination";
import type { TournamentListItem } from "@/lib/tournaments";

function padIndex(index: number) {
  return String(index).padStart(2, "0");
}

type TournamentsTableProps = {
  tournaments: TournamentListItem[];
  total: number;
  loading: boolean;
  query: string;
  used: string;
  page: number;
  pageSize: number;
  totalPages: number;
  resetting?: boolean;
  onQueryChange: (value: string) => void;
  onUsedChange: (value: string) => void;
  onPageChange: (page: number) => void;
  onRefresh: () => void;
  onReset: () => void;
  onDelete: (tournament: TournamentListItem) => void;
};

export function TournamentsTable({
  tournaments,
  total,
  loading,
  query,
  used,
  page,
  pageSize,
  totalPages,
  resetting = false,
  onQueryChange,
  onUsedChange,
  onPageChange,
  onRefresh,
  onReset,
  onDelete,
}: TournamentsTableProps) {
  const empty = !loading && tournaments.length === 0;
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const openMenu = useOpenMenu();

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
            <h1 className="text-[28px] font-semibold tracking-tight text-white sm:text-[32px]">
              Tournaments({total})
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              Create and manage all tournaments at one place.
            </p>
          </div>
        </div>
        <HeaderActions />
      </div>

      <div className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-center">
        <label className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
          <input
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search tournaments by name"
            className="h-12 w-full rounded-full border border-white/8 bg-[#14141a] pl-11 pr-4 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-purple/50"
          />
        </label>

        <button
          type="button"
          onClick={onRefresh}
          className="inline-flex size-12 shrink-0 items-center justify-center rounded-full border border-white/8 bg-[#16122A] text-zinc-300 transition hover:text-white"
          aria-label="Refresh tournaments"
        >
          <RefreshCw className="size-4" />
        </button>

        <div className="relative shrink-0">
          <select
            value={used}
            onChange={(e) => onUsedChange(e.target.value)}
            className="h-12 appearance-none rounded-full border border-white/8 bg-[#16122A] py-0 pl-5 pr-11 text-sm text-zinc-300 outline-none"
          >
            <option value="">Used</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
        </div>

        <button
          type="button"
          onClick={onReset}
          disabled={resetting}
          className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-full border border-purple px-5 text-sm font-medium text-purple disabled:opacity-50"
        >
          <RotateCcw className="size-4" />
          Reset
        </button>

        <Link
          href="/tournaments/new"
          className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-full bg-purple px-6 text-sm font-medium text-white shadow-[0_0_24px_rgba(124,92,255,0.4)] transition hover:bg-[#6d4dff]"
        >
          <Plus className="size-4" />
          Create a New Tournament
        </Link>
      </div>

      <div className="mt-6 overflow-x-auto rounded-[28px] bg-card">
        <table className="min-w-full text-left">
          <thead>
            <tr className="bg-[#16122A] text-xs font-medium uppercase tracking-wide text-zinc-400">
              <th className="px-5 py-4 font-medium">#</th>
              <th className="px-5 py-4 font-medium">Tournament Name</th>
              <th className="px-5 py-4 font-medium">Total Questions</th>
              <th className="px-5 py-4 font-medium">Used</th>
              <th className="px-5 py-4 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-5 py-12 text-center text-sm text-zinc-500">
                  Loading tournaments...
                </td>
              </tr>
            ) : empty ? (
              <tr>
                <td colSpan={5} className="px-5 py-12 text-center text-sm text-zinc-500">
                  No tournaments found.
                </td>
              </tr>
            ) : (
              tournaments.map((tournament, index) => (
                <tr key={tournament.id} className="border-b border-border last:border-0">
                  <td className="px-5 py-4 text-sm text-zinc-400">
                    {padIndex((page - 1) * pageSize + index + 1)}
                  </td>
                  <td className="px-5 py-4 text-sm font-medium text-white">{tournament.name}</td>
                  <td className="px-5 py-4 text-sm text-zinc-300">{tournament.total_questions}</td>
                  <td className="px-5 py-4 text-sm text-zinc-300">{tournament.used}</td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <Link
                        href={`/tournaments/${tournament.id}/edit`}
                        className="text-zinc-400 transition hover:text-white"
                        aria-label={`Edit ${tournament.name}`}
                      >
                        <Pencil className="size-4" />
                      </Link>
                      <button
                        type="button"
                        onClick={() => onDelete(tournament)}
                        className="text-red-400 transition hover:text-red-300"
                        aria-label={`Delete ${tournament.name}`}
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

      {totalPages > 0 ? (
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-zinc-500">
            Showing {from}-{to} of {total}
          </p>
          <TablePagination page={page} totalPages={totalPages} onPageChange={onPageChange} />
        </div>
      ) : null}
    </div>
  );
}
