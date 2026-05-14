import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Save, Plus, Trash2, RotateCcw, Target, StickyNote, Share2, Trophy } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import type { DayConfig } from "@/lib/exercises";
import { useAuth } from "@/lib/auth-context";
import { AuthScreen } from "@/components/AuthScreen";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RestTimer } from "@/components/RestTimer";
import { ExerciseChart } from "@/components/ExerciseChart";
import { ShareWorkoutDialog, type WorkoutSummary } from "@/components/ShareWorkoutDialog";
import { getSplitAccent } from "@/lib/split-accent";

export const Route = createFileRoute("/day/$day")({
  component: DayRoute,
  head: () => ({
    meta: [
      { title: "Workout — IronLog" },
      { name: "description", content: "Log your workout." },
    ],
  }),
});

function DayRoute() {
  const { day } = Route.useParams();
  return <DayPage key={day} day={day} />;
}

type SetRow = { weight: string; reps: string };
type State = Record<string, SetRow[]>;

const setSchema = z.object({
  weight: z.number().min(0).max(2000).nullable(),
  reps: z.number().int().min(0).max(1000).nullable(),
});

// Double-progression defaults. If user keeps a rep range in the exercise name
// like "(8-12 reps)" we honor it; else default 8-12.
const DEFAULT_MIN_REPS = 8;
const DEFAULT_MAX_REPS = 12;
const WEIGHT_INCREMENT = 2.5;

function parseRepRange(name: string): { min: number; max: number } {
  const m = name.match(/(\d+)\s*-\s*(\d+)\s*reps?/i);
  if (m) return { min: parseInt(m[1], 10), max: parseInt(m[2], 10) };
  return { min: DEFAULT_MIN_REPS, max: DEFAULT_MAX_REPS };
}

type LastSetEntry = { weight: number | null; reps: number | null; set_number: number };

function buildTarget(
  exercise: string,
  lastSets: LastSetEntry[] | undefined,
): { last: string; target: string; hitCeiling: boolean } {
  const range = parseRepRange(exercise);
  if (!lastSets || lastSets.length === 0) {
    return {
      last: "No history yet",
      target: `Pick a comfortable weight · aim for ${range.min}-${range.max} reps`,
      hitCeiling: false,
    };
  }
  const valid = lastSets.filter((s) => s.weight != null && s.reps != null);
  if (valid.length === 0) {
    return {
      last: "No tracked sets last time",
      target: `Aim for ${range.min}-${range.max} reps`,
      hitCeiling: false,
    };
  }
  const topWeight = Math.max(...valid.map((s) => s.weight as number));
  const topSets = valid.filter((s) => s.weight === topWeight);
  const allHit = topSets.every((s) => (s.reps as number) >= range.max);
  const lastStr = valid
    .map((s) => `${s.weight}kg × ${s.reps}`)
    .join("  ·  ");

  if (allHit) {
    const next = +(topWeight + WEIGHT_INCREMENT).toFixed(2);
    return {
      last: lastStr,
      target: `Increase to ${next}kg · aim for ${range.min}-${range.min + 2} reps`,
      hitCeiling: true,
    };
  }
  return {
    last: lastStr,
    target: `Stay at ${topWeight}kg · add 1-2 total reps across sets`,
    hitCeiling: false,
  };
}

