import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Activity, 
  Droplets, 
  Heart, 
  TrendingUp, 
  TrendingDown,
  AlertTriangle,
  Plus,
  Bell,
  Utensils,
  Footprints,
  Clock,
  Calendar,
  FileText,
  ChevronRight,
  Phone,
  LogOut,
  User,
  MapPin
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogDescription,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  calculateGlucoseStats 
} from '@/lib/metrics';
import { getGlucoseStatus, type Alert, type HealthInsight } from '@/types';
import GlucoseChart from '@/components/charts/GlucoseChart';
import HbA1cChart from '@/components/charts/HbA1cChart';
import VitalsTrendChart from '@/components/charts/VitalsTrendChart';
import ActivityCaloriesChart from '@/components/charts/ActivityCaloriesChart';
import MetricCard from '@/components/dashboard/MetricCard';
import AlertsPanel from '@/components/dashboard/AlertsPanel';
import InsightsPanel from '@/components/dashboard/InsightsPanel';
import { useAuthUser } from '@/hooks/useAuthUser';
import { useRoleBasedAuth } from '@/hooks/useRoleBasedAuth';
import {
  buildDayTimeSlots,
  createAppointmentRequest,
  dispatchDueMedicationReminderEmails,
  disableMedicationReminderJobsForPatient,
  getMedicationReminderSettings,
  listActivityLogs,
  listAvailableAppointmentSlotsForDoctor,
  listAppointmentsForPatient,
  listCarePlansForPatient,
  listDailyHealthMetrics,
  listNotifications,
  setMedicationReminderEnabled,
  syncMedicationReminderJobsForPatient,
  upsertActivityLog,
  type ActivityLogDoc,
  type AppointmentDoc,
  type DoctorCarePlanDoc,
  type DailyHealthMetricsDoc,
  type NotificationDoc,
  type TimeSlotOption,
} from '@/lib/firestore';
import {
  generateWeeklyDietPlan,
  type DietPreference,
  type WeeklyDietPlan,
} from '@/lib/diet-plan-generator';
import {
  generateWeeklyWorkoutPlan,
  type WeeklyWorkoutPlan,
} from '@/lib/workout-plan-generator';
import {
  generateNearbyHospitalsFromAi,
  type NearbyHospitalResult,
} from '@/lib/nearby-hospital-generator';
import { summarizeDiabetesRisk } from '@/lib/diabetes-risk';
import DashboardSettingsDialog from '@/components/settings/DashboardSettingsDialog';
import { getDoctorForPatient, getFamilyMemberForPatient } from '@/lib/roles';
import { toast } from 'sonner';
import LogDailyHealthDialog from '@/components/health/LogDailyHealthDialog';

interface PatientDashboardProps {
  onLogout: () => void;
}

interface LatLngCoords {
  lat: number;
  lng: number;
}

function formatDistance(distanceKm: number): string {
  if (!Number.isFinite(distanceKm)) return "--";
  if (distanceKm < 1) return `${Math.round(distanceKm * 1000)} m`;
  return `${distanceKm.toFixed(1)} km`;
}

function buildTelHref(phone: string): string | null {
  const normalized = phone.replace(/[^+\d]/g, "");
  return normalized ? `tel:${normalized}` : null;
}

