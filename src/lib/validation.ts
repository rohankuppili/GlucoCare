import { z } from "zod";
import { UserRole } from "@/types/roles";

// Basic validation schemas
export const emailSchema = z
  .string()
  .min(1, "Email is required")
  .email("Please enter a valid email address");

export const phoneSchema = z
  .string()
  .min(1, "Phone number is required")
  .regex(/^\d{10}$/, "Please enter a valid 10-digit phone number");

export const nameSchema = z
  .string()
  .min(1, "Name is required")
  .min(2, "Name must be at least 2 characters")
  .max(50, "Name must be less than 50 characters")
  .regex(/^[a-zA-Z\s'-]+$/, "Name can only contain letters, spaces, hyphens, and apostrophes");

export const dateOfBirthSchema = z
  .string()
  .min(1, "Date of birth is required")
  .refine((date) => {
    const parsedDate = new Date(date);
    const now = new Date();
    const age = now.getFullYear() - parsedDate.getFullYear();
    const monthDiff = now.getMonth() - parsedDate.getMonth();
    
    return age >= 13 && age <= 120;
  }, "You must be between 13 and 120 years old");

export const roleSchema = z.enum(["patient", "family", "doctor"], {
  errorMap: () => ({ message: "Please select a valid role" }),
});

// Profile update schema
export const profileUpdateSchema = z.object({
  firstName: nameSchema,
  lastName: nameSchema,
  email: emailSchema,
  phone: phoneSchema,
  dob: dateOfBirthSchema,
});

// Patient registration schema
export const patientRegistrationSchema = z.object({
  firstName: nameSchema,
  lastName: nameSchema,
  email: emailSchema,
  phone: phoneSchema,
  dob: dateOfBirthSchema,
  role: z.literal("patient"),
  emergencyContact: z.string().min(1, "Emergency contact is required"),
  address: z.string().min(1, "Address is required"),
  diabetesType: z.enum(["type1", "type2", "prediabetes", "gestational"], {
    errorMap: () => ({ message: "Please select a valid diabetes type" }),
  }),
  diagnosedDate: z.string().min(1, "Diagnosis date is required"),
});

// Family member registration schema
export const familyRegistrationSchema = z.object({
  firstName: nameSchema,
  lastName: nameSchema,
  email: emailSchema,
  phone: phoneSchema,
  dob: dateOfBirthSchema,
  role: z.literal("family"),
  patientId: z.string().min(1, "Patient ID is required"),
});

// Doctor registration schema
export const doctorRegistrationSchema = z.object({
  firstName: nameSchema,
  lastName: nameSchema,
  email: emailSchema,
  phone: phoneSchema,
  dob: dateOfBirthSchema,
  role: z.literal("doctor"),
  licenseNumber: z.string().min(1, "License number is required"),
  specialization: z.string().min(1, "Specialization is required"),
  hospital: z.string().min(1, "Hospital is required"),
});

// Combined registration schema
export const registrationSchema = z.discriminatedUnion("role", [
  patientRegistrationSchema,
  familyRegistrationSchema,
  doctorRegistrationSchema,
]);

// Login schema (for future email/password login)
export const loginSchema = z.object({
  email: emailSchema,
  password: z
    .string()
    .min(1, "Password is required")
    .min(6, "Password must be at least 6 characters"),
});

// Password reset schema
export const passwordResetSchema = z.object({
  email: emailSchema,
});

// Password update schema
export const passwordUpdateSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(6, "Password must be at least 6 characters")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        "Password must contain at least one uppercase letter, one lowercase letter, and one number"
      ),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

// Utility functions
export function validateField<T>(schema: z.ZodSchema<T>, value: unknown): {
  isValid: boolean;
  error?: string;
  data?: T;
} {
  try {
    const data = schema.parse(value);
    return { isValid: true, data };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { isValid: false, error: error.errors[0]?.message };
    }
    return { isValid: false, error: "Validation failed" };
  }
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof z.ZodError) {
    return error.errors[0]?.message || "Validation error";
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "An unknown error occurred";
}

// Type exports
export type ProfileUpdateData = z.infer<typeof profileUpdateSchema>;
export type PatientRegistrationData = z.infer<typeof patientRegistrationSchema>;
export type FamilyRegistrationData = z.infer<typeof familyRegistrationSchema>;
export type DoctorRegistrationData = z.infer<typeof doctorRegistrationSchema>;
export type RegistrationData = z.infer<typeof registrationSchema>;
export type LoginData = z.infer<typeof loginSchema>;
export type PasswordResetData = z.infer<typeof passwordResetSchema>;
export type PasswordUpdateData = z.infer<typeof passwordUpdateSchema>;
