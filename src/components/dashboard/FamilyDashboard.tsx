import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Users, 
  Activity, 
  TrendingUp,
  TrendingDown,
  Heart,
  AlertTriangle,
  Calendar,
  MapPin,
  Phone,
  ChevronRight,
  LogOut,
  Bell,
  Search,
  Eye,
  Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { 
  calculateGlucoseStats,
} from '@/lib/metrics';
import { getGlucoseStatus } from '@/types';
import GlucoseChart from '@/components/charts/GlucoseChart';
import MetricCard from '@/components/dashboard/MetricCard';
import { useRoleBasedAuth } from '@/hooks/useRoleBasedAuth';
import DashboardSettingsDialog from '@/components/settings/DashboardSettingsDialog';
import {
  listAppointmentsForPatient,
  listDailyHealthMetrics,
  listNotifications,
  type AppointmentDoc,
  type DailyHealthMetricsDoc,
  type NotificationDoc,
} from '@/lib/firestore';
import { toast } from 'sonner';

interface FamilyDashboardProps {
  onLogout: () => void;
}

const nearbyServices = [
  { name: 'City Hospital', type: 'Hospital', distance: '2.5 km', phone: '+91 22 1234 5678' },
  { name: 'Apollo Diabetes Center', type: 'Clinic', distance: '3.1 km', phone: '+91 22 2345 6789' },
  { name: 'LifeCare Pharmacy', type: 'Pharmacy', distance: '0.8 km', phone: '+91 22 3456 7890' },
  { name: 'NutriLife Dietician', type: 'Dietician', distance: '1.5 km', phone: '+91 22 4567 8901' },
];

