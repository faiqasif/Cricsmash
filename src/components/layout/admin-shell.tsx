"use client";

import { createContext, useContext, useState } from "react";
import { AuthGuard } from "@/components/auth/auth-guard";
import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/top-bar";

const MenuContext = createContext<() => void>(() => {});

export function useOpenMenu() {
  return useContext(MenuContext);
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <AuthGuard>
      <MenuContext.Provider value={() => setOpen(true)}>
        <div className="relative h-dvh overflow-hidden bg-background">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-[#6d4aff]/45 via-[#7c5cff]/16 to-transparent"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -top-8 left-1/2 h-24 w-[36rem] -translate-x-1/2 rounded-full bg-[#7c5cff]/40 blur-3xl"
          />
          <div className="relative flex h-full gap-3 p-4">
            <Sidebar open={open} onClose={() => setOpen(false)} />
            <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden px-2 sm:px-4 lg:px-5">
              <TopBar onMenuClick={() => setOpen(true)} />
              <main className="min-h-0 flex-1 overflow-y-auto pb-8">{children}</main>
            </div>
          </div>
        </div>
      </MenuContext.Provider>
    </AuthGuard>
  );
}
