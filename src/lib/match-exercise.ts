import { EXERCISE_DB, MUSCLE_GROUPS, type MuscleGroup } from "@/lib/exercises";

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const STOP = new Set(["the", "a", "of", "with", "and", "for", "on", "in"]);

const tokens = (s: string) => norm(s).split(" ").filter((t) => t && !STOP.has(t));

/**
 * Map a free-text exercise name onto the app's internal exercise library.
 * Falls back to the original name when nothing scores well enough.
 */
export function matchExercise(input: string): { name: string; matched: boolean } {
  const target = norm(input);
  if (!target) return { name: input, matched: false };

  for (const e of EXERCISE_DB) {
    if (norm(e.name) === target) return { name: e.name, matched: true };
  }

  const tt = tokens(input);
  let best: { name: string; score: number } | null = null;
  for (const e of EXERCISE_DB) {
    const et = tokens(e.name);
    const overlap = tt.filter((t) => et.includes(t)).length;
    if (overlap === 0) continue;
    const score = (2 * overlap) / (tt.length + et.length);
    if (!best || score > best.score) best = { name: e.name, score };
  }
  if (best && best.score >= 0.5) return { name: best.name, matched: true };
  return { name: input, matched: false };
}

export function normalizeMuscleGroups(input: string[]): MuscleGroup[] {
  const out: MuscleGroup[] = [];
  for (const raw of input) {
    const hit = MUSCLE_GROUPS.find((g) => norm(g) === norm(raw));
    if (hit && !out.includes(hit)) out.push(hit);
  }
  return out;
}

export function musclesForExercises(names: string[]): MuscleGroup[] {
  const out: MuscleGroup[] = [];
  for (const n of names) {
    const e = EXERCISE_DB.find((x) => x.name === n);
    for (const m of e?.muscles ?? []) if (!out.includes(m)) out.push(m);
  }
  return out;
}
