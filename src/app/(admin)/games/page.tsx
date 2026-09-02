"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Menu, Search } from "lucide-react";
import { HeaderActions } from "@/components/layout/header-actions";
import { useOpenMenu } from "@/components/layout/admin-shell";
import { GAME_CARDS } from "@/data/games";

export default function GamesPage() {
  const openMenu = useOpenMenu();
  const [query, setQuery] = useState("");

  const cards = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return GAME_CARDS;
    return GAME_CARDS.filter(
      (card) =>
        card.title.toLowerCase().includes(value) || card.description.toLowerCase().includes(value),
    );
  }, [query]);

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
            <h1 className="text-[28px] font-semibold tracking-tight text-white sm:text-[32px]">Games</h1>
            <p className="mt-1 text-sm text-zinc-500">Manage all games.</p>
          </div>
        </div>
        <HeaderActions />
      </div>

      <label className="relative mt-5 block">
        <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search questions by title or keyword"
          className="h-12 w-full rounded-full border border-white/8 bg-[#14141a] pl-11 pr-4 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-purple/50"
        />
      </label>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => {
          const inner = (
            <>
              <div className="relative aspect-[16/10] overflow-hidden">
                <Image src={card.image} alt="" fill className="object-cover" sizes="(min-width: 1280px) 360px, 50vw" />
              </div>
              <div className="px-5 pb-5 pt-4">
                <p className="text-lg font-semibold text-white">{card.title}</p>
                <p className="mt-1 text-sm text-zinc-400">{card.description}</p>
                {card.href ? null : <p className="mt-2 text-xs font-medium uppercase tracking-wide text-zinc-500">Coming soon</p>}
              </div>
            </>
          );
          const className =
            "overflow-hidden rounded-[28px] bg-[#14141a] text-left transition hover:ring-1 hover:ring-purple/40";
          if (card.href) {
            return (
              <Link key={card.slug} href={card.href} className={className}>
                {inner}
              </Link>
            );
          }
          return (
            <div key={card.slug} className={`${className} opacity-80`}>
              {inner}
            </div>
          );
        })}
      </div>
    </div>
  );
}
