import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Users,
  Activity,
  TrendingUp,
  AlertTriangle,
  Calendar,
  MapPin,
  Phone,
  LogOut,
  Bell,
  Clock,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { calculateGlucoseStats } from "@/lib/metrics";
import { getGlucoseStatus, type HealthInsight } from "@/types";
import GlucoseChart from "@/components/charts/GlucoseChart";
import HbA1cChart from "@/components/charts/HbA1cChart";
import VitalsTrendChart from "@/components/charts/VitalsTrendChart";
import MetricCard from "@/components/dashboard/MetricCard";
import InsightsPanel from "@/components/dashboard/InsightsPanel";
import { useRoleBasedAuth } from "@/hooks/useRoleBasedAuth";
import DashboardSettingsDialog from "@/components/settings/DashboardSettingsDialog";
import {
  listAppointmentsForPatient,
  listDailyHealthMetrics,
  listNotifications,
  type AppointmentDoc,
  type DailyHealthMetricsDoc,
  type NotificationDoc,
} from "@/lib/firestore";
import { summarizeDiabetesRisk } from "@/lib/diabetes-risk";
import {
  generateNearbyHospitalsFromAi,
  type NearbyHospitalResult,
} from "@/lib/nearby-hospital-generator";
import { toast } from "sonner";

