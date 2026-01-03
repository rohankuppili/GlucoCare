export type UserRole = 'patient' | 'family' | 'doctor';

export interface Patient {
  id: string;
  name: string;
  age: number;
  gender: 'male' | 'female' | 'other';
  dateOfBirth: string;
  phoneNumber: string;
  email: string;
  emergencyContact: string;
  address: string;
  diabetesType: 'type1' | 'type2' | 'prediabetes' | 'gestational';
  diagnosedDate: string;
  medications: Medication[];
  allergies: string[];
  conditions: string[];
}

export interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  timing: string;
  startDate: string;
  endDate?: string;
}

export interface GlucoseReading {
  id: string;
  patientId: string;
  value: number;
  unit: 'mg/dL' | 'mmol/L';
  type: 'fasting' | 'post-meal' | 'random' | 'bedtime';
  mealContext?: 'before-breakfast' | 'after-breakfast' | 'before-lunch' | 'after-lunch' | 'before-dinner' | 'after-dinner';
  timestamp: string;
  notes?: string;
}

export interface VitalReading {
  id: string;
  patientId: string;
  type: 'blood-pressure' | 'heart-rate' | 'weight' | 'temperature';
  value: number | { systolic: number; diastolic: number };
  unit: string;
  timestamp: string;
  notes?: string;
}

export interface HbA1cReading {
  id: string;
  patientId: string;
  value: number;
  timestamp: string;
  notes?: string;
}

export interface MealLog {
  id: string;
  patientId: string;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  foods: FoodItem[];
  totalCarbs: number;
  totalCalories: number;
  glycemicLoad: 'low' | 'medium' | 'high';
  timestamp: string;
  notes?: string;
  photoUrl?: string;
}

export interface FoodItem {
  name: string;
  portion: string;
  carbs: number;
  calories: number;
  glycemicIndex?: number;
}

export interface ActivityLog {
  id: string;
  patientId: string;
  type: 'walking' | 'yoga' | 'swimming' | 'cycling' | 'stretching' | 'other';
  duration: number; // minutes
  intensity: 'light' | 'moderate' | 'vigorous';
  caloriesBurned?: number;
  timestamp: string;
  notes?: string;
}

export interface Alert {
  id: string;
  patientId: string;
  type: 'glucose-high' | 'glucose-low' | 'medication-reminder' | 'appointment' | 'emergency';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  isAcknowledged: boolean;
}

export interface Doctor {
  id: string;
  name: string;
  specialization: string;
  hospital: string;
  phoneNumber: string;
  email: string;
  licenseNumber: string;
  patientIds: string[];
}

export interface Appointment {
  id: string;
  patientId: string;
  doctorId: string;
  type: 'regular-checkup' | 'follow-up' | 'emergency' | 'consultation';
  scheduledDate: string;
  duration: number; // minutes
  status: 'scheduled' | 'completed' | 'cancelled' | 'rescheduled';
  notes?: string;
}

export interface Prescription {
  id: string;
  patientId: string;
  doctorId: string;
  medications: Medication[];
  dietPlan?: string;
  exercisePlan?: string;
  notes: string;
  createdAt: string;
  validUntil: string;
}

export interface HealthInsight {
  id: string;
  patientId: string;
  type: 'trend' | 'prediction' | 'recommendation' | 'alert';
  category: 'glucose' | 'diet' | 'activity' | 'medication' | 'lifestyle';
  title: string;
  description: string;
  confidence?: number;
  actionItems?: string[];
  timestamp: string;
}

export interface GlucoseStats {
  average: number;
  min: number;
  max: number;
  inRangePercentage: number;
  belowRangePercentage: number;
  aboveRangePercentage: number;
  timeInRange: number; // hours
  readings: number;
}

export type GlucoseStatus = 'low' | 'normal' | 'elevated' | 'high' | 'critical';

export const getGlucoseStatus = (value: number): GlucoseStatus => {
  if (value < 70) return 'low';
  if (value <= 100) return 'normal';
  if (value <= 140) return 'elevated';
  if (value <= 180) return 'high';
  return 'critical';
};

export const getGlucoseStatusColor = (status: GlucoseStatus): string => {
  const colors = {
    low: 'text-glucose-low',
    normal: 'text-glucose-normal',
    elevated: 'text-glucose-elevated',
    high: 'text-glucose-high',
    critical: 'text-glucose-critical',
  };
  return colors[status];
};
