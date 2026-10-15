"use client";

import { useCallback, useEffect, useState } from "react";
import { ConfirmDeleteModal, openConfirm } from "@/components/ui/confirm-delete-modal";
import { PlayerImportActions } from "@/components/players/player-import-modal";
import { PlayersTable } from "@/components/players/players-table";
import { api } from "@/lib/api";
import type { PlayerListItem, PlayerListResponse } from "@/lib/players";

export default function PlayersPage() {
  const [players, setPlayers] = useState<PlayerListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(5);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("");
  const [country, setCountry] = useState("");
  const [version, setVersion] = useState("");
  const [versions, setVersions] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [pendingDelete, setPendingDelete] = useState<PlayerListItem | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("page_size", String(pageSize));
      if (query.trim()) params.set("q", query.trim());
      if (role) params.set("role", role);
      if (country) params.set("country", country);
      if (version) params.set("version", version);
      const data = await api<PlayerListResponse>(`/api/v1/players?${params.toString()}`);
      if (data.total_pages > 0 && page > data.total_pages) {
        setPage(data.total_pages);
        return;
      }
      setPlayers(data.items);
      setTotal(data.total);
      setTotalPages(data.total_pages);
      setVersions(data.versions ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load players from Firebase.");
      setPlayers([]);
      setTotal(0);
      setTotalPages(0);
    } finally {
      setLoading(false);
    }
  }, [query, role, country, version, page, pageSize]);

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
      <PlayersTable
        players={players}
        total={total}
        loading={loading}
        query={query}
        role={role}
        country={country}
        version={version}
        versions={versions}
        page={page}
        pageSize={pageSize}
        totalPages={totalPages}
        onQueryChange={(value) => {
          setQuery(value);
          setPage(1);
        }}
        onRoleChange={(value) => {
          setRole(value);
          setPage(1);
        }}
        onCountryChange={(value) => {
          setCountry(value);
          setPage(1);
        }}
        onVersionChange={(value) => {
          setVersion(value);
          setPage(1);
        }}
        onPageChange={setPage}
        onDelete={(player) => openConfirm(setPendingDelete, player)}
        importActions={<PlayerImportActions onSaved={load} />}
      />
      <ConfirmDeleteModal
        open={Boolean(pendingDelete)}
        title="Delete player?"
        description={
          pendingDelete
            ? `“${pendingDelete.name}” will be permanently deleted. This cannot be undone.`
            : ""
        }
        onClose={() => setPendingDelete(null)}
        onConfirm={async () => {
          if (!pendingDelete) return;
          await api(`/api/v1/players/${pendingDelete.id}`, { method: "DELETE" });
          await load();
        }}
      />
    </div>
  );
}
