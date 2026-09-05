"use client";

import {
  BarChart3,
  Bike,
  Boxes,
  LayoutDashboard,
  Layers,
  Mail,
  Package,
  PawPrint,
  Settings,
  ShoppingBag,
  Tag,
  Tags,
  UserCircle,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const iconMap = {
  BarChart3,
  Bike,
  Boxes,
  LayoutDashboard,
  Layers,
  Mail,
  Package,
  PawPrint,
  Settings,
  ShoppingBag,
  Tag,
  Tags,
  UserCircle,
  Users,
} as const;

type NavItem = {
  href: string;
  label: string;
  iconName: keyof typeof iconMap;
};

export function DashboardNav({ item }: { item: NavItem }) {
  const pathname = usePathname();
  const Icon = iconMap[item.iconName] ?? Package;
  const isActive =
    item.href === "/dashboard"
      ? pathname === "/dashboard"
      : pathname.startsWith(item.href);

  return (
    <Link
      href={item.href}
      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
        isActive
          ? "bg-[var(--ca-purple)] text-white"
          : "text-slate-600 hover:bg-slate-100"
      }`}
    >
      <Icon size={18} />
      {item.label}
    </Link>
  );
}
