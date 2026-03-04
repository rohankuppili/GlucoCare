import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { User, Users, Stethoscope, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import PatientSetup from "@/components/onboarding/PatientSetup";
import FamilyLink from "@/components/onboarding/FamilyLink";
import DoctorSetup from "@/components/onboarding/DoctorSetup";
import { UserRole } from "@/types/roles";
import { useRoleBasedAuth } from "@/hooks/useRoleBasedAuth";

type RoleSetupView = "select" | "patient" | "family" | "doctor";

interface RoleSetupProps {
  initialRole?: UserRole | null;
  onComplete: () => void;
  onBack?: () => void;
}

export default function RoleSetup({ initialRole, onComplete, onBack }: RoleSetupProps) {
  const { loading } = useRoleBasedAuth();
  const [view, setView] = useState<RoleSetupView>("select");

  // If a role is preselected (e.g., coming from landing role selection), skip the select screen.
  useEffect(() => {
    if (view === "select" && initialRole) {
      setView(initialRole);
    }
  }, [initialRole, view]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  if (view === "patient") {
    return (
      <div>
        {onBack && (
          <Button variant="ghost" onClick={() => setView("select")} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        )}
        <PatientSetup onComplete={onComplete} />
      </div>
    );
  }

  if (view === "family") {
    return (
      <div>
        {onBack && (
          <Button variant="ghost" onClick={() => setView("select")} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        )}
        <FamilyLink onComplete={onComplete} />
      </div>
    );
  }

  if (view === "doctor") {
    return (
      <div>
        {onBack && (
          <Button variant="ghost" onClick={() => setView("select")} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        )}
        <DoctorSetup onComplete={onComplete} />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen flex items-center justify-center p-4"
    >
      <Card variant="glass" className="max-w-lg w-full">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Choose Your Role</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            variant="outline"
            className="w-full h-20 flex-col gap-2"
            onClick={() => setView("patient")}
          >
            <User className="w-8 h-8" />
            <span className="font-semibold">Patient</span>
            <span className="text-sm text-muted-foreground">
              Manage your glucose readings and health data
            </span>
          </Button>

          <Button
            variant="outline"
            className="w-full h-20 flex-col gap-2"
            onClick={() => setView("family")}
          >
            <Users className="w-8 h-8" />
            <span className="font-semibold">Family Member / Caretaker</span>
            <span className="text-sm text-muted-foreground">
              Monitor a patient's data with their Patient ID
            </span>
          </Button>

          <Button
            variant="outline"
            className="w-full h-20 flex-col gap-2"
            onClick={() => setView("doctor")}
          >
            <Stethoscope className="w-8 h-8" />
            <span className="font-semibold">Doctor</span>
            <span className="text-sm text-muted-foreground">
              View and manage multiple patients
            </span>
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}
