import type { DailyHealthMetricsDoc } from "@/lib/firestore";
import { diabetesRiskModel } from "@/lib/generated/diabetes-rf-model";

type SmokingHistory = "No Info" | "never" | "former" | "current" | "not current" | "ever";
type Gender = "Female" | "Male" | "Other";

export type RiskInput = {
  age?: number;
  bmi?: number;
  hba1c?: number;
  bloodGlucose?: number;
  hypertension?: number;
  heartDisease?: number;
  gender?: Gender;
  smokingHistory?: SmokingHistory;
};

export type RiskTrendPoint = {
  date: string;
  risk: number;
};

export type DiabetesRiskSummary = {
  riskScore: number;
  riskBand: "low" | "moderate" | "high";
  confidence: number;
  projected30DayRisk: number;
  trendLabel: "improving" | "worsening" | "stable";
  trendPoints: RiskTrendPoint[];
  recommendations: string[];
};

type Tree = {
  children_left: readonly number[];
  children_right: readonly number[];
  feature: readonly number[];
  threshold: readonly number[];
  value: readonly number[];
};

const MODEL = diabetesRiskModel;

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

function buildFeatureVector(input: RiskInput): number[] {
  const defaults = MODEL.defaults.numeric;
  const age = Number.isFinite(input.age) ? Number(input.age) : defaults.age;
  const bmi = Number.isFinite(input.bmi) ? Number(input.bmi) : defaults.bmi;
  const hba1c = Number.isFinite(input.hba1c) ? Number(input.hba1c) : defaults.HbA1c_level;
  const bloodGlucose = Number.isFinite(input.bloodGlucose)
    ? Number(input.bloodGlucose)
    : defaults.blood_glucose_level;
  const hypertension = Number.isFinite(input.hypertension) ? Number(input.hypertension) : defaults.hypertension;
  const heartDisease = Number.isFinite(input.heartDisease) ? Number(input.heartDisease) : defaults.heart_disease;
  const gender = input.gender ?? (MODEL.defaults.gender as Gender);
  const smoking = input.smokingHistory ?? (MODEL.defaults.smoking_history as SmokingHistory);

  const base: Record<string, number> = {
    age,
    bmi,
    HbA1c_level: hba1c,
    blood_glucose_level: bloodGlucose,
    hypertension,
    heart_disease: heartDisease,
  };

  for (const feature of MODEL.feature_order) {
    if (feature.startsWith("gender_")) {
      base[feature] = feature === `gender_${gender}` ? 1 : 0;
    } else if (feature.startsWith("smoking_history_")) {
      base[feature] = feature === `smoking_history_${smoking}` ? 1 : 0;
    } else if (!(feature in base)) {
      base[feature] = 0;
    }
  }

  return MODEL.feature_order.map((f) => base[f] ?? 0);
}

function predictTree(tree: Tree, features: number[]): number {
  let node = 0;
  while (tree.children_left[node] !== -1 && tree.children_right[node] !== -1) {
    const featureIndex = tree.feature[node];
    const threshold = tree.threshold[node];
    const value = features[featureIndex] ?? 0;
    node = value <= threshold ? tree.children_left[node] : tree.children_right[node];
  }
  return tree.value[node] ?? 0;
}

export function predictDiabetesRisk(input: RiskInput): number {
  const features = buildFeatureVector(input);
  const treeScores = MODEL.trees.map((tree) => predictTree(tree as unknown as Tree, features));
  const average = treeScores.reduce((sum, value) => sum + value, 0) / Math.max(treeScores.length, 1);
  return clamp01(average);
}

function deriveRiskBand(risk: number): "low" | "moderate" | "high" {
  if (risk < 0.25) return "low";
  if (risk < 0.55) return "moderate";
  return "high";
}

function inferHypertension(metric: DailyHealthMetricsDoc): number {
  const sys = metric.bloodPressureSystolic ?? 0;
  const dia = metric.bloodPressureDiastolic ?? 0;
  return sys >= 140 || dia >= 90 ? 1 : 0;
}

