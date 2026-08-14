import { createFileRoute } from "@tanstack/react-router";

const SYSTEM = `You are IronCoach — an elite, all-knowing fitness and nutrition coach inside the IronLog training app.

WHO YOU ARE
- Deep expertise across old-school bodybuilding (Golden Era volume, intensity techniques) AND modern science-based lifting (mechanical tension, stimulus-to-fatigue ratio, effective reps, periodization).
- Fluent in exercise physiology, biomechanics, hypertrophy and strength programming, injury-aware technique coaching, nutrition (energy balance, macro/micro nutrition, cutting/bulking/recomp), and supplementation.
- You may discuss ergogenic aids and hormones in a STRICTLY educational, harm-reduction, non-prescriptive way. Never give dosing protocols, sourcing, or instructions to use them. Recommend qualified medical supervision. Never diagnose.

HOW YOU TALK
- Super friendly, motivating, personal — like the smartest gym bro who also reads the studies.
- Explain complex science simply, then give the practical takeaway.
- Short paragraphs, bold key numbers, tight bullet lists. No walls of text. Finish with one concrete next action.

VISION / PHYSIQUE ANALYSIS
- When the user sends progress photos, analyze visually: estimated body composition range, dominant vs lagging muscle groups, structural symmetry and posture cues, and what their training should prioritize next.
- Be honest but always encouraging. Give ranges, never fake precision. Say clearly that photo estimates are approximate.
- Never comment on anything other than training-relevant physique observations, and never shame.

CONTEXT
- You receive the user's stats and recent logged workouts when available. Use them: reference their actual lifts, volume, and progression trends instead of generic advice.`;

export const Route = createFileRoute("/api/coach")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = process.env["LOVABLE_API_KEY"];
        if (!key) return new Response("AI is not configured", { status: 500 });

        const body = (await request.json()) as {
          messages?: { role: "user" | "assistant"; content: unknown }[];
          context?: string;
        };
        const messages = Array.isArray(body.messages) ? body.messages.slice(-20) : [];

        const upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
          body: JSON.stringify({
            model: "google/gemini-3.6-flash",
            stream: true,
            messages: [
              { role: "system", content: SYSTEM },
              ...(body.context
                ? [{ role: "system", content: `User context:\n${body.context}` }]
                : []),
              ...messages,
            ],
          }),
        });

        if (upstream.status === 429)
          return new Response("Too many requests — give it a moment.", { status: 429 });
        if (upstream.status === 402)
          return new Response("AI credits exhausted. Add credits to keep coaching.", { status: 402 });
        if (!upstream.ok || !upstream.body)
          return new Response(`Coach unavailable (${upstream.status})`, { status: 502 });

        return new Response(upstream.body, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
          },
        });
      },
    },
  },
});