interface FamilyDashboardProps {
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

const FamilyDashboard = ({ onLogout }: FamilyDashboardProps) => {
  const { loading, linkedPatient } = useRoleBasedAuth();
  const [dailyMetrics, setDailyMetrics] = useState<DailyHealthMetricsDoc[]>([]);
  const [notifications, setNotifications] = useState<NotificationDoc[]>([]);
  const [appointments, setAppointments] = useState<AppointmentDoc[]>([]);
  const [openTrend, setOpenTrend] = useState<"bp" | "bpm" | "weight" | "hba1c" | null>(null);
  const [currentLocation, setCurrentLocation] = useState<LatLngCoords | null>(null);
  const [hospitalsLoading, setHospitalsLoading] = useState(false);
  const [nearbyHospitals, setNearbyHospitals] = useState<NearbyHospitalResult[]>([]);
  const [hospitalLookupError, setHospitalLookupError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      if (!linkedPatient?.uid) {
        setDailyMetrics([]);
        setNotifications([]);
        setAppointments([]);
        return;
      }
      try {
        const [metrics, notes, appts] = await Promise.all([
          listDailyHealthMetrics(linkedPatient.uid),
          listNotifications(linkedPatient.uid),
          listAppointmentsForPatient(linkedPatient.uid),
        ]);
        if (!cancelled) {
          setDailyMetrics(metrics);
          setNotifications(notes);
          setAppointments(appts);
        }
      } catch {
        if (!cancelled) toast.error("Failed to load patient monitoring data.");
      }
    }

    loadData();
    return () => {
      cancelled = true;
    };
  }, [linkedPatient?.uid]);

  const chartReadings = useMemo(() => {
    const patientId = linkedPatient?.patientId ?? "";
    return dailyMetrics
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date))
      .flatMap((m) => [
        {
          id: `${m.id}-f`,
          patientId,
          value: m.fastingGlucose,
          unit: "mg/dL" as const,
          type: "fasting" as const,
          timestamp: `${m.date}T07:00:00`,
          notes: m.notes,
        },
        {
          id: `${m.id}-p`,
          patientId,
          value: m.postMealGlucose,
          unit: "mg/dL" as const,
          type: "post-meal" as const,
          timestamp: `${m.date}T13:00:00`,
          notes: m.notes,
        },
      ]);
  }, [dailyMetrics, linkedPatient?.patientId]);

  const stats = useMemo(() => calculateGlucoseStats(chartReadings), [chartReadings]);
  const latestDaily = dailyMetrics[0];
  const latestGlucoseValue = latestDaily?.postMealGlucose ?? latestDaily?.fastingGlucose ?? 0;
  const glucoseStatus = getGlucoseStatus(latestGlucoseValue || 0);
  const unreadAlerts = notifications.filter((n) => !n.isRead);

  const patientName = linkedPatient ? `${linkedPatient.firstName} ${linkedPatient.lastName}`.trim() : "";
  const patientId = linkedPatient?.patientId ?? "";
  const patientInitial = (patientName || patientId || "P").charAt(0).toUpperCase();
  const patientPhoneHref = linkedPatient?.phone ? buildTelHref(linkedPatient.phone) : null;

  const patientDob = linkedPatient?.dob || "";
  const patientAge = useMemo(() => {
    if (!patientDob) return undefined;
    const d = new Date(patientDob);
    if (Number.isNaN(d.getTime())) return undefined;
    const now = new Date();
    let age = now.getFullYear() - d.getFullYear();
    const m = now.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age -= 1;
    return age >= 0 ? age : undefined;
  }, [patientDob]);

  const hba1cReadings = useMemo(() => {
    const id = linkedPatient?.patientId ?? "";
    return dailyMetrics
      .filter((m) => typeof m.hba1c === "number")
      .map((m) => ({
        id: `${m.id}-hba1c`,
        patientId: id,
        value: m.hba1c as number,
        timestamp: `${m.date}T09:00:00`,
      }));
  }, [dailyMetrics, linkedPatient?.patientId]);

  const diabetesRiskSummary = useMemo(
    () =>
      summarizeDiabetesRisk(dailyMetrics, {
        age: patientAge,
        latestWeightKg: latestDaily?.weight,
      }),
    [dailyMetrics, latestDaily?.weight, patientAge]
  );

  const caregiverInsights = useMemo<HealthInsight[]>(() => {
    const pid = linkedPatient?.patientId ?? "";
    const items: HealthInsight[] = [];

    if (stats.readings > 0) {
      items.push({
        id: "family-glucose-summary",
        patientId: pid,
        type: "trend",
        category: "glucose",
        title: "Care Trend Snapshot",
        description: `Average ${stats.average} mg/dL, with ${stats.inRangePercentage}% readings in target range.`,
        timestamp: new Date().toISOString(),
      });
    }

    if (diabetesRiskSummary) {
      items.push({
        id: "family-rf-risk",
        patientId: pid,
        type: "prediction",
        category: "glucose",
        title: "Caregiver Risk Watch (RF Model)",
        description: `Current risk ${Math.round(diabetesRiskSummary.riskScore * 100)}% (${diabetesRiskSummary.riskBand}). 30-day projection ${Math.round(diabetesRiskSummary.projected30DayRisk * 100)}%.`,
        timestamp: new Date().toISOString(),
        confidence: diabetesRiskSummary.confidence,
        actionItems: diabetesRiskSummary.recommendations,
      });
    }

    if (unreadAlerts.length > 0) {
      items.push({
        id: "family-alert-focus",
        patientId: pid,
        type: "alert",
        category: "lifestyle",
        title: "Attention Required",
        description: `${unreadAlerts.length} active alert(s). Latest: ${unreadAlerts[0]?.title ?? "New alert"}.`,
        timestamp: new Date().toISOString(),
      });
    }

    return items;
  }, [diabetesRiskSummary, linkedPatient?.patientId, stats.average, stats.inRangePercentage, stats.readings, unreadAlerts]);

  const upcomingAppointments = useMemo(
    () =>
      appointments
        .filter((a) => a.status === "approved")
        .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime())
        .slice(0, 3),
    [appointments]
  );

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
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
      );
    });

  const handleFindNearbyHospitals = async () => {
    setHospitalsLoading(true);
    setHospitalLookupError("");
    try {
      const coords = await resolveCurrentLocation();
      setCurrentLocation(coords);
      const items = await generateNearbyHospitalsFromAi(coords.lat, coords.lng, 5);
      setNearbyHospitals(items);
      if (items.length === 0) {
        setHospitalLookupError("No nearby diabetes hospitals found.");
      }
    } catch (error: unknown) {
      const message = (error as { message?: string })?.message ?? "Unable to fetch nearby hospitals.";
      setHospitalLookupError(message);
      toast.error(message);
    } finally {
      setHospitalsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-hero">
      <header className="glass-card sticky top-0 z-50 border-b border-border/50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center">
                <Users className="w-6 h-6 text-accent" />
              </div>
              <div>
                <p className="text-muted-foreground">Family Caregiver Dashboard</p>
                <h1 className="text-2xl font-bold">
                  Monitoring: {loading ? "Loading..." : (patientName || "Patient")}
                  {!!patientId && (
                    <span className="ml-2 text-sm font-normal text-muted-foreground">
                      ({patientId})
                    </span>
                  )}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button variant="glass" size="icon-lg" className="relative">
                <Bell className="w-6 h-6" />
                {unreadAlerts.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-danger text-danger-foreground rounded-full text-xs flex items-center justify-center">
                    {unreadAlerts.length}
                  </span>
                )}
              </Button>
              <DashboardSettingsDialog />
              <Button variant="ghost" size="icon-lg" onClick={onLogout}>
                <LogOut className="w-6 h-6" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <Card variant="glass">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-6">
                  <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <span className="text-3xl font-bold text-primary">{patientInitial}</span>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">
                      {loading ? "Loading..." : (patientName || "Patient")}
                      {!!patientId && (
                        <span className="ml-2 text-sm font-normal text-muted-foreground">
                          ({patientId})
                        </span>
                      )}
                    </h2>
                    <p className="text-muted-foreground">{typeof patientAge === "number" ? `${patientAge} years` : ""}</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button variant="hero" onClick={() => patientPhoneHref ? (window.location.href = patientPhoneHref) : toast.error("Patient phone number unavailable.")}>
                    <Phone className="w-5 h-5 mr-2" />
                    Call Patient
                  </Button>
                  <Button variant="outline" onClick={() => void handleFindNearbyHospitals()} disabled={hospitalsLoading}>
                    <MapPin className="w-5 h-5 mr-2" />
                    {hospitalsLoading ? "Finding hospitals..." : "Find Nearby Diabetes Hospitals"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-8">
          <Card
            variant="glass"
            className={`border-l-4 ${
              glucoseStatus === "normal"
                ? "border-l-success"
                : glucoseStatus === "elevated"
                  ? "border-l-warning"
                  : "border-l-danger"
            }`}
          >
            <CardContent className="p-8">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                <div>
                  <p className="text-lg text-muted-foreground mb-2 flex items-center gap-2">
                    <Activity className="w-5 h-5" />
                    Current Blood Glucose
                  </p>
                  <div className="flex items-baseline gap-3">
                    <span
                      className={`text-6xl font-bold ${
                        glucoseStatus === "normal"
                          ? "text-success"
                          : glucoseStatus === "elevated"
                            ? "text-warning"
                            : "text-danger"
                      }`}
                    >
                      {latestGlucoseValue || "--"}
                    </span>
                    <span className="text-2xl text-muted-foreground">mg/dL</span>
                  </div>
                  <div className="flex items-center gap-4 mt-3">
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                        glucoseStatus === "normal"
                          ? "status-normal"
                          : glucoseStatus === "elevated"
                            ? "status-warning"
                            : "status-danger"
                      }`}
                    >
                      {glucoseStatus === "normal" ? "In Range" : glucoseStatus === "elevated" ? "Slightly Elevated" : "High"}
                    </span>
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      Updated {latestDaily?.date || "--"}
                    </span>
                  </div>
                </div>

                {unreadAlerts.length > 0 && (
                  <div className="p-4 rounded-xl bg-warning/10 border border-warning/30">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="w-6 h-6 text-warning" />
                      <div>
                        <p className="font-semibold">{unreadAlerts.length} Active Alerts</p>
                        <p className="text-sm text-muted-foreground">{unreadAlerts[0]?.title}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <MetricCard
            title="Avg. Glucose (7D)"
            value={stats.average}
            unit="mg/dL"
            trend={stats.average < 130 ? "down" : "up"}
            trendValue="5%"
            icon={Activity}
            status={stats.average < 130 ? "success" : "warning"}
          />
          <MetricCard
            title="Time in Range"
            value={stats.inRangePercentage}
            unit="%"
            trend="up"
            trendValue="3%"
            icon={TrendingUp}
            status={stats.inRangePercentage >= 70 ? "success" : "warning"}
          />
          <MetricCard
            title="Risk Score"
            value={diabetesRiskSummary ? Math.round(diabetesRiskSummary.riskScore * 100) : "--"}
            unit="%"
            icon={AlertTriangle}
            status={
              diabetesRiskSummary?.riskBand === "high"
                ? "danger"
                : diabetesRiskSummary?.riskBand === "moderate"
                  ? "warning"
                  : "success"
            }
          />
          <MetricCard
            title="Upcoming Visits"
            value={upcomingAppointments.length}
            unit="scheduled"
            icon={Calendar}
            status="normal"
          />
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="lg:col-span-2">
            <Card variant="glass">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-6 h-6 text-primary" />
                  Glucose Trends (Care View)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <GlucoseChart readings={chartReadings.slice(-28)} />
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <Card variant="glass" className="h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-6 h-6 text-primary" />
                  Nearby Diabetes Hospitals
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
                    Use "Find Nearby Diabetes Hospitals" to load options around your current location.
                  </p>
                )}
                {nearbyHospitals.slice(0, 4).map((hospital, idx) => {
                  const callHref = buildTelHref(hospital.phone);
                  return (
                    <div key={hospital.id} className="p-3 rounded-xl bg-card/50 border border-border/50">
                      <h4 className="font-semibold">{idx + 1}. {hospital.name}</h4>
                      <p className="text-xs text-muted-foreground mt-1">{hospital.address}</p>
                      <p className="text-xs text-muted-foreground mt-1">Distance: {formatDistance(hospital.distanceKm)}</p>
                      <div className="flex gap-2 mt-2">
                        {callHref ? (
                          <a href={callHref}>
                            <Button variant="outline" size="sm">
                              <Phone className="w-4 h-4 mr-1" />
                              Call
                            </Button>
                          </a>
                        ) : (
                          <Button variant="outline" size="sm" disabled>
                            Phone unavailable
                          </Button>
                        )}
                        <a href={hospital.mapsUrl} target="_blank" rel="noreferrer">
                          <Button variant="outline" size="sm">Open Map</Button>
                        </a>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }} className="mb-8">
          <Card variant="glass">
            <CardHeader>
              <CardTitle className="text-lg">Additional Health Graphs</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              <Button variant="outline" onClick={() => setOpenTrend("bp")}>View BP Graph</Button>
              <Button variant="outline" onClick={() => setOpenTrend("bpm")}>View BPM Graph</Button>
              <Button variant="outline" onClick={() => setOpenTrend("weight")}>View Weight Graph</Button>
              <Button variant="outline" onClick={() => setOpenTrend("hba1c")}>View HbA1c Graph</Button>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="mb-8">
          <Card variant="glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Care Plan Snapshot
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Upcoming approved visits: {upcomingAppointments.length}
              </p>
              {upcomingAppointments.length === 0 && (
                <p className="text-sm text-muted-foreground">No approved visits scheduled.</p>
              )}
              {upcomingAppointments.map((appt) => (
                <div key={appt.id} className="rounded-md border border-border/60 p-3">
                  <p className="font-medium">Visit: {appt.date}</p>
                  <p className="text-xs text-muted-foreground">{appt.slotLabel}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}>
          <InsightsPanel insights={caregiverInsights} />
        </motion.div>

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
      </main>
    </div>
  );
};

export default FamilyDashboard;
