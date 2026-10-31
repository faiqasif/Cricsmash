"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Menu } from "lucide-react";
import { GuessPlayerStatForm } from "@/components/games/guess-player-stat-form";
import { useOpenMenu } from "@/components/layout/admin-shell";
import { createGuessPlayerStat } from "@/lib/guess-player-stats";

export default function NewGuessPlayerStatPage() {
  const openMenu = useOpenMenu();
  const router = useRouter();

  return (
    <div>
      <p className="mb-4 text-sm text-zinc-500">
        <Link href="/games/guess-player-stats" className="hover:text-zinc-300">
          Guess the Player Stats
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-white">New question</span>
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
          <h1 className="text-2xl font-semibold tracking-tight text-white">Add question</h1>
          <p className="mt-1 text-sm text-zinc-400">The statement and the correct answer are stored together.</p>
        </div>
      </div>
      <GuessPlayerStatForm
        submitLabel="Save question"
        onSubmit={async (value) => {
          await createGuessPlayerStat(value);
          router.push("/games/guess-player-stats");
        }}
      />
    </div>
  );
}
