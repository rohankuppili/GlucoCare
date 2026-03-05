import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
  Timestamp,
  updateDoc,
  writeBatch,
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
  type: "appointment" | "care-plan";
  title: string;
  message: string;
  createdAt: Date;
  isRead: boolean;
  appointmentId?: string;
  carePlanType?: DoctorCarePlanType;
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
  const type = raw.type === "care-plan" ? "care-plan" : "appointment";
  return {
    id: d.id,
    type,
    title: String(raw.title ?? ""),
    message: String(raw.message ?? ""),
    createdAt: toDateValue(raw.createdAt as Date | { toDate: () => Date }) ?? new Date(),
    isRead: Boolean(raw.isRead ?? false),
    appointmentId: (raw.appointmentId as string | undefined) ?? undefined,
    carePlanType: (raw.carePlanType as DoctorCarePlanType | undefined) ?? undefined,
    status: (raw.status as AppointmentStatus | undefined) ?? undefined,
  };
}

function sortByScheduledAsc(a: AppointmentDoc, b: AppointmentDoc): number {
  return a.scheduledAt.getTime() - b.scheduledAt.getTime();
}

function sortByCreatedDesc(a: NotificationDoc, b: NotificationDoc): number {
  return b.createdAt.getTime() - a.createdAt.getTime();
}

