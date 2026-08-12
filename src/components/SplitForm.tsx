import { useState } from "react";
import { GripVertical, Trash2, Save } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ACCENT_OPTIONS, MUSCLE_GROUPS, type MuscleGroup } from "@/lib/exercises";
import { ExercisePicker } from "./ExercisePicker";
import { cn } from "@/lib/utils";

export type SplitDraft = {
  name: string;
  subtitle: string;
  accent: string;
  muscleGroups: MuscleGroup[];
  exercises: string[];
};

type Props = {
  initial?: Partial<SplitDraft>;
  saving?: boolean;
  submitLabel?: string;
  onSubmit: (draft: SplitDraft) => void;
};

export function SplitForm({ initial, saving, submitLabel = "Create split", onSubmit }: Props) {
  const [name, setName] = useState(initial?.name ?? "");
  const [subtitle, setSubtitle] = useState(initial?.subtitle ?? "");
  const [accent, setAccent] = useState<string>(initial?.accent ?? "primary");
  const [muscleGroups, setMuscleGroups] = useState<MuscleGroup[]>(
    (initial?.muscleGroups ?? []) as MuscleGroup[],
  );
  const [exercises, setExercises] = useState<string[]>(initial?.exercises ?? []);

  const toggleMG = (g: MuscleGroup) =>
    setMuscleGroups((cur) =>
      cur.includes(g) ? cur.filter((x) => x !== g) : [...cur, g],
    );

  const moveEx = (i: number, dir: -1 | 1) => {
    setExercises((arr) => {
      const next = [...arr];
      const j = i + dir;
      if (j < 0 || j >= next.length) return arr;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  };

  const removeEx = (i: number) =>
    setExercises((arr) => arr.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-4">
      <div className="glass space-y-4 rounded-2xl p-4">
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Split name
          </label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Push Day"
            maxLength={60}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Subtitle
          </label>
          <Input
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
            placeholder="e.g. Chest · Shoulders · Triceps"
            maxLength={120}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Color accent
          </label>
          <div className="flex flex-wrap gap-2">
            {ACCENT_OPTIONS.map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => setAccent(a)}
                className="flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-all"
                style={{
                  borderColor: accent === a ? `var(--${a})` : "var(--border)",
                  backgroundColor:
                    accent === a
                      ? `color-mix(in oklab, var(--${a}) 20%, transparent)`
                      : "transparent",
                  color: accent === a ? `var(--${a})` : "var(--muted-foreground)",
                }}
              >
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: `var(--${a})` }}
                />
                {a}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Muscle groups targeted
          </label>
          <div className="flex flex-wrap gap-1.5">
            {MUSCLE_GROUPS.map((g) => {
              const on = muscleGroups.includes(g);
              return (
                <button
                  key={g}
                  type="button"
                  onClick={() => toggleMG(g)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-semibold transition-all",
                    on
                      ? "border-primary bg-primary/15 text-primary"
                      : "border-border text-muted-foreground hover:text-foreground",
                  )}
                >
                  {g}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="glass rounded-2xl p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Exercises ({exercises.length})
          </div>
        </div>

        {exercises.length > 0 && (
          <ul className="mb-3 space-y-2">
            {exercises.map((ex, i) => (
              <li
                key={`${ex}-${i}`}
                className="flex items-center gap-2 rounded-lg border border-border bg-background/50 p-2"
              >
                <div className="flex flex-col">
                  <button
                    type="button"
                    onClick={() => moveEx(i, -1)}
                    className="text-muted-foreground hover:text-foreground"
                    aria-label="Move up"
                  >
                    <GripVertical className="h-4 w-4 rotate-90" />
                  </button>
                </div>
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-bold tabular-nums text-muted-foreground">
                  {i + 1}
                </div>
                <ExerciseThumb name={ex} size={48} />
                <div className="min-w-0 flex-1 truncate text-sm font-semibold">{ex}</div>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => removeEx(i)}
                  aria-label="Remove"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}

        <ExercisePicker selected={exercises} onChange={setExercises} />
      </div>

      <div
        className="fixed inset-x-0 z-30 glass-strong border-t border-border/60"
        style={{ bottom: "calc(64px + env(safe-area-inset-bottom))" }}
      >
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <div className="text-sm text-muted-foreground">{exercises.length} exercises</div>
          <Button
            size="lg"
            className="font-bold shadow-[var(--shadow-glow)]"
            disabled={saving}
            onClick={() =>
              onSubmit({
                name: name.trim(),
                subtitle: subtitle.trim(),
                accent,
                muscleGroups,
                exercises,
              })
            }
          >
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Saving…" : submitLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
