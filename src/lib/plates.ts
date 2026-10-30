/** Set tags: Normal, Warm-up, Drop set, Failure. Warm-ups are never saved to history. */
export type SetKind = "N" | "W" | "D" | "F";

export const SET_KIND_ORDER: SetKind[] = ["N", "W", "D", "F"];

export function nextSetKind(k: SetKind | undefined): SetKind {
  const i = SET_KIND_ORDER.indexOf(k ?? "N");
  return SET_KIND_ORDER[(i + 1) % SET_KIND_ORDER.length];
}

export const DEFAULT_BAR_KG = 20;
export const PLATES_KG = [25, 20, 15, 10, 5, 2.5, 1.25];

/** Plates needed on EACH side of the bar to reach `total` kg. `remainder` is weight that can't be loaded. */
export function platesPerSide(total: number, bar = DEFAULT_BAR_KG, plates = PLATES_KG) {
  if (!Number.isFinite(total) || total <= bar) return { plates: [] as number[], remainder: 0 };
  let side = (total - bar) / 2;
  const out: number[] = [];
  for (const p of plates) {
    while (side + 1e-9 >= p) {
      out.push(p);
      side -= p;
    }
  }
  return { plates: out, remainder: Math.round(side * 2 * 100) / 100 };
}
