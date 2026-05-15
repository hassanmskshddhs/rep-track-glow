import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CalendarDays, Dumbbell, Pencil, Plus, Trash2, Trophy } from "lucide-react";
import { format } from "date-fns";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { useAuth } from "@/lib/auth-context";
import { AuthScreen } from "@/components/AuthScreen";
import { supabase } from "@/integrations/supabase/client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/history")({
  component: HistoryPage,
  head: () => ({ meta: [{ title: "History — IronLog" }, { name: "description", content: "Your workout history." }] }),
});

type SetRow = {
  id?: string;
  exercise_name: string;
  set_number: number;
  weight: number | null;
  reps: number | null;
};

type SessionWithSets = {
  id: string;
  day: string;
  performed_at: string;
  title: string | null;
  sets: SetRow[];
};


function HistoryPage() {
  const { user, loading } = useAuth();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<SessionWithSets | null>(null);

  const { data: splits } = useQuery({
    queryKey: ["custom-days-list", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("custom_workout_days")
        .select("id, name, accent");
      if (error) throw error;
      return data ?? [];
    },
  });
  const splitMap = new Map((splits ?? []).map((s) => [s.id, s]));

  const { data, isLoading } = useQuery({
    queryKey: ["history", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: sessions, error } = await supabase
        .from("workout_sessions")
        .select("id, day, performed_at, title")
        .order("performed_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      if (!sessions || sessions.length === 0) return [] as SessionWithSets[];

      const ids = sessions.map((s) => s.id);
      const { data: sets, error: e2 } = await supabase
        .from("set_logs")
        .select("id, session_id, exercise_name, set_number, weight, reps")
        .in("session_id", ids)
        .order("set_number", { ascending: true });
      if (e2) throw e2;

      return sessions.map((s) => ({
        ...s,
        sets: (sets ?? []).filter((x) => x.session_id === s.id) as SetRow[],
      })) as SessionWithSets[];
    },
  });

  if (loading) return <div className="p-10 text-center text-muted-foreground">Loading…</div>;
  if (!user) return <AuthScreen />;

  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <Link to="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="mr-1 h-4 w-4" /> Home
      </Link>
      <h1 className="mt-3 text-3xl font-extrabold tracking-tight md:text-4xl">History</h1>
      <p className="text-sm text-muted-foreground">Every session. Every set. Track the overload.</p>

      {isLoading ? (
        <div className="mt-10 text-center text-muted-foreground">Loading…</div>
      ) : !data || data.length === 0 ? (
        <div className="mt-12 rounded-2xl border border-dashed border-border p-10 text-center">
          <Dumbbell className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <h3 className="font-semibold">No workouts yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">Log your first session to see it here.</p>
          <Link to="/" className="mt-4 inline-block text-sm font-semibold text-primary underline">
            Pick a workout
          </Link>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {(() => {
            // Walk sessions oldest -> newest to compute the PR weight & date
            // per exercise. Only sessions that beat the previous best earn the
            // PR badge for that exercise.
            const ordered = [...data].sort(
              (a, b) => new Date(a.performed_at).getTime() - new Date(b.performed_at).getTime(),
            );
            const bestSoFar = new Map<string, number>();
            const prSessions = new Map<string, Set<string>>(); // sessionId -> set of ex names that PR'd
            for (const s of ordered) {
              const topPerEx = new Map<string, number>();
              for (const x of s.sets) {
                if (x.weight == null || x.reps == null || x.reps <= 0) continue;
                const cur = topPerEx.get(x.exercise_name) ?? -Infinity;
                if (x.weight > cur) topPerEx.set(x.exercise_name, x.weight);
              }
              const sessionPRs = new Set<string>();
              for (const [ex, w] of topPerEx) {
                const prev = bestSoFar.get(ex);
                if (prev == null || w > prev) {
                  sessionPRs.add(ex);
                  bestSoFar.set(ex, w);
                }
              }
              if (sessionPRs.size > 0) prSessions.set(s.id, sessionPRs);
            }
            return data.map((s) => {
            const split = splitMap.get(s.day);
            const accent = split?.accent ?? "primary";
            const prSet = prSessions.get(s.id) ?? new Set<string>();
            const grouped = new Map<string, SetRow[]>();
            for (const x of s.sets) {
              const arr = grouped.get(x.exercise_name) ?? [];
              arr.push(x);
              grouped.set(x.exercise_name, arr);
            }
            return (
              <article key={s.id} className="overflow-hidden rounded-2xl border border-border bg-card">
                <header className="flex items-center justify-between border-b border-border/60 p-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-lg"
                      style={{ backgroundColor: `color-mix(in oklab, var(--${accent}) 22%, transparent)` }}
                    >
                      <Dumbbell className="h-5 w-5" style={{ color: `var(--${accent})` }} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h3 className="truncate text-base font-extrabold tracking-tight">
                          {s.title?.trim() || split?.name || "Workout"}
                        </h3>
                        <button
                          type="button"
                          aria-label="Rename session"
                          onClick={() => setRenaming(s)}
                          className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-primary"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <CalendarDays className="h-3 w-3" />
                        {format(new Date(s.performed_at), "EEE, MMM d · h:mm a")}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {s.sets.length} {s.sets.length === 1 ? "set" : "sets"}
                    </span>
                    <Button size="sm" variant="outline" onClick={() => setEditing(s)}>
                      <Pencil className="mr-1 h-3.5 w-3.5" /> Edit
                    </Button>
                  </div>
                </header>

                <div className="divide-y divide-border/50">
                  {Array.from(grouped, ([ex, sets]) => {
                    const isPR = prSet.has(ex);
                    return (
                    <div key={ex} className="p-4">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <div className="text-sm font-semibold">{ex}</div>
                        {isPR && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-primary">
                            <Trophy className="h-3 w-3" /> New PR
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {sets.map((x) => (
                          <span
                            key={x.set_number}
                            className="rounded-md bg-muted px-2 py-1 text-xs tabular-nums text-foreground"
                          >
                            <span className="text-muted-foreground">{x.set_number}.</span>{" "}
                            {x.weight ?? "—"}kg × {x.reps ?? "—"}
                          </span>
                        ))}
                      </div>
                    </div>
                    );
                  })}
                </div>
              </article>
            );
            });
          })()}
        </div>
      )}

      <EditSessionDialog
        session={editing}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          qc.invalidateQueries({ queryKey: ["history", user.id] });
          qc.invalidateQueries({ queryKey: ["last-sets"] });
        }}
        userId={user.id}
      />
    </main>
  );
}

