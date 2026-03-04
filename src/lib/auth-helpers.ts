import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";
import { auth } from "./firebase";
import { 
  signInWithGoogle, 
  createOrUpdateUserProfile, 
  completeOnboarding 
} from "@/hooks/useAuth";
import type { UserProfile, UserRole } from "@/types/roles";

export async function handleGoogleSignIn(role: UserRole): Promise<{ success: boolean; error?: string }> {
  try {
    // Sign in with Google
    const user = await signInWithGoogle();
    
    // Create or update user profile with the selected role
    await createOrUpdateUserProfile(user, role);
    
    return { success: true };
  } catch (error: any) {
    console.error("Google sign in error:", error);
    return { 
      success: false, 
      error: error.message || "Failed to sign in with Google" 
    };
  }
}

export async function handleUserRegistration(
  user: any,
  role: UserRole,
  additionalData?: Partial<UserProfile>
): Promise<{ success: boolean; error?: string; profile?: UserProfile }> {
  try {
    const profile = await createOrUpdateUserProfile(user, role, additionalData);
    return { success: true, profile };
  } catch (error: any) {
    console.error("Registration error:", error);
    return { 
      success: false, 
      error: error.message || "Failed to create user profile" 
    };
  }
}

export async function handleProfileCompletion(uid: string): Promise<{ success: boolean; error?: string }> {
  try {
    await completeOnboarding(uid);
    return { success: true };
  } catch (error: any) {
    console.error("Profile completion error:", error);
    return { 
      success: false, 
      error: error.message || "Failed to complete profile" 
    };
  }
}

export function getAuthErrorMessage(error: any): string {
  if (!error) return "An unknown error occurred";
  
  switch (error.code) {
    case "auth/user-not-found":
      return "No account found with this email address";
    case "auth/wrong-password":
      return "Incorrect password";
    case "auth/email-already-in-use":
      return "An account with this email already exists";
    case "auth/weak-password":
      return "Password should be at least 6 characters";
    case "auth/invalid-email":
      return "Please enter a valid email address";
    case "auth/user-disabled":
      return "This account has been disabled";
    case "auth/too-many-requests":
      return "Too many failed attempts. Please try again later";
    case "auth/network-request-failed":
      return "Network error. Please check your connection";
    case "auth/popup-closed-by-user":
      return "Sign-in was cancelled";
    case "auth/popup-blocked":
      return "Sign-in popup was blocked. Please allow popups for this site";
    default:
      return error.message || "An error occurred during authentication";
  }
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validatePhone(phone: string): boolean {
  const phoneRegex = /^\d{10}$/;
  return phoneRegex.test(phone.replace(/\D/g, ''));
}

export function validateDateOfBirth(dob: string): { isValid: boolean; error?: string } {
  if (!dob) return { isValid: false, error: "Date of birth is required" };
  
  const date = new Date(dob);
  const now = new Date();
  const age = now.getFullYear() - date.getFullYear();
  const monthDiff = now.getMonth() - date.getMonth();
  
  if (age < 0 || age > 120) {
    return { isValid: false, error: "Please enter a valid date of birth" };
  }
  
  if (age < 13) {
    return { isValid: false, error: "You must be at least 13 years old to use this service" };
  }
  
  return { isValid: true };
}

export function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  return phone;
}

export function generateDisplayName(firstName: string, lastName: string): string {
  return `${firstName.trim()} ${lastName.trim()}`.trim();
}
