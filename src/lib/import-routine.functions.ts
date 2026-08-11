import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({
  text: z.string().optional(),
  imageDataUrl: z.string().optional(),
});

export type ParsedExercise = {
  name: string;
  sets: number | null;
  reps: string | null;
  weight: string | null;
};

export type ParsedRoutine = {
  name: string;
  subtitle: string;
  muscleGroups: string[];
  exercises: ParsedExercise[];
};

const SYSTEM = `You extract structured gym routines from raw text or images of workout plans.
Return ONLY JSON with this exact shape:
{"name":string,"subtitle":string,"muscleGroups":string[],"exercises":[{"name":string,"sets":number|null,"reps":string|null,"weight":string|null}]}
Rules:
- name: the split/day title (e.g. "Push Day"). If absent, infer from the muscles trained.
- subtitle: short muscle summary like "Chest · Shoulders · Triceps".
- muscleGroups: pick only from: Chest, Back, Shoulders, Biceps, Triceps, Forearms, Quads, Hamstrings, Glutes, Calves, Core, Cardio.
- exercises: use canonical gym names (e.g. "Barbell Bench Press (Flat)", "Lat Pulldown (Wide Grip)").
- reps like "8-12" stay as strings, weight like "60kg" stays as a string. Unknown values are null.
No markdown, no commentary, JSON only.`;

export const parseRoutine = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data }): Promise<ParsedRoutine> => {
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) throw new Error("AI is not configured");

    const content: Record<string, unknown>[] = [];
    if (data.text?.trim()) {
      content.push({ type: "text", text: `Parse this workout routine:\n\n${data.text.trim()}` });
    }
    if (data.imageDataUrl) {
      content.push({ type: "text", text: "Parse the workout routine shown in this image." });
      content.push({ type: "image_url", image_url: { url: data.imageDataUrl } });
    }
    if (content.length === 0) throw new Error("Provide text or an image to import");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
      body: JSON.stringify({
        model: "google/gemini-3.6-flash",
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (res.status === 429) throw new Error("Too many requests — try again in a moment.");
    if (res.status === 402) throw new Error("AI credits exhausted. Add credits to continue.");
    if (!res.ok) throw new Error(`AI request failed (${res.status})`);

    const json = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const raw = json.choices?.[0]?.message?.content ?? "";
    const cleaned = raw.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();

    let parsed: unknown;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      const m = cleaned.match(/\{[\s\S]*\}/);
      if (!m) throw new Error("Couldn't understand that routine — try clearer text.");
      parsed = JSON.parse(m[0]);
    }

    const Shape = z.object({
      name: z.string().optional(),
      subtitle: z.string().optional(),
      muscleGroups: z.array(z.string()).optional(),
      exercises: z
        .array(
          z.object({
            name: z.string(),
            sets: z.union([z.number(), z.string(), z.null()]).optional(),
            reps: z.union([z.string(), z.number(), z.null()]).optional(),
            weight: z.union([z.string(), z.number(), z.null()]).optional(),
          }),
        )
        .optional(),
    });
    const out = Shape.parse(parsed);

    return {
      name: (out.name ?? "Imported Split").slice(0, 60),
      subtitle: (out.subtitle ?? "").slice(0, 120),
      muscleGroups: out.muscleGroups ?? [],
      exercises: (out.exercises ?? []).map((e) => ({
        name: e.name.slice(0, 80),
        sets: typeof e.sets === "number" ? e.sets : e.sets ? Number(e.sets) || null : null,
        reps: e.reps === null || e.reps === undefined ? null : String(e.reps),
        weight: e.weight === null || e.weight === undefined ? null : String(e.weight),
      })),
    };
  });
