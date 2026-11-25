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
  day_id: string | null;
  performed_at: string;
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
      .select("id,user_id,day_id,performed_at")
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
      .select("day_id")
      .eq("user_id", userId)
      .order("performed_at", { ascending: false })
      .limit(1);
    if (!error && data && data.length > 0) return (data[0] as { day_id: string | null }).day_id;
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
