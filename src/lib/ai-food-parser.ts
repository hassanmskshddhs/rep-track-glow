export type AIFoodResponse = {
  food_name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  serving_size_quantity: number;
  serving_size_unit: string;
};

/**
 * Parses a free-text food description through the app's server-side AI
 * endpoint (Lovable AI). Credentials never touch the browser; the endpoint
 * authenticates the caller via the Supabase bearer token.
 */
export async function parseFoodWithAI(query: string): Promise<AIFoodResponse> {
  const { supabase } = await import("@/integrations/supabase/client");
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  if (!token) {
    throw new Error("Sign in to use AI food search.");
  }

  let response: Response;
  try {
    response = await fetch("/api/nutrition", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ query }),
    });
  } catch {
    throw new Error("You're offline — AI search needs a connection.");
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    if (response.status === 401) {
      throw new Error("Sign in to use AI food search.");
    }
    throw new Error(detail || "AI search is unavailable right now. Try a database food or add it manually.");
  }

  const parsed = (await response.json()) as AIFoodResponse;
  if (!parsed || typeof parsed.calories !== "number") {
    throw new Error("Couldn't identify that food — try describing it differently.");
  }
  return parsed;
}
