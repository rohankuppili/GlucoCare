import { getAI, getGenerativeModel, Schema } from "firebase/ai";
import { z } from "zod";
import { app } from "@/lib/firebase";

export type NearbyHospitalResult = {
  id: string;
  name: string;
  address: string;
  phone: string;
  distanceKm: number;
  mapsUrl: string;
};

const ai = getAI(app);

const nearbyHospitalItemSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2),
  address: z.string().min(4),
  phone: z.string().optional().default(""),
  distanceKm: z.union([z.number().nonnegative(), z.string()]),
  mapsUrl: z.string().optional(),
});

const nearbyHospitalsSchema = z.object({
  hospitals: z.array(nearbyHospitalItemSchema).min(1).max(8),
});

function extractFirstJsonObject(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) return trimmed;
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) return trimmed.slice(start, end + 1);
  return trimmed;
}

function getModel() {
  const modelName = import.meta.env.VITE_FIREBASE_AI_MODEL || "gemini-2.5-flash-lite";
  const responseSchema = Schema.object({
    properties: {
      hospitals: Schema.array({
        minItems: 1,
        maxItems: 8,
        items: Schema.object({
          properties: {
            id: Schema.string({}),
            name: Schema.string({}),
            address: Schema.string({}),
            phone: Schema.string({}),
            distanceKm: Schema.number({}),
            mapsUrl: Schema.string({}),
          },
        }),
      }),
    },
  });

  return getGenerativeModel(ai, {
    model: modelName,
    generationConfig: {
      temperature: 0.1,
      responseMimeType: "application/json",
      responseSchema,
    },
  });
}

function buildPrompt(lat: number, lng: number, limit: number): string {
  return [
    "Find nearby diabetes hospitals for the provided user coordinates.",
    "Use currently known real-world locations only. Do not invent fake hospitals.",
    `Coordinates: latitude=${lat}, longitude=${lng}`,
    `Return up to ${Math.max(3, Math.min(limit, 8))} closest options.`,
    "Each item must include:",
    "id, name, address, phone (blank if unknown), distanceKm (numeric), mapsUrl.",
    "If mapsUrl is unknown, keep it blank.",
    "Sort by nearest first based on best available location knowledge.",
    "Output JSON only and no markdown.",
  ].join("\n");
}

function normalizeDistance(value: number | string): number {
  if (typeof value === "number") return Number.isFinite(value) ? Math.max(0, value) : 9999;
  const parsed = Number(String(value).replace(/[^\d.]+/g, ""));
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 9999;
}

function buildMapsUrl(name: string, address: string): string {
  const query = encodeURIComponent(`${name} ${address}`.trim());
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}

function parseHospitalsPayload(parsed: unknown): z.infer<typeof nearbyHospitalItemSchema>[] {
  if (Array.isArray(parsed)) {
    return z.array(nearbyHospitalItemSchema).parse(parsed);
  }
  const shaped = nearbyHospitalsSchema.parse(parsed);
  return shaped.hospitals;
}

function toUserFacingError(error: unknown): Error {
  const rawMessage = error instanceof Error ? error.message : String(error ?? "Unknown error");
  const lowered = rawMessage.toLowerCase();

  if (
    lowered.includes("permission") ||
    lowered.includes("unauthorized") ||
    lowered.includes("forbidden") ||
    lowered.includes("api has not been used") ||
    lowered.includes("api not enabled")
  ) {
    return new Error("AI service is not enabled for this Firebase project. Enable Firebase AI Logic / Gemini API and try again.");
  }

  if (lowered.includes("quota") || lowered.includes("rate limit")) {
    return new Error("AI quota/rate limit reached. Please retry after some time.");
  }

  return new Error(rawMessage);
}

export async function generateNearbyHospitalsFromAi(
  lat: number,
  lng: number,
  limit = 5
): Promise<NearbyHospitalResult[]> {
  const model = getModel();

  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const result = await model.generateContent(buildPrompt(lat, lng, limit));
      const raw = result.response.text();
      const parsed = JSON.parse(extractFirstJsonObject(raw));
      const shaped = parseHospitalsPayload(parsed);

      return shaped
        .map((h, index) => ({
          id: h.id || `ai-hospital-${index + 1}`,
          name: h.name,
          address: h.address,
          phone: h.phone ?? "",
          distanceKm: normalizeDistance(h.distanceKm),
          mapsUrl: h.mapsUrl && h.mapsUrl.startsWith("http") ? h.mapsUrl : buildMapsUrl(h.name, h.address),
        }))
        .filter((h) => h.name && h.address)
        .sort((a, b) => a.distanceKm - b.distanceKm)
        .slice(0, Math.max(3, Math.min(limit, 8)));
    } catch (error) {
      lastError = toUserFacingError(error);
    }
  }

  const message = lastError instanceof Error ? lastError.message : "Unknown generation failure.";
  throw new Error(`Failed to generate nearby hospitals via AI: ${message}`);
}
