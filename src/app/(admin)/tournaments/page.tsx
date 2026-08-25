"use client";

import { useCallback, useEffect, useState } from "react";
import { ConfirmDeleteModal, openConfirm } from "@/components/ui/confirm-delete-modal";
import { ConfirmResetModal } from "@/components/ui/confirm-reset-modal";
import { TournamentsTable } from "@/components/tournaments/tournaments-table";
import { api } from "@/lib/api";
import type { TournamentListItem, TournamentListResponse } from "@/lib/tournaments";

export default function TournamentsPage() {
  const [tournaments, setTournaments] = useState<TournamentListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(5);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [used, setUsed] = useState("");
  const [error, setError] = useState("");
  const [pendingDelete, setPendingDelete] = useState<TournamentListItem | null>(null);
  const [resetOpen, setResetOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("page_size", String(pageSize));
      if (query.trim()) params.set("q", query.trim());
      if (used) params.set("used", used);
      const data = await api<TournamentListResponse>(`/api/v1/tournaments?${params.toString()}`);
      if (data.total_pages > 0 && page > data.total_pages) {
        setPage(data.total_pages);
        return;
      }
      setTournaments(data.items);
      setTotal(data.total);
      setTotalPages(data.total_pages);
    } catch {
      setError("Could not load tournaments. Make sure the Go API is running on port 8080.");
      setTournaments([]);
      setTotal(0);
      setTotalPages(0);
    } finally {
      setLoading(false);
    }
  }, [query, used, page, pageSize]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      void load();
    }, 250);
    return () => clearTimeout(timeout);
  }, [load]);

  return (
    <div>
      {error ? (
        <p className="mb-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      ) : null}
      <TournamentsTable
        tournaments={tournaments}
        total={total}
        loading={loading}
        query={query}
        used={used}
        page={page}
        pageSize={pageSize}
        totalPages={totalPages}
        onQueryChange={(value) => {
          setQuery(value);
          setPage(1);
        }}
        onUsedChange={(value) => {
          setUsed(value);
          setPage(1);
        }}
        onPageChange={setPage}
        onRefresh={() => void load()}
        onReset={() => setResetOpen(true)}
        onDelete={(tournament) => openConfirm(setPendingDelete, tournament)}
      />
      <ConfirmDeleteModal
        open={Boolean(pendingDelete)}
        title="Delete tournament?"
        description={
          pendingDelete
            ? `“${pendingDelete.name}” and its assigned answers will be permanently deleted. This cannot be undone.`
            : ""
        }
        onClose={() => setPendingDelete(null)}
        onConfirm={async () => {
          if (!pendingDelete) return;
          await api(`/api/v1/tournaments/${pendingDelete.id}`, { method: "DELETE" });
          await load();
        }}
      />
      <ConfirmResetModal
        open={resetOpen}
        title="Are you sure you want to reset the tournaments?"
        description="This would reset all the questions from all the tournaments to Unused."
        onClose={() => setResetOpen(false)}
        onConfirm={async () => {
          await api("/api/v1/tournaments/reset-used", { method: "POST" });
          await load();
        }}
      />
    </div>
  );
}
