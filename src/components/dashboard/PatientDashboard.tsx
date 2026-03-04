import { useEffect, useMemo, useState } from 'react';
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
  ChevronRight,
  Phone,
  LogOut,
  Settings,
  User
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  mockPatient, 
  mockAlerts, 
  mockHealthInsights,
  mockVitalReadings,
  calculateGlucoseStats 
} from '@/data/mockData';
import { getGlucoseStatus } from '@/types';
import GlucoseChart from '@/components/charts/GlucoseChart';
import MetricCard from '@/components/dashboard/MetricCard';
import AlertsPanel from '@/components/dashboard/AlertsPanel';
import InsightsPanel from '@/components/dashboard/InsightsPanel';
import { useAuthUser } from '@/hooks/useAuthUser';
import { useRoleBasedAuth } from '@/hooks/useRoleBasedAuth';
import { listGlucoseReadings, type GlucoseReadingDoc } from '@/lib/firestore';

interface PatientDashboardProps {
  onLogout: () => void;
}

const PatientDashboard = ({ onLogout }: PatientDashboardProps) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'glucose' | 'diet' | 'activity'>('overview');
  const { user } = useAuthUser();
  const { loading: roleLoading, patientProfile } = useRoleBasedAuth();
  const [glucoseReadings, setGlucoseReadings] = useState<GlucoseReadingDoc[]>([]);
  const [glucoseLoading, setGlucoseLoading] = useState(true);

  const patientName = patientProfile ? `${patientProfile.firstName} ${patientProfile.lastName}`.trim() : "";

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!user) return;
      setGlucoseLoading(true);
      const readings = await listGlucoseReadings(user.uid);
      if (cancelled) return;
      setGlucoseReadings(readings);
      setGlucoseLoading(false);
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const stats = useMemo(() => {
    const converted = glucoseReadings.map((r) => ({
      id: r.id,
      patientId: user?.uid ?? "",
      value: r.value,
      unit: r.unit,
      type: r.type,
      timestamp: r.timestamp.toISOString(),
      notes: r.notes,
    }));
    return calculateGlucoseStats(converted);
  }, [glucoseReadings, user?.uid]);

  const latestGlucose = glucoseReadings[0];
  const glucoseStatus = latestGlucose ? getGlucoseStatus(latestGlucose.value) : 'normal';

  const chartReadings = useMemo(() => {
    return glucoseReadings
      .slice()
      .reverse()
      .map((r) => ({
        id: r.id,
        patientId: user?.uid ?? "",
        value: r.value,
        unit: r.unit,
        type: r.type,
        timestamp: r.timestamp.toISOString(),
        notes: r.notes,
      }));
  }, [glucoseReadings, user?.uid]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const bloodPressure = mockVitalReadings.find(v => v.type === 'blood-pressure');
  const heartRate = mockVitalReadings.find(v => v.type === 'heart-rate');
  const weight = mockVitalReadings.find(v => v.type === 'weight');

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
                <h1 className="text-2xl font-bold">{roleLoading ? "Loading..." : (patientName || "Patient")}</h1>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button variant="glass" size="icon-lg" className="relative">
                <Bell className="w-6 h-6" />
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-danger text-danger-foreground rounded-full text-xs flex items-center justify-center">
                  {mockAlerts.filter(a => !a.isRead).length}
                </span>
              </Button>
              <Button variant="glass" size="icon-lg">
                <Settings className="w-6 h-6" />
              </Button>
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
          <Button variant="sos" className="w-full sm:w-auto">
            <Phone className="w-8 h-8 mr-3" />
            Emergency SOS
          </Button>
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
                      {latestGlucose?.value ?? '--'}
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
                  <Button variant="hero" size="lg">
                    <Plus className="w-5 h-5 mr-2" />
                    Log New Reading
                  </Button>
                  <p className="text-sm text-muted-foreground text-center">
                    Last updated: {latestGlucose ? latestGlucose.timestamp.toLocaleTimeString() : '--'}
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
            value={bloodPressure ? `${(bloodPressure.value as { systolic: number }).systolic}/${(bloodPressure.value as { diastolic: number }).diastolic}` : '--'}
            unit="mmHg"
            icon={Heart}
            status="normal"
          />
          <MetricCard
            title="Heart Rate"
            value={heartRate?.value as number || '--'}
            unit="bpm"
            icon={Activity}
            status="normal"
          />
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
        >
          {[
            { icon: Droplets, label: 'Log Glucose', color: 'bg-primary' },
            { icon: Utensils, label: 'Log Meal', color: 'bg-success' },
            { icon: Footprints, label: 'Log Activity', color: 'bg-warning' },
            { icon: Heart, label: 'Log Vitals', color: 'bg-accent' },
          ].map((action) => (
            <Card
              key={action.label}
              variant="glass"
              className="cursor-pointer hover:shadow-glow transition-all duration-300 group"
            >
              <CardContent className="p-6 flex flex-col items-center text-center">
                <div className={`w-14 h-14 rounded-2xl ${action.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                  <action.icon className="w-7 h-7 text-primary-foreground" />
                </div>
                <span className="text-lg font-semibold">{action.label}</span>
              </CardContent>
            </Card>
          ))}
        </motion.div>

        {/* Charts and Insights Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
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
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <AlertsPanel alerts={mockAlerts} />
          </motion.div>
        </div>

        {/* Health Insights */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-6"
        >
          <InsightsPanel insights={mockHealthInsights} />
        </motion.div>
      </main>
    </div>
  );
};

export default PatientDashboard;