const PatientDashboard = ({ onLogout }: PatientDashboardProps) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'glucose' | 'diet' | 'activity'>('overview');
  const { user } = useAuthUser();
  const { loading: roleLoading, patientProfile } = useRoleBasedAuth();
  const [dailyMetrics, setDailyMetrics] = useState<DailyHealthMetricsDoc[]>([]);
  const [dailyMetricsLoading, setDailyMetricsLoading] = useState(true);
  const [activityLogs, setActivityLogs] = useState<ActivityLogDoc[]>([]);
  const [activityLogsLoading, setActivityLogsLoading] = useState(true);
  const [appointments, setAppointments] = useState<AppointmentDoc[]>([]);
  const [notifications, setNotifications] = useState<NotificationDoc[]>([]);
  const [doctorCarePlans, setDoctorCarePlans] = useState<DoctorCarePlanDoc[]>([]);
  const [doctorDetails, setDoctorDetails] = useState<{ uid: string; doctorId: string; name: string; phone: string } | null>(null);
  const [caretakerDetails, setCaretakerDetails] = useState<{ name: string; phone: string } | null>(null);
  const [appointmentDate, setAppointmentDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [appointmentTime, setAppointmentTime] = useState("");
  const [availableSlots, setAvailableSlots] = useState<TimeSlotOption[]>(buildDayTimeSlots());
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [submittingAppointment, setSubmittingAppointment] = useState(false);
  const [openTrend, setOpenTrend] = useState<"bp" | "bpm" | "weight" | "hba1c" | null>(null);
  const [medicationReminderEnabled, setMedicationReminderEnabledState] = useState(true);
  const [medicationReminderSaving, setMedicationReminderSaving] = useState(false);
  const [dietPreferenceByPlanId, setDietPreferenceByPlanId] = useState<Record<string, DietPreference>>({});
  const [generatedDietByPlanId, setGeneratedDietByPlanId] = useState<Record<string, WeeklyDietPlan>>({});
  const [generatingDietByPlanId, setGeneratingDietByPlanId] = useState<Record<string, boolean>>({});
  const [generatedWorkoutByPlanId, setGeneratedWorkoutByPlanId] = useState<Record<string, WeeklyWorkoutPlan>>({});
  const [generatingWorkoutByPlanId, setGeneratingWorkoutByPlanId] = useState<Record<string, boolean>>({});
  const [showActivityActions, setShowActivityActions] = useState(false);
  const [showActivityLogsPanel, setShowActivityLogsPanel] = useState(false);
  const [activityLogOpen, setActivityLogOpen] = useState(false);
  const [activityCaloriesInput, setActivityCaloriesInput] = useState("");
  const [savingActivityLog, setSavingActivityLog] = useState(false);
  const [sosOpen, setSosOpen] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<LatLngCoords | null>(null);
  const [hospitalsLoading, setHospitalsLoading] = useState(false);
  const [nearbyHospitals, setNearbyHospitals] = useState<NearbyHospitalResult[]>([]);
  const [hospitalLookupError, setHospitalLookupError] = useState<string>("");
  const alertsSectionRef = useRef<HTMLDivElement | null>(null);

  const patientName = patientProfile ? `${patientProfile.firstName} ${patientProfile.lastName}`.trim() : "";

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!user) return;
      setDailyMetricsLoading(true);
      setActivityLogsLoading(true);
      const [readings, activityItems] = await Promise.all([
        listDailyHealthMetrics(user.uid),
        listActivityLogs(user.uid),
      ]);
      if (cancelled) return;
      setDailyMetrics(readings);
      setActivityLogs(activityItems);
      setDailyMetricsLoading(false);
      setActivityLogsLoading(false);
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    let cancelled = false;

    async function loadAppointmentData() {
      if (!user) return;
      try {
        const [appointmentItems, notificationItems, carePlanItems] = await Promise.all([
          listAppointmentsForPatient(user.uid),
          listNotifications(user.uid),
          listCarePlansForPatient(user.uid, patientProfile?.patientId),
        ]);
        if (!cancelled) {
          setAppointments(appointmentItems);
          setNotifications(notificationItems);
          setDoctorCarePlans(carePlanItems);
        }
      } catch (error) {
        if (!cancelled) toast.error("Failed to load appointment data.");
      }
    }

    loadAppointmentData();
    return () => {
      cancelled = true;
    };
  }, [patientProfile?.patientId, user]);

  useEffect(() => {
    let cancelled = false;

    async function loadDoctor() {
      if (!patientProfile?.patientId) {
        setDoctorDetails(null);
        return;
      }
      try {
        const doctor = await getDoctorForPatient(patientProfile.patientId);
        if (!cancelled && doctor) {
          setDoctorDetails({
            uid: doctor.uid,
            doctorId: doctor.doctorId,
            name: `${doctor.firstName} ${doctor.lastName}`.trim() || doctor.doctorId,
            phone: doctor.phone ?? "",
          });
        } else if (!cancelled) {
          setDoctorDetails(null);
        }
      } catch (error) {
        if (!cancelled) toast.error("Failed to load linked doctor.");
      }
    }

    loadDoctor();
    return () => {
      cancelled = true;
    };
  }, [patientProfile?.patientId]);

  useEffect(() => {
    let cancelled = false;

    async function loadCaretaker() {
      if (!patientProfile?.patientId) {
        setCaretakerDetails(null);
        return;
      }
      try {
        const family = await getFamilyMemberForPatient(patientProfile.patientId);
        if (!cancelled && family) {
          setCaretakerDetails({
            name: `${family.firstName} ${family.lastName}`.trim() || "Caretaker",
            phone: family.phone ?? "",
          });
        } else if (!cancelled) {
          setCaretakerDetails(null);
        }
      } catch {
        if (!cancelled) setCaretakerDetails(null);
      }
    }

    loadCaretaker();
    return () => {
      cancelled = true;
    };
  }, [patientProfile?.patientId]);

  useEffect(() => {
    let cancelled = false;
    async function loadReminderSettings() {
      if (!user) return;
      try {
        const settings = await getMedicationReminderSettings(user.uid);
        if (!cancelled) {
          setMedicationReminderEnabledState(settings.enabled);
        }
      } catch {
        if (!cancelled) toast.error("Failed to load reminder settings.");
      }
    }
    loadReminderSettings();
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (!user || !medicationReminderEnabled) return;
    let isUnmounted = false;
    let timer: ReturnType<typeof setInterval> | null = null;

    async function setupReminderProcessing() {
      try {
        await syncMedicationReminderJobsForPatient(user.uid);
        if (isUnmounted) return;
        await dispatchDueMedicationReminderEmails(user.uid);
        if (isUnmounted) return;
        timer = setInterval(() => {
          void dispatchDueMedicationReminderEmails(user.uid);
        }, 60 * 1000);
      } catch {
        if (!isUnmounted) toast.error("Failed to start medication email reminders.");
      }
    }

    setupReminderProcessing();
    return () => {
      isUnmounted = true;
      if (timer) clearInterval(timer);
    };
  }, [medicationReminderEnabled, user]);

  const chartReadings = useMemo(() => {
    const patientId = patientProfile?.patientId ?? user?.uid ?? "";
    const entries = dailyMetrics
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date))
      .flatMap((m) => [
        {
          id: `${m.id}-f`,
          patientId,
          value: m.fastingGlucose,
          unit: 'mg/dL' as const,
          type: 'fasting' as const,
          timestamp: `${m.date}T07:00:00`,
          notes: m.notes,
        },
        {
          id: `${m.id}-p`,
          patientId,
          value: m.postMealGlucose,
          unit: 'mg/dL' as const,
          type: 'post-meal' as const,
          timestamp: `${m.date}T13:00:00`,
          notes: m.notes,
        },
      ]);
    return entries;
  }, [dailyMetrics, patientProfile?.patientId, user?.uid]);

  const stats = useMemo(() => calculateGlucoseStats(chartReadings), [chartReadings]);

  const latestDaily = dailyMetrics[0];
  const latestActivity = activityLogs[0];
  const patientAge = useMemo(() => {
    const dob = patientProfile?.dob;
    if (!dob) return undefined;
    const date = new Date(dob);
    if (Number.isNaN(date.getTime())) return undefined;
    const now = new Date();
    let age = now.getFullYear() - date.getFullYear();
    const monthDelta = now.getMonth() - date.getMonth();
    if (monthDelta < 0 || (monthDelta === 0 && now.getDate() < date.getDate())) {
      age -= 1;
    }
    return age >= 0 ? age : undefined;
  }, [patientProfile?.dob]);
  const latestGlucoseValue = latestDaily?.postMealGlucose ?? latestDaily?.fastingGlucose;
  const glucoseStatus = latestGlucoseValue ? getGlucoseStatus(latestGlucoseValue) : 'normal';

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const latestBloodPressure =
    latestDaily?.bloodPressureSystolic && latestDaily?.bloodPressureDiastolic
      ? `${latestDaily.bloodPressureSystolic}/${latestDaily.bloodPressureDiastolic}`
      : '--';
  const latestHeartRate = latestDaily?.heartRate ?? '--';
  const latestCaloriesBurned =
    latestActivity?.caloriesBurned ??
    latestDaily?.caloriesBurned ??
    '--';
  const unreadNotifications = notifications.filter((n) => !n.isRead).length;
  const doctorCallHref = doctorDetails?.phone ? buildTelHref(doctorDetails.phone) : null;
  const caretakerCallHref = caretakerDetails?.phone ? buildTelHref(caretakerDetails.phone) : null;
  const ambulanceCallHref = "tel:108";
  const sosHospitals = nearbyHospitals.slice(0, 3);
  const hba1cReadings = useMemo(() => {
    const patientId = patientProfile?.patientId ?? user?.uid ?? "";
    return dailyMetrics
      .filter((m) => typeof m.hba1c === "number")
      .map((m) => ({
        id: `${m.id}-hba1c`,
        patientId,
        value: m.hba1c as number,
        timestamp: `${m.date}T09:00:00`,
      }));
  }, [dailyMetrics, patientProfile?.patientId, user?.uid]);

  const workoutWeightLogs = useMemo(
    () =>
      dailyMetrics
        .filter((m) => typeof m.weight === "number" && Number.isFinite(m.weight))
        .slice()
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(-30)
        .map((m) => ({
          date: m.date,
          value: Number(m.weight),
        })),
    [dailyMetrics]
  );

  const workoutCalorieLogs = useMemo(() => {
    const byDate = new Map<string, number>();
    for (const metric of dailyMetrics) {
      if (typeof metric.caloriesBurned === "number" && Number.isFinite(metric.caloriesBurned)) {
        byDate.set(metric.date, Math.round(metric.caloriesBurned));
      }
    }
    for (const log of activityLogs) {
      if (Number.isFinite(log.caloriesBurned)) {
        byDate.set(log.date, Math.round(log.caloriesBurned));
      }
    }

    return Array.from(byDate.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-30)
      .map(([date, value]) => ({ date, value }));
  }, [activityLogs, dailyMetrics]);

  const diabetesRiskSummary = useMemo(
    () =>
      summarizeDiabetesRisk(dailyMetrics, {
        age: patientAge,
        latestWeightKg: latestDaily?.weight,
      }),
    [dailyMetrics, latestDaily?.weight, patientAge]
  );

  const panelAlerts = useMemo<Alert[]>(() => {
    const patientId = patientProfile?.patientId ?? user?.uid ?? "";
    return notifications.map((n) => ({
      id: n.id,
      patientId,
      type: "appointment",
      severity: n.status === "rejected" ? "warning" : "info",
      title: n.title,
      message: n.message,
      timestamp: n.createdAt.toISOString(),
      isRead: n.isRead,
      isAcknowledged: false,
    }));
  }, [notifications, patientProfile?.patientId, user?.uid]);

  const derivedInsights = useMemo<HealthInsight[]>(() => {
    const patientId = patientProfile?.patientId ?? user?.uid ?? "";
    const items: HealthInsight[] = [];

    if (stats.readings > 0) {
      items.push({
        id: "insight-glucose-trend",
        patientId,
        type: "trend",
        category: "glucose",
        title: "Glucose Summary",
        description: `Average ${stats.average} mg/dL with ${stats.inRangePercentage}% in target range.`,
        timestamp: new Date().toISOString(),
      });
    }

    if (latestDaily?.bloodPressureSystolic && latestDaily?.bloodPressureDiastolic) {
      items.push({
        id: "insight-bp",
        patientId,
        type: "recommendation",
        category: "lifestyle",
        title: "Latest Blood Pressure",
        description: `Most recent BP is ${latestDaily.bloodPressureSystolic}/${latestDaily.bloodPressureDiastolic} mmHg.`,
        timestamp: new Date().toISOString(),
      });
    }

    if (latestDaily?.heartRate) {
      items.push({
        id: "insight-bpm",
        patientId,
        type: "trend",
        category: "lifestyle",
        title: "Latest Heart Rate",
        description: `Most recent heart rate is ${latestDaily.heartRate} bpm.`,
        timestamp: new Date().toISOString(),
      });
    }

    if (diabetesRiskSummary) {
      const currentRiskPct = Math.round(diabetesRiskSummary.riskScore * 100);
      const projectedRiskPct = Math.round(diabetesRiskSummary.projected30DayRisk * 100);
      const trendText =
        diabetesRiskSummary.trendLabel === "improving"
          ? "improving"
          : diabetesRiskSummary.trendLabel === "worsening"
            ? "worsening"
            : "stable";

      items.push({
        id: "insight-rf-risk-score",
        patientId,
        type: "prediction",
        category: "glucose",
        title: "Custom RF Diabetes Risk Score",
        description: `Current risk score: ${currentRiskPct}% (${diabetesRiskSummary.riskBand}). Model confidence ${Math.round(diabetesRiskSummary.confidence * 100)}%.`,
        timestamp: new Date().toISOString(),
        confidence: diabetesRiskSummary.confidence,
        actionItems: diabetesRiskSummary.recommendations,
      });

      items.push({
        id: "insight-rf-risk-trend",
        patientId,
        type: "trend",
        category: "lifestyle",
        title: "30-Day Risk Trajectory",
        description: `Risk trend is ${trendText}. Projected 30-day risk: ${projectedRiskPct}% based on recent logs.`,
        timestamp: new Date().toISOString(),
      });
    }

    return items;
  }, [diabetesRiskSummary, latestDaily?.bloodPressureDiastolic, latestDaily?.bloodPressureSystolic, latestDaily?.heartRate, patientProfile?.patientId, stats.average, stats.inRangePercentage, stats.readings, user?.uid]);

  useEffect(() => {
    let cancelled = false;

    async function loadFreeSlots() {
      if (!doctorDetails?.uid || !appointmentDate) {
        setAvailableSlots([]);
        return;
      }
      setSlotsLoading(true);
      try {
        const slots = await listAvailableAppointmentSlotsForDoctor(doctorDetails.uid, appointmentDate);
        if (cancelled) return;
        setAvailableSlots(slots);
        if (!slots.some((s) => s.value === appointmentTime)) {
          setAppointmentTime(slots[0]?.value ?? "");
        }
      } catch (error) {
        if (!cancelled) toast.error("Failed to load free time slots.");
      } finally {
        if (!cancelled) setSlotsLoading(false);
      }
    }

    loadFreeSlots();

    return () => {
      cancelled = true;
    };
  }, [doctorDetails?.uid, appointmentDate]);

  const upcomingVisits = useMemo(() => {
    const now = Date.now();
    return appointments
      .filter((a) => a.status === 'approved' && a.scheduledAt.getTime() >= now)
      .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime())
      .slice(0, 8);
  }, [appointments]);

  const handleRequestAppointment = async () => {
    if (!user || !patientProfile || !doctorDetails) {
      toast.error("Doctor link not found for appointment booking.");
      return;
    }
    if (!appointmentDate || !appointmentTime) {
      toast.error("Please select date and time slot.");
      return;
    }
    const selectedDateTime = new Date(`${appointmentDate}T${appointmentTime}:00`);
    if (selectedDateTime.getTime() < Date.now()) {
      toast.error("Please choose a future date/time.");
      return;
    }

    const selectedSlot = availableSlots.find((s) => s.value === appointmentTime);
    if (!selectedSlot) {
      toast.error("Invalid appointment slot selected.");
      return;
    }

    setSubmittingAppointment(true);
    try {
      await createAppointmentRequest({
        patientUid: user.uid,
        patientId: patientProfile.patientId,
        patientName: patientName || patientProfile.patientId,
        doctorUid: doctorDetails.uid,
        doctorId: doctorDetails.doctorId,
        doctorName: doctorDetails.name,
        date: appointmentDate,
        time: appointmentTime,
        slotLabel: selectedSlot.label,
      });
      const appointmentItems = await listAppointmentsForPatient(user.uid);
      setAppointments(appointmentItems);
      const slots = await listAvailableAppointmentSlotsForDoctor(doctorDetails.uid, appointmentDate);
      setAvailableSlots(slots);
      if (!slots.some((s) => s.value === appointmentTime)) {
        setAppointmentTime(slots[0]?.value ?? "");
      }
      toast.success("Appointment request sent.");
    } catch (error: unknown) {
      const message = (error as { message?: string })?.message ?? "Failed to request appointment.";
      toast.error(message);
    } finally {
      setSubmittingAppointment(false);
    }
  };

  const handleBellClick = () => {
    alertsSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const resolveCurrentLocation = async (): Promise<LatLngCoords> =>
    new Promise<LatLngCoords>((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation is not supported on this device."));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (position) =>
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          }),
        () => reject(new Error("Please allow location access to find nearby hospitals.")),
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 60000,
        }
      );
    });

  const handleFindNearbyHospitals = async () => {
    setHospitalsLoading(true);
    setHospitalLookupError("");
    try {
      const coords = await resolveCurrentLocation();
      setCurrentLocation(coords);
      const hospitals = await generateNearbyHospitalsFromAi(coords.lat, coords.lng, 5);
      setNearbyHospitals(hospitals);
      if (hospitals.length === 0) {
        setHospitalLookupError("No nearby diabetes hospitals found for your location.");
      }
    } catch (error: unknown) {
      console.error("Nearby hospital lookup failed:", error);
      const message = (error as { message?: string })?.message ?? "Unable to fetch nearby hospitals via AI.";
      setHospitalLookupError(message);
      toast.error(message);
    } finally {
      setHospitalsLoading(false);
    }
  };

  const callNumber = (href: string | null, fallbackMessage: string) => {
    if (!href) {
      toast.error(fallbackMessage);
      return;
    }
    window.location.href = href;
  };

  const handleMedicationReminderToggle = async (enabled: boolean) => {
    if (!user) return;
    setMedicationReminderSaving(true);
    try {
      await setMedicationReminderEnabled(user.uid, enabled);
      if (enabled) {
        await syncMedicationReminderJobsForPatient(user.uid);
        await dispatchDueMedicationReminderEmails(user.uid);
      } else {
        await disableMedicationReminderJobsForPatient(user.uid);
      }
      setMedicationReminderEnabledState(enabled);
      toast.success(
        enabled
          ? "Medication email reminders enabled."
          : "Medication email reminders disabled."
      );
    } catch {
      toast.error("Failed to update reminder settings.");
    } finally {
      setMedicationReminderSaving(false);
    }
  };

  const handleGenerateWeeklyDietPlan = async (
    planId: string,
    dietPlanText: string,
    calorieLimit: number
  ) => {
    const preference = dietPreferenceByPlanId[planId] ?? "veg";
    setGeneratingDietByPlanId((prev) => ({ ...prev, [planId]: true }));
    try {
      const weekly = await generateWeeklyDietPlan({
        doctorRecommendation: dietPlanText,
        calorieLimit,
        age: patientAge,
        weightKg: latestDaily?.weight,
        dietPreference: preference,
      });
      setGeneratedDietByPlanId((prev) => ({ ...prev, [planId]: weekly }));
      toast.success("AI weekly diet plan generated.");
    } catch (error) {
      const message =
        (error as { message?: string })?.message ?? "Failed to generate AI diet plan.";
      toast.error(message);
    } finally {
      setGeneratingDietByPlanId((prev) => ({ ...prev, [planId]: false }));
    }
  };

  const handleGenerateWeeklyWorkoutPlan = async (planId: string, exerciseGoalText: string) => {
    setGeneratingWorkoutByPlanId((prev) => ({ ...prev, [planId]: true }));
    try {
      const weekly = await generateWeeklyWorkoutPlan({
        doctorRecommendation: exerciseGoalText,
        age: patientAge,
        weightLogs: workoutWeightLogs,
        calorieLogs: workoutCalorieLogs,
      });
      setGeneratedWorkoutByPlanId((prev) => ({ ...prev, [planId]: weekly }));
      toast.success("AI weekly workout plan generated.");
    } catch (error) {
      const message =
        (error as { message?: string })?.message ?? "Failed to generate AI workout plan.";
      toast.error(message);
    } finally {
      setGeneratingWorkoutByPlanId((prev) => ({ ...prev, [planId]: false }));
    }
  };

  const handleSaveActivityLog = async () => {
    if (!user) return;
    const calories = Number(activityCaloriesInput);
    if (!Number.isFinite(calories) || calories <= 0) {
      toast.error("Please enter a valid calories burned value.");
      return;
    }
    setSavingActivityLog(true);
    try {
      const date = new Date().toISOString().split("T")[0];
      await upsertActivityLog(user.uid, {
        date,
        caloriesBurned: calories,
        source: "quick-action",
      });
      const [metrics, logs] = await Promise.all([
        listDailyHealthMetrics(user.uid),
        listActivityLogs(user.uid),
      ]);
      setDailyMetrics(metrics);
      setActivityLogs(logs);
      setActivityLogOpen(false);
      setActivityCaloriesInput("");
      toast.success("Activity calories logged.");
    } catch {
      toast.error("Failed to log activity.");
    } finally {
      setSavingActivityLog(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-hero">
      {/* Header */}
      <header className="glass-card sticky top-0 z-50 border-b border-border/50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-muted-foreground">{getGreeting()},</p>
                <h1 className="text-2xl font-bold">
                  {roleLoading ? "Loading..." : (patientName || "Patient")}
                  {!!patientProfile?.patientId && (
                    <span className="ml-2 text-sm font-normal text-muted-foreground">
                      ({patientProfile.patientId})
                    </span>
                  )}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="glass"
                size="icon-lg"
                className="relative overflow-visible"
                onClick={handleBellClick}
                aria-label="Go to alerts and reminders"
              >
                <Bell className="w-6 h-6" />
                {unreadNotifications > 0 && (
                  <span className="absolute top-0 right-0 z-10 min-w-5 h-5 px-1 translate-x-1/3 -translate-y-1/3 bg-danger text-danger-foreground rounded-full text-[10px] leading-none flex items-center justify-center">
                    {unreadNotifications > 99 ? "99+" : unreadNotifications}
                  </span>
                )}
              </Button>
              <DashboardSettingsDialog
                showMedicationReminderToggle
                medicationReminderEnabled={medicationReminderEnabled}
                medicationReminderSaving={medicationReminderSaving}
                onMedicationReminderChange={handleMedicationReminderToggle}
              />
              <Button variant="ghost" size="icon-lg" onClick={onLogout}>
                <LogOut className="w-6 h-6" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        {/* Emergency SOS Button */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-8"
        >
          <div className="flex flex-col sm:flex-row gap-3">
            <Button variant="sos" className="w-full sm:w-auto" onClick={() => setSosOpen(true)}>
              <Phone className="w-8 h-8 mr-3" />
              Emergency SOS
            </Button>
            <Button variant="outline" className="w-full sm:w-auto" onClick={() => void handleFindNearbyHospitals()} disabled={hospitalsLoading}>
              <MapPin className="w-5 h-5 mr-2" />
              {hospitalsLoading ? "Finding nearby hospitals..." : "Find Nearby Diabetes Hospitals"}
            </Button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="mb-8"
        >
          <Card variant="glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary" />
                Nearest Diabetes Hospitals
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {currentLocation && (
                <p className="text-xs text-muted-foreground">
                  Current location: {currentLocation.lat.toFixed(5)}, {currentLocation.lng.toFixed(5)}
                </p>
              )}
              {hospitalLookupError && (
                <p className="text-sm text-destructive">{hospitalLookupError}</p>
              )}
              {!hospitalLookupError && nearbyHospitals.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Tap "Find Nearby Diabetes Hospitals" to load hospitals around your current location.
                </p>
              )}
              {nearbyHospitals.map((hospital, index) => {
                const callHref = buildTelHref(hospital.phone);
                return (
                  <div key={hospital.id} className="rounded-lg border border-border/60 p-3">
                    <p className="font-medium">
                      {index + 1}. {hospital.name}
                    </p>
                    <p className="text-sm text-muted-foreground">{hospital.address}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Distance: {formatDistance(hospital.distanceKm)}
                    </p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {callHref ? (
                        <a href={callHref}>
                          <Button size="sm" variant="hero">
                            <Phone className="w-4 h-4 mr-1" />
                            Call
                          </Button>
                        </a>
                      ) : (
                        <Button size="sm" variant="outline" disabled>
                          Phone unavailable
                        </Button>
                      )}
                      <a href={hospital.mapsUrl} target="_blank" rel="noreferrer">
                        <Button size="sm" variant="outline">Open in Maps</Button>
                      </a>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </motion.div>

        {/* Current Glucose Status - Large Display */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <Card variant="glass" className="overflow-hidden">
            <div className="p-8">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                <div>
                  <p className="text-lg text-muted-foreground mb-2 flex items-center gap-2">
                    <Droplets className="w-5 h-5" />
                    Current Blood Glucose
                  </p>
                  <div className="flex items-baseline gap-3">
                    <span className={`text-7xl font-bold ${
                      glucoseStatus === 'normal' ? 'text-success' :
                      glucoseStatus === 'elevated' ? 'text-warning' :
                      glucoseStatus === 'high' || glucoseStatus === 'critical' ? 'text-danger' :
                      'text-glucose-low'
                    }`}>
                      {latestGlucoseValue ?? '--'}
                    </span>
                    <span className="text-2xl text-muted-foreground">mg/dL</span>
                  </div>
                  <p className="text-lg mt-2 flex items-center gap-2">
                    {glucoseStatus === 'normal' ? (
                      <>
                        <TrendingUp className="w-5 h-5 text-success" />
                        <span className="text-success">In healthy range</span>
                      </>
                    ) : glucoseStatus === 'elevated' || glucoseStatus === 'high' ? (
                      <>
                        <AlertTriangle className="w-5 h-5 text-warning" />
                        <span className="text-warning">Slightly elevated - Consider a walk</span>
                      </>
                    ) : (
                      <>
                        <TrendingDown className="w-5 h-5 text-glucose-low" />
                        <span className="text-glucose-low">Below target - Have a snack</span>
                      </>
                    )}
                  </p>
                </div>

                <div className="flex flex-col gap-3">
                  <LogDailyHealthDialog
                    onSaved={async () => {
                      if (!user) return;
                      const [readings, activityItems] = await Promise.all([
                        listDailyHealthMetrics(user.uid),
                        listActivityLogs(user.uid),
                      ]);
                      setDailyMetrics(readings);
                      setActivityLogs(activityItems);
                    }}
                  >
                    <Button variant="hero" size="lg">
                      <Plus className="w-5 h-5 mr-2" />
                      Log Daily Health
                    </Button>
                  </LogDailyHealthDialog>
                  <p className="text-sm text-muted-foreground text-center">
                    Last updated: {latestDaily ? latestDaily.date : '--'}
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Metrics Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
        >
          <MetricCard
            title="Avg. Glucose"
            value={stats.average}
            unit="mg/dL"
            trend="down"
            trendValue="8%"
            icon={Activity}
            status="success"
          />
          <MetricCard
            title="Time in Range"
            value={stats.inRangePercentage}
            unit="%"
            trend="up"
            trendValue="5%"
            icon={Clock}
            status="success"
          />
          <MetricCard
            title="Blood Pressure"
            value={latestBloodPressure}
            unit="mmHg"
            icon={Heart}
            status="normal"
          />
          <MetricCard
            title="Heart Rate"
            value={latestHeartRate}
            unit="bpm"
            icon={Activity}
            status="normal"
          />
        </motion.div>

        {/* Charts and Insights Grid */}
        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          {/* Glucose Chart - Takes 2 columns */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="lg:col-span-2"
          >
            <Card variant="glass">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-6 h-6 text-primary" />
                    Glucose Trends
                  </CardTitle>
                  <div className="flex gap-2">
                    {['7D', '14D', '30D'].map((period) => (
                      <Button
                        key={period}
                        variant={period === '7D' ? 'default' : 'ghost'}
                        size="sm"
                      >
                        {period}
                      </Button>
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <GlucoseChart readings={chartReadings.slice(-28)} />
              </CardContent>
            </Card>
          </motion.div>

          {/* Alerts Panel */}
          <motion.div
            ref={alertsSectionRef}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="scroll-mt-28"
          >
            <AlertsPanel alerts={panelAlerts} />
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.22 }}
          className="mb-8"
        >
          <Card variant="glass">
            <CardHeader>
              <CardTitle className="text-lg">More Health Graphs</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              <Button variant="outline" onClick={() => setOpenTrend("bp")}>View BP Graph</Button>
              <Button variant="outline" onClick={() => setOpenTrend("bpm")}>View BPM Graph</Button>
              <Button variant="outline" onClick={() => setOpenTrend("weight")}>View Weight Graph</Button>
              <Button variant="outline" onClick={() => setOpenTrend("hba1c")}>View HbA1c Graph</Button>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="grid lg:grid-cols-2 gap-6 mb-8"
        >
          <Card variant="glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                Request Appointment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Linked doctor: {doctorDetails ? `Dr. ${doctorDetails.name} (${doctorDetails.doctorId})` : "Not linked"}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium">Date</label>
                  <Input
                    type="date"
                    min={new Date().toISOString().split('T')[0]}
                    value={appointmentDate}
                    onChange={(e) => setAppointmentDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Time Slot (30 min)</label>
                  <select
                    className="w-full h-12 rounded-xl border border-input bg-background px-3 text-base"
                    value={appointmentTime}
                    onChange={(e) => setAppointmentTime(e.target.value)}
                    disabled={slotsLoading || availableSlots.length === 0}
                  >
                    {availableSlots.map((slot) => (
                      <option key={slot.value} value={slot.value}>
                        {slot.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground mt-1">
                    {slotsLoading ? "Loading free slots..." : availableSlots.length === 0 ? "No free slots for this date." : "Only doctor-free slots are shown."}
                  </p>
                </div>
              </div>
              <Button
                variant="hero"
                onClick={handleRequestAppointment}
                disabled={!doctorDetails || submittingAppointment || slotsLoading || availableSlots.length === 0}
              >
                {submittingAppointment ? "Submitting..." : "Request Appointment"}
              </Button>
            </CardContent>
          </Card>

          <Card variant="glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                Upcoming Visits
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {upcomingVisits.length === 0 && (
                <p className="text-sm text-muted-foreground">No upcoming approved visits.</p>
              )}
              {upcomingVisits.map((appt) => (
                <div key={appt.id} className="rounded-lg border border-border/60 p-3">
                  <p className="font-medium">Dr. {appt.doctorName || appt.doctorId}</p>
                  <p className="text-sm text-muted-foreground">{appt.date} • {appt.slotLabel}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.38 }}
          className="mb-8"
        >
          <Card variant="glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Doctor Updates
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {doctorCarePlans.length === 0 && (
                <p className="text-sm text-muted-foreground">No doctor updates yet.</p>
              )}
              {doctorCarePlans.slice(0, 8).map((plan) => (
                <div key={plan.id} className="rounded-lg border border-border/60 p-4 space-y-2">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-1">
                    <p className="font-semibold">
                      {plan.type === "prescription" && "Prescription"}
                      {plan.type === "diet-plan" && "Diet Plan"}
                      {plan.type === "exercise-goal" && "Exercise Goals"}
                      {plan.type === "medical-note" && "Medical Notes"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {plan.createdAt ? plan.createdAt.toLocaleString() : "Recently added"}
                    </p>
                  </div>

                  {plan.type === "prescription" && plan.prescription && (
                    <div className="space-y-2">
                      {plan.prescription.medicines.map((med, idx) => (
                        <div key={`${plan.id}-med-${idx}`} className="rounded-md bg-muted/40 p-3 text-sm">
                          <p className="font-medium">
                            {med.name} - {med.dosage}
                          </p>
                          <p className="text-muted-foreground">
                            Morning: {med.morning.replace("-", " ")} | Afternoon: {med.afternoon.replace("-", " ")} | Night: {med.night.replace("-", " ")}
                          </p>
                        </div>
                      ))}
                      {plan.prescription.comments && (
                        <p className="text-sm text-muted-foreground">Remarks: {plan.prescription.comments}</p>
                      )}
                    </div>
                  )}

                  {plan.type === "diet-plan" && plan.dietPlan && (
                    <div className="space-y-2">
                      <p className="text-sm whitespace-pre-wrap">{plan.dietPlan.text}</p>
                      <p className="text-sm text-muted-foreground">
                        Calorie limit: {plan.dietPlan.calorieLimit} kcal/day
                      </p>
                      <div className="flex flex-col md:flex-row md:items-center gap-2">
                        <select
                          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                          value={dietPreferenceByPlanId[plan.id] ?? "veg"}
                          onChange={(e) =>
                            setDietPreferenceByPlanId((prev) => ({
                              ...prev,
                              [plan.id]: e.target.value as DietPreference,
                            }))
                          }
                        >
                          <option value="veg">Vegetarian</option>
                          <option value="eggetarian">Eggetarian</option>
                          <option value="non-veg">Non-veg</option>
                        </select>
                        <Button
                          variant="outline"
                          onClick={() =>
                            void handleGenerateWeeklyDietPlan(
                              plan.id,
                              plan.dietPlan?.text ?? "",
                              plan.dietPlan?.calorieLimit ?? 1600
                            )
                          }
                          disabled={generatingDietByPlanId[plan.id]}
                        >
                          {generatingDietByPlanId[plan.id] ? "Generating..." : "Generate 1-Week Diet Plan"}
                        </Button>
                      </div>
                      {(dietPreferenceByPlanId[plan.id] ?? "veg") === "non-veg" && (
                        <p className="text-xs text-muted-foreground">
                          Non-veg menu includes only chicken, mutton, seafood, eggs, and veg sides.
                        </p>
                      )}
                      {generatedDietByPlanId[plan.id] && (
                        <div className="rounded-md border border-border/60 bg-muted/30 p-3 space-y-3">
                          <p className="text-sm font-medium">
                            Generated weekly plan ({generatedDietByPlanId[plan.id].calorieTarget} kcal/day target)
                          </p>
                          {generatedDietByPlanId[plan.id].focusNotes.map((note, idx) => (
                            <p key={`${plan.id}-focus-${idx}`} className="text-xs text-muted-foreground">
                              {note}
                            </p>
                          ))}
                          <div className="space-y-2">
                            {generatedDietByPlanId[plan.id].days.map((day) => (
                              <div key={`${plan.id}-${day.day}`} className="rounded-md border border-border/60 bg-background p-3">
                                <p className="font-medium text-sm">{day.day}</p>
                                <p className="text-xs mt-1"><span className="font-medium">Breakfast:</span> {day.breakfast} ({day.breakfastCalories} kcal)</p>
                                <p className="text-xs mt-1"><span className="font-medium">Lunch:</span> {day.lunch} ({day.lunchCalories} kcal)</p>
                                <p className="text-xs mt-1"><span className="font-medium">Dinner:</span> {day.dinner} ({day.dinnerCalories} kcal)</p>
                                <p className="text-xs mt-2 text-muted-foreground">Total: {day.totalCalories} kcal</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {plan.dietPlan.imageUrl && (
                        <img
                          src={plan.dietPlan.imageUrl}
                          alt="Diet plan"
                          className="w-full max-w-md rounded-lg border border-border/60"
                        />
                      )}
                    </div>
                  )}

                  {plan.type === "exercise-goal" && plan.exerciseGoal && (
                    <div className="space-y-3">
                      <p className="text-sm whitespace-pre-wrap">{plan.exerciseGoal.text}</p>
                      <Button
                        variant="outline"
                        onClick={() => void handleGenerateWeeklyWorkoutPlan(plan.id, plan.exerciseGoal?.text ?? "")}
                        disabled={generatingWorkoutByPlanId[plan.id]}
                      >
                        {generatingWorkoutByPlanId[plan.id] ? "Generating..." : "Generate 1-Week Workout Plan"}
                      </Button>
                      <p className="text-xs text-muted-foreground">
                        Uses doctor goal, age, recent weight logs, and recent calorie-burn logs.
                      </p>
                      {generatedWorkoutByPlanId[plan.id] && (
                        <div className="rounded-md border border-border/60 bg-muted/30 p-3 space-y-3">
                          <p className="text-sm font-medium">Generated weekly workout plan</p>
                          <p className="text-xs text-muted-foreground">
                            {generatedWorkoutByPlanId[plan.id].weeklySummary}
                          </p>
                          <div className="space-y-1">
                            <p className="text-xs font-medium">Alignment with doctor advice and logs</p>
                            {generatedWorkoutByPlanId[plan.id].alignmentNotes.map((note, idx) => (
                              <p key={`${plan.id}-workout-align-${idx}`} className="text-xs text-muted-foreground">
                                {note}
                              </p>
                            ))}
                          </div>
                          <div className="grid md:grid-cols-2 gap-3">
                            <div className="rounded-md border border-border/60 bg-background p-3">
                              <p className="text-xs font-medium">Weight trend</p>
                              <p className="text-xs mt-1 text-muted-foreground">
                                Recent: {generatedWorkoutByPlanId[plan.id].weightTrend.recent}
                              </p>
                              <p className="text-xs mt-1 text-muted-foreground">
                                Projected: {generatedWorkoutByPlanId[plan.id].weightTrend.projected}
                              </p>
                            </div>
                            <div className="rounded-md border border-border/60 bg-background p-3">
                              <p className="text-xs font-medium">Calories-burn trend</p>
                              <p className="text-xs mt-1 text-muted-foreground">
                                Recent: {generatedWorkoutByPlanId[plan.id].calorieTrend.recent}
                              </p>
                              <p className="text-xs mt-1 text-muted-foreground">
                                Projected: {generatedWorkoutByPlanId[plan.id].calorieTrend.projected}
                              </p>
                            </div>
                          </div>
                          <div className="space-y-2">
                            {generatedWorkoutByPlanId[plan.id].days.map((day) => (
                              <div key={`${plan.id}-workout-${day.day}`} className="rounded-md border border-border/60 bg-background p-3">
                                <p className="font-medium text-sm">
                                  {day.day} ({day.intensity})
                                </p>
                                <p className="text-xs mt-1"><span className="font-medium">Focus:</span> {day.focus}</p>
                                <p className="text-xs mt-1"><span className="font-medium">Warm-up:</span> {day.warmup}</p>
                                <p className="text-xs mt-1"><span className="font-medium">Workout:</span> {day.workout}</p>
                                <p className="text-xs mt-1"><span className="font-medium">Cooldown:</span> {day.cooldown}</p>
                                <p className="text-xs mt-1 text-muted-foreground">
                                  Duration: {day.durationMinutes} min | Estimated burn: {day.estimatedCaloriesBurn} kcal
                                </p>
                                <p className="text-xs mt-1 text-muted-foreground">
                                  Why this matches your profile: {day.rationale}
                                </p>
                                <p className="text-xs mt-1 text-muted-foreground">
                                  Safety: {day.safetyNote}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {plan.type === "medical-note" && plan.medicalNote && (
                    <ul className="list-disc pl-5 space-y-1 text-sm">
                      {plan.medicalNote.items.map((item, idx) => (
                        <li key={`${plan.id}-note-${idx}`}>{item}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>

        {/* Health Insights */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-6"
        >
          <InsightsPanel insights={derivedInsights} />
        </motion.div>

        <Dialog open={sosOpen} onOpenChange={setSosOpen}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-danger">
                <Phone className="w-5 h-5" />
                Emergency SOS Contacts
              </DialogTitle>
              <DialogDescription>
                Quick call options for medical emergencies.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              <Button
                className="w-full justify-start"
                variant="outline"
                onClick={() => callNumber(doctorCallHref, "Doctor number is not available.")}
              >
                <Phone className="w-4 h-4 mr-2" />
                {doctorDetails ? `Call Linked Doctor (${doctorDetails.name})` : "Call Linked Doctor"}
              </Button>

              <Button
                className="w-full justify-start"
                variant="outline"
                onClick={() => callNumber(caretakerCallHref, "Caretaker number is not available.")}
              >
                <Phone className="w-4 h-4 mr-2" />
                {caretakerDetails ? `Call Caretaker (${caretakerDetails.name})` : "Call Caretaker"}
              </Button>

              <Button
                className="w-full justify-start"
                variant="outline"
                onClick={() => callNumber(ambulanceCallHref, "Ambulance number is unavailable.")}
              >
                <Phone className="w-4 h-4 mr-2" />
                Call Ambulance (108)
              </Button>

              <div className="pt-1 space-y-2">
                <p className="text-sm font-medium">Nearest 3 hospitals</p>
                {sosHospitals.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Load nearby hospitals first, then you can call the nearest 3 from here.
                  </p>
                )}
                {sosHospitals.map((hospital, idx) => (
                  <Button
                    key={`${hospital.id}-sos`}
                    className="w-full justify-start"
                    variant="outline"
                    onClick={() =>
                      callNumber(
                        buildTelHref(hospital.phone),
                        `${hospital.name} phone number is not available.`
                      )
                    }
                  >
                    <Phone className="w-4 h-4 mr-2" />
                    {idx + 1}. {hospital.name} ({formatDistance(hospital.distanceKm)})
                  </Button>
                ))}
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => void handleFindNearbyHospitals()} disabled={hospitalsLoading}>
                <MapPin className="w-4 h-4 mr-2" />
                {hospitalsLoading ? "Refreshing hospitals..." : "Refresh nearby hospitals"}
              </Button>
              <Button variant="hero" onClick={() => setSosOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={openTrend !== null} onOpenChange={(open) => { if (!open) setOpenTrend(null); }}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>
                {openTrend === "bp" && "Blood Pressure Trend"}
                {openTrend === "bpm" && "Heart Rate Trend"}
                {openTrend === "weight" && "Weight Trend"}
                {openTrend === "hba1c" && "HbA1c Trend"}
              </DialogTitle>
            </DialogHeader>
            {openTrend === "bp" && <VitalsTrendChart metric="blood-pressure" data={dailyMetrics} />}
            {openTrend === "bpm" && <VitalsTrendChart metric="heart-rate" data={dailyMetrics} />}
            {openTrend === "weight" && <VitalsTrendChart metric="weight" data={dailyMetrics} />}
            {openTrend === "hba1c" && <HbA1cChart readings={hba1cReadings} />}
          </DialogContent>
        </Dialog>

        <Dialog open={activityLogOpen} onOpenChange={setActivityLogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Footprints className="w-5 h-5 text-warning" />
                Log Activity
              </DialogTitle>
              <DialogDescription>
                Enter only today&apos;s calories burned.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <label className="text-sm font-medium">Daily Calories Burned</label>
              <Input
                type="number"
                min={1}
                value={activityCaloriesInput}
                onChange={(e) => setActivityCaloriesInput(e.target.value)}
                placeholder="e.g., 450"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setActivityLogOpen(false)}>
                Cancel
              </Button>
              <Button variant="hero" onClick={() => void handleSaveActivityLog()} disabled={savingActivityLog}>
                {savingActivityLog ? "Saving..." : "Save Activity"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default PatientDashboard;
