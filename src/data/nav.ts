import type { LucideIcon } from "lucide-react";
import {
  DoorOpen,
  FileQuestion,
  FolderOpen,
  Gamepad2,
  HelpCircle,
  ImageIcon,
  LayoutDashboard,
  LayoutGrid,
  LogOut,
  MessageCircleQuestion,
  Settings,
  Trophy,
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
  { label: "Rooms", href: "/rooms", icon: DoorOpen },
  { label: "Players", href: "/players", icon: UserRound },
  { label: "Category", href: "/categories", icon: FolderOpen },
  { label: "Tournament", href: "/tournaments", icon: Trophy },
  { label: "Player Questions", href: "/questions/player", icon: HelpCircle },
  {
    label: "Tournament Questions",
    href: "/questions/tournament",
    icon: MessageCircleQuestion,
  },
  { label: "General Questions", href: "/questions/general", icon: FileQuestion },
  { label: "Image Questions", href: "/questions/image", icon: ImageIcon },
  { label: "Games", href: "/games", icon: Gamepad2 },
  { label: "Settings", href: "/settings", icon: Settings },
];

export const logoutItem: NavItem = {
  label: "Logout",
  href: "/logout",
  icon: LogOut,
};
