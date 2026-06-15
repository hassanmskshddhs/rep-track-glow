// src/lib/share-plan.ts
// Share a routine layout as plain text. Does NOT include weights or logs.

export type SharePlanInput = {
  routineName: string;
  // Items in routine order: name + optional set count
  exercises: { name: string; sets?: number }[];
};

export function buildPlanText({ routineName, exercises }: SharePlanInput): string {
  const lines: string[] = [];
  lines.push(`\uD83C\uDFCB\uFE0F IronLog Workout Plan: ${routineName}`);
  lines.push(`Track. Lift. Repeat.`);
  lines.push("");
  exercises.forEach((ex, i) => {
    const setCount = ex.sets && ex.sets > 0 ? ex.sets : 3;
    lines.push(`${i + 1}. ${ex.name} — ${setCount} Sets`);
  });
  lines.push("");
  lines.push(`\uD83D\uDCAA Try this workout layout or track your lifts inside IronLog!`);
  lines.push("");
  return lines.join("\n");
}

export async function sharePlan(
  input: SharePlanInput,
  opts: { onCopied?: () => void; onShared?: () => void; onError?: (e: unknown) => void } = {},
): Promise<void> {
  const text = buildPlanText(input);
  const title = `IronLog — ${input.routineName}`;
  try {
    const nav = typeof navigator !== "undefined" ? navigator : null;
    if (nav && typeof nav.share === "function") {
      await nav.share({ title, text });
      opts.onShared?.();
      return;
    }
    if (nav && nav.clipboard && typeof nav.clipboard.writeText === "function") {
      await nav.clipboard.writeText(text);
      opts.onCopied?.();
      return;
    }
    // Final fallback: temporary textarea
    if (typeof document !== "undefined") {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      opts.onCopied?.();
    }
  } catch (e) {
    // AbortError = user canceled native share; treat as benign
    if (e && typeof e === "object" && "name" in e && (e as { name?: string }).name === "AbortError") {
      return;
    }
    opts.onError?.(e);
  }
}
