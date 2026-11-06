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
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur-xl"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Primary"
    >
      <ul className="mx-auto flex h-16 max-w-md items-stretch">
        {ITEMS.map((it) => {
          const active = it.match(pathname);
          const Icon = it.icon;
          return (
            <li key={it.to} className="flex-1">
              <Link
                to={it.to}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "tap relative flex h-full flex-col items-center justify-center gap-1 text-[11px] font-semibold",
                  active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {active && <span className="absolute top-0 h-0.5 w-8 rounded-full bg-primary" />}
                <Icon className={cn("h-[22px] w-[22px]", active && "text-primary")} strokeWidth={active ? 2.3 : 1.8} />
                <span>{it.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