const FamilyDashboard = ({ onLogout }: FamilyDashboardProps) => {
  const { loading, linkedPatient } = useRoleBasedAuth();
  const [dailyMetrics, setDailyMetrics] = useState<DailyHealthMetricsDoc[]>([]);
  const [notifications, setNotifications] = useState<NotificationDoc[]>([]);
  const [appointments, setAppointments] = useState<AppointmentDoc[]>([]);

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
      } catch (error) {
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
  }, [dailyMetrics, linkedPatient?.patientId]);

  const stats = useMemo(() => calculateGlucoseStats(chartReadings), [chartReadings]);
  const latestDaily = dailyMetrics[0];
  const latestGlucoseValue = latestDaily?.postMealGlucose ?? latestDaily?.fastingGlucose ?? 0;
  const glucoseStatus = getGlucoseStatus(latestGlucoseValue || 0);
  const unreadAlerts = notifications.filter(n => !n.isRead);

  const patientName = linkedPatient ? `${linkedPatient.firstName} ${linkedPatient.lastName}`.trim() : "";
  const patientId = linkedPatient?.patientId ?? "";
  const patientInitial = (patientName || patientId || "P").charAt(0).toUpperCase();

  const patientDob = linkedPatient?.dob || "";
  const patientAge = (() => {
    if (!patientDob) return null;
    const d = new Date(patientDob);
    if (Number.isNaN(d.getTime())) return null;
    const now = new Date();
    let age = now.getFullYear() - d.getFullYear();
    const m = now.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age -= 1;
    return age;
  })();

  return (
    <div className="min-h-screen bg-gradient-hero">
      {/* Header */}
      <header className="glass-card sticky top-0 z-50 border-b border-border/50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center">
                <Users className="w-6 h-6 text-accent" />
              </div>
              <div>
                <p className="text-muted-foreground">Family Caregiver Dashboard</p>
                <h1 className="text-2xl font-bold">Monitoring: {loading ? "Loading..." : (patientName || "Patient")}</h1>
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
        {/* Patient Info Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Card variant="glass">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-6">
                  <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <span className="text-3xl font-bold text-primary">
                      {patientInitial}
                    </span>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">{loading ? "Loading..." : (patientName || "Patient")}</h2>
                    <p className="text-muted-foreground">
                      {patientAge !== null ? `${patientAge} years` : ""}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Patient ID: {patientId || '—'}
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button variant="hero">
                    <Phone className="w-5 h-5 mr-2" />
                    Call Patient
                  </Button>
                  <Button variant="outline">
                    <Eye className="w-5 h-5 mr-2" />
                    Full Report
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Current Status - Large Display */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <Card 
            variant="glass" 
            className={`border-l-4 ${
              glucoseStatus === 'normal' ? 'border-l-success' :
              glucoseStatus === 'elevated' ? 'border-l-warning' :
              'border-l-danger'
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
                    <span className={`text-6xl font-bold ${
                      glucoseStatus === 'normal' ? 'text-success' :
                      glucoseStatus === 'elevated' ? 'text-warning' :
                      'text-danger'
                    }`}>
                      {latestGlucoseValue || '--'}
                    </span>
                    <span className="text-2xl text-muted-foreground">mg/dL</span>
                  </div>
                  <div className="flex items-center gap-4 mt-3">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      glucoseStatus === 'normal' ? 'status-normal' :
                      glucoseStatus === 'elevated' ? 'status-warning' :
                      'status-danger'
                    }`}>
                      {glucoseStatus === 'normal' ? 'In Range' : 
                       glucoseStatus === 'elevated' ? 'Slightly Elevated' : 'High'}
                    </span>
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      Updated {latestDaily?.date || '--'}
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

        {/* Metrics Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
        >
          <MetricCard
            title="Avg. Glucose (7D)"
            value={stats.average}
            unit="mg/dL"
            trend={stats.average < 130 ? 'down' : 'up'}
            trendValue="5%"
            icon={Activity}
            status={stats.average < 130 ? 'success' : 'warning'}
          />
          <MetricCard
            title="Time in Range"
            value={stats.inRangePercentage}
            unit="%"
            trend="up"
            trendValue="3%"
            icon={TrendingUp}
            status={stats.inRangePercentage >= 70 ? 'success' : 'warning'}
          />
          <MetricCard
            title="Readings Today"
            value={4}
            unit="of 4"
            icon={Heart}
            status="success"
          />
          <MetricCard
            title="Medication"
            value="On Track"
            icon={Calendar}
            status="success"
          />
        </motion.div>

        {/* Charts and Services Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Glucose Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="lg:col-span-2"
          >
            <Card variant="glass">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-6 h-6 text-primary" />
                  Glucose Trends (7 Days)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <GlucoseChart readings={chartReadings.slice(-28)} />
              </CardContent>
            </Card>
          </motion.div>

          {/* Nearby Services */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card variant="glass" className="h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-6 h-6 text-primary" />
                  Nearby Healthcare
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {nearbyServices.map((service) => (
                  <div
                    key={service.name}
                    className="p-4 rounded-xl bg-card/50 border border-border/50 hover:shadow-md transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold">{service.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {service.type} • {service.distance}
                        </p>
                      </div>
                      <Button variant="ghost" size="icon">
                        <Phone className="w-5 h-5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Weekly Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-6"
        >
          <Card variant="glass">
            <CardHeader>
              <CardTitle>Weekly Health Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="p-5 rounded-xl bg-success/10 border border-success/30">
                  <h4 className="font-semibold text-success mb-2">✓ Positive Trends</h4>
                  <ul className="space-y-2 text-sm">
                    <li>• Fasting glucose improved by 8%</li>
                    <li>• All medications taken on time</li>
                    <li>• Daily walking goal achieved</li>
                  </ul>
                </div>
                <div className="p-5 rounded-xl bg-warning/10 border border-warning/30">
                  <h4 className="font-semibold text-warning mb-2">⚠ Areas to Watch</h4>
                  <ul className="space-y-2 text-sm">
                    <li>• Post-dinner spikes on 3 days</li>
                    <li>• Water intake below target</li>
                  </ul>
                </div>
                <div className="p-5 rounded-xl bg-primary/10 border border-primary/30">
                  <h4 className="font-semibold text-primary mb-2">📅 Upcoming</h4>
                  <ul className="space-y-2 text-sm">
                    <li>• Dr. Sharma appointment (Tomorrow)</li>
                    <li>• HbA1c test due in 2 weeks</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  );
};

export default FamilyDashboard;
