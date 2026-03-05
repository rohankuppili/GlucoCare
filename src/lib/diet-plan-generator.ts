import { getAI, getGenerativeModel, Schema } from "firebase/ai";
import { z } from "zod";
import { app } from "@/lib/firebase";

export type DietPreference = "veg" | "eggetarian" | "non-veg";

export type WeeklyDietDayPlan = {
  day: string;
  breakfast: string;
  lunch: string;
  dinner: string;
  breakfastCalories: number;
  lunchCalories: number;
  dinnerCalories: number;
  totalCalories: number;
};

export type WeeklyDietPlan = {
  calorieTarget: number;
  focusNotes: string[];
  days: WeeklyDietDayPlan[];
};

type GenerateWeeklyDietPlanInput = {
  doctorRecommendation: string;
  calorieLimit: number;
  age?: number;
  weightKg?: number;
  dietPreference: DietPreference;
};

const DAY_ORDER = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;

const weeklyDietPlanSchema = z.object({
  calorieTarget: z.number().int().positive(),
  focusNotes: z.array(z.string().min(3)).min(1).max(6),
  days: z
    .array(
      z.object({
        day: z.enum(DAY_ORDER),
        breakfast: z.string().min(3),
        lunch: z.string().min(3),
        dinner: z.string().min(3),
        breakfastCalories: z.number().int().positive(),
        lunchCalories: z.number().int().positive(),
        dinnerCalories: z.number().int().positive(),
        totalCalories: z.number().int().positive(),
      })
    )
    .length(7),
});

function normalizeCalorieTarget(limit: number): number {
  return Math.max(1100, Math.round(limit || 1600));
}

function extractFirstJsonObject(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) return trimmed;
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) return trimmed.slice(start, end + 1);
  return trimmed;
}

function containsAny(text: string, terms: string[]): boolean {
  const t = text.toLowerCase();
  return terms.some((term) => t.includes(term));
}

function validateDietPreferenceRules(plan: WeeklyDietPlan, pref: DietPreference): void {
  const nonVegAllowed = ["chicken", "mutton", "fish", "seafood", "prawn", "shrimp", "egg", "eggs"];
  const hardBanned = ["beef", "pork", "bacon", "ham", "duck", "turkey", "salami", "sausage"];

  for (const day of plan.days) {
    const combined = `${day.breakfast} ${day.lunch} ${day.dinner}`.toLowerCase();
    if (containsAny(combined, hardBanned)) {
      throw new Error("Diet plan included a disallowed non-veg item.");
    }
    if (pref === "veg" && containsAny(combined, [...nonVegAllowed])) {
      throw new Error("Vegetarian plan included non-veg or egg items.");
    }
    if (
      pref === "eggetarian" &&
      containsAny(combined, ["chicken", "mutton", "fish", "seafood", "prawn", "shrimp"])
    ) {
      throw new Error("Eggetarian plan included non-egg meat or seafood.");
    }
    if (pref === "non-veg") {
      const otherMeatTerms = ["lamb", "goat", "crab", "squid", "octopus"];
      if (containsAny(combined, otherMeatTerms)) {
        throw new Error("Non-veg plan included meats outside allowed set.");
      }
    }
  }
}

function validateCalories(plan: WeeklyDietPlan, target: number): void {
  for (const day of plan.days) {
    const sum = day.breakfastCalories + day.lunchCalories + day.dinnerCalories;
    if (Math.abs(sum - day.totalCalories) > 60) {
      throw new Error(`Calorie mismatch for ${day.day}.`);
    }
    if (day.totalCalories > target) {
      throw new Error(`Calorie target exceeded for ${day.day}.`);
    }
  }
}

function buildPrompt(input: GenerateWeeklyDietPlanInput, targetCalories: number): string {
  const prefRule =
    input.dietPreference === "veg"
      ? "STRICT VEGETARIAN ONLY. No egg, chicken, mutton, fish, seafood."
      : input.dietPreference === "eggetarian"
        ? "EGGETARIAN ONLY. Eggs allowed, but no chicken, mutton, fish, seafood."
        : "NON-VEG allowed STRICTLY only chicken, mutton, seafood, eggs. Do not include any other meats.";

  return [
    "Create a strict 7-day diabetic diet plan in JSON only.",
    "Use the doctor's recommendation as primary instruction.",
    `Doctor recommendation: ${input.doctorRecommendation || "No extra recommendation provided."}`,
    `Daily calorie cap: ${targetCalories} kcal (MUST NOT EXCEED).`,
    `Patient age: ${input.age ?? "unknown"}`,
    `Patient weight: ${input.weightKg ?? "unknown"} kg`,
    `Diet preference rule: ${prefRule}`,
    "Output days in order Monday to Sunday.",
    "For each day provide breakfast, lunch, dinner with practical Indian meal suggestions.",
    "Include calories for breakfast/lunch/dinner and totalCalories.",
    "Each day's totalCalories must be <= calorieTarget and match meal calorie sums.",
    "No markdown, no explanations, no extra fields.",
  ].join("\n");
}

const ai = getAI(app);

function getModel() {
  const modelName = import.meta.env.VITE_FIREBASE_AI_MODEL || "gemini-2.5-flash-lite";
  const responseSchema = Schema.object({
    properties: {
      calorieTarget: Schema.integer({ description: "Daily calorie target upper cap." }),
      focusNotes: Schema.array({ items: Schema.string({}), minItems: 1, maxItems: 6 }),
      days: Schema.array({
        minItems: 7,
        maxItems: 7,
        items: Schema.object({
          properties: {
            day: Schema.enumString({ enum: [...DAY_ORDER] }),
            breakfast: Schema.string({}),
            lunch: Schema.string({}),
            dinner: Schema.string({}),
            breakfastCalories: Schema.integer({}),
            lunchCalories: Schema.integer({}),
            dinnerCalories: Schema.integer({}),
            totalCalories: Schema.integer({}),
          },
        }),
      }),
    },
  });

  return getGenerativeModel(ai, {
    model: modelName,
    generationConfig: {
      temperature: 0.2,
      responseMimeType: "application/json",
      responseSchema,
    },
  });
}

export async function generateWeeklyDietPlan(input: GenerateWeeklyDietPlanInput): Promise<WeeklyDietPlan> {
  const targetCalories = normalizeCalorieTarget(input.calorieLimit);
  const model = getModel();

  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const result = await model.generateContent(buildPrompt(input, targetCalories));
      const raw = result.response.text();
      const parsed = JSON.parse(extractFirstJsonObject(raw));
      const shaped = weeklyDietPlanSchema.parse(parsed);
      const normalized: WeeklyDietPlan = {
        calorieTarget: targetCalories,
        focusNotes: shaped.focusNotes,
        days: DAY_ORDER.map((day) => {
          const found = shaped.days.find((d) => d.day === day);
          if (!found) throw new Error(`Missing day: ${day}`);
          return {
            day,
            breakfast: found.breakfast,
            lunch: found.lunch,
            dinner: found.dinner,
            breakfastCalories: found.breakfastCalories,
            lunchCalories: found.lunchCalories,
            dinnerCalories: found.dinnerCalories,
            totalCalories: found.totalCalories,
          };
        }),
      };

      validateCalories(normalized, targetCalories);
      validateDietPreferenceRules(normalized, input.dietPreference);
      return normalized;
    } catch (err) {
      lastError = err;
    }
  }

  const message = lastError instanceof Error ? lastError.message : "Unknown generation failure.";
  throw new Error(`Failed to generate valid AI diet plan: ${message}`);
}
