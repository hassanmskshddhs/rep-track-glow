import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Dumbbell,
  ChevronRight,
  Plus,
  Trash2,
  Pencil,
  Flame,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { format, startOfDay, subDays } from "date-fns";

import { useAuth } from "@/lib/auth-context";
import { AuthScreen } from "@/components/AuthScreen";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getSplitAccent } from "@/lib/split-accent";

export const Route = createFileRoute("/")({
  component: Index,
});

type CustomDay = {
  id: string;
  name: string;
  subtitle: string | null;
  accent: string | null;
  exercises: unknown;
  muscle_groups: string[] | null;
  created_at: string;
};

function Index() {
  const { user, loading } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data: splits, isLoading: splitsLoading } = useQuery({
    queryKey: ["custom-days-list", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<CustomDay[]> => {
      const { data, error } = await supabase
        .from("custom_workout_days")
        .select("id, name, subtitle, accent, exercises, muscle_groups, created_at")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as CustomDay[];
    },
  });

  const { data: recent } = useQuery({
    queryKey: ["recent-sessions", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const since = subDays(new Date(), 13).toISOString();
      const { data, error } = await supabase
        .from("workout_sessions")
        .select("id, day, performed_at")
        .gte("performed_at", since)
        .order("performed_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const week = useMemo(() => {
    const days: { date: Date; active: boolean; label: string; splitId: string | null }[] = [];
    const performedMap = new Map<string, string>();
    for (const s of recent ?? []) {
      const key = startOfDay(new Date(s.performed_at)).toISOString();
      if (!performedMap.has(key)) performedMap.set(key, s.day);
    }
    for (let i = 6; i >= 0; i--) {
      const d = startOfDay(subDays(new Date(), i));
      const key = d.toISOString();
      days.push({
        date: d,
        active: performedMap.has(key),
        label: format(d, "EEEEE"),
        splitId: performedMap.get(key) ?? null,
      });
    }
    return days;
  }, [recent]);

  const streak = useMemo(() => {
    const set = new Set(
      (recent ?? []).map((s) =>
        startOfDay(new Date(s.performed_at)).toISOString(),
      ),
    );
    let s = 0;
    for (let i = 0; i < 30; i++) {
      const d = startOfDay(subDays(new Date(), i));
      if (set.has(d.toISOString())) s++;
      else if (i > 0) break;
    }
    return s;
  }, [recent]);

  const upNext = useMemo(() => {
    if (!splits || splits.length === 0) return null;
    const lastSession = recent?.[0];
    if (!lastSession) return splits[0];
    const lastIdx = splits.findIndex((s) => s.id === lastSession.day);
    if (lastIdx === -1) return splits[0];
    return splits[(lastIdx + 1) % splits.length];
  }, [splits, recent]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Dumbbell className="h-8 w-8 animate-pulse text-primary" />
      </div>
    );
  }
  if (!user) return <AuthScreen />;

  const firstName =
    (user.user_metadata?.full_name as string | undefined)?.split(" ")[0] ??
    (user.user_metadata?.name as string | undefined)?.split(" ")[0] ??
    user.email?.split("@")[0] ??
    "Athlete";

  const deleteSplit = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? Logged sessions stay in History.`)) return;
    const { error } = await supabase
      .from("custom_workout_days")
      .delete()
      .eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Split deleted");
      qc.invalidateQueries({ queryKey: ["custom-days-list", user.id] });
    }
  };

  // Empty state
  if (!splitsLoading && (splits?.length ?? 0) === 0) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-12 animate-fade-in-up">
        <div className="glass relative overflow-hidden rounded-3xl p-10 text-center">
          <div
            aria-hidden
            className="absolute -inset-1 -z-10 opacity-60"
            style={{ background: "var(--gradient-hero)" }}
          />
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/15 text-primary">
            <Dumbbell className="h-8 w-8" />
          </div>
          <h1 className="mt-6 text-3xl font-extrabold tracking-tight md:text-4xl">
            Your journey starts here.
          </h1>
          <p className="mt-2 text-muted-foreground">
            Create your first custom workout split to start tracking sets, weights and progress.
          </p>
          <Button
            size="lg"
            className="mt-8 font-bold shadow-[var(--shadow-glow)]"
            onClick={() => navigate({ to: "/custom/new" })}
          >
            <Plus className="mr-2 h-5 w-5" />
            Create New Split
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 pt-6 pb-4">
      {/* Hero greeting */}
      <section className="animate-fade-in-up">
        <div className="glass relative overflow-hidden rounded-3xl p-5 md:p-6">
          <div
            aria-hidden
            className="absolute inset-0 -z-10 opacity-90"
            style={{ background: "var(--gradient-hero)" }}
          />
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                <Flame className="h-3.5 w-3.5" />
                {streak > 0 ? `${streak}-day streak` : "Let's lift"}
              </div>
              <h1 className="mt-1 text-2xl font-extrabold tracking-tight md:text-3xl">
                Welcome back, <span className="text-primary">{firstName}</span>!
              </h1>
              <p className="text-sm text-muted-foreground">Weekly activity</p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-7 gap-1.5">
            {week.map((d) => (
              <div key={d.date.toISOString()} className="flex flex-col items-center gap-1">
                <div
                  className={cn(
                    "flex h-10 w-full items-center justify-center rounded-lg text-xs font-bold transition-all",
                    d.active
                      ? "bg-primary text-primary-foreground shadow-[var(--shadow-glow)]"
                      : "bg-muted/60 text-muted-foreground",
                  )}
                >
                  {d.active ? <Flame className="h-4 w-4" /> : "·"}
                </div>
                <span className="text-[10px] font-semibold text-muted-foreground">{d.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Up Next */}
      {upNext && (
        <section className="mt-5 animate-fade-in-up stagger-1">
          <Link
            to="/day/$day"
            params={{ day: upNext.id }}
            className="group glass-strong relative block overflow-hidden rounded-3xl p-6 transition-all hover:-translate-y-0.5"
          >
            <div
              className="absolute inset-x-0 top-0 h-1.5"
              style={{ backgroundColor: `var(--${upNext.accent ?? "primary"})` }}
            />
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              <Sparkles className="h-3.5 w-3.5" /> Up Next
            </div>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight md:text-4xl">
              {upNext.name}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {upNext.subtitle ||
                (Array.isArray(upNext.muscle_groups) && upNext.muscle_groups.length > 0
                  ? upNext.muscle_groups.join(" · ")
                  : "Your next session in the rotation")}
            </p>

            <div className="mt-5 flex items-center justify-between">
              <div className="text-xs text-muted-foreground">
                {Array.isArray(upNext.exercises) ? (upNext.exercises as unknown[]).length : 0} exercises
              </div>
              <span
                className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground shadow-[var(--shadow-glow)] transition-transform group-hover:translate-x-0.5"
              >
                Start Workout <ChevronRight className="h-4 w-4" />
              </span>
            </div>
          </Link>
        </section>
      )}

      {/* My Programs */}
      <section className="mt-6 animate-fade-in-up stagger-2">
        <div className="mb-3 flex items-end justify-between">
          <h3 className="text-lg font-bold tracking-tight">My Programs</h3>
          <Link
            to="/custom/new"
            className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
          >
            <Plus className="h-3.5 w-3.5" /> New split
          </Link>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {(splits ?? []).map((s) => {
            const accent = s.accent ?? "primary";
            const exCount = Array.isArray(s.exercises) ? (s.exercises as unknown[]).length : 0;
            return (
              <div
                key={s.id}
                className="group glass relative overflow-hidden rounded-2xl transition-all hover:-translate-y-0.5 hover:border-primary/40"
              >
                <div
                  className="absolute inset-x-0 top-0 h-1"
                  style={{ backgroundColor: `var(--${accent})` }}
                />
                <Link to="/day/$day" params={{ day: s.id }} className="block p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                        Split
                      </div>
                      <h4 className="mt-0.5 truncate text-xl font-extrabold tracking-tight">
                        {s.name}
                      </h4>
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        {s.subtitle ||
                          (Array.isArray(s.muscle_groups) && s.muscle_groups.length > 0
                            ? s.muscle_groups.join(" · ")
                            : `${exCount} exercises`)}
                      </p>
                    </div>
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                      style={{
                        backgroundColor: `color-mix(in oklab, var(--${accent}) 18%, transparent)`,
                      }}
                    >
                      <Dumbbell className="h-4 w-4" style={{ color: `var(--${accent})` }} />
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{exCount} exercises</span>
                    <span className="flex items-center gap-1 font-medium text-primary">
                      Start <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                    </span>
                  </div>
                </Link>

                <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <Button
                    asChild
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-muted-foreground hover:text-primary"
                    aria-label="Edit"
                  >
                    <Link to="/custom/$id/edit" params={{ id: s.id }}>
                      <Pencil className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={(e) => {
                      e.preventDefault();
                      deleteSplit(s.id, s.name);
                    }}
                    aria-label="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}

          <Link
            to="/custom/new"
            className="group flex min-h-[150px] items-center justify-center rounded-2xl border-2 border-dashed border-border bg-card/30 p-5 text-center transition-all hover:border-primary/60 hover:bg-card/60"
          >
            <div>
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15">
                <Plus className="h-5 w-5 text-primary" />
              </div>
              <div className="mt-2 text-sm font-bold">New split</div>
              <div className="text-[11px] text-muted-foreground">Build your own day</div>
            </div>
          </Link>
        </div>
      </section>
    </main>
  );
}