async function createCarePlanNotification(
  patientUid: string,
  doctorName: string,
  carePlanType: DoctorCarePlanType
): Promise<void> {
  const titleByType: Record<DoctorCarePlanType, string> = {
    prescription: "New Prescription",
    "diet-plan": "Diet Plan Updated",
    "exercise-goal": "Exercise Goal Updated",
    "medical-note": "Medical Notes Added",
  };
  const messageByType: Record<DoctorCarePlanType, string> = {
    prescription: `Dr. ${doctorName} has shared a new prescription.`,
    "diet-plan": `Dr. ${doctorName} has updated your diet plan.`,
    "exercise-goal": `Dr. ${doctorName} has set/updated your exercise goals.`,
    "medical-note": `Dr. ${doctorName} has added medical notes for you.`,
  };

  await addDoc(notificationsRef(patientUid), {
    type: "care-plan",
    carePlanType,
    title: titleByType[carePlanType],
    message: messageByType[carePlanType],
    isRead: false,
    createdAt: serverTimestamp(),
  });
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

export type MedicationReminderSlot =
  | "morning-before-food"
  | "morning-after-food"
  | "afternoon-before-food"
  | "afternoon-after-food"
  | "night-before-food"
  | "night-after-food";

type MedicationReminderTiming = {
  slot: MedicationReminderSlot;
  label: string;
  emailLabel: string;
  hour: number;
  minute: number;
};

export const MEDICATION_REMINDER_SLOTS: MedicationReminderTiming[] = [
  {
    slot: "morning-before-food",
    label: "Morning before food",
    emailLabel: "Morning before food (07:30 AM)",
    hour: 7,
    minute: 30,
  },
  {
    slot: "morning-after-food",
    label: "Morning after food",
    emailLabel: "Morning after food (09:00 AM)",
    hour: 9,
    minute: 0,
  },
  {
    slot: "afternoon-before-food",
    label: "Afternoon before food",
    emailLabel: "Afternoon before food (12:00 PM)",
    hour: 12,
    minute: 0,
  },
  {
    slot: "afternoon-after-food",
    label: "Afternoon after food",
    emailLabel: "Afternoon after food (02:00 PM)",
    hour: 14,
    minute: 0,
  },
  {
    slot: "night-before-food",
    label: "Night before food",
    emailLabel: "Night before food (07:30 PM)",
    hour: 19,
    minute: 30,
  },
  {
    slot: "night-after-food",
    label: "Night after food",
    emailLabel: "Night after food (09:30 PM)",
    hour: 21,
    minute: 30,
  },
];

type MedicationReminderEmailJobStatus = "pending" | "sent" | "disabled";

type MedicationReminderEmailJobDoc = {
  id: string;
  patientUid: string;
  patientName: string;
  patientEmail: string;
  scheduleDate: string; // YYYY-MM-DD
  slot: MedicationReminderSlot;
  slotLabel: string;
  sendAt: Date;
  status: MedicationReminderEmailJobStatus;
  medications: Array<{ name: string; dosage: string }>;
  createdAt?: Date;
  updatedAt?: Date;
  sentAt?: Date;
};

export type MedicationReminderSettingsDoc = {
  enabled: boolean;
  updatedAt?: Date;
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
const medicationReminderSettingsRef = (uid: string) =>
  doc(db, "users", uid, "settings", "medicationReminders");
const medicationReminderJobsRef = collection(db, "medicationReminderEmails");
// `mail` is used by the Firebase Trigger Email extension (or equivalent backend worker).
const mailQueueRef = collection(db, "mail");

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

function parseFirestoreMaybeDate(value: unknown): Date | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return value;
  if (value instanceof Timestamp) return value.toDate();
  if (typeof value === "object" && value && "toDate" in value) {
    return (value as { toDate: () => Date }).toDate();
  }
  return undefined;
}

function slotByPeriodTiming(
  period: "morning" | "afternoon" | "night",
  timing: Exclude<MealTimingOption, "none">
): MedicationReminderSlot {
  return `${period}-${timing}` as MedicationReminderSlot;
}

function reminderJobId(uid: string, date: string, slot: MedicationReminderSlot): string {
  return `${uid}_${date}_${slot}`.replace(/[^a-zA-Z0-9_-]/g, "_");
}

function formatDateYmd(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toReminderJobDoc(d: { id: string; data: () => Record<string, unknown> }): MedicationReminderEmailJobDoc {
  const raw = d.data();
  return {
    id: d.id,
    patientUid: String(raw.patientUid ?? ""),
    patientName: String(raw.patientName ?? ""),
    patientEmail: String(raw.patientEmail ?? ""),
    scheduleDate: String(raw.scheduleDate ?? ""),
    slot: (raw.slot as MedicationReminderSlot) ?? "morning-before-food",
    slotLabel: String(raw.slotLabel ?? ""),
    sendAt: parseFirestoreMaybeDate(raw.sendAt) ?? new Date(),
    status: (raw.status as MedicationReminderEmailJobStatus) ?? "pending",
    medications: Array.isArray(raw.medications)
      ? raw.medications.map((m) => ({
          name: String((m as { name?: unknown }).name ?? ""),
          dosage: String((m as { dosage?: unknown }).dosage ?? ""),
        }))
      : [],
    createdAt: parseFirestoreMaybeDate(raw.createdAt),
    updatedAt: parseFirestoreMaybeDate(raw.updatedAt),
    sentAt: parseFirestoreMaybeDate(raw.sentAt),
  };
}

function buildMedicationEmailContent(job: MedicationReminderEmailJobDoc): {
  subject: string;
  text: string;
  html: string;
} {
  const medLines = job.medications
    .map((m, idx) => `${idx + 1}. ${m.name} - ${m.dosage}`)
    .join("\n");
  const medHtml = job.medications
    .map((m) => `<li><strong>${m.name}</strong> (${m.dosage})</li>`)
    .join("");
  return {
    subject: `Medication Reminder: ${job.slotLabel}`,
    text: [
      `Hello ${job.patientName || "Patient"},`,
      "",
      `This is your medication reminder for ${job.slotLabel}.`,
      "",
      "Medications:",
      medLines || "No medication details available.",
      "",
      "Please take your medicines as prescribed by your doctor.",
      "",
      "Regards,",
      "GlucoCare",
    ].join("\n"),
    html: [
      `<p>Hello ${job.patientName || "Patient"},</p>`,
      `<p>This is your medication reminder for <strong>${job.slotLabel}</strong>.</p>`,
      `<p><strong>Medications:</strong></p>`,
      `<ul>${medHtml || "<li>No medication details available.</li>"}</ul>`,
      `<p>Please take your medicines as prescribed by your doctor.</p>`,
      `<p>Regards,<br/>GlucoCare</p>`,
    ].join(""),
  };
}

async function fetchPatientReminderMedicines(
  patientUid: string
): Promise<{ patientName: string; patientEmail: string; medicines: PrescriptionMedicineInput[] }> {
  const planSnap = await getDocs(
    query(carePlansRef, where("patientUid", "==", patientUid), where("type", "==", "prescription"))
  );

  const byMedicine = new Map<string, PrescriptionMedicineInput>();
  for (const snap of planSnap.docs) {
    const raw = snap.data() as Record<string, unknown>;
    if (!Array.isArray(raw.medicines)) continue;
    for (const med of raw.medicines as PrescriptionMedicineInput[]) {
      const name = (med.name ?? "").trim();
      const dosage = (med.dosage ?? "").trim();
      if (!name || !dosage) continue;
      byMedicine.set(`${name}__${dosage}`, {
        name,
        dosage,
        morning: med.morning ?? "none",
        afternoon: med.afternoon ?? "none",
        night: med.night ?? "none",
      });
    }
  }
  const medicines = Array.from(byMedicine.values());
  if (medicines.length === 0) {
    return { patientName: "Patient", patientEmail: "", medicines };
  }

  const userSnap = await getDoc(doc(db, "users", patientUid));
  const userData = (userSnap.exists() ? userSnap.data() : {}) as Record<string, unknown>;
  const patientName = `${String(userData.firstName ?? "")} ${String(userData.lastName ?? "")}`.trim();
  const patientEmail = String(userData.email ?? "").trim();
  if (!patientEmail) {
    throw new Error("Patient email address is missing.");
  }

  return { patientName: patientName || "Patient", patientEmail, medicines };
}

export async function getMedicationReminderSettings(uid: string): Promise<MedicationReminderSettingsDoc> {
  const snap = await getDoc(medicationReminderSettingsRef(uid));
  if (!snap.exists()) {
    return { enabled: true };
  }
  const raw = snap.data() as Record<string, unknown>;
  return {
    enabled: raw.enabled !== false,
    updatedAt: parseFirestoreMaybeDate(raw.updatedAt),
  };
}

export async function setMedicationReminderEnabled(uid: string, enabled: boolean): Promise<void> {
  await setDoc(
    medicationReminderSettingsRef(uid),
    {
      enabled,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export async function syncMedicationReminderJobsForPatient(
  patientUid: string,
  daysAhead = 30
): Promise<number> {
  const settings = await getMedicationReminderSettings(patientUid);
  if (!settings.enabled) return 0;

  const { patientEmail, patientName, medicines } = await fetchPatientReminderMedicines(patientUid);
  if (medicines.length === 0) {
    await disableMedicationReminderJobsForPatient(patientUid);
    return 0;
  }

  const medicationsBySlot = new Map<MedicationReminderSlot, Array<{ name: string; dosage: string }>>();
  for (const med of medicines) {
    if (med.morning !== "none") {
      const slot = slotByPeriodTiming("morning", med.morning);
      medicationsBySlot.set(slot, [...(medicationsBySlot.get(slot) ?? []), { name: med.name, dosage: med.dosage }]);
    }
    if (med.afternoon !== "none") {
      const slot = slotByPeriodTiming("afternoon", med.afternoon);
      medicationsBySlot.set(slot, [...(medicationsBySlot.get(slot) ?? []), { name: med.name, dosage: med.dosage }]);
    }
    if (med.night !== "none") {
      const slot = slotByPeriodTiming("night", med.night);
      medicationsBySlot.set(slot, [...(medicationsBySlot.get(slot) ?? []), { name: med.name, dosage: med.dosage }]);
    }
  }

  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const expectedIds = new Set<string>();
  const batch = writeBatch(db);
  let count = 0;

  for (let offset = 0; offset < daysAhead; offset += 1) {
    const runDate = new Date(start);
    runDate.setDate(start.getDate() + offset);
    const ymd = formatDateYmd(runDate);

    for (const slotTiming of MEDICATION_REMINDER_SLOTS) {
      const slotMeds = medicationsBySlot.get(slotTiming.slot);
      if (!slotMeds || slotMeds.length === 0) continue;

      const sendAt = new Date(
        runDate.getFullYear(),
        runDate.getMonth(),
        runDate.getDate(),
        slotTiming.hour,
        slotTiming.minute,
        0,
        0
      );
      if (sendAt.getTime() <= now.getTime()) {
        continue;
      }

      const id = reminderJobId(patientUid, ymd, slotTiming.slot);
      expectedIds.add(id);
      batch.set(doc(medicationReminderJobsRef, id), {
        patientUid,
        patientName,
        patientEmail,
        scheduleDate: ymd,
        slot: slotTiming.slot,
        slotLabel: slotTiming.emailLabel,
        sendAt,
        status: "pending" as MedicationReminderEmailJobStatus,
        medications: slotMeds,
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      });
      count += 1;
    }
  }

  const existingSnap = await getDocs(
    query(medicationReminderJobsRef, where("patientUid", "==", patientUid), where("status", "==", "pending"))
  );
  for (const existing of existingSnap.docs) {
    if (!expectedIds.has(existing.id)) {
      batch.update(existing.ref, {
        status: "disabled" as MedicationReminderEmailJobStatus,
        updatedAt: serverTimestamp(),
      });
    }
  }

  await batch.commit();
  return count;
}

export async function disableMedicationReminderJobsForPatient(patientUid: string): Promise<void> {
  const pendingSnap = await getDocs(
    query(medicationReminderJobsRef, where("patientUid", "==", patientUid), where("status", "==", "pending"))
  );
  if (pendingSnap.empty) return;
  const batch = writeBatch(db);
  for (const item of pendingSnap.docs) {
    batch.update(item.ref, {
      status: "disabled" as MedicationReminderEmailJobStatus,
      updatedAt: serverTimestamp(),
    });
  }
  await batch.commit();
}

export async function dispatchDueMedicationReminderEmails(
  patientUid: string,
  maxJobs = 6
): Promise<number> {
  const settings = await getMedicationReminderSettings(patientUid);
  if (!settings.enabled) return 0;

  const snap = await getDocs(
    query(
      medicationReminderJobsRef,
      where("patientUid", "==", patientUid),
      where("status", "==", "pending"),
      orderBy("sendAt", "asc"),
      limit(maxJobs)
    )
  );
  if (snap.empty) return 0;

  const now = Date.now();
  const dueJobs = snap.docs
    .map((d) => toReminderJobDoc(d))
    .filter((job) => job.sendAt.getTime() <= now && !!job.patientEmail);

  if (dueJobs.length === 0) return 0;

  const batch = writeBatch(db);
  for (const job of dueJobs) {
    const content = buildMedicationEmailContent(job);
    const mailDocRef = doc(mailQueueRef);
    batch.set(mailDocRef, {
      to: [job.patientEmail],
      message: {
        subject: content.subject,
        text: content.text,
        html: content.html,
      },
      patientUid: job.patientUid,
      reminderJobId: job.id,
      kind: "medication-reminder",
      createdAt: serverTimestamp(),
    });
    batch.update(doc(medicationReminderJobsRef, job.id), {
      status: "sent" as MedicationReminderEmailJobStatus,
      sentAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
  await batch.commit();
  return dueJobs.length;
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

  const existing = await getDocs(
    query(
      carePlansRef,
      where("patientUid", "==", input.patientUid),
      where("doctorUid", "==", input.doctorUid),
      where("type", "==", "prescription")
    )
  );

  if (medicines.length === 0) {
    if (!existing.empty) {
      await Promise.all(existing.docs.map((d) => deleteDoc(d.ref)));
    }
    await disableMedicationReminderJobsForPatient(input.patientUid);
    return;
  }

  const payload = {
    type: "prescription" as DoctorCarePlanType,
    patientUid: input.patientUid,
    patientId: input.patientId,
    patientName: input.patientName,
    doctorUid: input.doctorUid,
    doctorId: input.doctorId,
    doctorName: input.doctorName,
    medicines,
    comments: input.comments?.trim() || null,
    updatedAt: serverTimestamp(),
  };

  if (!existing.empty) {
    await updateDoc(existing.docs[0].ref, payload);
  } else {
    await addDoc(carePlansRef, {
      ...payload,
      createdAt: serverTimestamp(),
    });
  }
  const settings = await getMedicationReminderSettings(input.patientUid);
  if (settings.enabled) {
    await syncMedicationReminderJobsForPatient(input.patientUid);
  } else {
    await disableMedicationReminderJobsForPatient(input.patientUid);
  }
  await createCarePlanNotification(input.patientUid, input.doctorName, "prescription");
}

export async function createDietPlan(input: CreateDietPlanInput): Promise<void> {
  if (!input.text.trim()) {
    throw new Error("Diet plan text is required.");
  }
  if (!Number.isFinite(input.calorieLimit) || input.calorieLimit <= 0) {
    throw new Error("Calorie limit must be a positive number.");
  }

  const existing = await getDocs(
    query(
      carePlansRef,
      where("patientUid", "==", input.patientUid),
      where("doctorUid", "==", input.doctorUid),
      where("type", "==", "diet-plan")
    )
  );

  const payload = {
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
    updatedAt: serverTimestamp(),
  };

  if (!existing.empty) {
    await updateDoc(existing.docs[0].ref, payload);
  } else {
    await addDoc(carePlansRef, {
      ...payload,
      createdAt: serverTimestamp(),
    });
  }
  await createCarePlanNotification(input.patientUid, input.doctorName, "diet-plan");
}

export async function createExerciseGoal(input: CreateExerciseGoalInput): Promise<void> {
  if (!input.text.trim()) {
    throw new Error("Exercise goal text is required.");
  }

  const existing = await getDocs(
    query(
      carePlansRef,
      where("patientUid", "==", input.patientUid),
      where("doctorUid", "==", input.doctorUid),
      where("type", "==", "exercise-goal")
    )
  );

  const payload = {
    type: "exercise-goal" as DoctorCarePlanType,
    patientUid: input.patientUid,
    patientId: input.patientId,
    patientName: input.patientName,
    doctorUid: input.doctorUid,
    doctorId: input.doctorId,
    doctorName: input.doctorName,
    text: input.text.trim(),
    updatedAt: serverTimestamp(),
  };

  if (!existing.empty) {
    await updateDoc(existing.docs[0].ref, payload);
  } else {
    await addDoc(carePlansRef, {
      ...payload,
      createdAt: serverTimestamp(),
    });
  }
  await createCarePlanNotification(input.patientUid, input.doctorName, "exercise-goal");
}

export async function createMedicalNote(input: CreateMedicalNoteInput): Promise<void> {
  const items = input.items.map((item) => item.trim()).filter(Boolean);
  if (items.length === 0) {
    throw new Error("Add at least one medical note item.");
  }

  const existing = await getDocs(
    query(
      carePlansRef,
      where("patientUid", "==", input.patientUid),
      where("doctorUid", "==", input.doctorUid),
      where("type", "==", "medical-note")
    )
  );

  const payload = {
    type: "medical-note" as DoctorCarePlanType,
    patientUid: input.patientUid,
    patientId: input.patientId,
    patientName: input.patientName,
    doctorUid: input.doctorUid,
    doctorId: input.doctorId,
    doctorName: input.doctorName,
    items,
    updatedAt: serverTimestamp(),
  };

  if (!existing.empty) {
    await updateDoc(existing.docs[0].ref, payload);
  } else {
    await addDoc(carePlansRef, {
      ...payload,
      createdAt: serverTimestamp(),
    });
  }
  await createCarePlanNotification(input.patientUid, input.doctorName, "medical-note");
}

export async function listCarePlansForPatient(
  patientUid?: string,
  patientId?: string
): Promise<DoctorCarePlanDoc[]> {
  const fetches: Promise<import("firebase/firestore").QuerySnapshot>[] = [];
  if (patientUid) {
    fetches.push(getDocs(query(carePlansRef, where("patientUid", "==", patientUid))));
  }
  if (patientId) {
    fetches.push(getDocs(query(carePlansRef, where("patientId", "==", patientId))));
  }
  if (fetches.length === 0) return [];

  const snaps = await Promise.all(fetches);
  const byId = new Map<string, DoctorCarePlanDoc>();
  for (const snap of snaps) {
    for (const docSnap of snap.docs) {
      const item = toDoctorCarePlanDoc(docSnap);
      byId.set(item.id, item);
    }
  }
  return Array.from(byId.values()).sort(sortPlansByCreatedDesc);
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
