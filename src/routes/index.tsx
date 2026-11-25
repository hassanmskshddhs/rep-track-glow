import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { format, startOfDay, subDays } from "date-fns";
import { ArrowRight, Check, Dumbbell, Sparkles } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import * as db from "@/lib/db";
import { useSessionTimer } from "@/lib/session-timer";
import { useEffect, useState, type CSSProperties } from "react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  component: Train,
  head: () => ({ meta: [{ title: "Train — IronLog" }] }),
});
function Train() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const { user } = useAuth();
  const { startedAt } = useSessionTimer();
  const [scheduledDay, setScheduledDay] = useState<string | null>(null);
  const [activeDay, setActiveDay] = useState<string | null>(null);
  useEffect(() => {
    setActiveDay(localStorage.getItem(`ironlog:active-day:${user?.id || "local"}`));
  }, [user?.id, startedAt]);
  useEffect(() => {
    try {
      const schedule = JSON.parse(
        localStorage.getItem(`ironlog:forged:schedule:${user?.id || "local"}`) || "{}",
      );
      setScheduledDay(schedule[format(new Date(), "EEE")] || null);
    } catch {
      setScheduledDay(null);
    }
  }, [user?.id]);
  const routines = useQuery({
    queryKey: ["custom-days-list", user?.id || "guest"],
    queryFn: () => db.getCustomDays(user?.id),
  });
  const sessions = useQuery({
    queryKey: ["recent-sessions", user?.id || "guest"],
    queryFn: () => db.getRecentSessions(user?.id),
  });
  const list = routines.data ?? [];
  const recent = sessions.data ?? [];
  const last = recent[0];
  const lastIndex = list.findIndex((r) => r.id === last?.day);
  const planned = list.find((r) => r.id === scheduledDay);
  const next = planned || (list.length ? list[(lastIndex + 1) % list.length] : null);
  const active = list.find((r) => r.id === activeDay);
  const days = Array.from({ length: 7 }, (_, i) => startOfDay(subDays(new Date(), 6 - i)));
  const completed = new Set(recent.map((s) => startOfDay(new Date(s.performed_at)).getTime()));
  const weekCount = days.filter((d) => completed.has(d.getTime())).length;
  if (!mounted)
    return (
      <main className="mx-auto max-w-4xl px-5 py-12" role="status">
        Loading your training…
      </main>
    );
  return (
    <main className="mx-auto max-w-4xl px-5 pb-8 pt-7">
      <header className="rise-in mb-7">
        <p className="forged-eyebrow">{format(new Date(), "EEEE, d MMMM")}</p>
        <h1 className="forged-title mt-3">Your next rep.</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          {recent.length ? "Build on your last session." : "Your first session starts here."}
        </p>
      </header>
      {startedAt && active && (
        <Link
          to="/day/$day"
          params={{ day: active.id }}
          className="mb-6 flex min-h-14 items-center justify-between rounded-xl border border-primary/40 bg-primary/10 px-4 text-sm font-semibold text-primary"
        >
          <span>Resume {active.name}</span>
          <ArrowRight className="h-4 w-4" />
        </Link>
      )}
      <div className="forged-hub-grid rise-in" style={{ "--d": "120ms" } as CSSProperties}>
        <div>
          <section aria-label="Last seven days" className="mb-7">
            <div className="mb-4 flex justify-between">
              <p className="forged-eyebrow">Last 7 days</p>
              <p className="text-xs text-primary">
                {weekCount} training {weekCount === 1 ? "day" : "days"}
              </p>
            </div>
            <div className="flex justify-between">
              {days.map((d) => (
                <div key={d.toISOString()} className="flex flex-col items-center gap-2">
                  <span className="text-[10px] text-muted-foreground">{format(d, "EEEEE")}</span>
                  <span
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-full text-xs",
                      completed.has(d.getTime())
                        ? "bg-primary text-primary-foreground"
                        : "bg-card text-muted-foreground",
                    )}
                  >
                    {completed.has(d.getTime()) ? <Check className="h-4 w-4" /> : format(d, "d")}
                  </span>
                </div>
              ))}
            </div>
          </section>
          {routines.isPending ? (
            <div role="status" className="forged-panel animate-pulse py-16 text-muted-foreground">
              Loading routines…
            </div>
          ) : routines.isError ? (
            <div className="forged-panel">
              <p>Could not load your routines.</p>
              <button onClick={() => routines.refetch()} className="mt-3 min-h-11 text-primary">
                Try again
              </button>
            </div>
          ) : next ? (
            <section className="forged-panel">
              <div className="flex items-center gap-2">
                <span style={{ color: "var(--brand)" }} className="text-lg font-bold">
                  /
                </span>
                <p className="forged-eyebrow">
                  {planned ? "Planned for today" : "Next in your rotation"}
                </p>
              </div>
              <h2 className="mt-3 text-3xl font-extrabold tracking-tight">{next.name}</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {next.subtitle || next.muscle_groups?.join(" · ")}
              </p>
              <p className="mt-4 text-xs text-muted-foreground">
                {Array.isArray(next.exercises) ? next.exercises.length : 0} exercises
              </p>
              <ul className="my-5 space-y-3 text-sm">
                {(Array.isArray(next.exercises) ? next.exercises : []).slice(0, 3).map((ex, i) => (
                  <li key={String(ex) + i} className="flex items-start gap-3">
                    <span className="text-xs text-muted-foreground">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span>{String(ex)}</span>
                  </li>
                ))}
              </ul>
              <Link
                to="/day/$day"
                params={{ day: next.id }}
                className="flex min-h-14 items-center justify-between rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground"
              >
                Open {next.name}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </section>
          ) : (
            <section className="forged-panel">
              <Dumbbell className="mb-4 text-primary" />
              <h2 className="text-xl font-bold">Make it your own.</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Create a routine or import one to begin.
              </p>
              <Link to="/custom/new" className="mt-5 flex min-h-12 items-center text-primary">
                Create a routine →
              </Link>
            </section>
          )}
          <Link
            to="/custom/new"
            className="mt-3 flex min-h-12 items-center justify-center text-xs text-muted-foreground"
          >
            Build a new workout
          </Link>
        </div>
        <aside className="mt-7 space-y-6 lg:mt-0">
          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">Recent activity</h2>
              <Link to="/history" className="flex min-h-11 items-center text-xs text-primary">
                View history →
              </Link>
            </div>
            {sessions.isPending ? (
              <p role="status" className="text-sm text-muted-foreground">
                Loading activity…
              </p>
            ) : sessions.isError ? (
              <button onClick={() => sessions.refetch()} className="min-h-11 text-sm text-primary">
                Retry activity
              </button>
            ) : last ? (
              <Link to="/history" className="block rounded-xl border border-border bg-card p-4">
                <p className="font-semibold">
                  {last.title || list.find((r) => r.id === last.day)?.name || "Workout"}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {format(new Date(last.performed_at), "EEE, d MMM · HH:mm")}
                </p>
              </Link>
            ) : (
              <p className="rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">
                Your saved sessions will appear here. No rush. Start with one.
              </p>
            )}
          </section>
          <Link
            to="/plan"
            className="flex min-h-12 items-center justify-between border-b border-border py-3 text-sm"
          >
            Manage your routines
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </Link>
          <Link
            to="/coach"
            className="flex min-h-12 items-center gap-3 text-sm text-muted-foreground"
          >
            <Sparkles className="h-4 w-4" /> Ask about your training
          </Link>
        </aside>
      </div>
    </main>
  );
}
