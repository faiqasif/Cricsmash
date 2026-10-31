"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu } from "lucide-react";
import { GuessPlayerStatForm } from "@/components/games/guess-player-stat-form";
import { useOpenMenu } from "@/components/layout/admin-shell";
import { ApiError } from "@/lib/api";
import { getGuessPlayerStat, updateGuessPlayerStat, type GuessPlayerStat } from "@/lib/guess-player-stats";

export default function EditGuessPlayerStatPage() {
  const openMenu = useOpenMenu();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [item, setItem] = useState<GuessPlayerStat | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void getGuessPlayerStat(params.id)
      .then((data) => {
        if (active) setItem(data);
      })
      .catch((err) => {
        if (active) setError(err instanceof ApiError ? err.message : "Could not load this question.");
      });
    return () => {
      active = false;
    };
  }, [params.id]);

  return (
    <div>
      <p className="mb-4 text-sm text-zinc-500">
        <Link href="/games/guess-player-stats" className="hover:text-zinc-300">
          Guess the Player Stats
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-white">Edit question</span>
      </p>
      <div className="flex items-center gap-3 rounded-[28px] bg-[#14141a] px-5 py-5 sm:px-7">
        <button
          type="button"
          onClick={openMenu}
          className="rounded-lg p-2 text-zinc-400 hover:bg-white/5 lg:hidden"
          aria-label="Open menu"
        >
          <Menu className="size-5" />
        </button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">Edit question</h1>
          <p className="mt-1 text-sm text-zinc-400">The latest statement and answer are published in the next version.</p>
        </div>
      </div>
      {error ? (
        <p className="mt-5 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p>
      ) : null}
      {!item && !error ? <p className="mt-6 text-sm text-zinc-500">Loading question…</p> : null}
      {item ? (
        <GuessPlayerStatForm
          key={item.id}
          initialQuestion={item.question}
          initialAnswer={item.answer}
          submitLabel="Save question"
          onSubmit={async (value) => {
            await updateGuessPlayerStat(item.id, value);
            router.push("/games/guess-player-stats");
          }}
        />
      ) : null}
    </div>
  );
}
