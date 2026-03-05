import { getAI, getGenerativeModel, Schema } from "firebase/ai";
import { z } from "zod";
import { app } from "@/lib/firebase";

const DAY_ORDER = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;

export type WorkoutLogPoint = {
  date: string;
  value: number;
};

export type WeeklyWorkoutDayPlan = {
  day: (typeof DAY_ORDER)[number];
  focus: string;
  warmup: string;
  workout: string;
  cooldown: string;
  durationMinutes: number;
  estimatedCaloriesBurn: number;
  intensity: "low" | "moderate";
  rationale: string;
  safetyNote: string;
};

export type WeeklyWorkoutPlan = {
  weeklySummary: string;
  alignmentNotes: string[];
  weightTrend: {
    recent: string;
    projected: string;
  };
  calorieTrend: {
    recent: string;
    projected: string;
  };
  days: WeeklyWorkoutDayPlan[];
};

type GenerateWeeklyWorkoutPlanInput = {
  doctorRecommendation: string;
  age?: number;
  weightLogs: WorkoutLogPoint[];
  calorieLogs: WorkoutLogPoint[];
};

const weeklyWorkoutPlanSchema = z.object({
  weeklySummary: z.string().min(12),
  alignmentNotes: z.array(z.string().min(6)).min(2).max(8),
  weightTrend: z.object({
    recent: z.string().min(6),
    projected: z.string().min(6),
  }),
  calorieTrend: z.object({
    recent: z.string().min(6),
    projected: z.string().min(6),
  }),
  days: z
    .array(
      z.object({
        day: z.enum(DAY_ORDER),
        focus: z.string().min(3),
        warmup: z.string().min(6),
        workout: z.string().min(10),
        cooldown: z.string().min(6),
        durationMinutes: z.number().int().min(15).max(120),
        estimatedCaloriesBurn: z.number().int().min(20).max(1200),
        intensity: z.enum(["low", "moderate"]),
        rationale: z.string().min(12),
        safetyNote: z.string().min(10),
      })
    )
    .length(7),
});

function extractFirstJsonObject(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) return trimmed;
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) return trimmed.slice(start, end + 1);
  return trimmed;
}

function summarizeLogs(logs: WorkoutLogPoint[], label: string): string {
  if (logs.length === 0) return `No ${label} logs available.`;
  const latest = logs[logs.length - 1];
  const earliest = logs[0];
  const delta = latest.value - earliest.value;
  const direction = delta > 0 ? "up" : delta < 0 ? "down" : "stable";
  return `${label} logs count=${logs.length}, earliest=${earliest.date}:${earliest.value}, latest=${latest.date}:${latest.value}, trend=${direction} (${delta.toFixed(1)}).`;
}

function buildPrompt(input: GenerateWeeklyWorkoutPlanInput): string {
  const weightSummary = summarizeLogs(input.weightLogs, "weight");
  const calorieSummary = summarizeLogs(input.calorieLogs, "calorie-burn");
  const weightLogJson = JSON.stringify(input.weightLogs.slice(-30));
  const calorieLogJson = JSON.stringify(input.calorieLogs.slice(-30));

  return [
    "Create a personalized 7-day workout plan in JSON only.",
    "Primary constraint: follow the doctor's exercise recommendation strictly.",
    `Doctor exercise recommendation: ${input.doctorRecommendation || "No recommendation provided."}`,
    `Patient age: ${input.age ?? "unknown"} (prioritize elderly-safe, low-impact movement and recovery).`,
    `${weightSummary}`,
    `${calorieSummary}`,
    `Weight logs JSON: ${weightLogJson}`,
    `Calorie-burn logs JSON: ${calorieLogJson}`,
    "Output must include:",
    "1) weeklySummary.",
    "2) alignmentNotes explaining how plan aligns with doctor recommendation, weight trend, and calorie-burn trend.",
    "3) weightTrend with recent and projected.",
    "4) calorieTrend with recent and projected.",
    "5) 7 days Monday-Sunday with warmup/workout/cooldown, durationMinutes, estimatedCaloriesBurn, intensity, rationale, safetyNote.",
    "Use only low or moderate intensity. Avoid unsafe high-impact routines for elderly users.",
    "No markdown, no extra keys, no explanations outside JSON.",
  ].join("\n");
}

const ai = getAI(app);

function getModel() {
  const modelName = import.meta.env.VITE_FIREBASE_AI_MODEL || "gemini-2.5-flash-lite";
  const responseSchema = Schema.object({
    properties: {
      weeklySummary: Schema.string({}),
      alignmentNotes: Schema.array({ items: Schema.string({}), minItems: 2, maxItems: 8 }),
      weightTrend: Schema.object({
        properties: {
          recent: Schema.string({}),
          projected: Schema.string({}),
        },
      }),
      calorieTrend: Schema.object({
        properties: {
          recent: Schema.string({}),
          projected: Schema.string({}),
        },
      }),
      days: Schema.array({
        minItems: 7,
        maxItems: 7,
        items: Schema.object({
          properties: {
            day: Schema.enumString({ enum: [...DAY_ORDER] }),
            focus: Schema.string({}),
            warmup: Schema.string({}),
            workout: Schema.string({}),
            cooldown: Schema.string({}),
            durationMinutes: Schema.integer({}),
            estimatedCaloriesBurn: Schema.integer({}),
            intensity: Schema.enumString({ enum: ["low", "moderate"] }),
            rationale: Schema.string({}),
            safetyNote: Schema.string({}),
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

export async function generateWeeklyWorkoutPlan(
  input: GenerateWeeklyWorkoutPlanInput
): Promise<WeeklyWorkoutPlan> {
  const model = getModel();

  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const result = await model.generateContent(buildPrompt(input));
      const raw = result.response.text();
      const parsed = JSON.parse(extractFirstJsonObject(raw));
      const shaped = weeklyWorkoutPlanSchema.parse(parsed);
      return {
        ...shaped,
        days: DAY_ORDER.map((day) => {
          const found = shaped.days.find((d) => d.day === day);
          if (!found) throw new Error(`Missing day: ${day}`);
          return found;
        }),
      };
    } catch (err) {
      lastError = err;
    }
  }

  const message = lastError instanceof Error ? lastError.message : "Unknown generation failure.";
  throw new Error(`Failed to generate valid AI workout plan: ${message}`);
}