function DayPage({ day }: { day: string }) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const { data: customDay, isLoading: customLoading, isError: customError } = useQuery({
    queryKey: ["custom-day", day],
    enabled: !!user,
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

  const config: DayConfig | null = customDay ?? null;

  const draftKey = user ? `ironlog:draft:${user.id}:${day}` : null;

  const [state, setState] = useState<State>({});
  const [hydrated, setHydrated] = useState(false);
  const [saving, setSaving] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [summary, setSummary] = useState<WorkoutSummary | null>(null);

  // Notes — keyed by exercise. Local edits, persisted to DB on blur.
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [notesHydrated, setNotesHydrated] = useState(false);

  // Hydrate input drafts
  useEffect(() => {
    if (!config || hydrated || typeof window === "undefined" || !draftKey) return;
    let initial: State = Object.fromEntries(
      config.exercises.map((e) => [e, [{ weight: "", reps: "" }]])
    );
    try {
      const raw = localStorage.getItem(draftKey);
      if (raw) {
        const parsed = JSON.parse(raw) as State;
        initial = Object.fromEntries(
          config.exercises.map((e) => [
            e,
            Array.isArray(parsed?.[e]) && parsed[e].length > 0
              ? parsed[e].map((r) => ({ weight: String(r?.weight ?? ""), reps: String(r?.reps ?? "") }))
              : [{ weight: "", reps: "" }],
          ])
        );
      }
    } catch { /* noop */ }
    setState(initial);
    setHydrated(true);
  }, [config, hydrated, draftKey]);

  useEffect(() => {
    if (!hydrated || !draftKey || typeof window === "undefined") return;
    try {
      localStorage.setItem(draftKey, JSON.stringify(state));
    } catch { /* noop */ }
  }, [state, hydrated, draftKey]);

  const { data: customDays } = useQuery({
    queryKey: ["custom-days-list", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("custom_workout_days")
        .select("id, name, accent, muscle_groups")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  // Pull recent set history once for all exercises in this config — used for
  // both "last session" recommendations and all-time PR detection.
  const { data: history } = useQuery({
    queryKey: ["history-window", user?.id, day, config?.exercises?.join("|")],
    enabled: !!user && !!config && config.exercises.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("set_logs")
        .select("exercise_name, weight, reps, set_number, session_id, created_at")
        .eq("user_id", user!.id)
        .in("exercise_name", config!.exercises)
        .order("created_at", { ascending: false })
        .limit(800);
      if (error) throw error;
      return data ?? [];
    },
  });

  // Per-exercise: latest session sets + all-time best weight
  const insights = useMemo(() => {
    const out: Record<
      string,
      { lastSets: LastSetEntry[]; bestWeight: number | null }
    > = {};
    if (!config) return out;
    for (const ex of config.exercises) {
      const rows = (history ?? []).filter((r) => r.exercise_name === ex);
      const latestSessionId = rows[0]?.session_id ?? null;
      const lastSets: LastSetEntry[] = latestSessionId
        ? rows
            .filter((r) => r.session_id === latestSessionId)
            .map((r) => ({
              weight: r.weight,
              reps: r.reps,
              set_number: r.set_number,
            }))
            .sort((a, b) => a.set_number - b.set_number)
        : [];
      const bestWeight = rows.reduce<number | null>((max, r) => {
        if (r.weight == null) return max;
        return max == null || r.weight > max ? r.weight : max;
      }, null);
      out[ex] = { lastSets, bestWeight };
    }
    return out;
  }, [history, config]);

  // Hydrate notes
  useEffect(() => {
    if (!user || !config || notesHydrated) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("exercise_notes")
        .select("exercise_name, note")
        .eq("user_id", user.id)
        .in("exercise_name", config.exercises);
      if (cancelled) return;
      const map: Record<string, string> = {};
      (data ?? []).forEach((r) => { map[r.exercise_name] = r.note ?? ""; });
      setNotes(map);
      setNotesHydrated(true);
    })();
    return () => { cancelled = true; };
  }, [user, config, notesHydrated]);

  if (loading) return <div className="p-10 text-center text-muted-foreground">Loading…</div>;
  if (!user) return <AuthScreen />;
  if (customLoading) {
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

  const saveNote = async (ex: string, value: string) => {
    const trimmed = value.trim();
    try {
      const { error } = await supabase
        .from("exercise_notes")
        .upsert(
          { user_id: user.id, exercise_name: ex, note: trimmed, updated_at: new Date().toISOString() },
          { onConflict: "user_id,exercise_name" },
        );
      if (error) throw error;
    } catch (e) {
      // silent — notes shouldn't block workflow
      console.warn("note save failed", e);
    }
  };

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

      // Compute summary
      const totalVolume = rows.reduce(
        (a, r) => a + (r.weight ?? 0) * (r.reps ?? 0),
        0,
      );
      const totalReps = rows.reduce((a, r) => a + (r.reps ?? 0), 0);

      // Highlights: PRs vs best-known weight
      const highlights: string[] = [];
      const exerciseTopThisSession: Record<string, { weight: number; reps: number }> = {};
      for (const r of rows) {
        if (r.weight == null || r.reps == null) continue;
        const cur = exerciseTopThisSession[r.exercise_name];
        if (!cur || r.weight > cur.weight || (r.weight === cur.weight && r.reps > cur.reps)) {
          exerciseTopThisSession[r.exercise_name] = { weight: r.weight, reps: r.reps };
        }
      }
      for (const [ex, top] of Object.entries(exerciseTopThisSession)) {
        const prev = insights[ex]?.bestWeight ?? null;
        if (prev == null || top.weight > prev) {
          highlights.push(`New weight PR — ${ex}: ${top.weight}kg`);
        }
      }
      const topLifts = Object.entries(exerciseTopThisSession)
        .map(([exercise, t]) => ({ exercise, weight: t.weight, reps: t.reps }))
        .sort((a, b) => b.weight - a.weight);

      setSummary({
        workoutName: config.name,
        performedAt: new Date(),
        totalVolume,
        totalSets: rows.length,
        totalReps,
        highlights: highlights.slice(0, 3),
        topLifts,
      });
      setShareOpen(true);

      if (draftKey && typeof window !== "undefined") localStorage.removeItem(draftKey);
      toast.success(`Logged ${rows.length} sets · ${config.name}`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to log workout";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const tabs: { key: string; label: string; accent: string }[] = (customDays ?? []).map((c) => ({
    key: c.id,
    label: c.name,
    accent: getSplitAccent(c.name, (c as { muscle_groups?: string[] | null }).muscle_groups, c.accent ?? "primary"),
  }));
  const dayAccent = getSplitAccent(config.name, null, config.accent);

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 pb-32">
      <Link to="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="mr-1 h-4 w-4" /> All workouts
      </Link>

      <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: `var(--${config.accent})` }}>
            Custom Workout
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
          const ins = insights[ex];
          const t = buildTarget(ex, ins?.lastSets);
          const sets = state[ex] ?? [{ weight: "", reps: "" }];
          return (
            <div key={ex} className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="px-4 pt-4">
                <div className="font-semibold">{ex}</div>

                {/* Smart progression */}
                <div
                  className="mt-2 rounded-lg border px-3 py-2"
                  style={{
                    borderColor: t.hitCeiling
                      ? "color-mix(in oklab, var(--progress) 45%, transparent)"
                      : "color-mix(in oklab, var(--border) 100%, transparent)",
                    backgroundColor: t.hitCeiling
                      ? "color-mix(in oklab, var(--progress) 10%, transparent)"
                      : "color-mix(in oklab, var(--muted) 60%, transparent)",
                  }}
                >
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Last session
                  </div>
                  <div className="mt-0.5 text-xs text-foreground/90">{t.last}</div>
                  <div
                    className="mt-2 flex items-start gap-1.5 text-xs font-semibold"
                    style={{ color: "var(--progress)" }}
                  >
                    <Target className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>{t.target}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2 px-4 pb-4 pt-3">
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

                {/* Training note */}
                <div className="pt-1">
                  <label className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    <StickyNote className="h-3 w-3" /> Training note
                  </label>
                  <Textarea
                    value={notes[ex] ?? ""}
                    onChange={(e) => setNotes((n) => ({ ...n, [ex]: e.target.value }))}
                    onBlur={(e) => saveNote(ex, e.target.value)}
                    placeholder="e.g. Seat height 3 · slow eccentric"
                    className="mt-1 min-h-[44px] text-sm"
                  />
                </div>

                <div className="pt-2">
                  <ExerciseChart userId={user.id} exercise={ex} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div
        className="fixed inset-x-0 z-30 border-t border-border/60 bg-background/95 backdrop-blur-xl"
        style={{ bottom: "calc(64px + env(safe-area-inset-bottom))" }}
      >
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <div className="text-sm">
            <div className="font-semibold">{totalSets} {totalSets === 1 ? "set" : "sets"} ready</div>
            <div className="text-xs text-muted-foreground">{config.name} session</div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="lg"
              variant="outline"
              onClick={resetInputs}
              disabled={saving || totalSets === 0}
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset
            </Button>
            {summary && !shareOpen && (
              <Button
                size="lg"
                variant="secondary"
                onClick={() => setShareOpen(true)}
              >
                <Share2 className="mr-2 h-4 w-4" />
                Share
              </Button>
            )}
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
      </div>

      <ShareWorkoutDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        summary={summary}
        onClose={() => {
          // After closing the share dialog go to history
          navigate({ to: "/history" });
        }}
      />
    </main>
  );
}
