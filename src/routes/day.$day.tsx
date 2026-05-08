import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Save, Plus, Trash2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { DAYS, DAY_KEYS, isBuiltInDay, type DayConfig, type DayKey } from "@/lib/exercises";
import { useAuth } from "@/lib/auth-context";
import { AuthScreen } from "@/components/AuthScreen";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RestTimer } from "@/components/RestTimer";
import { ExerciseChart } from "@/components/ExerciseChart";

export const Route = createFileRoute("/day/$day")({
  component: DayRoute,
  head: ({ params }) => {
    const d = isBuiltInDay(params.day) ? DAYS[params.day as DayKey] : null;
    return {
      meta: [
        { title: d ? `${d.name} — IronLog` : "Workout — IronLog" },
        { name: "description", content: d ? `Log your ${d.name} session.` : "Log your workout." },
      ],
    };
  },
});

function DayRoute() {
  const { day } = Route.useParams();
  // Force remount on day change so all per-exercise state resets cleanly.
  return <DayPage key={day} day={day} />;
}

type SetRow = { weight: string; reps: string };
type State = Record<string, SetRow[]>;

const setSchema = z.object({
  weight: z.number().min(0).max(2000).nullable(),
  reps: z.number().int().min(0).max(1000).nullable(),
});

function DayPage({ day }: { day: string }) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const builtIn = isBuiltInDay(day);

  // Load custom day from DB if not built-in
  const { data: customDay, isLoading: customLoading, isError: customError } = useQuery({
    queryKey: ["custom-day", day],
    enabled: !!user && !builtIn,
    queryFn: async (): Promise<DayConfig | null> => {
      const { data, error } = await supabase
        .from("custom_workout_days")
        .select("name, subtitle, accent, exercises")
        .eq("id", day)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return {
        name: data.name,
        subtitle: data.subtitle ?? "",
        accent: data.accent ?? "primary",
        exercises: Array.isArray(data.exercises) ? (data.exercises as string[]) : [],
      };
    },
  });

  const config: DayConfig | null = builtIn ? DAYS[day as DayKey] : customDay ?? null;

  const draftKey = user ? `ironlog:draft:${user.id}:${day}` : null;

  const [state, setState] = useState<State>({});
  const [hydrated, setHydrated] = useState(false);
  const [saving, setSaving] = useState(false);

  // Hydrate state from localStorage / config once config is available
  useEffect(() => {
    if (!config || hydrated || typeof window === "undefined" || !draftKey) return;
    let initial: State = Object.fromEntries(
      config.exercises.map((e) => [e, [{ weight: "", reps: "" }]])
    );
    try {
      const raw = localStorage.getItem(draftKey);
      if (raw) {
        const parsed = JSON.parse(raw) as State;
        // merge: keep current exercises, prefer saved rows when present
        initial = Object.fromEntries(
          config.exercises.map((e) => [
            e,
            Array.isArray(parsed?.[e]) && parsed[e].length > 0
              ? parsed[e].map((r) => ({ weight: String(r?.weight ?? ""), reps: String(r?.reps ?? "") }))
              : [{ weight: "", reps: "" }],
          ])
        );
      }
    } catch {
      // ignore corrupted draft
    }
    setState(initial);
    setHydrated(true);
  }, [config, hydrated, draftKey]);

  // Persist draft on every change
  useEffect(() => {
    if (!hydrated || !draftKey || typeof window === "undefined") return;
    try {
      localStorage.setItem(draftKey, JSON.stringify(state));
    } catch {
      // storage may be full or unavailable
    }
  }, [state, hydrated, draftKey]);

  const { data: customDays } = useQuery({
    queryKey: ["custom-days-list", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("custom_workout_days")
        .select("id, name, accent")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: lastSets } = useQuery({
    queryKey: ["last-sets", user?.id, day, config?.exercises?.join("|")],
    enabled: !!user && !!config,
    queryFn: async () => {
      const out: Record<string, { weight: number | null; reps: number | null } | null> = {};
      for (const ex of config!.exercises) {
        const { data } = await supabase
          .from("set_logs")
          .select("weight, reps")
          .eq("user_id", user!.id)
          .eq("exercise_name", ex)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        out[ex] = data ?? null;
      }
      return out;
    },
  });

  if (loading) return <div className="p-10 text-center text-muted-foreground">Loading…</div>;
  if (!user) return <AuthScreen />;

  if (!builtIn && customLoading) {
    return <div className="p-10 text-center text-muted-foreground">Loading workout…</div>;
  }

  if (!config || customError) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-12">
        <p className="text-muted-foreground">This workout day couldn't be loaded.</p>
        <Link to="/" className="mt-4 inline-block text-primary underline">Back home</Link>
      </main>
    );
  }

  if (config.exercises.length === 0) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-12">
        <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">← Home</Link>
        <h1 className="mt-3 text-2xl font-bold">{config.name}</h1>
        <p className="mt-2 text-muted-foreground">No exercises in this workout yet.</p>
      </main>
    );
  }

  const resetInputs = () => {
    if (!confirm("Clear all current inputs? This won't affect saved history.")) return;
    setState(Object.fromEntries(config.exercises.map((e) => [e, [{ weight: "", reps: "" }]])));
    if (draftKey && typeof window !== "undefined") localStorage.removeItem(draftKey);
    toast.success("Inputs cleared");
  };


  const update = (ex: string, idx: number, field: keyof SetRow, value: string) =>
    setState((s) => ({
      ...s,
      [ex]: (s[ex] ?? [{ weight: "", reps: "" }]).map((r, i) => (i === idx ? { ...r, [field]: value } : r)),
    }));

  const addSet = (ex: string) =>
    setState((s) => ({ ...s, [ex]: [...(s[ex] ?? []), { weight: "", reps: "" }] }));

  const removeSet = (ex: string, idx: number) =>
    setState((s) => ({
      ...s,
      [ex]: (s[ex] ?? []).length > 1 ? s[ex].filter((_, i) => i !== idx) : s[ex] ?? [{ weight: "", reps: "" }],
    }));

  const totalSets = Object.values(state).reduce(
    (a, sets) => a + (sets ?? []).filter((s) => s.weight || s.reps).length,
    0
  );

  const logWorkout = async () => {
    const rows: { exercise_name: string; set_number: number; weight: number | null; reps: number | null }[] = [];
    for (const ex of config.exercises) {
      const sets = state[ex] ?? [];
      sets.forEach((s, i) => {
        const w = s.weight === "" ? null : Number(s.weight);
        const r = s.reps === "" ? null : Number(s.reps);
        if (w === null && r === null) return;
        const parsed = setSchema.safeParse({ weight: w, reps: r });
        if (!parsed.success) throw new Error(`Invalid input for ${ex}`);
        rows.push({ exercise_name: ex, set_number: i + 1, weight: w, reps: r });
      });
    }
    if (rows.length === 0) {
      toast.error("Add at least one set with weight or reps.");
      return;
    }

    setSaving(true);
    try {
      const { data: session, error: sErr } = await supabase
        .from("workout_sessions")
        .insert({ user_id: user.id, day })
        .select("id")
        .single();
      if (sErr) throw sErr;

      const { error: lErr } = await supabase.from("set_logs").insert(
        rows.map((r) => ({ ...r, session_id: session!.id, user_id: user.id }))
      );
      if (lErr) throw lErr;

      toast.success(`Logged ${rows.length} sets · ${config.name}`);
      navigate({ to: "/history" });
    } catch (e: any) {
      toast.error(e.message ?? "Failed to log workout");
    } finally {
      setSaving(false);
    }
  };

  const tabs: { key: string; label: string; accent: string }[] = [
    ...DAY_KEYS.map((k) => ({ key: k, label: DAYS[k].name, accent: DAYS[k].accent })),
    ...((customDays ?? []).map((c) => ({ key: c.id, label: c.name, accent: c.accent ?? "primary" }))),
  ];

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 pb-32">
      <Link to="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="mr-1 h-4 w-4" /> All workouts
      </Link>

      <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: `var(--${config.accent})` }}>
            {builtIn ? `Day · ${day}` : "Custom Workout"}
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">{config.name}</h1>
          <p className="text-sm text-muted-foreground">{config.subtitle}</p>
        </div>
        <div className="flex flex-wrap gap-1">
          {tabs.map((t) => (
            <Link
              key={t.key}
              to="/day/$day"
              params={{ day: t.key }}
              className="rounded-md px-2.5 py-1 text-xs font-semibold uppercase tracking-wider"
              style={{
                backgroundColor: t.key === day ? `color-mix(in oklab, var(--${t.accent}) 25%, transparent)` : "transparent",
                color: t.key === day ? `var(--${t.accent})` : "var(--muted-foreground)",
              }}
            >
              {t.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="mt-6">
        <RestTimer />
      </div>

      <div className="mt-6 space-y-3">
        {config.exercises.map((ex) => {
          const last = lastSets?.[ex];
          const sets = state[ex] ?? [{ weight: "", reps: "" }];
          return (
            <div key={ex} className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="flex items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <div className="truncate font-semibold">{ex}</div>
                  {last ? (
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      Last: <span className="text-foreground">{last.weight ?? "—"} kg × {last.reps ?? "—"}</span>
                    </div>
                  ) : (
                    <div className="mt-0.5 text-xs text-muted-foreground">No history yet</div>
                  )}
                </div>
              </div>

              <div className="space-y-2 px-4 pb-4">
                {sets.map((row, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-bold tabular-nums text-muted-foreground">
                      {idx + 1}
                    </div>
                    <Input
                      type="number"
                      inputMode="decimal"
                      placeholder="kg"
                      value={row.weight}
                      onChange={(e) => update(ex, idx, "weight", e.target.value)}
                      className="h-10"
                    />
                    <Input
                      type="number"
                      inputMode="numeric"
                      placeholder="reps"
                      value={row.reps}
                      onChange={(e) => update(ex, idx, "reps", e.target.value)}
                      className="h-10"
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      className="shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => removeSet(ex, idx)}
                      disabled={sets.length === 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button variant="secondary" size="sm" className="w-full" onClick={() => addSet(ex)}>
                  <Plus className="mr-1 h-4 w-4" /> Add set
                </Button>

                <div className="pt-2">
                  <ExerciseChart userId={user.id} exercise={ex} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border/60 bg-background/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <div className="text-sm">
            <div className="font-semibold">{totalSets} {totalSets === 1 ? "set" : "sets"} ready</div>
            <div className="text-xs text-muted-foreground">{config.name} session</div>
          </div>
          <Button
            size="lg"
            className="font-bold shadow-[var(--shadow-glow)]"
            onClick={logWorkout}
            disabled={saving || totalSets === 0}
          >
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Saving…" : "Log Workout"}
          </Button>
        </div>
      </div>
    </main>
  );
}
