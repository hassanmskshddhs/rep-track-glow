import { Link, useLocation } from "@tanstack/react-router";
import { Dumbbell, CalendarDays, LineChart, Apple } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  {
    label: "Train",
    to: "/",
    icon: Dumbbell,
    match: (p: string) => p === "/" || p.startsWith("/day"),
  },
  {
    label: "Plan",
    to: "/plan",
    icon: CalendarDays,
    match: (p: string) => p.startsWith("/plan") || p.startsWith("/custom"),
  },
  {
    label: "Progress",
    to: "/progress",
    icon: LineChart,
    match: (p: string) => p.startsWith("/progress") || p.startsWith("/history"),
  },
  {
    label: "Fuel",
    to: "/nutrition",
    icon: Apple,
    match: (p: string) => p.startsWith("/nutrition"),
  },
] as const;
export function BottomNav() {
  const { pathname } = useLocation();
  if (pathname.startsWith("/day/")) return null;
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Primary"
    >
      <ul className="mx-auto flex h-[72px] max-w-xl items-stretch">
        {ITEMS.map((it) => {
          const active = it.match(pathname);
          const Icon = it.icon;
          return (
            <li key={it.to} className="flex-1">
              <Link
                to={it.to}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "tap flex h-full flex-col items-center justify-center gap-2 text-[11px] font-semibold",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="h-[22px] w-[22px]" strokeWidth={1.7} />
                <span>{it.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
