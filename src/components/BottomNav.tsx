import { Link, useLocation } from "@tanstack/react-router";
import { Home, History, LineChart, Settings, Bot } from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = {
  label: string;
  icon: typeof Home;
  link: React.ReactNode;
  match: (pathname: string) => boolean;
};

function NavLink({
  to,
  active,
  children,
}: {
  to: "/" | "/history" | "/progress" | "/coach" | "/settings";
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      to={to}
      className={cn(
        "flex flex-col items-center gap-1 rounded-2xl px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-colors",
        active ? "text-primary" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </Link>
  );
}


export function BottomNav() {
  const { pathname } = useLocation();

  const items: NavItem[] = [
    {
      label: "Home",
      icon: Home,
      link: null,
      match: (p) => p === "/",
    },
    {
      label: "History",
      icon: History,
      link: null,
      match: (p) => p.startsWith("/history"),
    },
    {
      label: "Progress",
      icon: LineChart,
      link: null,
      match: (p) => p.startsWith("/progress"),
    },
    {
      label: "Coach",
      icon: Bot,
      link: null,
      match: (p) => p.startsWith("/coach"),
    },
    {
      label: "Settings",
      icon: Settings,
      link: null,
      match: (p) => p.startsWith("/settings"),
    },
  ];

  const tos: Array<"/" | "/history" | "/progress" | "/coach" | "/settings"> = [
    "/",
    "/history",
    "/progress",
    "/coach",
    "/settings",
  ];

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 glass-strong border-t border-border/60"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Primary"
    >
      <ul className="mx-auto flex max-w-3xl items-stretch justify-around px-2 py-1.5">
        {items.map((it, idx) => {
          const active = it.match(pathname);
          const Icon = it.icon;
          return (
            <li key={it.label} className="flex-1">
              <NavLink to={tos[idx]} active={active}>
                <span
                  className={cn(
                    "flex h-9 w-12 items-center justify-center rounded-xl transition-all",
                    active && "bg-primary/15",
                  )}
                >
                  <Icon className="h-5 w-5" />
                </span>
                {it.label}
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
