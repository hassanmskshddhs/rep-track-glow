import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { v4 as uuidv4 } from "uuid";

type CustomDay = Database["public"]["Tables"]["custom_workout_days"]["Row"];
type WorkoutSession = Database["public"]["Tables"]["workout_sessions"]["Row"];
type SetLog = Database["public"]["Tables"]["set_logs"]["Row"];

function getLocal<T>(key: string): T[] {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function setLocal<T>(key: string, data: T[]) {
  localStorage.setItem(key, JSON.stringify(data));
}

// ----------------------------------------------------------------------------
// Custom Days
// ----------------------------------------------------------------------------

export async function getCustomDays(userId: string | undefined): Promise<CustomDay[]> {
  const local = getLocal<CustomDay>("ironlog_custom_days");
  if (userId) {
    const { data, error } = await supabase
      .from("custom_workout_days")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: true });
    if (error) throw error;
    
    // Hybrid merge:
    const remote = (data ?? []) as CustomDay[];
    const remoteIds = new Set(remote.map((d) => d.id));
    const merged = [...remote, ...local.filter((d) => !remoteIds.has(d.id))];
    return merged.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  } else {
    return local.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }
}

export async function createCustomDay(
  data: Partial<CustomDay>,
  userId: string | undefined
): Promise<{ id: string }> {
  if (userId) {
    const { data: res, error } = await supabase
      .from("custom_workout_days")
      .insert({ ...data, user_id: userId } as any)
      .select("id")
      .single();
    if (error) throw error;
    return res;
  } else {
    const local = getLocal<CustomDay>("ironlog_custom_days");
    const id = data.id || uuidv4();
    const newDay: CustomDay = {
      ...data,
      id,
      user_id: "local",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      name: data.name!,
      subtitle: data.subtitle || null,
      accent: data.accent || "primary",
      exercises: data.exercises || [],
      muscle_groups: data.muscle_groups || [],
    };
    setLocal("ironlog_custom_days", [...local, newDay]);
    return { id };
  }
}

export async function updateCustomDay(
  id: string,
  data: Partial<CustomDay>,
  userId: string | undefined
): Promise<void> {
  if (userId) {
    const { error } = await supabase
      .from("custom_workout_days")
      .update(data as any)
      .eq("id", id)
      .eq("user_id", userId);
    if (error) throw error;
  } else {
    const local = getLocal<CustomDay>("ironlog_custom_days");
    const idx = local.findIndex((d) => d.id === id);
    if (idx !== -1) {
      local[idx] = { ...local[idx], ...data, updated_at: new Date().toISOString() };
      setLocal("ironlog_custom_days", local);
    }
  }
}

export async function deleteCustomDay(id: string, userId: string | undefined): Promise<void> {
  if (userId) {
    const { error } = await supabase
      .from("custom_workout_days")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);
    if (error) throw error;
  } else {
    const local = getLocal<CustomDay>("ironlog_custom_days");
    setLocal("ironlog_custom_days", local.filter((d) => d.id !== id));
  }
}

export async function getCustomDayById(
  id: string,
  userId: string | undefined
): Promise<CustomDay | null> {
  const local = getLocal<CustomDay>("ironlog_custom_days");
  if (userId) {
    const { data, error } = await supabase
      .from("custom_workout_days")
      .select("*")
      .eq("id", id)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    if (data) return data as CustomDay;
    return local.find((d) => d.id === id) || null;
  } else {
    return local.find((d) => d.id === id) || null;
  }
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
    if (error) throw error;
    
    const remote = (data ?? []) as WorkoutSession[];
    const remoteIds = new Set(remote.map((s) => s.id));
    const merged = [...remote, ...local.filter((s) => !remoteIds.has(s.id))];
    return merged
      .filter((s) => !sinceISO || new Date(s.performed_at) >= new Date(sinceISO))
      .sort((a, b) => new Date(b.performed_at).getTime() - new Date(a.performed_at).getTime())
      .slice(0, 100);
  } else {
    let filtered = local;
    if (sinceISO) {
      filtered = filtered.filter((s) => new Date(s.performed_at) >= new Date(sinceISO));
    }
    return filtered.sort((a, b) => new Date(b.performed_at).getTime() - new Date(a.performed_at).getTime()).slice(0, 100);
  }
}