type DraftSet = { id?: string; weight: string; reps: string };

function EditSessionDialog({
  session,
  onClose,
  onSaved,
  userId,
}: {
  session: SessionWithSets | null;
  onClose: () => void;
  onSaved: () => void;
  userId: string;
}) {
  const [draft, setDraft] = useState<Record<string, DraftSet[]>>({});
  const [saving, setSaving] = useState(false);

  // initialize draft when session changes
  useEffect(() => {
    if (!session) {
      setDraft({});
      return;
    }
    const init: Record<string, DraftSet[]> = {};
    const grouped = new Map<string, SetRow[]>();
    for (const x of session.sets) {
      const arr = grouped.get(x.exercise_name) ?? [];
      arr.push(x);
      grouped.set(x.exercise_name, arr);
    }
    grouped.forEach((rows, ex) => {
      init[ex] = rows
        .sort((a, b) => a.set_number - b.set_number)
        .map((r) => ({
          id: r.id,
          weight: r.weight === null || r.weight === undefined ? "" : String(r.weight),
          reps: r.reps === null || r.reps === undefined ? "" : String(r.reps),
        }));
    });
    setDraft(init);
  }, [session?.id]);

  const close = () => {
    setDraft({});
    onClose();
  };

  if (!session) return null;

  const update = (ex: string, idx: number, field: "weight" | "reps", value: string) =>
    setDraft((d) => ({
      ...d,
      [ex]: d[ex].map((r, i) => (i === idx ? { ...r, [field]: value } : r)),
    }));

  const addSet = (ex: string) =>
    setDraft((d) => ({ ...d, [ex]: [...(d[ex] ?? []), { weight: "", reps: "" }] }));

  const removeSet = (ex: string, idx: number) =>
    setDraft((d) => ({ ...d, [ex]: d[ex].filter((_, i) => i !== idx) }));

  const save = async () => {
    setSaving(true);
    try {
      // Delete all existing rows for this session, re-insert from draft
      const { error: dErr } = await supabase
        .from("set_logs")
        .delete()
        .eq("session_id", session.id);
      if (dErr) throw dErr;

      const rows: {
        session_id: string;
        user_id: string;
        exercise_name: string;
        set_number: number;
        weight: number | null;
        reps: number | null;
      }[] = [];
      for (const [ex, sets] of Object.entries(draft)) {
        sets.forEach((s, i) => {
          const w = s.weight === "" ? null : Number(s.weight);
          const r = s.reps === "" ? null : Number(s.reps);
          if (w === null && r === null) return;
          if (w !== null && (Number.isNaN(w) || w < 0 || w > 2000)) {
            throw new Error(`Invalid weight for ${ex}`);
          }
          if (r !== null && (!Number.isInteger(r) || r < 0 || r > 1000)) {
            throw new Error(`Invalid reps for ${ex}`);
          }
          rows.push({
            session_id: session.id,
            user_id: userId,
            exercise_name: ex,
            set_number: i + 1,
            weight: w,
            reps: r,
          });
        });
      }

      if (rows.length > 0) {
        const { error: iErr } = await supabase.from("set_logs").insert(rows);
        if (iErr) throw iErr;
      }

      toast.success("Session updated");
      setDraft({});
      onSaved();
    } catch (e: any) {
      toast.error(e.message ?? "Failed to update session");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!session} onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Edit session</DialogTitle>
          <DialogDescription>
            {format(new Date(session.performed_at), "EEE, MMM d · h:mm a")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {Object.entries(draft).map(([ex, sets]) => (
            <div key={ex} className="rounded-lg border border-border p-3">
              <div className="mb-2 text-sm font-semibold">{ex}</div>
              <div className="space-y-2">
                {sets.map((row, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-bold text-muted-foreground">
                      {idx + 1}
                    </div>
                    <Input
                      type="number"
                      placeholder="kg"
                      value={row.weight}
                      onChange={(e) => update(ex, idx, "weight", e.target.value)}
                      className="h-9"
                    />
                    <Input
                      type="number"
                      placeholder="reps"
                      value={row.reps}
                      onChange={(e) => update(ex, idx, "reps", e.target.value)}
                      className="h-9"
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      className="shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => removeSet(ex, idx)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button variant="secondary" size="sm" className="w-full" onClick={() => addSet(ex)}>
                  <Plus className="mr-1 h-4 w-4" /> Add set
                </Button>
              </div>
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={close} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
