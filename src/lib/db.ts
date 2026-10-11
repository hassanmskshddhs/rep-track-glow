import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { v4 as uuidv4 } from "uuid";
import { DEFAULT_BUILTIN_DAYS } from "@/lib/exercises";

export type CustomDay = Database["public"]["Tables"]["custom_workout_days"]["Row"];
export type WorkoutSession = Database["public"]["Tables"]["workout_sessions"]["Row"];
export type SetLog = Database["public"]["Tables"]["set_logs"]["Row"];

export const INITIAL_CUSTOM_DAYS: CustomDay[] = [
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

function getLocal<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function setLocal<T>(key: string, data: T[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error(`Error saving to localStorage key "${key}":`, e);
  }
}

export function resetToDefaultDays(): CustomDay[] {
  setLocal("ironlog_custom_days", INITIAL_CUSTOM_DAYS);
  return INITIAL_CUSTOM_DAYS;
}

// ----------------------------------------------------------------------------
// Custom Days
// ----------------------------------------------------------------------------

export async function getCustomDays(userId: string | undefined): Promise<CustomDay[]> {
  let local = getLocal<CustomDay>("ironlog_custom_days");
  if (!local || local.length === 0) {
    local = resetToDefaultDays();
  }

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
        setLocal("ironlog_custom_days", merged);
        return merged.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      }
    } catch (e) {
      console.warn("Supabase getCustomDays failed, using local storage:", e);
    }
  }

  return local.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
}

export async function createCustomDay(
  data: Partial<CustomDay>,
  userId: string | undefined
): Promise<{ id: string }> {
  const local = getLocal<CustomDay>("ironlog_custom_days");
  const id = data.id || uuidv4();
  const now = new Date().toISOString();
  const newDay: CustomDay = {
    ...data,
    id,
    user_id: userId || "local",
    created_at: data.created_at || now,
    updated_at: now,
    name: data.name!,
    subtitle: data.subtitle || null,
    accent: data.accent || "primary",
    exercises: data.exercises || [],
    muscle_groups: data.muscle_groups || [],
  };

  setLocal("ironlog_custom_days", [...local, newDay]);

  if (userId) {
    try {
      await supabase
        .from("custom_workout_days")
        .insert({ ...data, id, user_id: userId } as any);
    } catch (e) {
      console.warn("Supabase createCustomDay sync failed:", e);
    }
  }

  return { id };
}

export async function updateCustomDay(
  id: string,
  data: Partial<CustomDay>,
  userId: string | undefined
): Promise<void> {
  const local = getLocal<CustomDay>("ironlog_custom_days");
  const idx = local.findIndex((d) => d.id === id);
  if (idx !== -1) {
    local[idx] = { ...local[idx], ...data, updated_at: new Date().toISOString() };
    setLocal("ironlog_custom_days", local);
  }

  if (userId) {
    try {
      await supabase
        .from("custom_workout_days")
        .update(data as any)
        .eq("id", id)
        .eq("user_id", userId);
    } catch (e) {
      console.warn("Supabase updateCustomDay sync failed:", e);
    }
  }
}

export async function deleteCustomDay(id: string, userId: string | undefined): Promise<void> {
  const local = getLocal<CustomDay>("ironlog_custom_days");
  setLocal("ironlog_custom_days", local.filter((d) => d.id !== id));

  if (userId) {
    try {
      await supabase
        .from("custom_workout_days")
        .delete()
        .eq("id", id)
        .eq("user_id", userId);
    } catch (e) {
      console.warn("Supabase deleteCustomDay sync failed:", e);
    }
  }
}

export async function getCustomDayById(
  id: string,
  userId: string | undefined
): Promise<CustomDay | null> {
  const local = getLocal<CustomDay>("ironlog_custom_days");
  const found = local.find((d) => d.id === id);
  if (found) return found;

  // Fallback to built-in days if exists
  if (DEFAULT_BUILTIN_DAYS[id]) {
    const builtin = DEFAULT_BUILTIN_DAYS[id];
    return {
      id,
      user_id: "local",
      created_at: new Date(2026, 0, 1).toISOString(),
      updated_at: new Date(2026, 0, 1).toISOString(),
      name: builtin.name,
      subtitle: builtin.subtitle,
      accent: builtin.accent,
      exercises: builtin.exercises,
      muscle_groups: builtin.muscle_groups || [],
    };
  }

  if (userId) {
    try {
      const { data, error } = await supabase
        .from("custom_workout_days")
        .select("*")
        .eq("id", id)
        .eq("user_id", userId)
        .maybeSingle();
      if (!error && data) return data as CustomDay;
    } catch (e) {
      console.warn("Supabase getCustomDayById failed:", e);
    }
  }

  return null;
}