export async function getAllSessionsWithDays(
  userId: string | undefined
): Promise<(WorkoutSession & { custom_workout_days: { name: string } | null })[]> {
  if (userId) {
    const { data, error } = await supabase
      .from("workout_sessions")
      .select("id, day, title, notes, performed_at, custom_workout_days(name)")
      .eq("user_id", userId)
      .order("performed_at", { ascending: false });
    if (error) throw error;
    return data as any;
  } else {
    const sessions = getLocal<WorkoutSession>("ironlog_workout_sessions");
    const days = getLocal<CustomDay>("ironlog_custom_days");
    return sessions
      .map((s) => ({
        ...s,
        custom_workout_days: days.find((d) => d.id === s.day) ? { name: days.find((d) => d.id === s.day)!.name } : null,
      }))
      .sort((a, b) => new Date(b.performed_at).getTime() - new Date(a.performed_at).getTime());
  }
}

export async function createSession(data: Partial<WorkoutSession>, userId: string | undefined): Promise<void> {
  if (userId) {
    const { error } = await supabase
      .from("workout_sessions")
      .insert({ ...data, user_id: userId } as any);
    if (error) throw error;
  } else {
    const local = getLocal<WorkoutSession>("ironlog_workout_sessions");
    const newSession: WorkoutSession = {
      ...data,
      id: data.id || uuidv4(),
      user_id: "local",
      created_at: new Date().toISOString(),
      day: data.day!,
      performed_at: data.performed_at!,
      title: data.title || null,
      notes: data.notes || null,
    };
    setLocal("ironlog_workout_sessions", [...local, newSession]);
  }
}

export async function updateSession(
  id: string,
  data: Partial<WorkoutSession>,
  userId: string | undefined
): Promise<void> {
  if (userId) {
    const { error } = await supabase
      .from("workout_sessions")
      .update(data as any)
      .eq("id", id)
      .eq("user_id", userId);
    if (error) throw error;
  } else {
    const local = getLocal<WorkoutSession>("ironlog_workout_sessions");
    const idx = local.findIndex((s) => s.id === id);
    if (idx !== -1) {
      local[idx] = { ...local[idx], ...data };
      setLocal("ironlog_workout_sessions", local);
    }
  }
}

export async function deleteSessionAndLogs(id: string, userId: string | undefined): Promise<void> {
  if (userId) {
    await supabase.from("set_logs").delete().eq("session_id", id).eq("user_id", userId);
    await supabase.from("workout_sessions").delete().eq("id", id).eq("user_id", userId);
  } else {
    const sessions = getLocal<WorkoutSession>("ironlog_workout_sessions");
    setLocal("ironlog_workout_sessions", sessions.filter((s) => s.id !== id));
    
    const logs = getLocal<SetLog>("ironlog_set_logs");
    setLocal("ironlog_set_logs", logs.filter((l) => l.session_id !== id));
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
    const { data, error } = await supabase
      .from("set_logs")
      .select("*")
      .eq("user_id", userId)
      .in("session_id", sessionIds)
      .order("set_number", { ascending: true });
    if (error) throw error;
    
    const remote = (data ?? []) as SetLog[];
    const remoteIds = new Set(remote.map((l) => l.id));
    const merged = [...remote, ...local.filter((l) => !remoteIds.has(l.id))];
    return merged.sort((a, b) => a.set_number - b.set_number);
  } else {
    return local.sort((a, b) => a.set_number - b.set_number);
  }
}

export async function getExerciseHistory(
  exerciseName: string,
  sinceISO: string,
  userId: string | undefined
): Promise<SetLog[]> {
  if (userId) {
    const { data, error } = await supabase
      .from("set_logs")
      .select("id, session_id, exercise_name, set_number, weight, reps")
      .eq("user_id", userId)
      .eq("exercise_name", exerciseName)
      .gte("created_at", sinceISO)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as SetLog[];
  } else {
    const local = getLocal<SetLog>("ironlog_set_logs");
    return local
      .filter((l) => l.exercise_name === exerciseName && new Date(l.created_at) >= new Date(sinceISO))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }
}

export async function getExerciseHistoryForExercises(
  exercises: string[],
  userId: string | undefined
): Promise<SetLog[]> {
  if (exercises.length === 0) return [];
  const local = getLocal<SetLog>("ironlog_set_logs").filter((l) => exercises.includes(l.exercise_name));
  
  if (userId) {
    const { data, error } = await supabase
      .from("set_logs")
      .select("*")
      .eq("user_id", userId)
      .in("exercise_name", exercises)
      .order("created_at", { ascending: false })
      .limit(800);
    if (error) throw error;
    
    const remote = (data ?? []) as SetLog[];
    const remoteIds = new Set(remote.map((l) => l.id));
    const merged = [...remote, ...local.filter((l) => !remoteIds.has(l.id))];
    return merged
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 800);
  } else {
    return local
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 800);
  }
}

