import { Link, useLocation } from "@tanstack/react-router";
import { Dumbbell, History, LineChart, Apple, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

type To = "/" | "/history" | "/progress" | "/nutrition" | "/coach";

const ITEMS: { label: string; to: To; icon: typeof Dumbbell; match: (p: string) => boolean }[] = [
  { label: "Workout", to: "/", icon: Dumbbell, match: (p) => p === "/" || p.startsWith("/day") || p.startsWith("/custom") },
  { label: "History", to: "/history", icon: History, match: (p) => p.startsWith("/history") },
  { label: "Progress", to: "/progress", icon: LineChart, match: (p) => p.startsWith("/progress") },
  { label: "Food", to: "/nutrition", icon: Apple, match: (p) => p.startsWith("/nutrition") },
  { label: "Coach", to: "/coach", icon: Sparkles, match: (p) => p.startsWith("/coach") },
];

export function BottomNav() {
  const { pathname } = useLocation();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 px-4"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 12px)" }}
      aria-label="Primary"
    >
      <ul className="dock mx-auto flex max-w-md items-stretch justify-between rounded-full p-1.5">
        {ITEMS.map((it) => {
          const active = it.match(pathname);
          const Icon = it.icon;
          return (
            <li key={it.to} className="flex-1">
              <Link
                to={it.to}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "tap flex h-12 flex-col items-center justify-center gap-0.5 rounded-full text-[10.5px] font-semibold",
                  active
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="h-[19px] w-[19px]" />
                <span>{it.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
