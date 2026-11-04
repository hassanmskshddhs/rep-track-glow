// Server-only: picks an AI provider from environment variables at request time.
// Lovable hosting uses LOVABLE_API_KEY; external hosts (e.g. Vercel) can set
// GEMINI_API_KEY or OPENAI_API_KEY. All use the OpenAI-compatible chat API.

export type AiProvider = {
  name: "lovable" | "gemini" | "openai";
  url: string;
  headers: Record<string, string>;
  model: (kind: "coach" | "nutrition") => string;
};

export function resolveAiProvider(): AiProvider | null {
  const lovable = process.env["LOVABLE_API_KEY"];
  if (lovable) {
    return {
      name: "lovable",
      url: "https://ai.gateway.lovable.dev/v1/chat/completions",
      headers: { "Lovable-API-Key": lovable, "X-Lovable-AIG-SDK": "fetch" },
      model: (k) => (k === "coach" ? "google/gemini-3.7-flash" : "openai/gpt-6-astra"),
    };
  }
  const gemini = process.env["GEMINI_API_KEY"];
  if (gemini) {
    return {
      name: "gemini",
      url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
      headers: { Authorization: `Bearer ${gemini}` },
      model: () => process.env["GEMINI_MODEL"] || "gemini-2.5-flash",
    };
  }
  const openai = process.env["OPENAI_API_KEY"];
  if (openai) {
    return {
      name: "openai",
      url: "https://api.openai.com/v1/chat/completions",
      headers: { Authorization: `Bearer ${openai}` },
      model: () => process.env["OPENAI_MODEL"] || "gpt-4o-mini",
    };
  }
  return null;
}
