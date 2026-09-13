"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { bestNameMatch, rankByName } from "@/lib/fuzzy";
import { suggestPlayers, type PlayerListItem } from "@/lib/players";

export type SelectedPlayer = {
  id: string;
  name: string;
  photo_url: string | null;
};

type PlayerSuggestFieldProps = {
  index: number;
  value: SelectedPlayer;
  country: string | null;
  roster: PlayerListItem[];
  excludeIds: string[];
  disabled?: boolean;
  onChange: (value: SelectedPlayer) => void;
};

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function PlayerSuggestField({
  index,
  value,
  country,
  roster,
  excludeIds,
  disabled,
  onChange,
}: PlayerSuggestFieldProps) {
  const [query, setQuery] = useState(value.name);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [remote, setRemote] = useState<PlayerListItem[]>([]);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(value.name);
  }, [value.id, value.name]);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    }
    window.addEventListener("mousedown", onPointerDown);
    return () => window.removeEventListener("mousedown", onPointerDown);
  }, []);

  const excludeKey = excludeIds.join(",");

  useEffect(() => {
    if (!country || query.trim().length < 2) {
      setRemote([]);
      return;
    }
    const timeout = window.setTimeout(() => {
      void suggestPlayers({
        country,
        q: query.trim(),
        exclude: excludeKey.split(",").filter(Boolean).filter((id) => id !== value.id),
        limit: 8,
      })
        .then((data) => setRemote(data.items))
        .catch(() => setRemote([]));
    }, 180);
    return () => window.clearTimeout(timeout);
  }, [country, excludeKey, query, value.id]);

  const available = useMemo(
    () => roster.filter((player) => player.id === value.id || !excludeIds.includes(player.id)),
    [excludeIds, roster, value.id],
  );

  const suggestions = useMemo(() => {
    const merged = new Map<string, PlayerListItem>();
    for (const player of [...available, ...remote]) {
      if (player.id === value.id || !excludeIds.includes(player.id)) merged.set(player.id, player);
    }
    const ranked = rankByName([...merged.values()], query, (player) => player.name, query.trim() ? 0.38 : 0);
    return ranked.slice(0, 8).map((entry) => entry.item);
  }, [available, excludeIds, query, remote, value.id]);

  function selectPlayer(player: PlayerListItem) {
    onChange({ id: player.id, name: player.name, photo_url: player.photo_url });
    setQuery(player.name);
    setOpen(false);
  }

  function autocorrect() {
    const trimmed = query.trim();
    if (!trimmed) {
      onChange({ id: "", name: "", photo_url: null });
      return;
    }
    if (value.id && value.name === trimmed) return;
    const exact = available.find((player) => player.name.toLowerCase() === trimmed.toLowerCase());
    if (exact) {
      selectPlayer(exact);
      return;
    }
    const match =
      bestNameMatch(available, trimmed, (player) => player.name) ??
      bestNameMatch(remote, trimmed, (player) => player.name);
    if (match) {
      selectPlayer(match);
      return;
    }
    onChange({ id: "", name: trimmed, photo_url: null });
  }

  return (
    <div ref={wrapRef} className="relative">
      <div className="flex h-12 items-center rounded-full border border-white/8 bg-[#0c0c10] px-4 focus-within:border-purple/50">
        <span className="mr-3 w-6 text-xs font-semibold text-zinc-500">{String(index).padStart(2, "0")}</span>
        <span className="mr-3 h-4 w-px bg-white/10" />
        <input
          value={query}
          disabled={disabled || !country}
          onChange={(event) => {
            const next = event.target.value;
            setQuery(next);
            setOpen(true);
            setActive(0);
            if (value.id) onChange({ id: "", name: next, photo_url: null });
          }}
          onFocus={() => setOpen(true)}
          onBlur={autocorrect}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setOpen(true);
              setActive((current) => Math.min(current + 1, Math.max(suggestions.length - 1, 0)));
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              setActive((current) => Math.max(current - 1, 0));
            } else if (event.key === "Enter") {
              const picked = suggestions[active];
              if (open && picked) {
                event.preventDefault();
                selectPlayer(picked);
              }
            } else if (event.key === "Escape") {
              setOpen(false);
            }
          }}
          placeholder={country ? "Enter Player Name" : "Enter a team title first"}
          className="h-full w-full bg-transparent text-sm text-white outline-none placeholder:text-zinc-500 disabled:text-zinc-600"
          autoComplete="off"
        />
      </div>
      {open && country && suggestions.length > 0 ? (
        <ul className="absolute z-20 mt-2 max-h-64 w-full overflow-auto rounded-2xl border border-white/8 bg-[#1a1a22] p-2 shadow-[0_16px_40px_rgba(0,0,0,0.45)]">
          {suggestions.map((player, suggestionIndex) => (
            <li key={player.id}>
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => selectPlayer(player)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left ${
                  suggestionIndex === active ? "bg-purple/15" : "hover:bg-white/5"
                }`}
              >
                {player.photo_url ? (
                  <img src={player.photo_url} alt="" className="size-8 rounded-full object-cover" />
                ) : (
                  <span className="flex size-8 items-center justify-center rounded-full bg-purple-soft text-[10px] font-semibold text-purple">
                    {initials(player.name)}
                  </span>
                )}
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-white">{player.name}</span>
                  <span className="block text-xs text-zinc-500">{player.country}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
