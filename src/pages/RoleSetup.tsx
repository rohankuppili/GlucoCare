import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { User, Users, Stethoscope, ArrowLeft, Home } from "lucide-react";
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
  const [autoSelected, setAutoSelected] = useState(false);

  // Auto-select preselected role only once so users can still navigate back to role selection.
  useEffect(() => {
    if (!autoSelected && view === "select" && initialRole) {
      setView(initialRole);
      setAutoSelected(true);
    }
  }, [autoSelected, initialRole, view]);

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
        <div className="mb-4 flex items-center gap-2">
          <Button variant="ghost" onClick={() => setView("select")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          {onBack && (
            <Button variant="outline" onClick={onBack}>
              <Home className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          )}
        </div>
        <PatientSetup onComplete={onComplete} />
      </div>
    );
  }

  if (view === "family") {
    return (
      <div>
        <div className="mb-4 flex items-center gap-2">
          <Button variant="ghost" onClick={() => setView("select")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          {onBack && (
            <Button variant="outline" onClick={onBack}>
              <Home className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          )}
        </div>
        <FamilyLink onComplete={onComplete} />
      </div>
    );
  }

  if (view === "doctor") {
    return (
      <div>
        <div className="mb-4 flex items-center gap-2">
          <Button variant="ghost" onClick={() => setView("select")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          {onBack && (
            <Button variant="outline" onClick={onBack}>
              <Home className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          )}
        </div>
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
          {onBack && (
            <div className="pt-2">
              <Button variant="outline" onClick={onBack} className="w-full">
                <Home className="w-4 h-4 mr-2" />
                Back to Home
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            variant="outline"
            className="w-full min-h-[120px] h-auto py-5 px-5 flex-col items-center justify-center gap-2 text-center whitespace-normal"
            onClick={() => setView("patient")}
          >
            <User className="w-7 h-7 shrink-0" />
            <span className="font-semibold text-xl leading-tight">Patient</span>
            <span className="text-sm text-muted-foreground leading-snug max-w-[28rem]">
              Manage your glucose readings and health data
            </span>
          </Button>

          <Button
            variant="outline"
            className="w-full min-h-[120px] h-auto py-5 px-5 flex-col items-center justify-center gap-2 text-center whitespace-normal"
            onClick={() => setView("family")}
          >
            <Users className="w-7 h-7 shrink-0" />
            <span className="font-semibold text-xl leading-tight">Family Member / Caretaker</span>
            <span className="text-sm text-muted-foreground leading-snug max-w-[28rem]">
              Monitor a patient's data with their Patient ID
            </span>
          </Button>

          <Button
            variant="outline"
            className="w-full min-h-[120px] h-auto py-5 px-5 flex-col items-center justify-center gap-2 text-center whitespace-normal"
            onClick={() => setView("doctor")}
          >
            <Stethoscope className="w-7 h-7 shrink-0" />
            <span className="font-semibold text-xl leading-tight">Doctor</span>
            <span className="text-sm text-muted-foreground leading-snug max-w-[28rem]">
              View and manage multiple patients
            </span>
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}
