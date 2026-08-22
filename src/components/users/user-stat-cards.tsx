import { Gamepad2, LayoutGrid } from "lucide-react";
import type { AppUser } from "@/data/users";

export function UserStatCards({ user }: { user: AppUser }) {
  return (
    <section className="mt-5 grid gap-5 md:grid-cols-2">
      <article className="rounded-[28px] bg-card p-6">
        <div className="flex items-start gap-4">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-purple-soft text-purple">
            <LayoutGrid className="size-5" />
          </span>
          <div>
            <p className="text-sm text-zinc-400">Games Played</p>
            <p className="mt-1 text-[40px] font-semibold leading-none tracking-tight text-white">
              {user.gamesPlayed}
            </p>
            <p className="mt-3 text-sm font-medium text-green">
              {user.gamesPlayedDelta}
            </p>
          </div>
        </div>
      </article>

      <article className="rounded-[28px] bg-card p-6">
        <div className="flex items-start gap-4">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-purple-soft text-purple">
            <Gamepad2 className="size-5" />
          </span>
          <div>
            <p className="text-sm text-zinc-400">Most Played Game</p>
            <p className="mt-1 text-[32px] font-semibold leading-none tracking-tight text-white sm:text-[40px]">
              {user.mostPlayedGame}
            </p>
            <p className="mt-3 text-sm font-medium text-green">
              {user.mostPlayedShare}
            </p>
          </div>
        </div>
      </article>
    </section>
  );
}
