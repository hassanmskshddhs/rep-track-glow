// Derives a color accent token name (matching CSS vars like --push, --pull,
// --legs, --upper, --primary) from a split's name + muscle groups, with a
// stored fallback when nothing matches.
export function getSplitAccent(
  name: string | null | undefined,
  muscleGroups: string[] | null | undefined,
  fallback: string = "primary",
): "push" | "pull" | "legs" | "upper" | "primary" | string {
  const n = (name ?? "").toLowerCase();
  const mgs = (muscleGroups ?? []).map((m) => m.toLowerCase());

  // Name-based first (most explicit)
  if (/\bpush\b/.test(n)) return "push";
  if (/\bpull\b/.test(n)) return "pull";
  if (/\b(leg|legs|lower|quad|hamstring|glute|calf|abs?)\b/.test(n)) return "legs";
  if (/\b(upper|arms?|shoulder|chest|back)\b/.test(n)) return "upper";

  // Muscle-group based
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
