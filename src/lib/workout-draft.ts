import type { WorkoutDraft, SetInput } from "@/types/workout";
/** Hydrate additively: retain unknown exercises and set flags for old drafts. */
export function hydrateDraft(exercises: string[], raw: unknown): WorkoutDraft {
  const source =
    raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const result: WorkoutDraft = {};
  for (const name of new Set([...Object.keys(source), ...exercises])) {
    const rows = source[name];
    result[name] =
      Array.isArray(rows) && rows.length
        ? rows.map((r: unknown) => {
            const row = r && typeof r === "object" ? (r as Partial<SetInput>) : {};
            const kind = row.kind && ["N", "W", "D", "F"].includes(row.kind) ? row.kind : "N";
            return {
              ...row,
              weight: String(row.weight ?? ""),
              reps: String(row.reps ?? ""),
              kind,
              done: row.done === true,
            } as SetInput;
          })
        : [{ weight: "", reps: "" }];
  }
  return result;
}
