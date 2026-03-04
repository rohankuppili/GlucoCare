import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  Timestamp,
  updateDoc,
  where,
  serverTimestamp,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { db, storage } from "@/lib/firebase";

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

export type DailyHealthMetricsInput = {
  date: string; // YYYY-MM-DD
  fastingGlucose: number;
  postMealGlucose: number;
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
  heartRate?: number;
  weight?: number;
  hba1c?: number;
  notes?: string;
};

export type DailyHealthMetricsDoc = DailyHealthMetricsInput & {
  id: string;
  uid: string;
  createdAt?: Date;
  updatedAt?: Date;
};

const dailyHealthRef = (uid: string) => collection(db, "users", uid, "dailyHealth");

function parseFirestoreDate(value: unknown): Date | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return value;
  if (value instanceof Timestamp) return value.toDate();
  if (typeof value === "object" && value && "toDate" in value) {
    return (value as { toDate: () => Date }).toDate();
  }
  return undefined;
}

function normalizeOptionalNumber(n: number | undefined): number | null {
  return typeof n === "number" && Number.isFinite(n) ? n : null;
}

export async function upsertDailyHealthMetrics(uid: string, input: DailyHealthMetricsInput): Promise<void> {
  if (!input.date || !input.fastingGlucose || !input.postMealGlucose) {
    throw new Error("Date, fasting glucose, and post-meal glucose are required.");
  }

  const q = query(dailyHealthRef(uid), where("date", "==", input.date));
  const existing = await getDocs(q);

  const payload = {
    uid,
    date: input.date,
    fastingGlucose: input.fastingGlucose,
    postMealGlucose: input.postMealGlucose,
    bloodPressureSystolic: normalizeOptionalNumber(input.bloodPressureSystolic),
    bloodPressureDiastolic: normalizeOptionalNumber(input.bloodPressureDiastolic),
    heartRate: normalizeOptionalNumber(input.heartRate),
    weight: normalizeOptionalNumber(input.weight),
    hba1c: normalizeOptionalNumber(input.hba1c),
    notes: input.notes?.trim() || null,
    updatedAt: serverTimestamp(),
  };

  if (!existing.empty) {
    await updateDoc(existing.docs[0].ref, payload);
    return;
  }

  await addDoc(dailyHealthRef(uid), {
    ...payload,
    createdAt: serverTimestamp(),
  });
}

export async function listDailyHealthMetrics(uid: string): Promise<DailyHealthMetricsDoc[]> {
  const q = query(dailyHealthRef(uid), orderBy("date", "desc"));
  const snap = await getDocs(q);

  return snap.docs.map((d) => {
    const data = d.data() as Record<string, unknown>;
    return {
      id: d.id,
      uid: String(data.uid ?? uid),
      date: String(data.date ?? ""),
      fastingGlucose: Number(data.fastingGlucose ?? 0),
      postMealGlucose: Number(data.postMealGlucose ?? 0),
      bloodPressureSystolic:
        typeof data.bloodPressureSystolic === "number" ? data.bloodPressureSystolic : undefined,
      bloodPressureDiastolic:
        typeof data.bloodPressureDiastolic === "number" ? data.bloodPressureDiastolic : undefined,
      heartRate: typeof data.heartRate === "number" ? data.heartRate : undefined,
      weight: typeof data.weight === "number" ? data.weight : undefined,
      hba1c: typeof data.hba1c === "number" ? data.hba1c : undefined,
      notes: typeof data.notes === "string" ? data.notes : undefined,
      createdAt: parseFirestoreDate(data.createdAt),
      updatedAt: parseFirestoreDate(data.updatedAt),
    };
  });
}

export type AppointmentStatus = "pending" | "approved" | "rejected";

export type AppointmentDoc = {
  id: string;
  patientUid: string;
  patientId: string;
  patientName: string;
  doctorUid: string;
  doctorId: string;
  doctorName: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm (24-hour)
  slotLabel: string; // e.g. 09:30 AM - 10:00 AM
  scheduledAt: Date;
  status: AppointmentStatus;
  statusUpdatedAt?: Date;
  requestedAt?: Date;
  note?: string;
};

export type NotificationDoc = {
  id: string;
  type: "appointment";
  title: string;
  message: string;
  createdAt: Date;
  isRead: boolean;
  appointmentId?: string;
  status?: AppointmentStatus;
};

type AppointmentRequestInput = {
  patientUid: string;
  patientId: string;
  patientName: string;
  doctorUid: string;
  doctorId: string;
  doctorName: string;
  date: string;
  time: string;
  slotLabel: string;
};

