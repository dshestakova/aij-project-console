"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import type { UserRole } from "@/types/project-registry";

type UserHeaderProps = {
  email: string;
  activePath?:
    | "/dashboard"
    | "/projects"
    | "/analytics"
    | "/ai-analyst"
    | "/admin/users";
  role?: UserRole | null;
};

const navigationItems = [
  { href: "/dashboard", label: "Дашборд" },
  { href: "/projects", label: "Проекты" },
  { href: "/analytics", label: "Аналитика" },
  { href: "/ai-analyst", label: "AI-аналитик" },
];

export function UserHeader({ activePath, email, role }: UserHeaderProps) {
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const visibleNavigationItems =
    role === "admin"
      ? [...navigationItems, { href: "/admin/users", label: "Пользователи" }]
      : navigationItems;

  async function handleSignOut() {
    setIsSigningOut(true);

    try {
      const supabase = createBrowserSupabaseClient();
      await supabase.auth.signOut();
    } finally {
      router.replace("/login");
      router.refresh();
    }
  }

  return (
    <header className="flex flex-col gap-4 border-b border-slate-200 pb-4">
      <div className="flex min-w-0 flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">
            AIJ Project Console
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-950 sm:text-3xl">
            Реестр AIJ-проектов
          </h1>
        </div>
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center">
          <div className="min-w-0 text-left sm:text-right">
            <p className="truncate text-sm font-medium text-slate-800">
              {email}
            </p>
            <p className="text-xs text-slate-500">пользователь Supabase</p>
          </div>
          <button
            className="h-10 w-full rounded-md border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:text-slate-950 disabled:cursor-not-allowed disabled:text-slate-400 sm:w-auto"
            disabled={isSigningOut}
            onClick={handleSignOut}
            type="button"
          >
            {isSigningOut ? "Выходим..." : "Выйти"}
          </button>
        </div>
      </div>

      <nav className="flex max-w-full gap-2 overflow-x-auto pb-1">
        {visibleNavigationItems.map((item) => (
          <Link
            className={`h-10 shrink-0 rounded-md px-3 py-2 text-sm font-medium transition ${
              activePath === item.href
                ? "bg-slate-950 text-white"
                : "border border-slate-200 bg-white text-slate-600 hover:text-slate-950"
            }`}
            href={item.href}
            key={item.href}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
