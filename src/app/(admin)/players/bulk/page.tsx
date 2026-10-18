"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, Search, X } from "lucide-react";
import { PlayerForm } from "@/components/players/player-form";
import { useOpenMenu } from "@/components/layout/admin-shell";
import { roleLabel } from "@/data/cricket";
import { api, ApiError } from "@/lib/api";
import { type Player, type PlayerListItem, type PlayerListResponse, type PlayerPayload } from "@/lib/players";

type Draft = {
  id: string;
  name: string;
  country: string;
  role: string;
  payload: PlayerPayload;
};

const DRAFTS_KEY = "cricstreak-bulk-release";

function readDrafts(): Draft[] {
  try {
    const raw = sessionStorage.getItem(DRAFTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Draft[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) => item && typeof item.id === "string" && item.payload && typeof item.payload === "object");
  } catch {
    return [];
  }
}

async function loadNextVersion() {
  const data = await api<{ next_version: string }>("/api/v1/player-versions");
  return data.next_version || "1.0";
}

export default function BulkPlayerUpdatePage() {
  const openMenu = useOpenMenu();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlayerListItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [draftsReady, setDraftsReady] = useState(false);
  const [editing, setEditing] = useState<Player | null>(null);
  const [loadingPlayer, setLoadingPlayer] = useState(false);
  const [nextVersion, setNextVersion] = useState("1.0");
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    setDrafts(readDrafts());
    setDraftsReady(true);
  }, []);

  useEffect(() => {
    if (!draftsReady) return;
    sessionStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts));
  }, [drafts, draftsReady]);

  useEffect(() => {
    let active = true;
    const timeout = setTimeout(() => {
      setSearching(true);
      const params = new URLSearchParams();
      params.set("page", "1");
      params.set("page_size", "20");
      if (query.trim()) params.set("q", query.trim());
      void api<PlayerListResponse>(`/api/v1/players?${params.toString()}`)
        .then((data) => {
          if (active) setResults(data.items);
        })
        .catch((err) => {
          if (active) setError(err instanceof ApiError ? err.message : "Could not search players.");
        })
        .finally(() => {
          if (active) setSearching(false);
        });
    }, 250);
    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [query]);

  useEffect(() => {
    let active = true;
    void loadNextVersion()
      .then((value) => {
        if (active) setNextVersion(value);
      })
      .catch(() => {
        if (active) setNextVersion("1.0");
      });
    return () => {
      active = false;
    };
  }, []);

  async function openPlayer(id: string) {
    setLoadingPlayer(true);
    setError("");
    setNotice("");
    try {
      setEditing(await api<Player>(`/api/v1/players/${id}`));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not open that player.");
    } finally {
      setLoadingPlayer(false);
    }
  }

  function keepDraft(payload: PlayerPayload) {
    if (!editing) return;
    if (drafts.length >= 50 && !drafts.some((item) => item.id === editing.id)) {
      setError("One release can include up to 50 players.");
      return;
    }
    const next: Draft = {
      id: editing.id,
      name: payload.name,
      country: payload.country,
      role: payload.role,
      payload,
    };
    setDrafts((current) => [...current.filter((item) => item.id !== editing.id), next]);
    setNotice(`${payload.name} is ready. Keep editing others, then assign one release version.`);
    setEditing(null);
  }

  async function publish() {
    if (drafts.length === 0) {
      setError("Update at least one player before publishing.");
      return;
    }
    setPublishing(true);
    setError("");
    setNotice("");
    try {
      const result = await api<{ release_version: string; count: number }>("/api/v1/players/release", {
        method: "POST",
        body: JSON.stringify({
          players: drafts.map((item) => ({ id: item.id, ...item.payload })),
        }),
      });
      setDrafts([]);
      const upcoming = await loadNextVersion().catch(() => nextVersion);
      setNextVersion(upcoming);
      setNotice(`Published ${result.count} player${result.count === 1 ? "" : "s"} as ${result.release_version}.`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not publish this release.");
    } finally {
      setPublishing(false);
    }
  }

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
            <h1 className="text-[28px] font-semibold tracking-tight text-white sm:text-[32px]">Bulk update</h1>
            <p className="mt-1 text-sm text-zinc-500">
              Update the players first. Publishing assigns version {nextVersion} automatically.
            </p>
          </div>
        </div>
      </div>

      {error ? (
        <p className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p>
      ) : null}
      {notice ? (
        <p className="mt-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
          {notice}
        </p>
      ) : null}

      <div className="mt-5 grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
        <div className="rounded-[28px] bg-[#14141a] p-5">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search players"
              className="h-12 w-full rounded-full border border-white/8 bg-[#0c0c10] pl-11 pr-4 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-purple/50"
            />
          </label>
          <div className="mt-4 max-h-64 space-y-2 overflow-y-auto">
            {searching ? <p className="px-2 text-sm text-zinc-500">Searching…</p> : null}
            {!searching && results.length === 0 ? <p className="px-2 text-sm text-zinc-500">No players found.</p> : null}
            {results.map((player) => {
              const kept = drafts.some((item) => item.id === player.id);
              return (
                <button
                  key={player.id}
                  type="button"
                  onClick={() => void openPlayer(player.id)}
                  className="flex w-full items-center justify-between gap-3 rounded-2xl px-3 py-2 text-left hover:bg-white/5"
                >
                  <span>
                    <span className="block text-sm text-white">{player.name}</span>
                    <span className="block text-xs text-zinc-500">
                      {player.country} · {roleLabel(player.role)}
                    </span>
                  </span>
                  <span className="text-xs text-purple">{kept ? "Ready" : "Edit"}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-6 border-t border-white/8 pt-5">
            <p className="text-sm font-medium text-white">Ready for release ({drafts.length})</p>
            <div className="mt-3 space-y-2">
              {drafts.length === 0 ? <p className="text-sm text-zinc-500">No players kept yet.</p> : null}
              {drafts.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-3 rounded-2xl bg-white/5 px-3 py-2">
                  <button type="button" onClick={() => void openPlayer(item.id)} className="min-w-0 text-left">
                    <span className="block truncate text-sm text-white">{item.name}</span>
                    <span className="block text-xs text-zinc-500">{item.country}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDrafts((current) => current.filter((entry) => entry.id !== item.id))}
                    className="rounded-full p-1 text-zinc-400 hover:bg-white/10 hover:text-white"
                    aria-label={`Remove ${item.name}`}
                  >
                    <X className="size-4" />
                  </button>
                </div>
              ))}
            </div>

            <p className="mt-5 text-sm text-zinc-300">
              Next version <span className="font-medium text-white">{nextVersion}</span>
            </p>
            <p className="mt-2 text-xs text-zinc-500">Versions start at 1.0 and increase by 0.1 on each publish.</p>
            <button
              type="button"
              onClick={() => void publish()}
              disabled={publishing || drafts.length === 0}
              className="mt-4 inline-flex h-12 w-full items-center justify-center rounded-full bg-purple px-6 text-sm font-medium text-white disabled:opacity-60"
            >
              {publishing ? "Publishing…" : "Publish release"}
            </button>
            <Link href="/players" className="mt-3 block text-center text-sm text-zinc-400 hover:text-white">
              Back to players
            </Link>
          </div>
        </div>

        <div>
          {loadingPlayer ? <p className="text-sm text-zinc-500">Loading player…</p> : null}
          {!loadingPlayer && !editing ? (
            <div className="rounded-[28px] bg-[#14141a] px-6 py-16 text-center">
              <p className="text-lg font-medium text-white">Choose a player to update</p>
              <p className="mt-2 text-sm text-zinc-500">
                Keep each player for the release. Nothing is published until you publish version {nextVersion}.
              </p>
            </div>
          ) : null}
          {editing ? (
            <PlayerForm key={editing.id} player={editing} onBatchSave={keepDraft} onBatchClose={() => setEditing(null)} />
          ) : null}
        </div>
      </div>
    </div>
  );
}
