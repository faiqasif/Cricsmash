"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";
import { useOpenMenu } from "@/components/layout/admin-shell";
import { TablePagination } from "@/components/ui/table-pagination";
import { api, ApiError } from "@/lib/api";

type VersionRow = {
  id: string;
  guess_the_stat_version_number: number;
  created_at: string;
  question_count: number;
};

type VersionList = {
  items: VersionRow[];
  current_version: number;
  next_version: number;
  pending_count: number;
};

function formatWhen(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || "—";
  return date.toLocaleString();
}

export default function GuessStatVersionsPage() {
  const openMenu = useOpenMenu();
  const [items, setItems] = useState<VersionRow[]>([]);
  const [currentVersion, setCurrentVersion] = useState(0);
  const [nextVersion, setNextVersion] = useState(1);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  function applyList(data: VersionList) {
    setItems(data.items);
    setCurrentVersion(data.current_version);
    setNextVersion(data.next_version);
    setPendingCount(data.pending_count);
  }

  useEffect(() => {
    let active = true;
    void api<VersionList>("/api/v1/guess-stat-versions")
      .then((data) => {
        if (active) applyList(data);
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

  async function createVersion() {
    setCreating(true);
    setError("");
    setNotice("");
    try {
      const created = await api<{ guess_the_stat_version_number: number; count: number }>("/api/v1/guess-stat-versions", {
        method: "POST",
      });
      const data = await api<VersionList>("/api/v1/guess-stat-versions");
      applyList(data);
      setPage(1);
      setNotice(
        `Created guess_the_stat_version_number ${created.guess_the_stat_version_number} with ${created.count} question${created.count === 1 ? "" : "s"}.`,
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create the version.");
    } finally {
      setCreating(false);
    }
  }

  const totalPages = items.length === 0 ? 0 : Math.ceil(items.length / pageSize);
  const currentPage = totalPages === 0 ? 1 : Math.min(page, totalPages);
  const pageItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [currentPage, items]);
  const fromRow = items.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const toRow = Math.min(currentPage * pageSize, items.length);

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
            <h1 className="text-[28px] font-semibold tracking-tight text-white sm:text-[32px]">Stat Version Numbers</h1>
            <p className="mt-1 text-sm text-zinc-400">
              guess_the_stat_version_number{" "}
              <span className="font-medium text-white">{currentVersion || "None yet"}</span>
            </p>
            <p className="mt-1 text-sm text-zinc-400">
              Next <span className="font-medium text-white">{nextVersion}</span>
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void createVersion()}
          disabled={creating || pendingCount === 0}
          className="inline-flex h-12 shrink-0 items-center justify-center rounded-full bg-purple px-6 text-sm font-medium text-white disabled:opacity-60"
        >
          {creating ? "Creating…" : "Create New Version"}
        </button>
      </div>

      <p className="mt-4 text-sm text-zinc-500">
        {pendingCount === 0
          ? "No Guess the Player Stats questions are waiting. Saves stay here until you create a version."
          : `${pendingCount} question${pendingCount === 1 ? "" : "s"} will be included in guess_the_stat_version_number ${nextVersion}.`}
      </p>

      {notice ? (
        <p className="mt-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">{notice}</p>
      ) : null}
      {error ? (
        <p className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p>
      ) : null}

      <div className="mt-5 overflow-x-auto rounded-[28px] bg-card">
        <table className="min-w-full text-left">
          <thead>
            <tr className="bg-[#16122A] text-xs font-medium uppercase tracking-wide text-zinc-400">
              <th className="px-5 py-4 font-medium">guess_the_stat_version_number</th>
              <th className="px-5 py-4 font-medium">Questions</th>
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
                  No stat versions yet. The first guess_the_stat_version_number will be 1.
                </td>
              </tr>
            ) : (
              pageItems.map((item) => (
                <tr key={item.id} className="border-b border-border last:border-0">
                  <td className="px-5 py-4 text-sm font-medium text-white">{item.guess_the_stat_version_number}</td>
                  <td className="px-5 py-4 text-sm text-zinc-300">{item.question_count}</td>
                  <td className="px-5 py-4 text-sm text-zinc-300">{formatWhen(item.created_at)}</td>
                  <td className="px-5 py-4">
                    <Link href={`/guess-stat-versions/${item.id}`} className="text-sm font-medium text-purple hover:text-white">
                      View
                    </Link>
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
            {fromRow}-{toRow} of {items.length}
          </p>
          <TablePagination page={currentPage} totalPages={totalPages} onPageChange={setPage} />
        </div>
      ) : null}
    </div>
  );
}
