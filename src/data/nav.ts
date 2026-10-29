import type { LucideIcon } from "lucide-react";
import {
  FileQuestion,
  FolderOpen,
  Gamepad2,
  HelpCircle,
  LayoutDashboard,
  LayoutGrid,
  LogOut,
  MessageCircleQuestion,
  Settings,
  Trophy,
  Hash,
  UserRound,
  Users,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

export const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "App Overview", href: "/overview", icon: LayoutGrid },
  { label: "User Management", href: "/users", icon: Users },
  { label: "Category", href: "/categories", icon: FolderOpen },
  { label: "Players", href: "/players", icon: UserRound },
  { label: "Version Numbers", href: "/player-versions", icon: Hash },
  { label: "Player Questions", href: "/questions/player", icon: HelpCircle },
  { label: "Tournament", href: "/tournaments", icon: Trophy },
  {
    label: "Tournament Questions",
    href: "/questions/tournament",
    icon: MessageCircleQuestion,
  },
  { label: "General Questions", href: "/questions/general", icon: FileQuestion },
  { label: "Games", href: "/games", icon: Gamepad2 },
  { label: "Settings", href: "/settings", icon: Settings },
];

export const logoutItem: NavItem = {
  label: "Logout",
  href: "/logout",
  icon: LogOut,
};
