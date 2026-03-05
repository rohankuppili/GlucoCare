import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Stethoscope, 
  Users, 
  Activity, 
  TrendingUp,
  AlertTriangle,
  Calendar,
  FileText,
  ChevronRight,
  LogOut,
  Bell,
  Search,
  Plus,
  Download,
  Clock,
  User,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  calculateGlucoseStats,
} from '@/lib/metrics';
import GlucoseChart from '@/components/charts/GlucoseChart';
import HbA1cChart from '@/components/charts/HbA1cChart';
import VitalsTrendChart from '@/components/charts/VitalsTrendChart';
import MetricCard from '@/components/dashboard/MetricCard';
import { useRoleBasedAuth } from '@/hooks/useRoleBasedAuth';
import DashboardSettingsDialog from '@/components/settings/DashboardSettingsDialog';
import {
  buildDayTimeSlots,
  addDoctorPrivateNote,
  createDoctorScheduledAppointment,
  createDietPlan,
  createExerciseGoal,
  createMedicalNote,
  createPrescriptionPlan,
  listAvailableAppointmentSlotsForDoctor,
  listAppointmentsForDoctor,
  listCarePlansForPatient,
  listDailyHealthMetrics,
  listDoctorPrivateNotes,
  uploadDietPlanImage,
  type AppointmentDoc,
  type DoctorCarePlanDoc,
  type DoctorPrivateNoteDoc,
  type DailyHealthMetricsDoc,
  type MealTimingOption,
  type PrescriptionMedicineInput,
  type TimeSlotOption,
  updateAppointmentStatus,
} from '@/lib/firestore';
import { toast } from 'sonner';

interface DoctorDashboardProps {
  onLogout: () => void;
}

type QuickActionType = "prescription" | "diet-plan" | "exercise-goal" | "medical-note" | null;

type PrescriptionMedicineFormRow = PrescriptionMedicineInput & {
  id: string;
};

const createEmptyMedicine = (): PrescriptionMedicineFormRow => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  name: "",
  dosage: "",
  morning: "none",
  afternoon: "none",
  night: "none",
});

