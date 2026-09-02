/**
 * Data-access layer for workout data.
 *
 * UI components never call Supabase directly for workout data — they use these
 * hooks. Every query is scoped to the signed-in user twice over: RLS on the
 * server and an explicit `user_id` filter here, so a bug in one layer can never
 * expose another athlete's logs.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { qk } from "@/lib/query-keys";
import type {
  ExerciseInsight,
  LoggedSetRow,
  WorkoutSplit,
  WorkoutSplitSummary,
} from "@/types/workout";

/** All splits owned by the signed-in user. */
export function useSplits() {
  const { user } = useAuth();
  return useQuery({
    queryKey: qk.splits(user?.id),
    enabled: !!user,
    queryFn: async (): Promise<WorkoutSplit[]> => {
      const { data, error } = await supabase
        .from("custom_workout_days")
        .select("id, name, subtitle, accent, exercises, muscle_groups, created_at")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((d) => ({
        ...d,
        exercises: Array.isArray(d.exercises) ? (d.exercises as string[]) : [],
      }));
    },
  });
}

/** Compact split list for tab bars. */
export function useSplitSummaries() {
  const { data, ...rest } = useSplits();
  const summaries: WorkoutSplitSummary[] = (data ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    accent: s.accent,
    muscle_groups: s.muscle_groups,
  }));
  return { data: summaries, ...rest };
}

/** One split by id, owned by the signed-in user. */
export function useSplit(splitId: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: qk.split(user?.id, splitId),
    enabled: !!user && !!splitId,
    queryFn: async (): Promise<WorkoutSplit | null> => {
      const { data, error } = await supabase
        .from("custom_workout_days")
        .select("id, name, subtitle, accent, exercises, muscle_groups, created_at")
        .eq("id", splitId)
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return {
        ...data,
        exercises: Array.isArray(data.exercises) ? (data.exercises as string[]) : [],
      };
    },
  });
}

/** Recent sets for the exercises of a split, used for targets and PR detection. */
export function useExerciseHistory(splitId: string, exercises: string[]) {
  const { user } = useAuth();
  return useQuery({
    queryKey: [...qk.historyWindow(user?.id, splitId), exercises.join("|")],
    enabled: !!user && exercises.length > 0,
    queryFn: async (): Promise<LoggedSetRow[]> => {
      const { data, error } = await supabase
        .from("set_logs")
        .select("exercise_name, weight, reps, set_number, session_id, created_at")
        .eq("user_id", user!.id)
        .in("exercise_name", exercises)
        .order("created_at", { ascending: false })
        .limit(800);
      if (error) throw error;
      return (data ?? []) as LoggedSetRow[];
    },
  });
}

/** Derives per-exercise "last session" sets and all-time best weight. */
export function buildInsights(
  exercises: string[],
  rows: LoggedSetRow[] | undefined,
): Record<string, ExerciseInsight> {
  const out: Record<string, ExerciseInsight> = {};
  for (const ex of exercises) {
    const exRows = (rows ?? []).filter((r) => r.exercise_name === ex);
    const latestSessionId = exRows[0]?.session_id ?? null;
    const lastSets = latestSessionId
      ? exRows
          .filter((r) => r.session_id === latestSessionId)
          .map((r) => ({ weight: r.weight, reps: r.reps, set_number: r.set_number }))
          .sort((a, b) => a.set_number - b.set_number)
      : [];
    const bestWeight = exRows.reduce<number | null>((max, r) => {
      if (r.weight == null) return max;
      return max == null || r.weight > max ? r.weight : max;
    }, null);
    out[ex] = { lastSets, bestWeight };
  }
  return out;
}

/** Persistent per-exercise training notes for the signed-in user. */
export function useExerciseNotes(splitId: string, exercises: string[]) {
  const { user } = useAuth();
  return useQuery({
    queryKey: [...qk.notes(user?.id, splitId), exercises.join("|")],
    enabled: !!user && exercises.length > 0,
    queryFn: async (): Promise<Record<string, string>> => {
      const { data, error } = await supabase
        .from("exercise_notes")
        .select("exercise_name, note")
        .eq("user_id", user!.id)
        .in("exercise_name", exercises);
      if (error) throw error;
      const map: Record<string, string> = {};
      (data ?? []).forEach((r) => { map[r.exercise_name] = r.note ?? ""; });
      return map;
    },
  });
}
