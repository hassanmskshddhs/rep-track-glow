import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Dumbbell, ChevronRight, Flame } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { AuthScreen } from "@/components/AuthScreen";
import { DAYS, DAY_KEYS } from "@/lib/exercises";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // no-op
  }, [user]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Dumbbell className="h-8 w-8 animate-pulse text-primary" />
      </div>
    );
  }
  if (!user) return <AuthScreen />;

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <section className="mb-8">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
          <Flame className="h-3.5 w-3.5" /> Today's grind
        </div>
        <h1 className="mt-2 text-4xl font-extrabold tracking-tight md:text-5xl">
          Pick your <span className="text-primary">workout</span>.
        </h1>
        <p className="mt-2 max-w-xl text-muted-foreground">
          Log every set. Track every kilo. Beat last week.
        </p>
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        {DAY_KEYS.map((key) => {
          const d = DAYS[key];
          return (
            <Link
              key={key}
              to="/day/$day"
              params={{ day: key }}
              className="group relative overflow-hidden rounded-2xl border border-border bg-[var(--gradient-card)] p-6 shadow-[var(--shadow-card)] transition-all hover:-translate-y-0.5 hover:border-primary/50"
              onClick={() => navigate}
            >
              <div
                className="absolute inset-x-0 top-0 h-1"
                style={{ backgroundColor: `var(--${d.accent})` }}
              />
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    Day · {key}
                  </div>
                  <h2 className="mt-1 text-3xl font-extrabold tracking-tight">{d.name}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{d.subtitle}</p>
                </div>
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-xl"
                  style={{ backgroundColor: `color-mix(in oklab, var(--${d.accent}) 18%, transparent)` }}
                >
                  <Dumbbell className="h-5 w-5" style={{ color: `var(--${d.accent})` }} />
                </div>
              </div>
              <div className="mt-5 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{d.exercises.length} exercises</span>
                <span className="flex items-center gap-1 font-medium text-primary">
                  Start <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
