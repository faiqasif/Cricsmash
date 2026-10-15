"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronDown, ChevronLeft, ChevronRight, Menu, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { HeaderActions } from "@/components/layout/header-actions";
import { useOpenMenu } from "@/components/layout/admin-shell";
import { COUNTRIES, ROLES, flagUrl, roleLabel } from "@/data/cricket";
import type { PlayerListItem } from "@/lib/players";
import type { ReactNode } from "react";

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function padIndex(index: number) {
  return String(index).padStart(2, "0");
}

type PlayersTableProps = {
  players: PlayerListItem[];
  total: number;
  loading: boolean;
  query: string;
  role: string;
  country: string;
  version: string;
  versions: string[];
  page: number;
  pageSize: number;
  totalPages: number;
  onQueryChange: (value: string) => void;
  onRoleChange: (value: string) => void;
  onCountryChange: (value: string) => void;
  onVersionChange: (value: string) => void;
  onPageChange: (page: number) => void;
  onDelete: (player: PlayerListItem) => void;
  importActions?: ReactNode;
};

export function PlayersTable({
  players,
  total,
  loading,
  query,
  role,
  country,
  version,
  versions,
  page,
  pageSize,
  totalPages,
  onQueryChange,
  onRoleChange,
  onCountryChange,
  onVersionChange,
  onPageChange,
  onDelete,
  importActions,
}: PlayersTableProps) {
  const empty = !loading && players.length === 0;
  const countryOptions = COUNTRIES;
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
              Players({total})
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              Create and manage all players at one place
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
            placeholder="Search players by name"
            className="h-12 w-full rounded-full border border-white/8 bg-[#14141a] pl-11 pr-4 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-purple/50"
          />
        </label>

        <FilterSelect value={role} onChange={onRoleChange} placeholder="All Roles">
          {ROLES.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </FilterSelect>

        <FilterSelect value={country} onChange={onCountryChange} placeholder="All Countries">
          {countryOptions.map((item) => (
            <option key={item.name} value={item.name}>
              {item.name}
            </option>
          ))}
        </FilterSelect>

        <FilterSelect value={version} onChange={onVersionChange} placeholder="All versions">
          <option value="none">No version</option>
          {versions.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </FilterSelect>

        {importActions}
        <Link
          href="/players/bulk"
          className="inline-flex h-12 shrink-0 items-center justify-center rounded-full border border-purple px-6 text-sm font-medium text-purple"
        >
          Bulk update
        </Link>
        <Link
          href="/players/new"
          className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-full bg-purple px-6 text-sm font-medium text-white shadow-[0_0_24px_rgba(124,92,255,0.4)] transition hover:bg-[#6d4dff]"
        >
          <Plus className="size-4" />
          Create a New Player
        </Link>
      </div>

      <div className="mt-6 overflow-x-auto rounded-[28px] bg-card">
        <table className="min-w-full text-left">
          <thead>
            <tr className="bg-[#16122A] text-xs font-medium uppercase tracking-wide text-zinc-400">
              <th className="px-5 py-4 font-medium">#</th>
              <th className="px-5 py-4 font-medium">Player Name</th>
              <th className="px-5 py-4 font-medium">Country</th>
              <th className="px-5 py-4 font-medium">Role</th>
              <th className="px-5 py-4 font-medium">Debut Year</th>
              <th className="px-5 py-4 font-medium">Version</th>
              <th className="px-5 py-4 font-medium">Status</th>
              <th className="px-5 py-4 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="px-5 py-12 text-center text-sm text-zinc-500">
                  Loading players...
                </td>
              </tr>
            ) : empty ? (
              <tr>
                <td colSpan={8} className="px-5 py-12 text-center text-sm text-zinc-500">
                  No players found.
                </td>
              </tr>
            ) : (
              players.map((player, index) => (
                <tr key={player.id} className="border-b border-border last:border-0">
                  <td className="px-5 py-4 text-sm text-zinc-400">
                    {padIndex((page - 1) * pageSize + index + 1)}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      {player.photo_url ? (
                        <img
                          src={player.photo_url}
                          alt={player.name}
                          className="size-10 rounded-full object-cover"
                        />
                      ) : (
                        <span className="flex size-10 items-center justify-center rounded-full bg-purple-soft text-xs font-semibold text-purple">
                          {initials(player.name)}
                        </span>
                      )}
                      <span className="font-medium text-white">{player.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2 text-sm text-zinc-300">
                      <Image
                        src={flagUrl(player.country)}
                        alt=""
                        width={20}
                        height={14}
                        className="h-3.5 w-5 rounded-sm object-cover"
                      />
                      {player.country}
                    </div>
                  </td>
                  <td className="px-5 py-4 text-sm text-zinc-300">{roleLabel(player.role)}</td>
                  <td className="px-5 py-4 text-sm text-zinc-300">{player.debut_year ?? "—"}</td>
                  <td className="px-5 py-4 text-sm text-zinc-300">{player.version ?? "—"}</td>
                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                        player.status === "active"
                          ? "bg-green/15 text-green"
                          : "bg-zinc-700/80 text-zinc-300"
                      }`}
                    >
                      {player.status === "active" ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <Link
                        href={`/players/${player.id}/edit`}
                        className="text-zinc-400 transition hover:text-white"
                        aria-label={`Edit ${player.name}`}
                      >
                        <Pencil className="size-4" />
                      </Link>
                      <button
                        type="button"
                        onClick={() => onDelete(player)}
                        className="text-red-400 transition hover:text-red-300"
                        aria-label={`Delete ${player.name}`}
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
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
              className="inline-flex size-10 items-center justify-center rounded-full border border-white/10 text-zinc-300 disabled:opacity-40"
              aria-label="Previous page"
            >
              <ChevronLeft className="size-4" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => onPageChange(n)}
                className={`inline-flex size-10 items-center justify-center rounded-full text-sm ${
                  n === page
                    ? "bg-purple font-medium text-white"
                    : "border border-white/10 text-zinc-300"
                }`}
              >
                {n}
              </button>
            ))}
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
              className="inline-flex size-10 items-center justify-center rounded-full border border-white/10 text-zinc-300 disabled:opacity-40"
              aria-label="Next page"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function FilterSelect({
  value,
  onChange,
  placeholder,
  children,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative shrink-0">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-12 appearance-none rounded-full border border-white/8 bg-[#16122A] py-0 pl-5 pr-11 text-sm text-zinc-300 outline-none"
      >
        <option value="">{placeholder}</option>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
    </div>
  );
}