// ----------------------------------------------------------------------------
// Workout Sessions
// ----------------------------------------------------------------------------

export async function getRecentSessions(
  userId: string | undefined,
  sinceISO?: string
): Promise<WorkoutSession[]> {
  const local = getLocal<WorkoutSession>("ironlog_workout_sessions");

  if (userId) {
    try {
      let q = supabase
        .from("workout_sessions")
        .select("*")
        .eq("user_id", userId)
        .order("performed_at", { ascending: false })
        .limit(100);
      if (sinceISO) {
        q = q.gte("performed_at", sinceISO);
      }
      const { data, error } = await q;
      if (!error && data && data.length > 0) {
        const remote = data as WorkoutSession[];
        const remoteIds = new Set(remote.map((s) => s.id));
        const merged = [...remote, ...local.filter((s) => !remoteIds.has(s.id))];
        setLocal("ironlog_workout_sessions", merged);
        return merged
          .filter((s) => !sinceISO || new Date(s.performed_at) >= new Date(sinceISO))
          .sort((a, b) => new Date(b.performed_at).getTime() - new Date(a.performed_at).getTime())
          .slice(0, 100);
      }
    } catch (e) {
      console.warn("Supabase getRecentSessions failed, using local:", e);
    }
  }

  let filtered = local;
  if (sinceISO) {
    filtered = filtered.filter((s) => new Date(s.performed_at) >= new Date(sinceISO));
  }
  return filtered
    .sort((a, b) => new Date(b.performed_at).getTime() - new Date(a.performed_at).getTime())
    .slice(0, 100);
}

export async function getAllSessionsWithDays(
  userId: string | undefined
): Promise<(WorkoutSession & { custom_workout_days: { name: string } | null })[]> {
  const sessions = getLocal<WorkoutSession>("ironlog_workout_sessions");
  const days = getLocal<CustomDay>("ironlog_custom_days");

  if (userId) {
    try {
      const { data, error } = await supabase
        .from("workout_sessions")
        .select("id, day, title, notes, performed_at, custom_workout_days(name)")
        .eq("user_id", userId)
        .order("performed_at", { ascending: false });
      if (!error && data && data.length > 0) {
        return data as any;
      }
    } catch (e) {
      console.warn("Supabase getAllSessionsWithDays failed, using local:", e);
    }
  }

  return sessions
    .map((s) => {
      const dayConfig = days.find((d) => d.id === s.day) || (DEFAULT_BUILTIN_DAYS[s.day] ? { name: DEFAULT_BUILTIN_DAYS[s.day].name } : null);
      return {
        ...s,
        custom_workout_days: dayConfig ? { name: dayConfig.name } : null,
      };
    })
    .sort((a, b) => new Date(b.performed_at).getTime() - new Date(a.performed_at).getTime());
}

export async function createSession(data: Partial<WorkoutSession>, userId: string | undefined): Promise<void> {
  const local = getLocal<WorkoutSession>("ironlog_workout_sessions");
  const newSession: WorkoutSession = {
    ...data,
    id: data.id || uuidv4(),
    user_id: userId || "local",
    created_at: new Date().toISOString(),
    day: data.day!,
    performed_at: data.performed_at!,
    title: data.title || null,
    notes: data.notes || null,
  };
  setLocal("ironlog_workout_sessions", [newSession, ...local]);

  if (userId) {
    try {
      await supabase
        .from("workout_sessions")
        .insert({ ...newSession, user_id: userId } as any);
    } catch (e) {
      console.warn("Supabase createSession sync failed:", e);
    }
  }
}

export async function updateSession(
  id: string,
  data: Partial<WorkoutSession>,
  userId: string | undefined
): Promise<void> {
  const local = getLocal<WorkoutSession>("ironlog_workout_sessions");
  const idx = local.findIndex((s) => s.id === id);
  if (idx !== -1) {
    local[idx] = { ...local[idx], ...data };
    setLocal("ironlog_workout_sessions", local);
  }

  if (userId) {
    try {
      await supabase
        .from("workout_sessions")
        .update(data as any)
        .eq("id", id)
        .eq("user_id", userId);
    } catch (e) {
      console.warn("Supabase updateSession sync failed:", e);
    }
  }
}