type DoctorAppointmentCreateInput = {
  patientUid: string;
  patientId: string;
  patientName: string;
  doctorUid: string;
  doctorId: string;
  doctorName: string;
  date: string;
  time: string;
  slotLabel: string;
  note?: string;
};

const appointmentsRef = collection(db, "appointments");
const notificationsRef = (uid: string) => collection(db, "users", uid, "notifications");

function toDateValue(value: Date | { toDate: () => Date } | undefined): Date | undefined {
  if (!value) return undefined;
  return value instanceof Date ? value : value.toDate();
}

function toAppointmentDoc(d: { id: string; data: () => Record<string, unknown> }): AppointmentDoc {
  const raw = d.data();
  return {
    id: d.id,
    patientUid: String(raw.patientUid ?? ""),
    patientId: String(raw.patientId ?? ""),
    patientName: String(raw.patientName ?? ""),
    doctorUid: String(raw.doctorUid ?? ""),
    doctorId: String(raw.doctorId ?? ""),
    doctorName: String(raw.doctorName ?? ""),
    date: String(raw.date ?? ""),
    time: String(raw.time ?? ""),
    slotLabel: String(raw.slotLabel ?? ""),
    scheduledAt: toDateValue(raw.scheduledAt as Date | { toDate: () => Date }) ?? new Date(),
    status: (raw.status as AppointmentStatus) ?? "pending",
    statusUpdatedAt: toDateValue(raw.statusUpdatedAt as Date | { toDate: () => Date } | undefined),
    requestedAt: toDateValue(raw.requestedAt as Date | { toDate: () => Date } | undefined),
    note: (raw.note as string | undefined) ?? undefined,
  };
}

function toNotificationDoc(d: { id: string; data: () => Record<string, unknown> }): NotificationDoc {
  const raw = d.data();
  return {
    id: d.id,
    type: "appointment",
    title: String(raw.title ?? ""),
    message: String(raw.message ?? ""),
    createdAt: toDateValue(raw.createdAt as Date | { toDate: () => Date }) ?? new Date(),
    isRead: Boolean(raw.isRead ?? false),
    appointmentId: (raw.appointmentId as string | undefined) ?? undefined,
    status: (raw.status as AppointmentStatus | undefined) ?? undefined,
  };
}

function sortByScheduledAsc(a: AppointmentDoc, b: AppointmentDoc): number {
  return a.scheduledAt.getTime() - b.scheduledAt.getTime();
}

function sortByCreatedDesc(a: NotificationDoc, b: NotificationDoc): number {
  return b.createdAt.getTime() - a.createdAt.getTime();
}

export type TimeSlotOption = {
  value: string;
  label: string;
};