export async function replaceSessionLogs(
  sessionId: string,
  logs: Partial<SetLog>[],
  userId: string | undefined
): Promise<void> {
  if (userId) {
    await supabase.from("set_logs").delete().eq("session_id", sessionId).eq("user_id", userId);
    if (logs.length > 0) {
      const inserts = logs.map(l => ({ ...l, user_id: userId, session_id: sessionId }));
      const { error } = await supabase.from("set_logs").insert(inserts as any);
      if (error) throw error;
    }
  } else {
    const local = getLocal<SetLog>("ironlog_set_logs");
    const filtered = local.filter(l => l.session_id !== sessionId);
    const newLogs: SetLog[] = logs.map(l => ({
      ...l,
      id: l.id || uuidv4(),
      user_id: "local",
      session_id: sessionId,
      created_at: new Date().toISOString(),
      exercise_name: l.exercise_name!,
      set_number: l.set_number!,
      weight: l.weight ?? null,
      reps: l.reps ?? null,
    } as SetLog));
    setLocal("ironlog_set_logs", [...filtered, ...newLogs]);
  }
}

export async function appendSessionLogs(
  sessionId: string,
  logs: Partial<SetLog>[],
  userId: string | undefined
): Promise<void> {
  if (logs.length === 0) return;
  if (userId) {
    const inserts = logs.map(l => ({ ...l, user_id: userId, session_id: sessionId }));
    const { error } = await supabase.from("set_logs").insert(inserts as any);
    if (error) throw error;
  } else {
    const local = getLocal<SetLog>("ironlog_set_logs");
    const newLogs: SetLog[] = logs.map(l => ({
      ...l,
      id: l.id || uuidv4(),
      user_id: "local",
      session_id: sessionId,
      created_at: new Date().toISOString(),
      exercise_name: l.exercise_name!,
      set_number: l.set_number!,
      weight: l.weight ?? null,
      reps: l.reps ?? null,
    } as SetLog));
    setLocal("ironlog_set_logs", [...local, ...newLogs]);
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
    const { data, error } = await supabase
      .from("exercise_notes")
      .select("exercise_name, note")
      .eq("user_id", userId)
      .in("exercise_name", exercises);
    if (error) throw error;
    
    const remote = data ?? [];
    const remoteEx = new Set(remote.map((r) => r.exercise_name));
    return [...remote, ...local.filter((l) => !remoteEx.has(l.exercise_name))];
  } else {
    return local;
  }
}

export async function saveExerciseNote(
  exerciseName: string,
  note: string,
  userId: string | undefined
): Promise<void> {
  if (userId) {
    const { error } = await supabase
      .from("exercise_notes")
      .upsert(
        { user_id: userId, exercise_name: exerciseName, note, updated_at: new Date().toISOString() },
        { onConflict: "user_id,exercise_name" }
      );
    if (error) throw error;
  } else {
    const local = getLocal<{ exercise_name: string; note: string; updated_at: string }>("ironlog_exercise_notes");
    const idx = local.findIndex((n) => n.exercise_name === exerciseName);
    const newNote = { exercise_name: exerciseName, note, updated_at: new Date().toISOString() };
    if (idx !== -1) {
      local[idx] = newNote;
    } else {
      local.push(newNote);
    }
    setLocal("ironlog_exercise_notes", local);
  }
}

// ----------------------------------------------------------------------------
// Migration
// ----------------------------------------------------------------------------

export async function migrateLocalDataToSupabase(userId: string) {
  const customDays = getLocal<CustomDay>("ironlog_custom_days");
  const sessions = getLocal<WorkoutSession>("ironlog_workout_sessions");
  const logs = getLocal<SetLog>("ironlog_set_logs");

  if (customDays.length > 0) {
    const inserts = customDays.map(d => ({ ...d, user_id: userId }));
    await supabase.from("custom_workout_days").upsert(inserts);
    localStorage.removeItem("ironlog_custom_days");
  }

  if (sessions.length > 0) {
    const inserts = sessions.map(s => ({ ...s, user_id: userId }));
    await supabase.from("workout_sessions").upsert(inserts);
    localStorage.removeItem("ironlog_workout_sessions");
  }

  if (logs.length > 0) {
    const inserts = logs.map(l => ({ ...l, user_id: userId }));
    await supabase.from("set_logs").upsert(inserts);
    localStorage.removeItem("ironlog_set_logs");
  }

  const notes = getLocal<{ exercise_name: string; note: string; updated_at: string }>("ironlog_exercise_notes");
  if (notes.length > 0) {
    const inserts = notes.map(n => ({ ...n, user_id: userId }));
    await supabase.from("exercise_notes").upsert(inserts);
    localStorage.removeItem("ironlog_exercise_notes");
  }
}
