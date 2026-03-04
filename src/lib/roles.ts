import { doc, getDoc, setDoc, collection, query, where, getDocs, deleteDoc } from "firebase/firestore";
import { db } from "./firebase";
import {
  type PatientProfile,
  type FamilyMemberProfile,
  type DoctorProfile,
  type PatientDoctorLink,
  type UserProfile,
  type UserRole,
} from "@/types/roles";

// Users collection (root-level, keyed by Firebase Auth UID)
const usersRef = (uid: string) => doc(db, "users", uid);

// Patient profiles collection (root-level, keyed by patientId)
const patientsRef = (patientId: string) => doc(db, "patients", patientId);

// Family members collection (root-level, keyed by family member UID)
const familyMembersRef = (uid: string) => doc(db, "familyMembers", uid);

// Doctor profiles collection (root-level, keyed by doctor UID)
const doctorsRef = (uid: string) => doc(db, "doctors", uid);

// Patient-Doctor links collection (root-level, keyed by composite ID)
const patientDoctorLinksRef = (patientId: string, doctorUid: string) =>
  doc(db, "patientDoctorLinks", `${patientId}_${doctorUid}`);

async function deletePatientDoctorLinksByPatientId(patientId: string): Promise<void> {
  const q = query(collection(db, "patientDoctorLinks"), where("patientId", "==", patientId));
  const snap = await getDocs(q);
  await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
}

async function deletePatientDoctorLinksByDoctorUid(doctorUid: string): Promise<void> {
  const q = query(collection(db, "patientDoctorLinks"), where("doctorUid", "==", doctorUid));
  const snap = await getDocs(q);
  await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
}

// ---- User Profile ----

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(usersRef(uid));
  if (!snap.exists()) return null;
  return snap.data() as UserProfile;
}

export async function setUserProfile(uid: string, profile: Omit<UserProfile, "uid">): Promise<void> {
  await setDoc(usersRef(uid), { uid, ...profile }, { merge: true });
}

// ---- Patient ----

export async function getPatientProfile(patientId: string): Promise<PatientProfile | null> {
  const snap = await getDoc(patientsRef(patientId));
  if (!snap.exists()) return null;
  return snap.data() as PatientProfile;
}

export async function getPatientProfileByUid(uid: string): Promise<PatientProfile | null> {
  const q = query(collection(db, "patients"), where("uid", "==", uid));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return snap.docs[0].data() as PatientProfile;
}

export async function createPatientProfile(patient: Omit<PatientProfile, "createdAt">): Promise<string> {
  const patientId = patient.patientId;
  await setDoc(patientsRef(patientId), { ...patient, createdAt: new Date() });
  return patientId;
}

// ---- Family Member ----

export async function getFamilyMemberProfile(uid: string): Promise<FamilyMemberProfile | null> {
  const snap = await getDoc(familyMembersRef(uid));
  if (!snap.exists()) return null;
  return snap.data() as FamilyMemberProfile;
}

export async function linkFamilyMemberToPatient(
  uid: string,
  patientId: string,
  firstName: string,
  lastName: string,
  dob: string,
  phone: string,
  email: string
): Promise<void> {
  await setDoc(familyMembersRef(uid), {
    uid,
    patientId,
    firstName,
    lastName,
    dob,
    phone,
    email,
    linkedAt: new Date(),
  });
}

export async function unlinkFamilyMember(uid: string): Promise<void> {
  await deleteDoc(familyMembersRef(uid));
}

// ---- Doctor ----

export async function getDoctorProfile(uid: string): Promise<DoctorProfile | null> {
  const snap = await getDoc(doctorsRef(uid));
  if (!snap.exists()) return null;
  return snap.data() as DoctorProfile;
}

export async function createDoctorProfile(doctor: Omit<DoctorProfile, "createdAt">): Promise<void> {
  await setDoc(doctorsRef(doctor.uid), { ...doctor, createdAt: new Date() });
}

// ---- Patient-Doctor Links ----

export async function linkPatientToDoctor(patientId: string, doctorUid: string): Promise<void> {
  await setDoc(patientDoctorLinksRef(patientId, doctorUid), {
    patientId,
    doctorUid,
    addedAt: new Date(),
  });
}

export async function unlinkPatientFromDoctor(patientId: string, doctorUid: string): Promise<void> {
  await deleteDoc(patientDoctorLinksRef(patientId, doctorUid));
}

export async function getPatientsForDoctor(doctorUid: string): Promise<PatientProfile[]> {
  const linksQuery = query(
    collection(db, "patientDoctorLinks"),
    where("doctorUid", "==", doctorUid)
  );
  const linksSnap = await getDocs(linksQuery);
  const patientIds = linksSnap.docs.map((d) => d.data().patientId as string);

  if (patientIds.length === 0) return [];

  const patientsPromises = patientIds.map((pid) => getPatientProfile(pid));
  const patients = await Promise.all(patientsPromises);
  const resolvedPatients = patients.filter((p): p is PatientProfile => p !== null);

  // Defensive dedupe: if legacy data has multiple patientIds for one uid,
  // show only one row per unique patient account in doctor dashboards.
  const byUid = new Map<string, PatientProfile>();
  for (const patient of resolvedPatients) {
    if (!byUid.has(patient.uid)) {
      byUid.set(patient.uid, patient);
    }
  }

  return Array.from(byUid.values());
}

export async function getFamilyMemberForPatient(patientId: string): Promise<FamilyMemberProfile | null> {
  const q = query(
    collection(db, "familyMembers"),
    where("patientId", "==", patientId)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  // Return the first linked family member (could be multiple in future)
  return snap.docs[0].data() as FamilyMemberProfile;
}

export async function getDoctorForPatient(patientId: string): Promise<DoctorProfile | null> {
  const q = query(
    collection(db, "patientDoctorLinks"),
    where("patientId", "==", patientId)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const doctorUid = snap.docs[0].data().doctorUid;
  return getDoctorProfile(doctorUid);
}

// ---- Helper: find doctor by doctorId ----

export async function getDoctorByDoctorId(doctorId: string): Promise<DoctorProfile | null> {
  const q = query(collection(db, "doctors"), where("doctorId", "==", doctorId));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return snap.docs[0].data() as DoctorProfile;
}

// ---- Account deletion cleanup ----

export async function deleteUserData(uid: string): Promise<void> {
  // Clean up patient profile(s) owned by this auth account and their link docs.
  const patientsByUidQ = query(collection(db, "patients"), where("uid", "==", uid));
  const patientsByUidSnap = await getDocs(patientsByUidQ);
  await Promise.all(
    patientsByUidSnap.docs.map(async (patientDoc) => {
      const patientId = (patientDoc.data() as PatientProfile).patientId;
      await deletePatientDoctorLinksByPatientId(patientId);
      await deleteDoc(patientDoc.ref);
    })
  );

  // If user is a doctor, remove doctor profile and all doctor-patient links.
  await deletePatientDoctorLinksByDoctorUid(uid);
  await deleteDoc(doctorsRef(uid));

  // If user is a family member, remove family mapping.
  await deleteDoc(familyMembersRef(uid));

  // Finally remove the primary auth user profile.
  await deleteDoc(usersRef(uid));
}

// ---- Helper: generate a readable patient ID ----

export function generatePatientId(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
