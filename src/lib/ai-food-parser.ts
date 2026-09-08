export type AIFoodResponse = {
  food_name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  serving_size_quantity: number;
  serving_size_unit: string;
};

export async function parseFoodWithAI(query: string, apiKey: string): Promise<AIFoodResponse> {
  if (!apiKey) {
    throw new Error("Gemini API Key is missing.");
  }

  const prompt = `
You are an expert nutritionist and food database parser. 
I will give you a natural language query describing a food item or meal. The query might be in English, Arabic, or Egyptian slang.
You must parse this query and return the nutritional information for the EXACT portion described. If no portion is described, assume 1 standard serving or 100g.

Return ONLY a valid JSON object matching this exact schema:
{
  "food_name": "String (normalized clean name in the user's language, e.g., 'كشري' or 'Chicken Breast')",
  "calories": Number (total kcal for the parsed portion),
  "protein": Number (grams of protein),
  "carbs": Number (grams of carbohydrates),
  "fats": Number (grams of fat),
  "serving_size_quantity": Number (e.g., 100, 1, 2),
  "serving_size_unit": "String (e.g., 'g', 'oz', 'piece', 'serving', 'plate', 'tablespoon')"
}

Do not wrap the JSON in markdown code blocks. Just output the raw JSON object.
Query: "${query}"
`;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1 },
      })
    });

    if (!response.ok) {
      throw new Error("Failed to fetch from Gemini API");
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    
    // Clean up potential markdown formatting if the model still returns it
    const cleanText = text.replace(/```json/g, "").replace(/```/g, "").trim();
    
    const parsed = JSON.parse(cleanText) as AIFoodResponse;
    return parsed;
  } catch (error) {
    console.error("AI Parsing Error:", error);
    throw new Error("Failed to parse food using AI. Please try again or enter manually.");
  }
}