export function buildDayTimeSlots(): TimeSlotOption[] {
  const slots: TimeSlotOption[] = [];
  // 9:00 AM to 4:00 PM window => start slots from 09:00 to 15:30
  for (let hour = 9; hour <= 15; hour += 1) {
    for (const minute of [0, 30]) {
      const hh = String(hour).padStart(2, "0");
      const mm = String(minute).padStart(2, "0");
      const value = `${hh}:${mm}`;
      const start = new Date(`2000-01-01T${value}:00`);
      const end = new Date(start.getTime() + 30 * 60 * 1000);
      const label = `${start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - ${end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
      slots.push({ value, label });
    }
  }
  return slots;
}

export async function listAvailableAppointmentSlotsForDoctor(
  doctorUid: string,
  date: string
): Promise<TimeSlotOption[]> {
  const allSlots = buildDayTimeSlots();
  const items = await listAppointmentsForDoctor(doctorUid);
  const blockedTimes = new Set(
    items
      .filter((a) => a.date === date && (a.status === "pending" || a.status === "approved"))
      .map((a) => a.time)
  );
  return allSlots.filter((slot) => !blockedTimes.has(slot.value));
}

export async function createAppointmentRequest(input: AppointmentRequestInput): Promise<void> {
  const scheduledAt = new Date(`${input.date}T${input.time}:00`);
  if (Number.isNaN(scheduledAt.getTime())) {
    throw new Error("Invalid appointment date/time");
  }

  const doctorAppointments = await listAppointmentsForDoctor(input.doctorUid);
  const sameSlotTaken = doctorAppointments.some(
    (a) =>
      a.date === input.date &&
      a.time === input.time &&
      (a.status === "pending" || a.status === "approved")
  );
  if (sameSlotTaken) {
    throw new Error("This slot is already requested/booked. Please choose another timeslot.");
  }

  await addDoc(appointmentsRef, {
    patientUid: input.patientUid,
    patientId: input.patientId,
    patientName: input.patientName,
    doctorUid: input.doctorUid,
    doctorId: input.doctorId,
    doctorName: input.doctorName,
    date: input.date,
    time: input.time,
    slotLabel: input.slotLabel,
    scheduledAt,
    status: "pending" as AppointmentStatus,
    requestedAt: serverTimestamp(),
    statusUpdatedAt: serverTimestamp(),
  });
}

export async function createDoctorScheduledAppointment(
  input: DoctorAppointmentCreateInput
): Promise<void> {
  const scheduledAt = new Date(`${input.date}T${input.time}:00`);
  if (Number.isNaN(scheduledAt.getTime())) {
    throw new Error("Invalid appointment date/time");
  }

  const availableSlots = await listAvailableAppointmentSlotsForDoctor(input.doctorUid, input.date);
  const isAvailable = availableSlots.some((slot) => slot.value === input.time);
  if (!isAvailable) {
    throw new Error("Selected slot is not available.");
  }

  const ref = await addDoc(appointmentsRef, {
    patientUid: input.patientUid,
    patientId: input.patientId,
    patientName: input.patientName,
    doctorUid: input.doctorUid,
    doctorId: input.doctorId,
    doctorName: input.doctorName,
    date: input.date,
    time: input.time,
    slotLabel: input.slotLabel,
    scheduledAt,
    status: "approved" as AppointmentStatus,
    requestedAt: serverTimestamp(),
    statusUpdatedAt: serverTimestamp(),
    note: input.note ?? null,
  });

  await addDoc(notificationsRef(input.patientUid), {
    type: "appointment",
    title: "Appointment scheduled",
    message: `Dr. ${input.doctorName} scheduled your visit on ${input.date} (${input.slotLabel}).`,
    status: "approved" as AppointmentStatus,
    appointmentId: ref.id,
    isRead: false,
    createdAt: serverTimestamp(),
  });
}

export async function listAppointmentsForDoctor(doctorUid: string): Promise<AppointmentDoc[]> {
  const q = query(appointmentsRef, where("doctorUid", "==", doctorUid));
  const snap = await getDocs(q);
  const items = snap.docs.map((d) => toAppointmentDoc(d));
  return items.sort(sortByScheduledAsc);
}

export async function listAppointmentsForPatient(patientUid: string): Promise<AppointmentDoc[]> {
  const q = query(appointmentsRef, where("patientUid", "==", patientUid));
  const snap = await getDocs(q);
  const items = snap.docs.map((d) => toAppointmentDoc(d));
  return items.sort(sortByScheduledAsc);
}

export async function updateAppointmentStatus(
  appointmentId: string,
  status: AppointmentStatus,
  doctorUid: string,
  note?: string
): Promise<void> {
  const appointmentDocRef = doc(db, "appointments", appointmentId);
  const snap = await getDoc(appointmentDocRef);
  if (!snap.exists()) {
    throw new Error("Appointment not found.");
  }
  const appointment = toAppointmentDoc({ id: snap.id, data: () => snap.data() as Record<string, unknown> });
  if (appointment.doctorUid !== doctorUid) {
    throw new Error("Unauthorized appointment update.");
  }

  await updateDoc(appointmentDocRef, {
    status,
    statusUpdatedAt: serverTimestamp(),
    note: note ?? null,
  });

  const statusText = status === "approved" ? "approved" : "rejected";
  await addDoc(notificationsRef(appointment.patientUid), {
    type: "appointment",
    title: `Appointment ${statusText}`,
    message: `Your appointment on ${appointment.date} (${appointment.slotLabel}) was ${statusText} by Dr. ${appointment.doctorName}.`,
    status,
    appointmentId,
    isRead: false,
    createdAt: serverTimestamp(),
  });
}

export async function listNotifications(uid: string): Promise<NotificationDoc[]> {
  const q = query(notificationsRef(uid), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  const items = snap.docs.map((d) => toNotificationDoc(d));
  return items.sort(sortByCreatedDesc);
}

export type MealTimingOption = "before-food" | "after-food" | "none";

export type PrescriptionMedicineInput = {
  name: string;
  dosage: string;
  morning: MealTimingOption;
  afternoon: MealTimingOption;
  night: MealTimingOption;
};

export type PrescriptionDoc = {
  medicines: PrescriptionMedicineInput[];
  comments?: string;
};

export type DietPlanDoc = {
  text: string;
  calorieLimit: number;
  imageUrl?: string;
  imagePath?: string;
};

export type ExerciseGoalDoc = {
  text: string;
};

export type MedicalNoteDoc = {
  items: string[];
};

export type DoctorCarePlanType = "prescription" | "diet-plan" | "exercise-goal" | "medical-note";

export type DoctorCarePlanDoc = {
  id: string;
  type: DoctorCarePlanType;
  patientUid: string;
  patientId: string;
  patientName: string;
  doctorUid: string;
  doctorId: string;
  doctorName: string;
  createdAt?: Date;
  prescription?: PrescriptionDoc;
  dietPlan?: DietPlanDoc;
  exerciseGoal?: ExerciseGoalDoc;
  medicalNote?: MedicalNoteDoc;
};

type DoctorCarePlanBaseInput = {
  patientUid: string;
  patientId: string;
  patientName: string;
  doctorUid: string;
  doctorId: string;
  doctorName: string;
};

export type CreatePrescriptionInput = DoctorCarePlanBaseInput & {
  medicines: PrescriptionMedicineInput[];
  comments?: string;
};

export type CreateDietPlanInput = DoctorCarePlanBaseInput & {
  text: string;
  calorieLimit: number;
  imageUrl?: string;
  imagePath?: string;
};

export type CreateExerciseGoalInput = DoctorCarePlanBaseInput & {
  text: string;
};

export type CreateMedicalNoteInput = DoctorCarePlanBaseInput & {
  items: string[];
};

export type DoctorPrivateNoteDoc = {
  id: string;
  doctorUid: string;
  patientUid: string;
  patientId: string;
  patientName: string;
  note: string;
  createdAt?: Date;
};

type CreateDoctorPrivateNoteInput = {
  doctorUid: string;
  patientUid: string;
  patientId: string;
  patientName: string;
  note: string;
};

const carePlansRef = collection(db, "doctorCarePlans");
const doctorPrivateNotesRef = (doctorUid: string) => collection(db, "users", doctorUid, "privateNotes");

const MAX_DIET_PLAN_IMAGE_BYTES = 5 * 1024 * 1024;

function toDoctorCarePlanDoc(d: { id: string; data: () => Record<string, unknown> }): DoctorCarePlanDoc {
  const raw = d.data();
  return {
    id: d.id,
    type: (raw.type as DoctorCarePlanType) ?? "medical-note",
    patientUid: String(raw.patientUid ?? ""),
    patientId: String(raw.patientId ?? ""),
    patientName: String(raw.patientName ?? ""),
    doctorUid: String(raw.doctorUid ?? ""),
    doctorId: String(raw.doctorId ?? ""),
    doctorName: String(raw.doctorName ?? ""),
    createdAt: toDateValue(raw.createdAt as Date | { toDate: () => Date } | undefined),
    prescription:
      raw.type === "prescription"
        ? {
            medicines: Array.isArray(raw.medicines)
              ? (raw.medicines as PrescriptionMedicineInput[])
              : [],
            comments: typeof raw.comments === "string" ? raw.comments : undefined,
          }
        : undefined,
    dietPlan:
      raw.type === "diet-plan"
        ? {
            text: String(raw.text ?? ""),
            calorieLimit: Number(raw.calorieLimit ?? 0),
            imageUrl: typeof raw.imageUrl === "string" ? raw.imageUrl : undefined,
            imagePath: typeof raw.imagePath === "string" ? raw.imagePath : undefined,
          }
        : undefined,
    exerciseGoal:
      raw.type === "exercise-goal"
        ? {
            text: String(raw.text ?? ""),
          }
        : undefined,
    medicalNote:
      raw.type === "medical-note"
        ? {
            items: Array.isArray(raw.items) ? raw.items.map((item) => String(item)) : [],
          }
        : undefined,
  };
}

function toDoctorPrivateNoteDoc(d: { id: string; data: () => Record<string, unknown> }): DoctorPrivateNoteDoc {
  const raw = d.data();
  return {
    id: d.id,
    doctorUid: String(raw.doctorUid ?? ""),
    patientUid: String(raw.patientUid ?? ""),
    patientId: String(raw.patientId ?? ""),
    patientName: String(raw.patientName ?? ""),
    note: String(raw.note ?? ""),
    createdAt: toDateValue(raw.createdAt as Date | { toDate: () => Date } | undefined),
  };
}

function sortPlansByCreatedDesc(a: DoctorCarePlanDoc, b: DoctorCarePlanDoc): number {
  return (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0);
}

function sortPrivateNotesByCreatedDesc(a: DoctorPrivateNoteDoc, b: DoctorPrivateNoteDoc): number {
  return (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0);
}

export async function uploadDietPlanImage(
  file: File,
  doctorUid: string,
  patientUid: string
): Promise<{ imageUrl: string; imagePath: string }> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Please upload a valid image file.");
  }
  if (file.size > MAX_DIET_PLAN_IMAGE_BYTES) {
    throw new Error("Image should be under 5 MB.");
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const imagePath = `dietPlans/${doctorUid}/${patientUid}/${Date.now()}-${safeName}`;
  const storageRef = ref(storage, imagePath);
  await uploadBytes(storageRef, file);
  const imageUrl = await getDownloadURL(storageRef);
  return { imageUrl, imagePath };
}

export async function createPrescriptionPlan(input: CreatePrescriptionInput): Promise<void> {
  const medicines = input.medicines
    .map((m) => ({
      name: m.name.trim(),
      dosage: m.dosage.trim(),
      morning: m.morning,
      afternoon: m.afternoon,
      night: m.night,
    }))
    .filter((m) => m.name && m.dosage);

  if (medicines.length === 0) {
    throw new Error("Add at least one medicine with name and dosage.");
  }

  await addDoc(carePlansRef, {
    type: "prescription" as DoctorCarePlanType,
    patientUid: input.patientUid,
    patientId: input.patientId,
    patientName: input.patientName,
    doctorUid: input.doctorUid,
    doctorId: input.doctorId,
    doctorName: input.doctorName,
    medicines,
    comments: input.comments?.trim() || null,
    createdAt: serverTimestamp(),
  });
}

export async function createDietPlan(input: CreateDietPlanInput): Promise<void> {
  if (!input.text.trim()) {
    throw new Error("Diet plan text is required.");
  }
  if (!Number.isFinite(input.calorieLimit) || input.calorieLimit <= 0) {
    throw new Error("Calorie limit must be a positive number.");
  }

  await addDoc(carePlansRef, {
    type: "diet-plan" as DoctorCarePlanType,
    patientUid: input.patientUid,
    patientId: input.patientId,
    patientName: input.patientName,
    doctorUid: input.doctorUid,
    doctorId: input.doctorId,
    doctorName: input.doctorName,
    text: input.text.trim(),
    calorieLimit: Math.round(input.calorieLimit),
    imageUrl: input.imageUrl ?? null,
    imagePath: input.imagePath ?? null,
    createdAt: serverTimestamp(),
  });
}

export async function createExerciseGoal(input: CreateExerciseGoalInput): Promise<void> {
  if (!input.text.trim()) {
    throw new Error("Exercise goal text is required.");
  }

  await addDoc(carePlansRef, {
    type: "exercise-goal" as DoctorCarePlanType,
    patientUid: input.patientUid,
    patientId: input.patientId,
    patientName: input.patientName,
    doctorUid: input.doctorUid,
    doctorId: input.doctorId,
    doctorName: input.doctorName,
    text: input.text.trim(),
    createdAt: serverTimestamp(),
  });
}

export async function createMedicalNote(input: CreateMedicalNoteInput): Promise<void> {
  const items = input.items.map((item) => item.trim()).filter(Boolean);
  if (items.length === 0) {
    throw new Error("Add at least one medical note item.");
  }

  await addDoc(carePlansRef, {
    type: "medical-note" as DoctorCarePlanType,
    patientUid: input.patientUid,
    patientId: input.patientId,
    patientName: input.patientName,
    doctorUid: input.doctorUid,
    doctorId: input.doctorId,
    doctorName: input.doctorName,
    items,
    createdAt: serverTimestamp(),
  });
}

export async function listCarePlansForPatient(patientUid: string): Promise<DoctorCarePlanDoc[]> {
  const q = query(carePlansRef, where("patientUid", "==", patientUid));
  const snap = await getDocs(q);
  const items = snap.docs.map((d) => toDoctorCarePlanDoc(d));
  return items.sort(sortPlansByCreatedDesc);
}

export async function addDoctorPrivateNote(input: CreateDoctorPrivateNoteInput): Promise<void> {
  const note = input.note.trim();
  if (!note) {
    throw new Error("Note cannot be empty.");
  }

  await addDoc(doctorPrivateNotesRef(input.doctorUid), {
    doctorUid: input.doctorUid,
    patientUid: input.patientUid,
    patientId: input.patientId,
    patientName: input.patientName,
    note,
    createdAt: serverTimestamp(),
  });
}

export async function listDoctorPrivateNotes(
  doctorUid: string,
  patientUid: string
): Promise<DoctorPrivateNoteDoc[]> {
  const q = query(doctorPrivateNotesRef(doctorUid), where("patientUid", "==", patientUid));
  const snap = await getDocs(q);
  const items = snap.docs.map((d) => toDoctorPrivateNoteDoc(d));
  return items.sort(sortPrivateNotesByCreatedDesc);
}