function fallbackHba1cFromGlucose(glucose: number): number {
  // ADAG approximation: eAG (mg/dL) = 28.7 * HbA1c - 46.7
  return (glucose + 46.7) / 28.7;
}

function linearSlope(values: number[]): number {
  if (values.length < 2) return 0;
  const n = values.length;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;
  for (let i = 0; i < n; i += 1) {
    const x = i;
    const y = values[i];
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumXX += x * x;
  }
  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) return 0;
  return (n * sumXY - sumX * sumY) / denom;
}

function simulateRiskDelta(base: RiskInput, patch: Partial<RiskInput>): number {
  const original = predictDiabetesRisk(base);
  const improved = predictDiabetesRisk({ ...base, ...patch });
  return original - improved;
}

export function summarizeDiabetesRisk(
  metrics: DailyHealthMetricsDoc[],
  context: {
    age?: number;
    latestWeightKg?: number;
    gender?: Gender;
    smokingHistory?: SmokingHistory;
  }
): DiabetesRiskSummary | null {
  if (metrics.length === 0) return null;

  const ordered = metrics.slice().sort((a, b) => a.date.localeCompare(b.date)).slice(-30);
  const trendPoints: RiskTrendPoint[] = ordered.map((m) => {
    const glucose = (m.fastingGlucose + m.postMealGlucose) / 2;
    const hba1c = Number.isFinite(m.hba1c) ? Number(m.hba1c) : fallbackHba1cFromGlucose(glucose);
    const risk = predictDiabetesRisk({
      age: context.age,
      bmi: undefined,
      hba1c,
      bloodGlucose: glucose,
      hypertension: inferHypertension(m),
      heartDisease: 0,
      gender: context.gender,
      smokingHistory: context.smokingHistory,
    });
    return { date: m.date, risk };
  });

  const riskValues = trendPoints.map((p) => p.risk);
  const currentRisk = riskValues[riskValues.length - 1];
  const slopePerDay = linearSlope(riskValues);
  const projected30DayRisk = clamp01(currentRisk + slopePerDay * 30);
  const trendLabel =
    slopePerDay > 0.002 ? "worsening" : slopePerDay < -0.002 ? "improving" : "stable";

  const latest = ordered[ordered.length - 1];
  const latestGlucose = (latest.fastingGlucose + latest.postMealGlucose) / 2;
  const latestHba1c = Number.isFinite(latest.hba1c) ? Number(latest.hba1c) : fallbackHba1cFromGlucose(latestGlucose);
  const baseInput: RiskInput = {
    age: context.age,
    hba1c: latestHba1c,
    bloodGlucose: latestGlucose,
    hypertension: inferHypertension(latest),
    heartDisease: 0,
    gender: context.gender,
    smokingHistory: context.smokingHistory,
  };

  const recommendationDeltas = [
    {
      label: "Target average blood glucose 20 mg/dL lower over the next 2 weeks.",
      delta: simulateRiskDelta(baseInput, { bloodGlucose: Math.max(70, latestGlucose - 20) }),
    },
    {
      label: "Work with your doctor to lower HbA1c by 0.5 points.",
      delta: simulateRiskDelta(baseInput, { hba1c: Math.max(4.8, latestHba1c - 0.5) }),
    },
    {
      label: "Keep blood pressure under 140/90 consistently.",
      delta: simulateRiskDelta(baseInput, { hypertension: 0 }),
    },
  ]
    .sort((a, b) => b.delta - a.delta)
    .slice(0, 2)
    .map((item) => item.label);

  const volatility = Math.sqrt(
    riskValues.reduce((acc, value) => acc + (value - currentRisk) ** 2, 0) / Math.max(riskValues.length, 1)
  );
  const confidence = clamp01(sigmoid((riskValues.length - 10) / 6) * (1 - Math.min(volatility * 2, 0.45)));

  return {
    riskScore: currentRisk,
    riskBand: deriveRiskBand(currentRisk),
    confidence,
    projected30DayRisk,
    trendLabel,
    trendPoints,
    recommendations: recommendationDeltas,
  };
}

