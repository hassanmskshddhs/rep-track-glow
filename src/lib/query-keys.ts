/**
 * Centralised, user-scoped React Query keys.
 *
 * Every key starts with the owning user's id. The query cache is persisted to
 * localStorage, so scoping by user guarantees that data cached for one account
 * can never be rendered for another one after a sign-out / sign-in.
 */
export const qk = {
  splits: (userId: string | undefined) => ["splits", userId] as const,
  split: (userId: string | undefined, splitId: string) =>
    ["split", userId, splitId] as const,
  historyWindow: (userId: string | undefined, splitId: string) =>
    ["history-window", userId, splitId] as const,
  notes: (userId: string | undefined, splitId: string) =>
    ["exercise-notes", userId, splitId] as const,
  sessions: (userId: string | undefined) => ["history", userId] as const,
  recentSessions: (userId: string | undefined) => ["recent-sessions", userId] as const,
  progressSets: (userId: string | undefined) => ["progress-sets", userId] as const,
  progressExercises: (userId: string | undefined) => ["progress-exercises", userId] as const,
  oneRepMax: (userId: string | undefined, exercise: string | null) =>
    ["progress-1rm", userId, exercise] as const,
  chart: (userId: string | undefined, exercise: string) =>
    ["chart", userId, exercise] as const,
};