export async function deleteSessionAndLogs(id: string, userId: string | undefined): Promise<void> {
  const sessions = getLocal<WorkoutSession>("ironlog_workout_sessions");
  setLocal("ironlog_workout_sessions", sessions.filter((s) => s.id !== id));
  
  const logs = getLocal<SetLog>("ironlog_set_logs");
  setLocal("ironlog_set_logs", logs.filter((l) => l.session_id !== id));

  if (userId) {
    try {
      await supabase.from("set_logs").delete().eq("session_id", id).eq("user_id", userId);
      await supabase.from("workout_sessions").delete().eq("id", id).eq("user_id", userId);
    } catch (e) {
      console.warn("Supabase deleteSessionAndLogs sync failed:", e);
    }
  }
}

// ----------------------------------------------------------------------------
// Set Logs
// ----------------------------------------------------------------------------

export async function getSetLogsBySessions(
  sessionIds: string[],
  userId: string | undefined
): Promise<SetLog[]> {
  if (sessionIds.length === 0) return [];
  const local = getLocal<SetLog>("ironlog_set_logs").filter((l) => sessionIds.includes(l.session_id));
  
  if (userId) {
    try {
      const { data, error } = await supabase
        .from("set_logs")
        .select("*")
        .eq("user_id", userId)
        .in("session_id", sessionIds)
        .order("set_number", { ascending: true });
      
      if (!error && data && data.length > 0) {
        const remote = data as SetLog[];
        const remoteIds = new Set(remote.map((l) => l.id));
        const merged = [...remote, ...local.filter((l) => !remoteIds.has(l.id))];
        return merged.sort((a, b) => a.set_number - b.set_number);
      }
    } catch (e) {
      console.warn("Supabase getSetLogsBySessions failed, using local:", e);
    }
  }

  return local.sort((a, b) => a.set_number - b.set_number);
}

export async function getExerciseHistory(
  exerciseName: string,
  sinceISO: string,
  userId: string | undefined
): Promise<SetLog[]> {
  const local = getLocal<SetLog>("ironlog_set_logs");
  const filtered = local
    .filter((l) => l.exercise_name === exerciseName && new Date(l.created_at) >= new Date(sinceISO))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  if (userId) {
    try {
      const { data, error } = await supabase
        .from("set_logs")
        .select("id, session_id, exercise_name, set_number, weight, reps, created_at")
        .eq("user_id", userId)
        .eq("exercise_name", exerciseName)
        .gte("created_at", sinceISO)
        .order("created_at", { ascending: false });
      if (!error && data && data.length > 0) {
        return data as SetLog[];
      }
    } catch (e) {
      console.warn("Supabase getExerciseHistory failed, using local:", e);
    }
  }

  return filtered;
}

export async function getExerciseHistoryForExercises(
  exercises: string[],
  userId: string | undefined
): Promise<SetLog[]> {
  if (exercises.length === 0) return [];
  const local = getLocal<SetLog>("ironlog_set_logs").filter((l) => exercises.includes(l.exercise_name));
  
  if (userId) {
    try {
      const { data, error } = await supabase
        .from("set_logs")
        .select("*")
        .eq("user_id", userId)
        .in("exercise_name", exercises)
        .order("created_at", { ascending: false })
        .limit(800);
      
      if (!error && data && data.length > 0) {
        const remote = data as SetLog[];
        const remoteIds = new Set(remote.map((l) => l.id));
        const merged = [...remote, ...local.filter((l) => !remoteIds.has(l.id))];
        return merged
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 800);
      }
    } catch (e) {
      console.warn("Supabase getExerciseHistoryForExercises failed, using local:", e);
    }
  }

  return local
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 800);
}

export async function replaceSessionLogs(
  sessionId: string,
  logs: Partial<SetLog>[],
  userId: string | undefined
): Promise<void> {
  const local = getLocal<SetLog>("ironlog_set_logs");
  const filtered = local.filter(l => l.session_id !== sessionId);
  const newLogs: SetLog[] = logs.map(l => ({
    ...l,
    id: l.id || uuidv4(),
    user_id: userId || "local",
    session_id: sessionId,
    created_at: l.created_at || new Date().toISOString(),
    exercise_name: l.exercise_name!,
    set_number: l.set_number!,
    weight: l.weight ?? null,
    reps: l.reps ?? null,
  } as SetLog));
  setLocal("ironlog_set_logs", [...filtered, ...newLogs]);

  if (userId) {
    try {
      await supabase.from("set_logs").delete().eq("session_id", sessionId).eq("user_id", userId);
      if (logs.length > 0) {
        const inserts = newLogs.map(l => ({ ...l, user_id: userId, session_id: sessionId }));
        await supabase.from("set_logs").insert(inserts as any);
      }
    } catch (e) {
      console.warn("Supabase replaceSessionLogs sync failed:", e);
    }
  }
}

