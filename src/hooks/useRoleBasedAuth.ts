import { useEffect, useState } from "react";
import { useAuthUser } from "./useAuthUser";
import {
  getUserProfile,
  getPatientProfile,
  getFamilyMemberProfile,
  getDoctorProfile,
  getPatientsForDoctor,
  getFamilyMemberForPatient,
  getDoctorForPatient,
} from "@/lib/roles";
import type {
  PatientProfile,
  FamilyMemberProfile,
  DoctorProfile,
  UserRole,
} from "@/types/roles";

export function useRoleBasedAuth() {
  const { user } = useAuthUser();
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [patientProfile, setPatientProfile] = useState<PatientProfile | null>(null);
  const [familyMemberProfile, setFamilyMemberProfile] = useState<FamilyMemberProfile | null>(null);
  const [doctorProfile, setDoctorProfile] = useState<DoctorProfile | null>(null);
  const [linkedPatients, setLinkedPatients] = useState<PatientProfile[]>([]);
  const [linkedPatient, setLinkedPatient] = useState<PatientProfile | null>(null);
  const [linkedDoctor, setLinkedDoctor] = useState<DoctorProfile | null>(null);

  useEffect(() => {
    if (!user) {
      setRole(null);
      setPatientProfile(null);
      setFamilyMemberProfile(null);
      setDoctorProfile(null);
      setLinkedPatients([]);
      setLinkedPatient(null);
      setLinkedDoctor(null);
      setLoading(false);
      return;
    }

    async function load() {
      setLoading(true);
      const profile = await getUserProfile(user.uid);
      if (!profile) {
        setRole(null);
        setLoading(false);
        return;
      }

      setRole(profile.role);

      if (profile.role === "patient") {
        const patientId = profile.primaryPatientId;
        const patient = patientId ? await getPatientProfile(patientId) : null;
        setPatientProfile(patient);
      } else if (profile.role === "family") {
        const fm = await getFamilyMemberProfile(user.uid);
        setFamilyMemberProfile(fm);
        if (fm) {
          const patient = await getPatientProfile(fm.patientId);
          setLinkedPatient(patient);
        }
      } else if (profile.role === "doctor") {
        const doctor = await getDoctorProfile(user.uid);
        setDoctorProfile(doctor);
        const patients = await getPatientsForDoctor(user.uid);
        setLinkedPatients(patients);
      }

      setLoading(false);
    }

    load();
  }, [user]);

  return {
    user,
    role,
    loading,
    patientProfile,
    familyMemberProfile,
    doctorProfile,
    linkedPatients,
    linkedPatient,
    linkedDoctor,
  };
}
