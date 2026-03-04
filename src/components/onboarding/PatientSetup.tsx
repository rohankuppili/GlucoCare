import { useState } from "react";
import { motion } from "framer-motion";
import { User, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthUser } from "@/hooks/useAuthUser";
import {
  setUserProfile,
  createPatientProfile,
  generatePatientId,
  getDoctorByDoctorId,
  getPatientProfile,
  linkPatientToDoctor,
} from "@/lib/roles";
import { UserRole } from "@/types/roles";

interface PatientSetupProps {
  onComplete: () => void;
}

export default function PatientSetup({ onComplete }: PatientSetupProps) {
  const { user } = useAuthUser();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dob, setDob] = useState(""); // YYYY-MM-DD
  const [phone, setPhone] = useState(""); // 10 digits
  const [doctorId, setDoctorId] = useState("");
  const [patientId, setPatientId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pre-fill names from Google displayName on first render if possible
  // (kept simple: split by first space)
  if (user && !firstName && !lastName && user.displayName) {
    const parts = user.displayName.split(" ");
    setFirstName(parts[0] || "");
    setLastName(parts.slice(1).join(" ") || "");
  }

  const handleGenerateId = () => {
    setPatientId(generatePatientId());
  };

  const handleCopyId = async () => {
    if (!patientId) return;
    await navigator.clipboard.writeText(patientId);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setError(null);

    const trimmedFirst = firstName.trim();
    const trimmedLast = lastName.trim();
    const trimmedDob = dob.trim();
    const trimmedDoctorId = doctorId.trim();

    if (!trimmedFirst || !trimmedLast || !trimmedDob || !phone || !trimmedDoctorId) {
      setError("Please fill in all required fields.");
      return;
    }

    // Phone: strictly 10 digits
    const digits = phone.replace(/\D/g, "");
    if (digits.length !== 10) {
      setError("Phone number must be exactly 10 digits.");
      return;
    }

    // DOB basic validation: YYYY-MM-DD and not in future
    if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmedDob)) {
      setError("Date of birth must be in YYYY-MM-DD format.");
      return;
    }
    const dobDate = new Date(trimmedDob);
    if (Number.isNaN(dobDate.getTime())) {
      setError("Please enter a valid date of birth.");
      return;
    }
    const today = new Date();
    if (dobDate > today) {
      setError("Date of birth cannot be in the future.");
      return;
    }

    if (!patientId) {
      setPatientId(generatePatientId());
    }
    const finalPatientId = (patientId || generatePatientId()).toUpperCase();

    setSubmitting(true);
    try {
      // Validate doctor by doctorId
      const doctor = await getDoctorByDoctorId(trimmedDoctorId.toUpperCase());
      if (!doctor) {
        setError("Doctor ID not found. Please check and try again.");
        return;
      }

      // Ensure patientId is unique (avoid overwriting an existing patient profile)
      const existingPatient = await getPatientProfile(finalPatientId);
      if (existingPatient) {
        setError("That Patient ID is already taken. Please generate a new one.");
        return;
      }

      // Create patient profile with unique patientId
      await createPatientProfile({
        uid: user.uid,
        patientId: finalPatientId,
        firstName: trimmedFirst,
        lastName: trimmedLast,
        dob: trimmedDob,
        phone: digits,
        email: user.email!,
      });

      // Link patient to doctor
      await linkPatientToDoctor(finalPatientId, doctor.uid);

      // Write user profile with role=patient and onboarded flag
      await setUserProfile(user.uid, {
        email: user.email!,
        firstName: trimmedFirst,
        lastName: trimmedLast,
        dob: trimmedDob,
        phone: digits,
        displayName: user.displayName || undefined,
        photoURL: user.photoURL || undefined,
        role: "patient" as UserRole,
        onboarded: true,
        primaryPatientId: finalPatientId,
      });

      onComplete();
    } catch (err) {
      console.error("Failed to set up patient:", err);
      setError("Failed to set up patient. Please try again.");
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
            <User className="w-6 h-6 text-primary" />
            Patient Setup
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="e.g., Jane"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="e.g., Doe"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dob">Date of Birth</Label>
                <Input
                  id="dob"
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  placeholder="YYYY-MM-DD"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, "");
                    setPhone(digits.slice(0, 10));
                  }}
                  placeholder="10-digit phone number"
                  maxLength={10}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email (Google)</Label>
              <Input id="email" value={user?.email || ""} disabled />
            </div>

            <div className="space-y-2">
              <Label htmlFor="doctorId">Doctor ID</Label>
              <Input
                id="doctorId"
                value={doctorId}
                onChange={(e) => setDoctorId(e.target.value.toUpperCase())}
                placeholder="Enter your doctor's ID"
                required
              />
              <p className="text-xs text-muted-foreground">
                Ask your doctor for their Doctor ID and enter it here to link your account.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Your Patient ID</Label>
              <div className="flex gap-2">
                <Input
                  value={patientId}
                  onChange={(e) => setPatientId(e.target.value.toUpperCase())}
                  placeholder="Click generate to create ID"
                  className="font-mono text-center text-lg"
                  maxLength={6}
                  readOnly
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGenerateId}
                  title="Generate a new ID"
                >
                  🎲
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCopyId}
                  title="Copy to clipboard"
                  disabled={!patientId}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Share this ID with your family members or caregivers so they can link to your account.
              </p>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Saving..." : "Complete Setup"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}