export async function appendSessionLogs(
  sessionId: string,
  logs: Partial<SetLog>[],
  userId: string | undefined
): Promise<void> {
  if (logs.length === 0) return;
  const local = getLocal<SetLog>("ironlog_set_logs");
  const newLogs: SetLog[] = logs.map(l => ({
    ...l,
    id: l.id || uuidv4(),
    user_id: userId || "local",
    session_id: sessionId,
    created_at: l.created_at || new Date().toISOString(),
    exercise_name: l.exercise_name!,
    set_number: l.set_number!,
    weight: l.weight ?? null,
    reps: l.reps ?? null,
  } as SetLog));
  setLocal("ironlog_set_logs", [...local, ...newLogs]);

  if (userId) {
    try {
      const inserts = newLogs.map(l => ({ ...l, user_id: userId, session_id: sessionId }));
      await supabase.from("set_logs").insert(inserts as any);
    } catch (e) {
      console.warn("Supabase appendSessionLogs sync failed:", e);
    }
  }
}

// ----------------------------------------------------------------------------
// Exercise Notes
// ----------------------------------------------------------------------------

export async function getExerciseNotes(
  exercises: string[],
  userId: string | undefined
): Promise<{ exercise_name: string; note: string }[]> {
  if (exercises.length === 0) return [];
  const local = getLocal<{ exercise_name: string; note: string }>("ironlog_exercise_notes")
    .filter((n) => exercises.includes(n.exercise_name));
    
  if (userId) {
    try {
      const { data, error } = await supabase
        .from("exercise_notes")
        .select("exercise_name, note")
        .eq("user_id", userId)
        .in("exercise_name", exercises);
      if (!error && data && data.length > 0) {
        const remoteEx = new Set(data.map((r) => r.exercise_name));
        return [...data, ...local.filter((l) => !remoteEx.has(l.exercise_name))];
      }
    } catch (e) {
      console.warn("Supabase getExerciseNotes failed, using local:", e);
    }
  }

  return local;
}

export async function saveExerciseNote(
  exerciseName: string,
  note: string,
  userId: string | undefined
): Promise<void> {
  const local = getLocal<{ exercise_name: string; note: string; updated_at: string }>("ironlog_exercise_notes");
  const idx = local.findIndex((n) => n.exercise_name === exerciseName);
  const newNote = { exercise_name: exerciseName, note, updated_at: new Date().toISOString() };
  if (idx !== -1) {
    local[idx] = newNote;
  } else {
    local.push(newNote);
  }
  setLocal("ironlog_exercise_notes", local);

  if (userId) {
    try {
      await supabase
        .from("exercise_notes")
        .upsert(
          { user_id: userId, exercise_name: exerciseName, note, updated_at: new Date().toISOString() },
          { onConflict: "user_id,exercise_name" }
        );
    } catch (e) {
      console.warn("Supabase saveExerciseNote sync failed:", e);
    }
  }
}

// ----------------------------------------------------------------------------
// Optional Cloud Backup (Never wipes local data)
// ----------------------------------------------------------------------------

export async function migrateLocalDataToSupabase(userId: string) {
  try {
    const customDays = getLocal<CustomDay>("ironlog_custom_days");
    const sessions = getLocal<WorkoutSession>("ironlog_workout_sessions");
    const logs = getLocal<SetLog>("ironlog_set_logs");
    const notes = getLocal<{ exercise_name: string; note: string; updated_at: string }>("ironlog_exercise_notes");

    if (customDays.length > 0) {
      const inserts = customDays.map(d => ({ ...d, user_id: userId }));
      await supabase.from("custom_workout_days").upsert(inserts as any);
    }

    if (sessions.length > 0) {
      const inserts = sessions.map(s => ({ ...s, user_id: userId }));
      await supabase.from("workout_sessions").upsert(inserts as any);
    }

    if (logs.length > 0) {
      const inserts = logs.map(l => ({ ...l, user_id: userId }));
      await supabase.from("set_logs").upsert(inserts as any);
    }

    if (notes.length > 0) {
      const inserts = notes.map(n => ({ ...n, user_id: userId }));
      await supabase.from("exercise_notes").upsert(inserts as any);
    }
  } catch (e) {
    console.warn("Cloud backup notice:", e);
  }
}
