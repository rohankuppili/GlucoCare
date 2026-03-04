import { useEffect, useMemo, useState } from 'react';
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
  User
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { 
  mockGlucoseReadings, 
  mockHbA1cReadings,
  calculateGlucoseStats,
  mockAppointments
} from '@/data/mockData';
import GlucoseChart from '@/components/charts/GlucoseChart';
import HbA1cChart from '@/components/charts/HbA1cChart';
import MetricCard from '@/components/dashboard/MetricCard';
import { useRoleBasedAuth } from '@/hooks/useRoleBasedAuth';

interface DoctorDashboardProps {
  onLogout: () => void;
}

const DoctorDashboard = ({ onLogout }: DoctorDashboardProps) => {
  const { loading, doctorProfile, linkedPatients } = useRoleBasedAuth();

  const patientsForUI = useMemo(() => {
    return linkedPatients.map((p) => ({
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
  const stats = calculateGlucoseStats(mockGlucoseReadings);

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
              <Button variant="glass" size="icon-lg" className="relative">
                <Bell className="w-6 h-6" />
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-danger text-danger-foreground rounded-full text-xs flex items-center justify-center">
                  3
                </span>
              </Button>
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
                      selectedPatient.id === patient.id 
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
                      <Button variant="outline">
                        <FileText className="w-5 h-5 mr-2" />
                        Add Note
                      </Button>
                      <Button variant="outline">
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
                value={mockHbA1cReadings[mockHbA1cReadings.length - 1]?.value || '--'}
                unit="%"
                trend="down"
                trendValue="0.7"
                icon={TrendingUp}
                status="success"
              />
              <MetricCard
                title="Time in Range"
                value={stats.inRangePercentage}
                unit="%"
                icon={Activity}
                status={stats.inRangePercentage >= 70 ? 'success' : 'warning'}
              />
              <MetricCard
                title="Compliance"
                value={92}
                unit="%"
                icon={Calendar}
                status="success"
              />
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
                    <GlucoseChart readings={mockGlucoseReadings} />
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
                    <HbA1cChart readings={mockHbA1cReadings} />
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
                      { icon: FileText, label: 'Write Prescription', color: 'bg-primary' },
                      { icon: Calendar, label: 'Update Diet Plan', color: 'bg-success' },
                      { icon: Activity, label: 'Set Exercise Goals', color: 'bg-warning' },
                      { icon: AlertTriangle, label: 'Add Medical Note', color: 'bg-accent' },
                    ].map((action) => (
                      <Button
                        key={action.label}
                        variant="glass"
                        className="h-auto py-6 flex flex-col items-center gap-3 hover:shadow-glow"
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
