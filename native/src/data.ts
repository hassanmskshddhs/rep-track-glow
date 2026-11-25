import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "./supabase";

export type CustomDay = {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  name: string;
  subtitle: string | null;
  accent: string | null;
  muscle_groups: string[];
  exercises: string[];
};

export type WorkoutSession = {
  id: string;
  user_id: string;
  day: string;
  title: string | null;
  performed_at: string;
};

export type SetLogRow = {
  id: string;
  session_id: string;
  exercise_name: string;
  set_number: number;
  weight: number | null;
  reps: number | null;
};

// Same defaults as the web app (src/lib/db.ts INITIAL_CUSTOM_DAYS)
export const DEFAULT_DAYS: CustomDay[] = [
  {
    id: "push",
    user_id: "local",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    name: "Push",
    subtitle: "Chest · Shoulders · Triceps",
    accent: "push",
    muscle_groups: ["Chest", "Shoulders", "Triceps"],
    exercises: [
      "Incline DB Press",
      "Bar Flat Machine Press",
      "Decline Machine Fly (Panatta)",
      "DB Lateral Raise",
      "Front Rope Raise",
      "Cable Extension",
      "V-Grip Overhead Extension",
    ],
  },
  {
    id: "pull",
    user_id: "local",
    created_at: "2026-01-02T00:00:00.000Z",
    updated_at: "2026-01-02T00:00:00.000Z",
    name: "Pull",
    subtitle: "Back · Biceps · Rear Delts",
    accent: "pull",
    muscle_groups: ["Back", "Biceps", "Shoulders"],
    exercises: [
      "Seated Low Row",
      "Lat Pulldown Wide Grip",
      "Straight Arm Pulldown",
      "Cable Face-away Curl",
      "DB Hammer Curl",
      "Reverse Pec Fly",
      "Back Extension",
    ],
  },
  {
    id: "legs",
    user_id: "local",
    created_at: "2026-01-03T00:00:00.000Z",
    updated_at: "2026-01-03T00:00:00.000Z",
    name: "Legs + Abs",
    subtitle: "Quads · Hams · Calves · Core",
    accent: "legs",
    muscle_groups: ["Quads", "Hamstrings", "Glutes", "Calves", "Core"],
    exercises: [
      "Leg Extension",
      "Super Hack Squat",
      "Seated Leg Curl",
      "Adduction",
      "Abduction",
      "Standing Calf Raise Machine",
      "Hanging Leg Raise",
      "Abdominal Machine",
      "Plank",
    ],
  },
  {
    id: "upper",
    user_id: "local",
    created_at: "2026-01-04T00:00:00.000Z",
    updated_at: "2026-01-04T00:00:00.000Z",
    name: "Upper",
    subtitle: "Full Upper Body",
    accent: "upper",
    muscle_groups: ["Chest", "Back", "Shoulders", "Biceps", "Triceps"],
    exercises: [
      "Seated DB Shoulder Press",
      "Machine Lateral Raise",
      "Incline Bar Smith Machine",
      "Pec Fly",
      "Seated Row Machine Wide Grip",
      "Pull-ups Neutral Grip",
      "EZ Bar Pushdown",
      "Preacher Curl",
      "Shrugs (Multi)",
    ],
  },
];

const LOCAL_KEY = "ironlog_custom_days";

async function getLocalDays(): Promise<CustomDay[]> {
  try {
    const raw = await AsyncStorage.getItem(LOCAL_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    /* fall through */
  }
  return DEFAULT_DAYS;
}

export async function getCustomDays(userId: string | undefined): Promise<CustomDay[]> {
  const local = await getLocalDays();
  if (userId) {
    try {
      const { data, error } = await supabase
        .from("custom_workout_days")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: true });
      if (!error && data && data.length > 0) {
        const remote = data as CustomDay[];
        const remoteIds = new Set(remote.map((d) => d.id));
        const merged = [...remote, ...local.filter((d) => !remoteIds.has(d.id))];
        await AsyncStorage.setItem(LOCAL_KEY, JSON.stringify(merged));
        return merged.sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
        );
      }
    } catch {
      /* offline: use local */
    }
  }
  return local.sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
}

export async function getRecentSessions(
  userId: string | undefined,
  sinceDays = 7,
): Promise<WorkoutSession[]> {
  if (!userId) return [];
  const since = new Date();
  since.setDate(since.getDate() - sinceDays);
  try {
    const { data, error } = await supabase
      .from("workout_sessions")
      .select("id,user_id,day,title,performed_at")
      .eq("user_id", userId)
      .gte("performed_at", since.toISOString())
      .order("performed_at", { ascending: false });
    if (!error && data) return data as WorkoutSession[];
  } catch {
    /* offline */
  }
  return [];
}

