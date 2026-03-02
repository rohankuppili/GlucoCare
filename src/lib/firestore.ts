import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export type GlucoseReadingCreateInput = {
  value: number;
  unit: "mg/dL" | "mmol/L";
  type: "fasting" | "post-meal" | "random" | "bedtime";
  timestamp: Date;
  notes?: string;
};

export type GlucoseReadingDoc = {
  id: string;
  value: number;
  unit: "mg/dL" | "mmol/L";
  type: "fasting" | "post-meal" | "random" | "bedtime";
  timestamp: Date;
  notes?: string;
};

const readingsCollection = (uid: string) => collection(db, "users", uid, "readings");

export async function createGlucoseReading(uid: string, input: GlucoseReadingCreateInput) {
  return addDoc(readingsCollection(uid), {
    value: input.value,
    unit: input.unit,
    type: input.type,
    timestamp: input.timestamp,
    notes: input.notes ?? null,
    createdAt: serverTimestamp(),
  });
}

export async function listGlucoseReadings(uid: string): Promise<GlucoseReadingDoc[]> {
  const q = query(readingsCollection(uid), orderBy("timestamp", "desc"));
  const snap = await getDocs(q);

  return snap.docs.map((d) => {
    const data = d.data() as {
      value: number;
      unit: GlucoseReadingDoc["unit"];
      type: GlucoseReadingDoc["type"];
      timestamp: { toDate: () => Date } | Date;
      notes?: string | null;
    };

    const ts = data.timestamp instanceof Date ? data.timestamp : data.timestamp.toDate();

    return {
      id: d.id,
      value: data.value,
      unit: data.unit,
      type: data.type,
      timestamp: ts,
      notes: data.notes ?? undefined,
    };
  });
}

export async function deleteGlucoseReading(uid: string, readingId: string) {
  const ref = doc(db, "users", uid, "readings", readingId);
  return deleteDoc(ref);
}
