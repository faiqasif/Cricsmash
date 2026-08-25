"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { HeaderActions } from "@/components/layout/header-actions";

type TopBarProps = {
  onMenuClick: () => void;
};

function breadcrumbsFor(pathname: string): { parent: string; current: string; parentHref: string } | null {
  if (pathname === "/players/new") {
    return { parent: "Players", current: "Add a new player", parentHref: "/players" };
  }
  if (pathname.startsWith("/players/") && pathname.endsWith("/edit")) {
    return { parent: "Players", current: "Edit player", parentHref: "/players" };
  }
  if (pathname === "/questions/player/new" || pathname === "/questions/general/new" || pathname === "/questions/tournament/new") {
    const parentHref = pathname.startsWith("/questions/general")
      ? "/questions/general"
      : pathname.startsWith("/questions/tournament")
        ? "/questions/tournament"
        : "/questions/player";
    return { parent: "Question", current: "Add a new question", parentHref };
  }
  if (
    (pathname.startsWith("/questions/player/") ||
      pathname.startsWith("/questions/general/") ||
      pathname.startsWith("/questions/tournament/")) &&
    pathname.endsWith("/edit")
  ) {
    const parentHref = pathname.startsWith("/questions/general")
      ? "/questions/general"
      : pathname.startsWith("/questions/tournament")
        ? "/questions/tournament"
        : "/questions/player";
    return { parent: "Question", current: "Edit question", parentHref };
  }
  if (pathname === "/tournaments/new") {
    return { parent: "Tournament", current: "Add a new Tournament", parentHref: "/tournaments" };
  }
  if (pathname.startsWith("/tournaments/") && pathname.endsWith("/edit")) {
    return { parent: "Tournament", current: "Edit tournament", parentHref: "/tournaments" };
  }
  if (pathname.startsWith("/users/") && pathname !== "/users") {
    return { parent: "User Management", current: "User details", parentHref: "/users" };
  }
  if (pathname === "/users") {
    return { parent: "User Management", current: "All users", parentHref: "/users" };
  }
  if (pathname.startsWith("/questions/")) {
    const section = pathname.split("/")[2] ?? "questions";
    const label = section.replace(/-/g, " ");
    return {
      parent: "Questions",
      current: label.charAt(0).toUpperCase() + label.slice(1),
      parentHref: "/questions",
    };
  }

  const label =
    pathname
      .split("/")
      .filter(Boolean)
      .at(-1)
      ?.replace(/-/g, " ") ?? "Dashboard";

  return {
    parent: "Cricket Fan",
    current: label.charAt(0).toUpperCase() + label.slice(1),
    parentHref: "/players",
  };
}

export function TopBar({ onMenuClick }: TopBarProps) {
  const pathname = usePathname();

  if (
    pathname === "/players" ||
    pathname === "/questions/player" ||
    pathname === "/questions/general" ||
    pathname === "/questions/tournament" ||
    pathname === "/tournaments" ||
    pathname === "/categories"
  ) {
    return null;
  }

  const crumbs = breadcrumbsFor(pathname);

  return (
    <header className="mb-6 flex items-center justify-between gap-4 rounded-[28px] bg-[#14141a] px-5 py-4 sm:px-7">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          className="rounded-lg p-2 text-zinc-400 hover:bg-white/5 lg:hidden"
          aria-label="Open menu"
        >
          <Menu className="size-5" />
        </button>
        {crumbs ? (
          <p className="truncate text-sm text-zinc-500">
            <Link href={crumbs.parentHref} className="transition hover:text-zinc-300">
              {crumbs.parent}
            </Link>
            <span className="mx-1.5">/</span>
            <span className="text-white">{crumbs.current}</span>
          </p>
        ) : null}
      </div>

      <HeaderActions />
    </header>
  );
}
