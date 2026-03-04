import { Patient, Doctor, GlucoseReading, VitalReading, HbA1cReading, MealLog, Alert, HealthInsight, Appointment } from '@/types';

export const mockPatient: Patient = {
  id: 'PAT-2024-001',
  name: 'Ramesh Kumar',
  age: 68,
  gender: 'male',
  dateOfBirth: '1956-03-15',
  phoneNumber: '+91 98765 43210',
  email: 'ramesh.kumar@email.com',
  emergencyContact: '+91 98765 43211',
  address: '123, Gandhi Nagar, Mumbai - 400001',
  diabetesType: 'type2',
  diagnosedDate: '2015-06-20',
  medications: [
    {
      id: 'MED-001',
      name: 'Metformin',
      dosage: '500mg',
      frequency: 'Twice daily',
      timing: 'After meals',
      startDate: '2015-06-20',
    },
    {
      id: 'MED-002',
      name: 'Glimepiride',
      dosage: '2mg',
      frequency: 'Once daily',
      timing: 'Before breakfast',
      startDate: '2018-01-15',
    },
  ],
  allergies: ['Penicillin'],
  conditions: ['Hypertension', 'Mild Arthritis'],
};

export const mockDoctor: Doctor = {
  id: 'DOC-2024-001',
  name: 'Dr. Priya Sharma',
  specialization: 'Diabetologist & Endocrinologist',
  hospital: 'City Medical Center',
  phoneNumber: '+91 98765 11111',
  email: 'dr.priya@citymedical.com',
  licenseNumber: 'MCI-12345',
  patientIds: ['PAT-2024-001', 'PAT-2024-002', 'PAT-2024-003'],
};

// Generate glucose readings for the past 30 days
export const generateGlucoseReadings = (): GlucoseReading[] => {
  const readings: GlucoseReading[] = [];
  const now = new Date();
  
  for (let day = 29; day >= 0; day--) {
    const date = new Date(now);
    date.setDate(date.getDate() - day);
    
    // Fasting reading (morning)
    readings.push({
      id: `GLU-F-${day}`,
      patientId: 'PAT-2024-001',
      value: Math.floor(90 + Math.random() * 40), // 90-130
      unit: 'mg/dL',
      type: 'fasting',
      mealContext: 'before-breakfast',
      timestamp: new Date(date.setHours(7, 30, 0)).toISOString(),
    });
    
    // Post-breakfast
    readings.push({
      id: `GLU-PB-${day}`,
      patientId: 'PAT-2024-001',
      value: Math.floor(120 + Math.random() * 60), // 120-180
      unit: 'mg/dL',
      type: 'post-meal',
      mealContext: 'after-breakfast',
      timestamp: new Date(date.setHours(10, 0, 0)).toISOString(),
    });
    
    // Post-lunch
    readings.push({
      id: `GLU-PL-${day}`,
      patientId: 'PAT-2024-001',
      value: Math.floor(110 + Math.random() * 70), // 110-180
      unit: 'mg/dL',
      type: 'post-meal',
      mealContext: 'after-lunch',
      timestamp: new Date(date.setHours(14, 30, 0)).toISOString(),
    });
    
    // Bedtime
    readings.push({
      id: `GLU-BT-${day}`,
      patientId: 'PAT-2024-001',
      value: Math.floor(100 + Math.random() * 40), // 100-140
      unit: 'mg/dL',
      type: 'bedtime',
      timestamp: new Date(date.setHours(22, 0, 0)).toISOString(),
    });
  }
  
  return readings;
};

export const mockGlucoseReadings = generateGlucoseReadings();

export const mockHbA1cReadings: HbA1cReading[] = [
  { id: 'HBA-001', patientId: 'PAT-2024-001', value: 7.2, timestamp: '2024-01-15T09:00:00Z' },
  { id: 'HBA-002', patientId: 'PAT-2024-001', value: 6.9, timestamp: '2024-04-20T09:00:00Z' },
  { id: 'HBA-003', patientId: 'PAT-2024-001', value: 6.7, timestamp: '2024-07-18T09:00:00Z' },
  { id: 'HBA-004', patientId: 'PAT-2024-001', value: 6.5, timestamp: '2024-10-25T09:00:00Z' },
];

export const mockVitalReadings: VitalReading[] = [
  { id: 'VIT-001', patientId: 'PAT-2024-001', type: 'blood-pressure', value: { systolic: 128, diastolic: 82 }, unit: 'mmHg', timestamp: new Date().toISOString() },
  { id: 'VIT-002', patientId: 'PAT-2024-001', type: 'heart-rate', value: 72, unit: 'bpm', timestamp: new Date().toISOString() },
  { id: 'VIT-003', patientId: 'PAT-2024-001', type: 'weight', value: 75, unit: 'kg', timestamp: new Date().toISOString() },
];

