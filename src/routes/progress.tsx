import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, TrendingUp, Dumbbell, Flame } from "lucide-react";
import { format, startOfDay, subDays } from "date-fns";

import { useAuth } from "@/lib/auth-context";
import { AuthScreen } from "@/components/AuthScreen";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/progress")({
  component: ProgressPage,
  head: () => ({ meta: [{ title: "Progress — IronLog" }] }),
});

function ProgressPage() {
  const { user, loading } = useAuth();

  const { data: sets } = useQuery({
    queryKey: ["progress-sets", user?.id],
    enabled: !!user,
    queryFn: async () => {
      // Pull 60 days so we can compute week-over-week deltas
      const since = subDays(new Date(), 59).toISOString();
      const { data, error } = await supabase
        .from("set_logs")
        .select("exercise_name, weight, reps, created_at, session_id")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(4000);
      if (error) throw error;
      return data ?? [];
    },
  });

  const stats = useMemo(() => {
    const rows = sets ?? [];
    const now = new Date();
    const last30Cutoff = subDays(now, 29);
    const recentRows = rows.filter((r) => new Date(r.created_at) >= last30Cutoff);

    const sessions = new Set(recentRows.map((r) => r.session_id));
    const totalVolume = recentRows.reduce(
      (a, r) => a + (r.weight ?? 0) * (r.reps ?? 0),
      0,
    );
    const totalSets = recentRows.length;
    const totalReps = recentRows.reduce((a, r) => a + (r.reps ?? 0), 0);

    // Week-over-week deltas (last 7 days vs prior 7 days)
    const weekStart = subDays(now, 6);
    const prevWeekStart = subDays(now, 13);
    let thisWeekVolume = 0,
      prevWeekVolume = 0,
      thisWeekReps = 0,
      prevWeekReps = 0,
      thisWeekSets = 0,
      prevWeekSets = 0;
    for (const r of rows) {
      const d = new Date(r.created_at);
      const vol = (r.weight ?? 0) * (r.reps ?? 0);
      if (d >= weekStart) {
        thisWeekVolume += vol;
        thisWeekReps += r.reps ?? 0;
        thisWeekSets += 1;
      } else if (d >= prevWeekStart) {
        prevWeekVolume += vol;
        prevWeekReps += r.reps ?? 0;
        prevWeekSets += 1;
      }
    }
    const pct = (cur: number, prev: number): number | null => {
      if (prev === 0) return cur > 0 ? 100 : null;
      return Math.round(((cur - prev) / prev) * 100);
    };

    // PRs per exercise
    const prMap = new Map<string, number>();
    for (const r of recentRows) {
      if (r.weight == null) continue;
      const cur = prMap.get(r.exercise_name) ?? 0;
      if (r.weight > cur) prMap.set(r.exercise_name, r.weight);
    }
    const prs = [...prMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);

    // Daily volume for last 14 days
    const dailyMap = new Map<string, number>();
    for (let i = 13; i >= 0; i--) {
      dailyMap.set(startOfDay(subDays(now, i)).toISOString(), 0);
    }
    for (const r of recentRows) {
      const key = startOfDay(new Date(r.created_at)).toISOString();
      if (dailyMap.has(key)) {
        dailyMap.set(key, (dailyMap.get(key) ?? 0) + (r.weight ?? 0) * (r.reps ?? 0));
      }
    }
    const daily = [...dailyMap.entries()].map(([d, v]) => ({ date: new Date(d), volume: v }));
    const maxVolume = Math.max(1, ...daily.map((d) => d.volume));

    return {
      sessions: sessions.size,
      totalVolume,
      totalSets,
      totalReps,
      prs,
      daily,
      maxVolume,
      deltas: {
        sessions: pct(
          new Set(rows.filter((r) => new Date(r.created_at) >= weekStart).map((r) => r.session_id)).size,
          new Set(rows.filter((r) => {
            const d = new Date(r.created_at);
            return d >= prevWeekStart && d < weekStart;
          }).map((r) => r.session_id)).size,
        ),
        volume: pct(thisWeekVolume, prevWeekVolume),
        sets: pct(thisWeekSets, prevWeekSets),
        reps: pct(thisWeekReps, prevWeekReps),
      },
    };
  }, [sets]);

  if (loading) return <div className="p-10 text-center text-muted-foreground">Loading…</div>;
  if (!user) return <AuthScreen />;

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 animate-fade-in-up">
      <Link
        to="/"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="mr-1 h-4 w-4" /> Home
      </Link>

      <h1 className="mt-3 text-3xl font-extrabold tracking-tight md:text-4xl">Progress</h1>
      <p className="text-sm text-muted-foreground">Last 30 days of your training.</p>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Sessions" value={stats.sessions} delta={stats.deltas.sessions} icon={<Flame className="h-4 w-4" />} />
        <Stat
          label="Volume (kg)"
          value={Math.round(stats.totalVolume).toLocaleString()}
          delta={stats.deltas.volume}
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <Stat label="Sets" value={stats.totalSets} delta={stats.deltas.sets} icon={<Dumbbell className="h-4 w-4" />} />
        <Stat label="Reps" value={stats.totalReps} delta={stats.deltas.reps} icon={<Dumbbell className="h-4 w-4" />} />
      </div>

      <section className="mt-6 glass rounded-2xl p-5 animate-fade-in-up stagger-1">
        <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
          Daily volume · 14 days
        </h3>
        <div className="mt-4 flex h-36 items-end gap-2 rounded-xl bg-background/40 p-3">
          {stats.daily.map((d) => {
            const heightPct = d.volume > 0
              ? Math.max(8, (d.volume / stats.maxVolume) * 100)
              : 4;
            return (
              <div
                key={d.date.toISOString()}
                className="flex h-full flex-1 flex-col items-center justify-end gap-1.5"
                title={`${format(d.date, "MMM d")} · ${Math.round(d.volume).toLocaleString()} kg`}
              >
                <div
                  className={cn(
                    "w-full rounded-t-md transition-all duration-300",
                    d.volume > 0
                      ? "bg-primary shadow-[0_0_12px_-2px_var(--primary)]"
                      : "bg-muted-foreground/20",
                  )}
                  style={{ height: `${heightPct}%` }}
                />
                <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {format(d.date, "EEEEE")}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mt-6 glass rounded-2xl p-5 animate-fade-in-up stagger-2">
        <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
          Top weights (last 30 days)
        </h3>
        {stats.prs.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No PRs yet — log a session to start.</p>
        ) : (
          <ul className="mt-3 divide-y divide-border/50">
            {stats.prs.map(([name, w]) => (
              <li key={name} className="flex items-center justify-between py-2.5">
                <span className="truncate pr-3 text-sm font-semibold">{name}</span>
                <span className="rounded-md bg-primary/15 px-2.5 py-1 text-xs font-bold text-primary tabular-nums">
                  {w}kg
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

function Stat({
  label,
  value,
  icon,
  delta,
}: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  delta?: number | null;
}) {
  const hasDelta = delta != null;
  const positive = (delta ?? 0) >= 0;
  return (
    <div className="glass rounded-2xl border border-border/40 bg-card/60 p-4 shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/15 text-primary">
          {icon}
        </div>
        {hasDelta && (
          <span
            className={cn(
              "rounded-md px-1.5 py-0.5 text-[10px] font-bold tabular-nums",
              positive
                ? "bg-emerald-500/15 text-emerald-400"
                : "bg-destructive/15 text-destructive",
            )}
            title="vs last week"
          >
            {positive ? "+" : ""}
            {delta}%
          </span>
        )}
      </div>
      <div className="mt-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-0.5 text-2xl font-extrabold tabular-nums">{value}</div>
    </div>
  );
}
