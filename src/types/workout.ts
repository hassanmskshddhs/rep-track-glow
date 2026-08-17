/**
 * Canonical data models for IronLog.
 *
 * Every module that reads or writes workout data imports its types from here
 * so UI, hooks and persistence layers can never drift apart.
 */

/** A single row in the logging UI (strings because inputs are controlled). */
export interface SetInput {
  weight: string;
  reps: string;
}

/** Draft state for one workout screen: exercise name -> set rows. */
export type WorkoutDraft = Record<string, SetInput[]>;

/** A set as persisted in the database. */
export interface LoggedSet {
  exercise_name: string;
  set_number: number;
  weight: number | null;
  reps: number | null;
}

/** A logged set enriched with the columns we read back. */
export interface LoggedSetRow extends LoggedSet {
  session_id: string;
  created_at: string;
}

/** A user-created workout split ("Push", "Legs + Abs", …). */
export interface WorkoutSplit {
  id: string;
  name: string;
  subtitle: string | null;
  accent: string | null;
  exercises: string[];
  muscle_groups: string[] | null;
  created_at: string;
}

/** Minimal split shape used by nav tabs and pickers. */
export interface WorkoutSplitSummary {
  id: string;
  name: string;
  accent: string | null;
  muscle_groups?: string[] | null;
}

/** A saved training session. */
export interface WorkoutSessionRecord {
  id: string;
  day: string;
  title: string | null;
  performed_at: string;
}

/** Derived per-exercise coaching data. */
export interface ExerciseInsight {
  lastSets: { weight: number | null; reps: number | null; set_number: number }[];
  bestWeight: number | null;
}

/** Payload handed to the persistence layer when a session is logged. */
export interface PendingWorkout {
  userId: string;
  day: string;
  title: string;
  performedAt: string;
  rows: LoggedSet[];
}
