"use client";

import Image from "next/image";
import { Bell } from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";

const ADMIN_AVATAR = "/avatars/admin.jpg";

export function HeaderActions() {
  const { user } = useAuth();
  const name = user?.display_name || "Admin";

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        className="relative flex size-11 items-center justify-center rounded-full border border-white/10 bg-[#121218] text-white"
        aria-label="Notifications"
      >
        <Bell className="size-[18px]" strokeWidth={1.6} />
        <span className="absolute -right-0.5 -top-0.5 flex size-[18px] items-center justify-center rounded-full bg-red-500 text-[10px] font-semibold text-white">
          3
        </span>
      </button>

      <div className="flex items-center gap-2 rounded-full border border-white/10 bg-[#121218] py-1 pl-1 pr-3">
        <Image
          src={ADMIN_AVATAR}
          alt={name}
          width={32}
          height={32}
          className="size-8 rounded-full object-cover"
        />
        <span className="pr-1 text-sm font-medium text-white">{name}</span>
      </div>
    </div>
  );
}
