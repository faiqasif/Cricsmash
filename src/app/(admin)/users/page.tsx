import Image from "next/image";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { users } from "@/data/users";

export default function UsersPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-white">User Management</h1>
      <p className="mt-1 text-sm text-zinc-500">
        View fan profiles, game history, and activity.
      </p>

      <div className="mt-6 overflow-hidden rounded-[28px] bg-card">
        <div className="hidden grid-cols-[1.4fr_1fr_1fr_0.7fr_0.7fr_auto] gap-4 border-b border-border px-6 py-4 text-xs font-medium uppercase tracking-wide text-zinc-500 md:grid">
          <span>User</span>
          <span>Country</span>
          <span>Joined</span>
          <span>Games</span>
          <span>Friends</span>
          <span />
        </div>

        <ul>
          {users.map((user, index) => (
            <li key={user.id}>
              <Link
                href={`/users/${user.id}`}
                className={`grid items-center gap-3 px-6 py-4 transition-colors hover:bg-white/[0.03] md:grid-cols-[1.4fr_1fr_1fr_0.7fr_0.7fr_auto] ${
                  index !== users.length - 1 ? "border-b border-border" : ""
                }`}
              >
                <div className="flex items-center gap-3">
                  <Image
                    src={user.avatar}
                    alt={user.name}
                    width={44}
                    height={44}
                    className="size-11 rounded-full object-cover"
                  />
                  <div>
                    <p className="font-medium text-white">{user.name}</p>
                    <p className="text-xs text-zinc-500">{user.email}</p>
                  </div>
                </div>
                <p className="text-sm text-zinc-400">{user.country}</p>
                <p className="text-sm text-zinc-400">{user.joinedAt}</p>
                <p className="text-sm text-zinc-400">{user.gamesPlayed}</p>
                <p className="text-sm text-zinc-400">{user.friends}</p>
                <span className="hidden text-zinc-500 md:inline-flex">
                  <ChevronRight className="size-4" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
