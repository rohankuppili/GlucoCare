export type UserRole = "patient" | "family" | "doctor";

export interface UserProfile {
  uid: string; // Firebase Auth UID
  email: string;
  firstName: string;
  lastName: string;
  dob: string; // YYYY-MM-DD
  phone: string; // 10-digit phone number
  displayName?: string;
  photoURL?: string;
  role: UserRole;
  onboarded: boolean;
  primaryPatientId?: string; // for patient accounts
  doctorId?: string; // for doctor accounts
  patientId?: string; // for family accounts (linked patient)
}

export interface PatientProfile {
  uid: string; // Firebase Auth UID of the patient
  patientId: string; // Unique readable patient ID (e.g., ABC123)
  firstName: string;
  lastName: string;
  dob: string; // YYYY-MM-DD
  phone: string; // 10-digit phone number
  email: string;
  createdAt: Date;
}

export interface FamilyMemberProfile {
  uid: string; // Firebase Auth UID of the family member
  patientId: string; // The patient they are linked to
  firstName: string;
  lastName: string;
  dob: string; // YYYY-MM-DD
  phone: string; // 10-digit phone number
  email: string;
  linkedAt: Date;
}

export interface DoctorProfile {
  uid: string; // Firebase Auth UID of the doctor
  doctorId: string; // Shareable doctor ID
  firstName: string;
  lastName: string;
  dob: string; // YYYY-MM-DD
  phone: string; // 10-digit phone number
  email: string;
  licenseNumber?: string;
  createdAt: Date;
}

// Mapping collection: a patient can be linked to multiple doctors
export interface PatientDoctorLink {
  patientId: string;
  doctorUid: string;
  addedAt: Date;
}
