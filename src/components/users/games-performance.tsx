import Image from "next/image";
import { Flame, Gamepad2, Trophy } from "lucide-react";
import type { AppUser, GameStat } from "@/data/users";

function padDays(days: number) {
  return String(days).padStart(2, "0");
}

function GameCard({ game }: { game: GameStat }) {
  return (
    <article className="rounded-[28px] bg-card p-5">
      <div className="flex items-center gap-4">
        <Image
          src={game.image}
          alt={game.imageAlt}
          width={72}
          height={72}
          className="size-[72px] rounded-2xl object-cover"
        />
        <div className="min-w-0">
          <h3 className="text-lg font-semibold text-white">{game.name}</h3>
          <p className="mt-1 text-sm text-zinc-500">{game.lastPlayed}</p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {game.streakDays != null ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#121218] px-3 py-1.5 text-xs text-zinc-300">
            <Flame className="size-3.5 text-orange-400" />
            {padDays(game.streakDays)} Days
          </span>
        ) : null}
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#121218] px-3 py-1.5 text-xs text-zinc-300">
          <Trophy className="size-3.5 text-yellow-400" />
          High Score: {game.highScore}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#121218] px-3 py-1.5 text-xs text-zinc-300">
          <Gamepad2 className="size-3.5 text-zinc-400" />
          {padDays(game.playCount)} {game.playLabel}
        </span>
      </div>
    </article>
  );
}

export function GamesPerformance({ user }: { user: AppUser }) {
  const games = user.games;

  return (
    <section className="mt-8">
      <h2 className="text-xl font-semibold text-white">Games Performance</h2>
      {games.length === 0 ? (
        <p className="mt-4 text-sm text-zinc-500">No games played yet.</p>
      ) : (
        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          {games.map((game) => (
            <GameCard key={game.id} game={game} />
          ))}
        </div>
      )}
    </section>
  );
}