export async function getLastSessionDayId(userId: string | undefined): Promise<string | null> {
  if (!userId) return null;
  try {
    const { data, error } = await supabase
      .from("workout_sessions")
      .select("day")
      .eq("user_id", userId)
      .order("performed_at", { ascending: false })
      .limit(1);
    if (!error && data && data.length > 0) return (data[0] as { day: string | null }).day;
  } catch {
    /* offline */
  }
  return null;
}

export type SetRowInput = {
  exercise_name: string;
  set_number: number;
  weight: number | null;
  reps: number | null;
};

function uuidv4(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Mirrors the web app's save path (offline-queue pushWorkout):
// one workout_sessions row, then its set_logs rows.
export async function saveWorkoutSession(
  userId: string,
  dayId: string,
  title: string,
  rows: SetRowInput[],
): Promise<void> {
  const sessionId = uuidv4();
  const performedAt = new Date().toISOString();
  const { error: sErr } = await supabase.from("workout_sessions").insert({
    id: sessionId,
    user_id: userId,
    day: dayId,
    title,
    performed_at: performedAt,
  });
  if (sErr) throw sErr;
  if (rows.length > 0) {
    const { error: lErr } = await supabase.from("set_logs").insert(
      rows.map((r) => ({
        id: uuidv4(),
        user_id: userId,
        session_id: sessionId,
        exercise_name: r.exercise_name,
        set_number: r.set_number,
        weight: r.weight,
        reps: r.reps,
        created_at: performedAt,
      })),
    );
    if (lErr) throw lErr;
  }
}

// --- History ---

export type SessionWithSets = WorkoutSession & { sets: SetLogRow[] };

// Mirrors the web history page: latest 100 sessions + their set_logs.
export async function getHistorySessions(
  userId: string | undefined,
): Promise<SessionWithSets[]> {
  if (!userId) return [];
  try {
    const { data: sessions, error: sErr } = await supabase
      .from("workout_sessions")
      .select("id,user_id,day,title,performed_at")
      .eq("user_id", userId)
      .order("performed_at", { ascending: false })
      .limit(100);
    if (sErr || !sessions || sessions.length === 0) return [];
    const ids = sessions.map((s) => s.id as string);
    const { data: logs, error: lErr } = await supabase
      .from("set_logs")
      .select("id,session_id,exercise_name,set_number,weight,reps")
      .eq("user_id", userId)
      .in("session_id", ids)
      .order("set_number", { ascending: true });
    if (lErr) return sessions.map((s) => ({ ...(s as WorkoutSession), sets: [] }));
    const rows = (logs ?? []) as SetLogRow[];
    return (sessions as WorkoutSession[]).map((s) => ({
      ...s,
      sets: rows.filter((r) => r.session_id === s.id),
    }));
  } catch {
    return [];
  }
}

export async function updateSessionTitle(
  id: string,
  title: string | null,
  userId: string,
): Promise<void> {
  const { error } = await supabase
    .from("workout_sessions")
    .update({ title })
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function deleteSessionAndLogs(id: string, userId: string): Promise<void> {
  const { error: lErr } = await supabase
    .from("set_logs")
    .delete()
    .eq("session_id", id)
    .eq("user_id", userId);
  if (lErr) throw lErr;
  const { error: sErr } = await supabase
    .from("workout_sessions")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  if (sErr) throw sErr;
}

// --- Progress ---

export type ProgressOverview = {
  workoutsThisMonth: number;
  workoutsDiff: number;
  volumeThisMonth: number;
  volumeDiffPct: number;
  volumeUp: boolean;
  prsThisMonth: number;
  currentStreak: number;
  longestStreak: number;
};

export type PRRecord = { ex: string; weight: number; prev: number; date: string };

export type ProgressData = {
  overview: ProgressOverview;
  prs: PRRecord[];
  weeklyVolume: { w: string; val: number }[];
  exerciseHistory: Record<string, { date: string; val: number }[]>;
  uniqueExercises: string[];
};

function sameMonth(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

function dayKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

const MONTHS_CHART = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

// Mirrors the web useProgressData hook: same month buckets, streaks,
// weekly volume and PR detection, computed from the same tables.
export async function getProgressData(userId: string | undefined): Promise<ProgressData | null> {
  if (!userId) return null;
  try {
    const { data: sessions, error: sErr } = await supabase
      .from("workout_sessions")
      .select("id,performed_at")
      .eq("user_id", userId)
      .order("performed_at", { ascending: true })
      .limit(500);
    if (sErr || !sessions) return null;
    const ids = sessions.map((s) => s.id as string);
    let sets: { exercise_name: string; weight: number | null; reps: number | null; created_at: string }[] = [];
    if (ids.length > 0) {
      const { data: logs, error: lErr } = await supabase
        .from("set_logs")
        .select("exercise_name,weight,reps,created_at")
        .eq("user_id", userId)
        .in("session_id", ids)
        .order("created_at", { ascending: true });
      if (!lErr && logs) sets = logs;
    }

    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    let workoutsThisMonth = 0;
    let workoutsLastMonth = 0;
    const sessionDays: string[] = [];
    for (const s of sessions) {
      const d = new Date(s.performed_at as string);
      if (sameMonth(d, now)) workoutsThisMonth++;
      if (sameMonth(d, lastMonth)) workoutsLastMonth++;
      const k = dayKey(d);
      if (!sessionDays.includes(k)) sessionDays.push(k);
    }

    let currentStreak = 0;
    let longestStreak = 0;
    if (sessionDays.length > 0) {
      sessionDays.sort();
      let temp = 1;
      longestStreak = 1;
      for (let i = 1; i < sessionDays.length; i++) {
        const diff = Math.round(
          (new Date(sessionDays[i]).getTime() - new Date(sessionDays[i - 1]).getTime()) / 86400000,
        );
        if (diff === 1) {
          temp++;
          if (temp > longestStreak) longestStreak = temp;
        } else if (diff > 1) {
          temp = 1;
        }
      }
      const last = new Date(sessionDays[sessionDays.length - 1]);
      const todayMid = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      const diffToToday = Math.round((todayMid - last.getTime()) / 86400000);
      currentStreak = diffToToday <= 1 ? temp : 0;
    }

    let volumeThisMonth = 0;
    let volumeLastMonth = 0;
    const weeklyVolume: Record<string, number> = {};
    const maxWeights: Record<string, { weight: number; date: string }> = {};
    const newPRs: PRRecord[] = [];
    const exerciseHistory: Record<string, { date: string; val: number }[]> = {};
    const uniqueExercises = new Set<string>();

    for (const set of sets) {
      const date = new Date(set.created_at);
      const w = set.weight || 0;
      const r = set.reps || 0;
      const vol = w * r;
      uniqueExercises.add(set.exercise_name);

      if (sameMonth(date, now)) volumeThisMonth += vol;
      if (sameMonth(date, lastMonth)) volumeLastMonth += vol;

      const weekDiff = (now.getTime() - date.getTime()) / (7 * 86400000);
      if (weekDiff <= 4 && weekDiff >= 0) {
        const weekNum = 4 - Math.floor(weekDiff);
        const key = `W${weekNum}`;
        weeklyVolume[key] = (weeklyVolume[key] || 0) + vol;
      }

      const cur = maxWeights[set.exercise_name];
      if (!cur) {
        maxWeights[set.exercise_name] = { weight: w, date: set.created_at };
        if (sameMonth(date, now)) {
          newPRs.push({ ex: set.exercise_name, weight: w, prev: 0, date: set.created_at });
        }
      } else if (w > cur.weight) {
        if (sameMonth(date, now)) {
          newPRs.push({ ex: set.exercise_name, weight: w, prev: cur.weight, date: set.created_at });
        }
        maxWeights[set.exercise_name] = { weight: w, date: set.created_at };
      }

      const label = `${MONTHS_CHART[date.getMonth()]} ${date.getDate()}`;
      const arr = (exerciseHistory[set.exercise_name] ||= []);
      const existing = arr.find((h) => h.date === label);
      if (existing) {
        if (w > existing.val) existing.val = w;
      } else {
        arr.push({ date: label, val: w });
      }
    }

    newPRs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return {
      overview: {
        workoutsThisMonth,
        workoutsDiff: workoutsThisMonth - workoutsLastMonth,
        volumeThisMonth,
        volumeDiffPct:
          volumeLastMonth > 0
            ? Math.round(Math.abs(((volumeThisMonth - volumeLastMonth) / volumeLastMonth) * 100))
            : 0,
        volumeUp: volumeThisMonth >= volumeLastMonth,
        prsThisMonth: newPRs.length,
        currentStreak,
        longestStreak,
      },
      prs: newPRs,
      weeklyVolume: [
        { w: "W1", val: weeklyVolume["W1"] || 0 },
        { w: "W2", val: weeklyVolume["W2"] || 0 },
        { w: "W3", val: weeklyVolume["W3"] || 0 },
        { w: "W4", val: weeklyVolume["W4"] || 0 },
      ],
      exerciseHistory,
      uniqueExercises: Array.from(uniqueExercises),
    };
  } catch {
    return null;
  }
}

// --- Plan ---

// Same accent tokens as the web styles.css
export const ACCENT_COLORS: Record<string, string> = {
  push: "#c8f2cb",
  pull: "#aec7b4",
  legs: "#dfcca1",
  upper: "#ffb092",
  primary: "#c8f2cb",
};

// Same rules as the web getSplitAccent
export function getSplitAccent(
  name: string | null | undefined,
  muscleGroups: string[] | null | undefined,
  fallback = "primary",
): string {
  const n = (name ?? "").toLowerCase();
  const mgs = (muscleGroups ?? []).map((m) => m.toLowerCase());
  if (/\bpush\b/.test(n)) return "push";
  if (/\bpull\b/.test(n)) return "pull";
  if (/\b(leg|legs|lower|quad|hamstring|glute|calf|abs?)\b/.test(n)) return "legs";
  if (/\b(upper|arms?|shoulder|chest|back)\b/.test(n)) return "upper";
  const hasPush = ["chest", "triceps", "shoulders"].some((m) => mgs.includes(m));
  const hasPull = ["back", "biceps", "forearms"].some((m) => mgs.includes(m));
  const hasLegs = ["quads", "hamstrings", "glutes", "calves", "core"].some((m) =>
    mgs.includes(m),
  );
  if (hasLegs && !hasPush && !hasPull) return "legs";
  if (hasPush && !hasPull) return "push";
  if (hasPull && !hasPush) return "pull";
  return fallback || "primary";
}

export async function deleteCustomDay(id: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from("custom_workout_days")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw error;
}

// --- Split editor ---

export async function createCustomDay(
  userId: string,
  data: {
    name: string;
    subtitle: string | null;
    accent: string;
    muscle_groups: string[];
    exercises: string[];
  },
): Promise<{ id: string }> {
  const id = uuidv4();
  const now = new Date().toISOString();
  const { error } = await supabase.from("custom_workout_days").insert({
    id,
    user_id: userId,
    created_at: now,
    updated_at: now,
    ...data,
  });
  if (error) throw error;
  return { id };
}

export async function updateCustomDay(
  id: string,
  userId: string,
  data: Partial<{
    name: string;
    subtitle: string | null;
    accent: string;
    muscle_groups: string[];
    exercises: string[];
  }>,
): Promise<void> {
  const { error } = await supabase
    .from("custom_workout_days")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw error;
}

// --- Day detail: per-exercise insights and notes ---

export type LastSetEntry = { weight: number | null; reps: number | null; set_number: number };
export type ExerciseInsight = { lastSets: LastSetEntry[]; bestWeight: number | null };

// Mirrors the web buildInsights: for each exercise, the most recent session's
// sets and the all-time best weight.
export async function getExerciseInsights(
  userId: string | undefined,
  exercises: string[],
): Promise<Record<string, ExerciseInsight>> {
  const out: Record<string, ExerciseInsight> = {};
  if (!userId || exercises.length === 0) return out;
  try {
    const { data, error } = await supabase
      .from("set_logs")
      .select("session_id,exercise_name,set_number,weight,reps,created_at")
      .eq("user_id", userId)
      .in("exercise_name", exercises)
      .order("created_at", { ascending: false })
      .limit(800);
    if (error || !data) return out;
    for (const ex of exercises) {
      const exRows = data.filter((r) => r.exercise_name === ex);
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
  } catch {
    /* offline */
  }
  return out;
}

export async function getExerciseNotes(
  userId: string | undefined,
  exercises: string[],
): Promise<Record<string, string>> {
  const map: Record<string, string> = {};
  if (!userId || exercises.length === 0) return map;
  try {
    const { data, error } = await supabase
      .from("exercise_notes")
      .select("exercise_name,note")
      .eq("user_id", userId)
      .in("exercise_name", exercises);
    if (!error && data) {
      for (const r of data) map[r.exercise_name as string] = (r.note as string) ?? "";
    }
  } catch {
    /* offline */
  }
  return map;
}

export async function saveExerciseNote(
  userId: string,
  exerciseName: string,
  note: string,
): Promise<void> {
  const trimmed = note.trim();
  if (!trimmed) {
    const { error } = await supabase
      .from("exercise_notes")
      .delete()
      .eq("user_id", userId)
      .eq("exercise_name", exerciseName);
    if (error) throw error;
    return;
  }
  const { error } = await supabase.from("exercise_notes").upsert(
    {
      user_id: userId,
      exercise_name: exerciseName,
      note: trimmed,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,exercise_name" },
  );
  if (error) throw error;
}
