import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, CalendarDays, MapPin, UserRound, Users } from "lucide-react";
import type { AppUser } from "@/data/users";

export function UserProfileCard({ user }: { user: AppUser }) {
  return (
    <section>
      <Link
        href="/users"
        className="mb-5 inline-flex items-center gap-2 text-sm text-zinc-400 transition-colors hover:text-white"
      >
        <ArrowLeft className="size-4" />
        Back to all users
      </Link>

      <div className="rounded-[28px] bg-card px-6 py-6 sm:px-8 sm:py-7">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
          <Image
            src={user.avatar}
            alt={user.name}
            width={96}
            height={96}
            className="size-24 rounded-full object-cover"
            priority
          />

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-[32px] font-semibold leading-none tracking-tight text-white">
                {user.name}
              </h1>
              <div className="flex items-center gap-2">
                {user.badges.map((badge) => (
                  <span
                    key={badge.letter}
                    className={`flex size-7 items-center justify-center rounded-full text-xs font-bold text-white ${badge.className}`}
                  >
                    {badge.letter}
                  </span>
                ))}
              </div>
            </div>

            <ul className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-zinc-400">
              <li className="flex items-center gap-2">
                <MapPin className="size-4 text-zinc-500" />
                {user.country}
              </li>
              <li className="flex items-center gap-2">
                <CalendarDays className="size-4 text-zinc-500" />
                Joined on {user.joinedAt}
              </li>
              <li className="flex items-center gap-2">
                <UserRound className="size-4 text-zinc-500" />
                {user.age} Years
              </li>
              <li className="flex items-center gap-2">
                <Users className="size-4 text-zinc-500" />
                {user.friends} Friends
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
