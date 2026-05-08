import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Plus, Trash2, Save } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/lib/auth-context";
import { AuthScreen } from "@/components/AuthScreen";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ACCENT_OPTIONS } from "@/lib/exercises";

export const Route = createFileRoute("/custom/new")({
  component: NewCustomDay,
  head: () => ({ meta: [{ title: "New Workout — IronLog" }] }),
});

function NewCustomDay() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [accent, setAccent] = useState<string>("primary");
  const [exercises, setExercises] = useState<string[]>([""]);
  const [saving, setSaving] = useState(false);

  if (loading) return <div className="p-10 text-center text-muted-foreground">Loading…</div>;
  if (!user) return <AuthScreen />;

  const updateEx = (i: number, v: string) =>
    setExercises((arr) => arr.map((x, idx) => (idx === i ? v : x)));
  const addEx = () => setExercises((arr) => [...arr, ""]);
  const removeEx = (i: number) =>
    setExercises((arr) => (arr.length > 1 ? arr.filter((_, idx) => idx !== i) : arr));

  const save = async () => {
    const cleaned = exercises.map((e) => e.trim()).filter(Boolean);
    if (!name.trim()) return toast.error("Give your workout a name.");
    if (cleaned.length === 0) return toast.error("Add at least one exercise.");

    setSaving(true);
    try {
      const { data, error } = await supabase
        .from("custom_workout_days")
        .insert({
          user_id: user.id,
          name: name.trim(),
          subtitle: subtitle.trim() || null,
          accent,
          exercises: cleaned,
        })
        .select("id")
        .single();
      if (error) throw error;
      toast.success("Workout created");
      navigate({ to: "/day/$day", params: { day: data!.id } });
    } catch (e: any) {
      toast.error(e.message ?? "Failed to create workout");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 pb-32">
      <Link to="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="mr-1 h-4 w-4" /> All workouts
      </Link>

      <h1 className="mt-3 text-3xl font-extrabold tracking-tight md:text-4xl">New custom workout</h1>
      <p className="text-sm text-muted-foreground">Build a day that fits your split.</p>

      <div className="mt-6 space-y-4 rounded-2xl border border-border bg-card p-4">
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Name</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Arms" maxLength={60} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Subtitle</label>
          <Input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="e.g. Biceps · Triceps · Forearms" maxLength={120} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Accent</label>
          <div className="flex flex-wrap gap-2">
            {ACCENT_OPTIONS.map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => setAccent(a)}
                className="flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-all"
                style={{
                  borderColor: accent === a ? `var(--${a})` : "var(--border)",
                  backgroundColor: accent === a ? `color-mix(in oklab, var(--${a}) 20%, transparent)` : "transparent",
                  color: accent === a ? `var(--${a})` : "var(--muted-foreground)",
                }}
              >
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: `var(--${a})` }} />
                {a}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-border bg-card p-4">
        <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Exercises</div>
        <div className="space-y-2">
          {exercises.map((ex, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-bold tabular-nums text-muted-foreground">
                {i + 1}
              </div>
              <Input
                value={ex}
                onChange={(e) => updateEx(i, e.target.value)}
                placeholder="Exercise name"
                className="h-10"
                maxLength={120}
              />
              <Button
                size="icon"
                variant="ghost"
                className="shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => removeEx(i)}
                disabled={exercises.length === 1}
                aria-label="Remove exercise"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button variant="secondary" size="sm" className="w-full" onClick={addEx}>
            <Plus className="mr-1 h-4 w-4" /> Add exercise
          </Button>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border/60 bg-background/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <div className="text-sm text-muted-foreground">
            {exercises.filter((e) => e.trim()).length} exercises
          </div>
          <Button size="lg" className="font-bold shadow-[var(--shadow-glow)]" onClick={save} disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Saving…" : "Create workout"}
          </Button>
        </div>
      </div>
    </main>
  );
}
