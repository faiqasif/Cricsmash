"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { X } from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import { logoutItem, navItems, type NavItem } from "@/data/nav";

type SidebarProps = {
  open: boolean;
  onClose: () => void;
};

function isActivePath(pathname: string, href: string) {
  if (href === "/dashboard") {
    return pathname === "/dashboard";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuth();
  const mainItems = navItems.filter((item) => item.href !== "/settings");
  const settingsItem = navItems.find((item) => item.href === "/settings");

  return (
    <>
      <div
        className={`fixed inset-0 z-30 bg-black/60 lg:hidden ${open ? "block" : "hidden"}`}
        onClick={onClose}
      />
      <aside
        className={`fixed top-4 bottom-4 left-4 z-40 flex w-[260px] shrink-0 flex-col overflow-hidden rounded-[32px] bg-[#0b0b13] shadow-[0_20px_60px_rgba(0,0,0,0.35)] transition-transform duration-200 lg:relative lg:top-auto lg:bottom-auto lg:left-auto lg:h-full lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-[calc(100%+1.5rem)]"
        }`}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#6d4aff]/45 via-[#7c5cff]/16 to-transparent"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-8 left-1/2 h-24 w-48 -translate-x-1/2 rounded-full bg-[#7c5cff]/40 blur-3xl"
        />

        <div className="relative flex items-center justify-between px-6 pb-3 pt-8">
          <Link href="/players" className="text-[26px] font-semibold tracking-tight text-white">
            Cricket Fan
          </Link>
          <button
            type="button"
            className="rounded-lg p-1 text-muted lg:hidden"
            onClick={onClose}
            aria-label="Close menu"
          >
            <X className="size-5" />
          </button>
        </div>

        <nav className="relative mt-3 flex-1 space-y-1 overflow-y-auto px-3 pb-2">
          {mainItems.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              active={isActivePath(pathname, item.href)}
              onClick={onClose}
            />
          ))}
        </nav>

        <div className="relative space-y-1 px-3 pb-6 pt-2">
          {settingsItem ? (
            <NavLink
              item={settingsItem}
              active={isActivePath(pathname, settingsItem.href)}
              onClick={onClose}
            />
          ) : null}
          <button
            type="button"
            onClick={async () => {
              onClose();
              await logout();
              router.replace("/login");
            }}
            className="flex w-full items-center gap-3 rounded-full px-4 py-3 text-[15px] text-zinc-200 transition-colors hover:bg-white/5 hover:text-white"
          >
            <logoutItem.icon className="size-[18px]" strokeWidth={1.6} />
            {logoutItem.label}
          </button>
        </div>
      </aside>
    </>
  );
}

function NavLink({
  item,
  active,
  onClick,
}: {
  item: NavItem;
  active: boolean;
  onClick: () => void;
}) {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={`relative flex items-center gap-3 rounded-full px-4 py-3 text-[15px] transition-colors ${
        active
          ? "bg-[#7c5cff]/15 font-medium text-[#8b74ff]"
          : "text-zinc-200 hover:bg-white/5 hover:text-white"
      }`}
    >
      {active ? (
        <span className="absolute inset-y-2.5 -left-3 w-[3px] rounded-full bg-[#7c5cff]" />
      ) : null}
      <Icon className="size-[18px] shrink-0" strokeWidth={1.6} />
      {item.label}
    </Link>
  );
}