export const mockAlerts: Alert[] = [
  {
    id: 'ALT-001',
    patientId: 'PAT-2024-001',
    type: 'medication-reminder',
    severity: 'info',
    title: 'Medication Reminder',
    message: 'Time to take your morning medication - Metformin 500mg',
    timestamp: new Date().toISOString(),
    isRead: false,
    isAcknowledged: false,
  },
  {
    id: 'ALT-002',
    patientId: 'PAT-2024-001',
    type: 'glucose-high',
    severity: 'warning',
    title: 'Elevated Glucose Level',
    message: 'Your post-lunch glucose reading of 175 mg/dL is slightly elevated. Consider a light walk.',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    isRead: false,
    isAcknowledged: false,
  },
  {
    id: 'ALT-003',
    patientId: 'PAT-2024-001',
    type: 'appointment',
    severity: 'info',
    title: 'Upcoming Appointment',
    message: 'Dr. Priya Sharma - Regular Checkup tomorrow at 10:00 AM',
    timestamp: new Date(Date.now() - 7200000).toISOString(),
    isRead: true,
    isAcknowledged: false,
  },
];

export const mockHealthInsights: HealthInsight[] = [
  {
    id: 'INS-001',
    patientId: 'PAT-2024-001',
    type: 'trend',
    category: 'glucose',
    title: 'Improving Fasting Glucose',
    description: 'Your fasting glucose levels have improved by 8% over the past month. Keep up the good work with your morning routine!',
    confidence: 0.92,
    actionItems: ['Continue current medication schedule', 'Maintain evening walks'],
    timestamp: new Date().toISOString(),
  },
  {
    id: 'INS-002',
    patientId: 'PAT-2024-001',
    type: 'recommendation',
    category: 'diet',
    title: 'Reduce Evening Carbs',
    description: 'Your post-dinner glucose spikes suggest reducing carbohydrate intake in the evening. Consider lighter dinners with more vegetables.',
    actionItems: ['Replace rice with roti', 'Add more green vegetables', 'Avoid sweets after 6 PM'],
    timestamp: new Date().toISOString(),
  },
  {
    id: 'INS-003',
    patientId: 'PAT-2024-001',
    type: 'prediction',
    category: 'glucose',
    title: 'HbA1c Forecast',
    description: 'Based on your current patterns, your next HbA1c test is predicted to be around 6.3-6.5%, which is excellent!',
    confidence: 0.85,
    timestamp: new Date().toISOString(),
  },
];

export const mockMealLogs: MealLog[] = [
  {
    id: 'MEAL-001',
    patientId: 'PAT-2024-001',
    mealType: 'breakfast',
    foods: [
      { name: 'Idli', portion: '3 pieces', carbs: 30, calories: 150, glycemicIndex: 60 },
      { name: 'Sambar', portion: '1 bowl', carbs: 15, calories: 80, glycemicIndex: 45 },
      { name: 'Coconut Chutney', portion: '2 tbsp', carbs: 5, calories: 40, glycemicIndex: 30 },
    ],
    totalCarbs: 50,
    totalCalories: 270,
    glycemicLoad: 'medium',
    timestamp: new Date().toISOString(),
  },
  {
    id: 'MEAL-002',
    patientId: 'PAT-2024-001',
    mealType: 'lunch',
    foods: [
      { name: 'Brown Rice', portion: '1 cup', carbs: 45, calories: 220, glycemicIndex: 50 },
      { name: 'Dal', portion: '1 bowl', carbs: 20, calories: 120, glycemicIndex: 35 },
      { name: 'Mixed Vegetable Curry', portion: '1 bowl', carbs: 15, calories: 100, glycemicIndex: 40 },
      { name: 'Buttermilk', portion: '1 glass', carbs: 5, calories: 40, glycemicIndex: 25 },
    ],
    totalCarbs: 85,
    totalCalories: 480,
    glycemicLoad: 'medium',
    timestamp: new Date().toISOString(),
  },
];

export const mockAppointments: Appointment[] = [
  {
    id: 'APT-001',
    patientId: 'PAT-2024-001',
    doctorId: 'DOC-2024-001',
    type: 'regular-checkup',
    scheduledDate: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
    duration: 30,
    status: 'scheduled',
    notes: 'Quarterly diabetes review',
  },
  {
    id: 'APT-002',
    patientId: 'PAT-2024-001',
    doctorId: 'DOC-2024-001',
    type: 'follow-up',
    scheduledDate: new Date(Date.now() + 604800000).toISOString(), // Next week
    duration: 20,
    status: 'scheduled',
    notes: 'Review blood test results',
  },
];