const DoctorDashboard = ({ onLogout }: DoctorDashboardProps) => {
  const { loading, doctorProfile, linkedPatients } = useRoleBasedAuth();
  const [appointments, setAppointments] = useState<AppointmentDoc[]>([]);
  const [appointmentsLoading, setAppointmentsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleDate, setScheduleDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [scheduleTime, setScheduleTime] = useState("");
  const [scheduleSlots, setScheduleSlots] = useState<TimeSlotOption[]>(buildDayTimeSlots());
  const [scheduleSlotsLoading, setScheduleSlotsLoading] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [selectedPatientMetrics, setSelectedPatientMetrics] = useState<DailyHealthMetricsDoc[]>([]);
  const [selectedPatientMetricsLoading, setSelectedPatientMetricsLoading] = useState(false);
  const [openTrend, setOpenTrend] = useState<"bp" | "bpm" | "weight" | "hba1c" | null>(null);
  const [privateNoteOpen, setPrivateNoteOpen] = useState(false);
  const [privateNoteText, setPrivateNoteText] = useState("");
  const [savingPrivateNote, setSavingPrivateNote] = useState(false);
  const [privateNotes, setPrivateNotes] = useState<DoctorPrivateNoteDoc[]>([]);
  const [carePlans, setCarePlans] = useState<DoctorCarePlanDoc[]>([]);
  const [quickActionOpen, setQuickActionOpen] = useState(false);
  const [quickActionType, setQuickActionType] = useState<QuickActionType>(null);
  const [savingQuickAction, setSavingQuickAction] = useState(false);

  const [prescriptionRows, setPrescriptionRows] = useState<PrescriptionMedicineFormRow[]>([createEmptyMedicine()]);
  const [prescriptionComments, setPrescriptionComments] = useState("");
  const [dietText, setDietText] = useState("");
  const [dietCalorieLimit, setDietCalorieLimit] = useState("");
  const [dietImageFile, setDietImageFile] = useState<File | null>(null);
  const [exerciseGoalText, setExerciseGoalText] = useState("");
  const [medicalNoteItems, setMedicalNoteItems] = useState<string[]>([""]);
  const recentUpdatesRef = useRef<HTMLDivElement | null>(null);

  const patientsForUI = useMemo(() => {
    return linkedPatients.map((p) => ({
      uid: p.uid,
      id: p.patientId,
      name: `${p.firstName} ${p.lastName}`.trim() || p.patientId,
      lastVisit: '—',
      status: 'stable',
      age: 0,
      diabetesType: 'type2' as const,
    }));
  }, [linkedPatients]);

  const [selectedPatient, setSelectedPatient] = useState(() => patientsForUI[0]);
  const [searchQuery, setSearchQuery] = useState('');

  const doctorName = doctorProfile ? `${doctorProfile.firstName} ${doctorProfile.lastName}`.trim() : "";

  // Keep selected patient in sync if linkedPatients load later.
  useEffect(() => {
    if (!selectedPatient && patientsForUI.length > 0) {
      setSelectedPatient(patientsForUI[0]);
    }
  }, [patientsForUI, selectedPatient]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'stable': return 'bg-success/10 text-success border-success/30';
      case 'attention': return 'bg-warning/10 text-warning border-warning/30';
      case 'critical': return 'bg-danger/10 text-danger border-danger/30';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const filteredPatients = patientsForUI.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    let cancelled = false;

    async function loadSelectedPatientData() {
      if (!selectedPatient?.uid) {
        setSelectedPatientMetrics([]);
        setPrivateNotes([]);
        setCarePlans([]);
        return;
      }
      setSelectedPatientMetricsLoading(true);
      try {
        const [metrics, notes, plans] = await Promise.all([
          listDailyHealthMetrics(selectedPatient.uid),
          doctorProfile?.uid ? listDoctorPrivateNotes(doctorProfile.uid, selectedPatient.uid) : Promise.resolve([]),
          listCarePlansForPatient(selectedPatient.uid, selectedPatient.id),
        ]);
        if (!cancelled) {
          setSelectedPatientMetrics(metrics);
          setPrivateNotes(notes);
          setCarePlans(doctorProfile?.uid ? plans.filter((p) => p.doctorUid === doctorProfile.uid) : plans);
        }
      } catch (error) {
        if (!cancelled) toast.error("Failed to load patient health data.");
      } finally {
        if (!cancelled) setSelectedPatientMetricsLoading(false);
      }
    }

    loadSelectedPatientData();
    return () => {
      cancelled = true;
    };
  }, [doctorProfile?.uid, selectedPatient?.uid]);

  const patientGlucoseReadings = useMemo(() => {
    if (!selectedPatient) return [];
    return selectedPatientMetrics
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date))
      .flatMap((m) => [
        {
          id: `${m.id}-f`,
          patientId: selectedPatient.id,
          value: m.fastingGlucose,
          unit: 'mg/dL' as const,
          type: 'fasting' as const,
          timestamp: `${m.date}T07:00:00`,
          notes: m.notes,
        },
        {
          id: `${m.id}-p`,
          patientId: selectedPatient.id,
          value: m.postMealGlucose,
          unit: 'mg/dL' as const,
          type: 'post-meal' as const,
          timestamp: `${m.date}T13:00:00`,
          notes: m.notes,
        },
      ]);
  }, [selectedPatient, selectedPatientMetrics]);

  const hba1cReadings = useMemo(() => {
    if (!selectedPatient) return [];
    return selectedPatientMetrics
      .filter((m) => typeof m.hba1c === "number")
      .map((m) => ({
        id: `${m.id}-hba1c`,
        patientId: selectedPatient.id,
        value: m.hba1c as number,
        timestamp: `${m.date}T09:00:00`,
      }));
  }, [selectedPatient, selectedPatientMetrics]);

  const stats = useMemo(() => calculateGlucoseStats(patientGlucoseReadings), [patientGlucoseReadings]);
  const latestHba1cValue = hba1cReadings.length > 0 ? hba1cReadings[hba1cReadings.length - 1]?.value : null;
  const latestDailyPatient = selectedPatientMetrics[0];
  const latestBpForDoctor =
    latestDailyPatient?.bloodPressureSystolic && latestDailyPatient?.bloodPressureDiastolic
      ? `${latestDailyPatient.bloodPressureSystolic}/${latestDailyPatient.bloodPressureDiastolic}`
      : '--';
  const latestBpmForDoctor = latestDailyPatient?.heartRate ?? '--';

  useEffect(() => {
    let cancelled = false;

    async function loadAppointments() {
      if (!doctorProfile?.uid) {
        setAppointments([]);
        setAppointmentsLoading(false);
        return;
      }
      setAppointmentsLoading(true);
      try {
        const items = await listAppointmentsForDoctor(doctorProfile.uid);
        if (!cancelled) setAppointments(items);
      } catch (error) {
        if (!cancelled) toast.error("Failed to load appointments.");
      } finally {
        if (!cancelled) setAppointmentsLoading(false);
      }
    }

    loadAppointments();

    return () => {
      cancelled = true;
    };
  }, [doctorProfile?.uid]);

  const dailyAppointments = useMemo(() => {
    return appointments
      .filter((a) => a.date === selectedDate)
      .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());
  }, [appointments, selectedDate]);

  const upcomingApproved = useMemo(() => {
    const now = Date.now();
    return appointments
      .filter((a) => a.status === 'approved' && a.scheduledAt.getTime() >= now)
      .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime())
      .slice(0, 8);
  }, [appointments]);

  const handleStatusChange = async (appointmentId: string, status: 'approved' | 'rejected') => {
    if (!doctorProfile?.uid) return;
    setStatusUpdatingId(appointmentId);
    try {
      await updateAppointmentStatus(appointmentId, status, doctorProfile.uid);
      const items = await listAppointmentsForDoctor(doctorProfile.uid);
      setAppointments(items);
      toast.success(`Appointment ${status}.`);
    } catch (error) {
      toast.error("Failed to update appointment.");
    } finally {
      setStatusUpdatingId(null);
    }
  };

  useEffect(() => {
    let cancelled = false;

    async function loadScheduleSlots() {
      if (!doctorProfile?.uid || !scheduleOpen || !scheduleDate) return;
      setScheduleSlotsLoading(true);
      try {
        const slots = await listAvailableAppointmentSlotsForDoctor(doctorProfile.uid, scheduleDate);
        if (cancelled) return;
        setScheduleSlots(slots);
        if (!slots.some((s) => s.value === scheduleTime)) {
          setScheduleTime(slots[0]?.value ?? "");
        }
      } catch (error) {
        if (!cancelled) toast.error("Failed to load free slots.");
      } finally {
        if (!cancelled) setScheduleSlotsLoading(false);
      }
    }

    loadScheduleSlots();
    return () => {
      cancelled = true;
    };
  }, [doctorProfile?.uid, scheduleOpen, scheduleDate]);

  const handleScheduleForPatient = async () => {
    if (!doctorProfile || !selectedPatient) return;
    if (!scheduleDate || !scheduleTime) {
      toast.error("Please choose date and time.");
      return;
    }

    const selectedSlot = scheduleSlots.find((s) => s.value === scheduleTime);
    if (!selectedSlot) {
      toast.error("Selected slot is not available.");
      return;
    }

    const selectedDateTime = new Date(`${scheduleDate}T${scheduleTime}:00`);
    if (selectedDateTime.getTime() < Date.now()) {
      toast.error("Please choose a future date/time.");
      return;
    }

    setScheduling(true);
    try {
      await createDoctorScheduledAppointment({
        patientUid: selectedPatient.uid,
        patientId: selectedPatient.id,
        patientName: selectedPatient.name,
        doctorUid: doctorProfile.uid,
        doctorId: doctorProfile.doctorId,
        doctorName: doctorName || doctorProfile.doctorId,
        date: scheduleDate,
        time: scheduleTime,
        slotLabel: selectedSlot.label,
      });
      const items = await listAppointmentsForDoctor(doctorProfile.uid);
      setAppointments(items);
      toast.success("Appointment booked successfully.");
      setScheduleOpen(false);
    } catch (error: unknown) {
      const message = (error as { message?: string })?.message ?? "Failed to book appointment.";
      toast.error(message);
    } finally {
      setScheduling(false);
    }
  };

  const resetQuickActionForm = () => {
    setPrescriptionRows([createEmptyMedicine()]);
    setPrescriptionComments("");
    setDietText("");
    setDietCalorieLimit("");
    setDietImageFile(null);
    setExerciseGoalText("");
    setMedicalNoteItems([""]);
  };

  const refreshCarePlanData = async () => {
    if (!selectedPatient?.uid) return;
    const plans = await listCarePlansForPatient(selectedPatient.uid, selectedPatient.id);
    setCarePlans(doctorProfile?.uid ? plans.filter((p) => p.doctorUid === doctorProfile.uid) : plans);
  };

  const openQuickActionDialog = (type: Exclude<QuickActionType, null>) => {
    resetQuickActionForm();
    const existing = carePlans.find((plan) => plan.type === type);

    if (type === "prescription" && existing?.prescription) {
      const rows = existing.prescription.medicines.length
        ? existing.prescription.medicines.map((m) => ({
            ...m,
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          }))
        : [createEmptyMedicine()];
      setPrescriptionRows(rows);
      setPrescriptionComments(existing.prescription.comments ?? "");
    } else if (type === "diet-plan" && existing?.dietPlan) {
      setDietText(existing.dietPlan.text ?? "");
      setDietCalorieLimit(
        existing.dietPlan.calorieLimit ? String(existing.dietPlan.calorieLimit) : ""
      );
    } else if (type === "exercise-goal" && existing?.exerciseGoal) {
      setExerciseGoalText(existing.exerciseGoal.text ?? "");
    } else if (type === "medical-note" && existing?.medicalNote) {
      setMedicalNoteItems(existing.medicalNote.items.length ? existing.medicalNote.items : [""]);
    }

    setQuickActionType(type);
    setQuickActionOpen(true);
  };

  const handleBellClick = () => {
    recentUpdatesRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const updateMedicineField = (
    rowId: string,
    field: keyof Omit<PrescriptionMedicineFormRow, "id">,
    value: string
  ) => {
    setPrescriptionRows((rows) =>
      rows.map((row) => (row.id === rowId ? { ...row, [field]: value } : row))
    );
  };

  const handleSavePrivateNote = async () => {
    if (!doctorProfile || !selectedPatient) return;
    const note = privateNoteText.trim();
    if (!note) {
      toast.error("Please write a note.");
      return;
    }

    setSavingPrivateNote(true);
    try {
      await addDoctorPrivateNote({
        doctorUid: doctorProfile.uid,
        patientUid: selectedPatient.uid,
        patientId: selectedPatient.id,
        patientName: selectedPatient.name,
        note,
      });
      const items = await listDoctorPrivateNotes(doctorProfile.uid, selectedPatient.uid);
      setPrivateNotes(items);
      setPrivateNoteText("");
      setPrivateNoteOpen(false);
      toast.success("Private note saved.");
    } catch (error: unknown) {
      const message = (error as { message?: string })?.message ?? "Failed to save note.";
      toast.error(message);
    } finally {
      setSavingPrivateNote(false);
    }
  };

  const handleSaveQuickAction = async () => {
    if (!doctorProfile || !selectedPatient || !quickActionType) return;

    setSavingQuickAction(true);
    try {
      if (quickActionType === "prescription") {
        await createPrescriptionPlan({
          patientUid: selectedPatient.uid,
          patientId: selectedPatient.id,
          patientName: selectedPatient.name,
          doctorUid: doctorProfile.uid,
          doctorId: doctorProfile.doctorId,
          doctorName: doctorName || doctorProfile.doctorId,
          medicines: prescriptionRows.map((row) => ({
            name: row.name,
            dosage: row.dosage,
            morning: row.morning,
            afternoon: row.afternoon,
            night: row.night,
          })),
          comments: prescriptionComments,
        });
      } else if (quickActionType === "diet-plan") {
        let imageUrl: string | undefined;
        let imagePath: string | undefined;
        if (dietImageFile) {
          const uploaded = await uploadDietPlanImage(dietImageFile, doctorProfile.uid, selectedPatient.uid);
          imageUrl = uploaded.imageUrl;
          imagePath = uploaded.imagePath;
        }
        await createDietPlan({
          patientUid: selectedPatient.uid,
          patientId: selectedPatient.id,
          patientName: selectedPatient.name,
          doctorUid: doctorProfile.uid,
          doctorId: doctorProfile.doctorId,
          doctorName: doctorName || doctorProfile.doctorId,
          text: dietText,
          calorieLimit: Number(dietCalorieLimit),
          imageUrl,
          imagePath,
        });
      } else if (quickActionType === "exercise-goal") {
        await createExerciseGoal({
          patientUid: selectedPatient.uid,
          patientId: selectedPatient.id,
          patientName: selectedPatient.name,
          doctorUid: doctorProfile.uid,
          doctorId: doctorProfile.doctorId,
          doctorName: doctorName || doctorProfile.doctorId,
          text: exerciseGoalText,
        });
      } else if (quickActionType === "medical-note") {
        await createMedicalNote({
          patientUid: selectedPatient.uid,
          patientId: selectedPatient.id,
          patientName: selectedPatient.name,
          doctorUid: doctorProfile.uid,
          doctorId: doctorProfile.doctorId,
          doctorName: doctorName || doctorProfile.doctorId,
          items: medicalNoteItems,
        });
      }

      await refreshCarePlanData();
      setQuickActionOpen(false);
      resetQuickActionForm();
      toast.success("Patient update saved.");
    } catch (error: unknown) {
      const message = (error as { message?: string })?.message ?? "Failed to save update.";
      toast.error(message);
    } finally {
      setSavingQuickAction(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-hero">
      {/* Header */}
      <header className="glass-card sticky top-0 z-50 border-b border-border/50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-success/20 flex items-center justify-center">
                <Stethoscope className="w-6 h-6 text-success" />
              </div>
              <div>
                <p className="text-muted-foreground">Welcome back,</p>
                <h1 className="text-2xl font-bold">{loading ? "Loading..." : (doctorName || "Doctor")}</h1>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative hidden md:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  placeholder="Search patients..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-64 rounded-xl"
                />
              </div>
              <Button
                variant="glass"
                size="icon-lg"
                onClick={handleBellClick}
                aria-label="Go to recent patient updates"
              >
                <Bell className="w-6 h-6" />
              </Button>
              <DashboardSettingsDialog />
              <Button variant="ghost" size="icon-lg" onClick={onLogout}>
                <LogOut className="w-6 h-6" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        <div className="grid lg:grid-cols-4 gap-6">
          {/* Patient List Sidebar */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-1"
          >
            <Card variant="glass" className="h-fit">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-primary" />
                    Patients ({patientsForUI.length})
                  </CardTitle>
                  <Button variant="ghost" size="icon">
                    <Plus className="w-5 h-5" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {filteredPatients.map((patient) => (
                  <div
                    key={patient.id}
                    onClick={() => setSelectedPatient(patient)}
                    className={`p-4 rounded-xl cursor-pointer transition-all ${
                      selectedPatient?.id === patient.id 
                        ? 'bg-primary/10 border-2 border-primary' 
                        : 'bg-card/50 border border-border/50 hover:bg-card'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="font-semibold text-primary">
                          {patient.name.charAt(0)}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold truncate">{patient.name}</h4>
                        <p className="text-sm text-muted-foreground">{patient.id}</p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(patient.status)}`}>
                        {patient.status}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Last visit: {patient.lastVisit}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>

          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            {/* Patient Header */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card variant="glass">
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                        <User className="w-8 h-8 text-primary" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold">{selectedPatient?.name ?? (loading ? "Loading..." : "No linked patient")}</h2>
                        <p className="text-muted-foreground">
                          {selectedPatient ? "" : "Link patients to see them here."}
                        </p>
                        <p className="text-sm text-muted-foreground">ID: {selectedPatient?.id ?? "—"}</p>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <Button variant="outline" onClick={() => setPrivateNoteOpen(true)} disabled={!selectedPatient}>
                        <FileText className="w-5 h-5 mr-2" />
                        Add Note
                      </Button>
                      <Button variant="outline" onClick={() => setScheduleOpen(true)} disabled={!selectedPatient}>
                        <Calendar className="w-5 h-5 mr-2" />
                        Schedule
                      </Button>
                      <Button variant="hero">
                        <Download className="w-5 h-5 mr-2" />
                        Export Report
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Schedule Appointment</DialogTitle>
                  <DialogDescription>
                    {selectedPatient ? `Book for ${selectedPatient.name} (${selectedPatient.id})` : "Select a patient first."}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Date</label>
                    <Input
                      type="date"
                      min={new Date().toISOString().split('T')[0]}
                      value={scheduleDate}
                      onChange={(e) => setScheduleDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Free Slot</label>
                    <select
                      className="w-full h-12 rounded-xl border border-input bg-background px-3 text-base"
                      value={scheduleTime}
                      onChange={(e) => setScheduleTime(e.target.value)}
                      disabled={scheduleSlotsLoading || scheduleSlots.length === 0}
                    >
                      {scheduleSlots.map((slot) => (
                        <option key={slot.value} value={slot.value}>
                          {slot.label}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-muted-foreground mt-1">
                      {scheduleSlotsLoading ? "Loading free slots..." : scheduleSlots.length === 0 ? "No free slots on this date." : "Only available slots are shown."}
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setScheduleOpen(false)}>Cancel</Button>
                  <Button
                    variant="hero"
                    onClick={handleScheduleForPatient}
                    disabled={!selectedPatient || scheduleSlotsLoading || scheduleSlots.length === 0 || scheduling}
                  >
                    {scheduling ? "Booking..." : "Book Appointment"}
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
                  <DialogDescription>
                    {selectedPatient ? `${selectedPatient.name} (${selectedPatient.id})` : ""}
                  </DialogDescription>
                </DialogHeader>
                {openTrend === "bp" && <VitalsTrendChart metric="blood-pressure" data={selectedPatientMetrics} />}
                {openTrend === "bpm" && <VitalsTrendChart metric="heart-rate" data={selectedPatientMetrics} />}
                {openTrend === "weight" && <VitalsTrendChart metric="weight" data={selectedPatientMetrics} />}
                {openTrend === "hba1c" && <HbA1cChart readings={hba1cReadings} />}
              </DialogContent>
            </Dialog>

            <Dialog open={privateNoteOpen} onOpenChange={setPrivateNoteOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Doctor Private Note</DialogTitle>
                  <DialogDescription>
                    This note is visible only to you and stays hidden from patient and caretaker.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-2">
                  <Textarea
                    rows={5}
                    value={privateNoteText}
                    onChange={(e) => setPrivateNoteText(e.target.value)}
                    placeholder="Write your private observation..."
                  />
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setPrivateNoteOpen(false)}>
                    Cancel
                  </Button>
                  <Button variant="hero" onClick={handleSavePrivateNote} disabled={savingPrivateNote}>
                    {savingPrivateNote ? "Saving..." : "Save Note"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog
              open={quickActionOpen}
              onOpenChange={(open) => {
                setQuickActionOpen(open);
                if (!open) {
                  setQuickActionType(null);
                  resetQuickActionForm();
                }
              }}
            >
              <DialogContent className="max-w-3xl">
                <DialogHeader>
                  <DialogTitle>
                    {quickActionType === "prescription" && "Write Prescription"}
                    {quickActionType === "diet-plan" && "Update Diet Plan"}
                    {quickActionType === "exercise-goal" && "Set Exercise Goals"}
                    {quickActionType === "medical-note" && "Add Medical Note"}
                  </DialogTitle>
                  <DialogDescription>
                    {selectedPatient ? `${selectedPatient.name} (${selectedPatient.id})` : ""}
                  </DialogDescription>
                </DialogHeader>

                {quickActionType === "prescription" && (
                  <div className="space-y-4 max-h-[60vh] overflow-auto pr-1">
                    {prescriptionRows.map((row, index) => (
                      <div key={row.id} className="rounded-lg border border-border/60 p-3 space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="font-medium">Medicine {index + 1}</p>
                          {prescriptionRows.length > 1 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setPrescriptionRows((rows) => rows.filter((r) => r.id !== row.id))}
                            >
                              <Trash2 className="w-4 h-4 mr-1" />
                              Remove
                            </Button>
                          )}
                        </div>
                        <div className="grid md:grid-cols-2 gap-3">
                          <Input
                            placeholder="Medicine name"
                            value={row.name}
                            onChange={(e) => updateMedicineField(row.id, "name", e.target.value)}
                          />
                          <Input
                            placeholder="Dosage (e.g. 500 mg)"
                            value={row.dosage}
                            onChange={(e) => updateMedicineField(row.id, "dosage", e.target.value)}
                          />
                        </div>
                        <div className="grid md:grid-cols-3 gap-3">
                          {(["morning", "afternoon", "night"] as const).map((period) => (
                            <div key={`${row.id}-${period}`}>
                              <p className="text-sm font-medium capitalize mb-1">{period}</p>
                              <select
                                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                                value={row[period]}
                                onChange={(e) =>
                                  updateMedicineField(row.id, period, e.target.value as MealTimingOption)
                                }
                              >
                                <option value="none">Not required</option>
                                <option value="before-food">Before food</option>
                                <option value="after-food">After food</option>
                              </select>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      onClick={() => setPrescriptionRows((rows) => [...rows, createEmptyMedicine()])}
                    >
                      Add Another Medicine
                    </Button>
                    <Textarea
                      rows={3}
                      placeholder="Comments / remarks"
                      value={prescriptionComments}
                      onChange={(e) => setPrescriptionComments(e.target.value)}
                    />
                  </div>
                )}

                {quickActionType === "diet-plan" && (
                  <div className="space-y-4">
                    <Textarea
                      rows={5}
                      placeholder="Write diet plan details..."
                      value={dietText}
                      onChange={(e) => setDietText(e.target.value)}
                    />
                    <Input
                      type="number"
                      min={1}
                      placeholder="Calorie limit per day"
                      value={dietCalorieLimit}
                      onChange={(e) => setDietCalorieLimit(e.target.value)}
                    />
                    <div>
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setDietImageFile(e.target.files?.[0] ?? null)}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Optional image. Max size 5 MB.
                      </p>
                    </div>
                  </div>
                )}

                {quickActionType === "exercise-goal" && (
                  <Textarea
                    rows={6}
                    placeholder="Set exercise goals for this patient..."
                    value={exerciseGoalText}
                    onChange={(e) => setExerciseGoalText(e.target.value)}
                  />
                )}

                {quickActionType === "medical-note" && (
                  <div className="space-y-3">
                    {medicalNoteItems.map((item, idx) => (
                      <div key={`medical-note-item-${idx}`} className="flex gap-2">
                        <Input
                          placeholder={`Note item ${idx + 1}`}
                          value={item}
                          onChange={(e) =>
                            setMedicalNoteItems((items) =>
                              items.map((entry, i) => (i === idx ? e.target.value : entry))
                            )
                          }
                        />
                        {medicalNoteItems.length > 1 && (
                          <Button
                            variant="ghost"
                            onClick={() =>
                              setMedicalNoteItems((items) => items.filter((_, i) => i !== idx))
                            }
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      onClick={() => setMedicalNoteItems((items) => [...items, ""])}
                    >
                      Add Note Item
                    </Button>
                  </div>
                )}

                <DialogFooter>
                  <Button variant="outline" onClick={() => setQuickActionOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    variant="hero"
                    onClick={handleSaveQuickAction}
                    disabled={!selectedPatient || !quickActionType || savingQuickAction}
                  >
                    {savingQuickAction ? "Saving..." : "Save"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
            >
              <Card variant="glass">
                <CardHeader>
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-primary" />
                      Appointments For The Day
                    </CardTitle>
                    <Input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="w-full md:w-56"
                    />
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {appointmentsLoading && (
                    <p className="text-sm text-muted-foreground">Loading appointments...</p>
                  )}
                  {!appointmentsLoading && dailyAppointments.length === 0 && (
                    <p className="text-sm text-muted-foreground">No appointments for this date.</p>
                  )}
                  {!appointmentsLoading && dailyAppointments.map((appt) => (
                    <div key={appt.id} className="rounded-lg border border-border/60 p-4">
                      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                        <div>
                          <p className="font-semibold">{appt.patientName || appt.patientId}</p>
                          <p className="text-sm text-muted-foreground">
                            {appt.patientId} • {appt.slotLabel}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Status: <span className="capitalize">{appt.status}</span>
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant={appt.status === 'approved' ? 'success' : 'outline'}
                            disabled={statusUpdatingId === appt.id}
                            onClick={() => handleStatusChange(appt.id, 'approved')}
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant={appt.status === 'rejected' ? 'destructive' : 'outline'}
                            disabled={statusUpdatingId === appt.id}
                            onClick={() => handleStatusChange(appt.id, 'rejected')}
                          >
                            Reject
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 }}
            >
              <Card variant="glass">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-primary" />
                    Upcoming Approved Visits
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {upcomingApproved.length === 0 && (
                    <p className="text-sm text-muted-foreground">No upcoming approved visits.</p>
                  )}
                  {upcomingApproved.map((appt) => (
                    <div key={`upcoming-${appt.id}`} className="rounded-lg border border-border/60 p-3">
                      <p className="font-medium">{appt.patientName || appt.patientId}</p>
                      <p className="text-sm text-muted-foreground">
                        {appt.date} • {appt.slotLabel}
                      </p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.09 }}
            >
              <Card variant="glass">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary" />
                    Doctor Private Notes
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {privateNotes.length === 0 && (
                    <p className="text-sm text-muted-foreground">No private notes for this patient yet.</p>
                  )}
                  {privateNotes.slice(0, 5).map((note) => (
                    <div key={note.id} className="rounded-lg border border-border/60 p-3">
                      <p className="text-sm">{note.note}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {note.createdAt ? note.createdAt.toLocaleString() : "Recently added"}
                      </p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              ref={recentUpdatesRef}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.095 }}
              className="scroll-mt-28"
            >
              <Card variant="glass">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="w-5 h-5 text-primary" />
                    Recent Patient Updates
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {carePlans.length === 0 && (
                    <p className="text-sm text-muted-foreground">No updates sent yet from quick actions.</p>
                  )}
                  {carePlans.slice(0, 5).map((plan) => (
                    <div key={plan.id} className="rounded-lg border border-border/60 p-3">
                      <p className="font-medium">
                        {plan.type === "prescription" && "Prescription"}
                        {plan.type === "diet-plan" && "Diet Plan"}
                        {plan.type === "exercise-goal" && "Exercise Goal"}
                        {plan.type === "medical-note" && "Medical Note"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {plan.createdAt ? plan.createdAt.toLocaleString() : "Recently added"}
                      </p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </motion.div>

            {/* Metrics */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="grid grid-cols-2 lg:grid-cols-4 gap-4"
            >
              <MetricCard
                title="Avg. Glucose (30D)"
                value={stats.average}
                unit="mg/dL"
                trend="down"
                trendValue="12%"
                icon={Activity}
                status={stats.average < 130 ? 'success' : 'warning'}
              />
              <MetricCard
                title="Latest HbA1c"
                value={latestHba1cValue ?? '--'}
                unit="%"
                trend="down"
                trendValue="0.7"
                icon={TrendingUp}
                status="success"
              />
              <MetricCard
                title="Blood Pressure"
                value={latestBpForDoctor}
                unit="mmHg"
                icon={Activity}
                status="normal"
              />
              <MetricCard
                title="Heart Rate"
                value={latestBpmForDoctor}
                unit="bpm"
                icon={Activity}
                status="normal"
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12 }}
            >
              <Card variant="glass">
                <CardHeader>
                  <CardTitle className="text-lg">Patient Log Graphs</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-3">
                  <Button variant="outline" onClick={() => setOpenTrend("bp")}>View BP Graph</Button>
                  <Button variant="outline" onClick={() => setOpenTrend("bpm")}>View BPM Graph</Button>
                  <Button variant="outline" onClick={() => setOpenTrend("weight")}>View Weight Graph</Button>
                  <Button variant="outline" onClick={() => setOpenTrend("hba1c")}>View HbA1c Graph</Button>
                </CardContent>
              </Card>
            </motion.div>

            {/* Charts Row */}
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Glucose Trends */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Card variant="glass">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-primary" />
                      Glucose Trends (30 Days)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {selectedPatientMetricsLoading ? (
                      <p className="text-sm text-muted-foreground">Loading chart...</p>
                    ) : (
                      <GlucoseChart readings={patientGlucoseReadings} />
                    )}
                  </CardContent>
                </Card>
              </motion.div>

              {/* HbA1c History */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <Card variant="glass">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="w-5 h-5 text-primary" />
                      HbA1c History
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {selectedPatientMetricsLoading ? (
                      <p className="text-sm text-muted-foreground">Loading chart...</p>
                    ) : (
                      <HbA1cChart readings={hba1cReadings} />
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            {/* Quick Actions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card variant="glass">
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-4 gap-4">
                    {[
                      { icon: FileText, label: 'Write Prescription', color: 'bg-primary', type: 'prescription' as const },
                      { icon: Calendar, label: 'Update Diet Plan', color: 'bg-success', type: 'diet-plan' as const },
                      { icon: Activity, label: 'Set Exercise Goals', color: 'bg-warning', type: 'exercise-goal' as const },
                      { icon: AlertTriangle, label: 'Add Medical Note', color: 'bg-accent', type: 'medical-note' as const },
                    ].map((action) => (
                      <Button
                        key={action.label}
                        variant="glass"
                        className="h-auto py-6 flex flex-col items-center gap-3 hover:shadow-glow"
                        onClick={() => openQuickActionDialog(action.type)}
                        disabled={!selectedPatient}
                      >
                        <div className={`w-12 h-12 rounded-xl ${action.color} flex items-center justify-center`}>
                          <action.icon className="w-6 h-6 text-primary-foreground" />
                        </div>
                        <span className="text-base font-medium">{action.label}</span>
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DoctorDashboard;
