import { signInWithPopup, signOut as firebaseSignOut, GoogleAuthProvider, type User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { getUserProfile, setUserProfile, generatePatientId } from "@/lib/roles";
import type { UserProfile, UserRole } from "@/types/roles";

export async function signInWithGoogle(): Promise<User> {
  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(auth, provider);
  return result.user;
}

export async function signOut(): Promise<void> {
  await firebaseSignOut(auth);
}

export async function createOrUpdateUserProfile(
  user: User,
  role: UserRole,
  additionalData?: Partial<UserProfile>
): Promise<UserProfile> {
  const existingProfile = await getUserProfile(user.uid);
  
  const profileData: Omit<UserProfile, "uid"> = {
    email: user.email!,
    firstName: additionalData?.firstName || user.displayName?.split(" ")[0] || "",
    lastName: additionalData?.lastName || user.displayName?.split(" ").slice(1).join(" ") || "",
    dob: additionalData?.dob || "",
    phone: additionalData?.phone || "",
    displayName: user.displayName || undefined,
    photoURL: user.photoURL || undefined,
    role,
    onboarded: false,
    primaryPatientId: role === "patient" ? (additionalData?.primaryPatientId || generatePatientId()) : undefined,
    doctorId: role === "doctor" ? additionalData?.doctorId : undefined,
    patientId: role === "family" ? additionalData?.patientId : undefined,
    ...additionalData,
  };

  await setUserProfile(user.uid, profileData);
  
  return {
    uid: user.uid,
    ...profileData,
  } as UserProfile;
}

export async function completeOnboarding(uid: string): Promise<void> {
  const profile = await getUserProfile(uid);
  if (profile) {
    await setUserProfile(uid, { ...profile, onboarded: true });
  }
}

export function isUserOnboarded(profile: UserProfile | null): boolean {
  return profile?.onboarded ?? false;
}

export function getUserRole(profile: UserProfile | null): UserRole | null {
  return profile?.role ?? null;
}

export function canAccessDashboard(profile: UserProfile | null): boolean {
  return isUserOnboarded(profile);
}

export function canAccessRoleSetup(profile: UserProfile | null): boolean {
  return profile !== null && !isUserOnboarded(profile);
}
