import { useState } from "react";
import { motion } from "framer-motion";
import { UserPlus, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthUser } from "@/hooks/useAuthUser";
import { linkPatientToDoctor, getPatientProfile } from "@/lib/roles";
import type { PatientProfile } from "@/types/roles";

interface AddPatientProps {
  onPatientAdded?: (patient: PatientProfile) => void;
}

export default function AddPatient({ onPatientAdded }: AddPatientProps) {
  const { user } = useAuthUser();
  const [patientId, setPatientId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !patientId.trim()) return;

    setSubmitting(true);
    setError("");
    try {
      const patient = await getPatientProfile(patientId.trim().toUpperCase());
      if (!patient) {
        setError("Patient ID not found. Please check and try again.");
        return;
      }

      // Link patient to this doctor
      await linkPatientToDoctor(patient.patientId, user.uid);

      onPatientAdded?.(patient);
      setPatientId("");
    } catch (err) {
      console.error("Failed to add patient:", err);
      setError("Failed to add patient. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="max-w-md mx-auto"
    >
      <Card variant="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <UserPlus className="w-6 h-6 text-primary" />
            Add Patient
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="patientId">Patient ID</Label>
              <Input
                id="patientId"
                value={patientId}
                onChange={(e) => setPatientId(e.target.value.toUpperCase())}
                placeholder="e.g., ABC123"
                className="font-mono text-center text-lg"
                maxLength={6}
                required
              />
              <p className="text-xs text-muted-foreground">
                Enter the 6-character Patient ID to link them to your account.
              </p>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" className="w-full" disabled={submitting}>
              <UserPlus className="w-4 h-4 mr-2" />
              {submitting ? "Adding..." : "Add Patient"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}
