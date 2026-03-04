import { useState } from "react";
import { motion } from "framer-motion";
import { Users, Link } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthUser } from "@/hooks/useAuthUser";
import { setUserProfile, linkFamilyMemberToPatient, getPatientProfile } from "@/lib/roles";
import { UserRole } from "@/types/roles";

interface FamilyLinkProps {
  onComplete: () => void;
}

export default function FamilyLink({ onComplete }: FamilyLinkProps) {
  const { user } = useAuthUser();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dob, setDob] = useState("");
  const [phone, setPhone] = useState("");
  const [patientId, setPatientId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (user && !firstName && !lastName && user.displayName) {
    const parts = user.displayName.split(" ");
    setFirstName(parts[0] || "");
    setLastName(parts.slice(1).join(" ") || "");
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const trimmedFirst = firstName.trim();
    const trimmedLast = lastName.trim();
    const trimmedDob = dob.trim();
    const trimmedPatientId = patientId.trim().toUpperCase();

    if (!trimmedFirst || !trimmedLast || !trimmedDob || !phone || !trimmedPatientId) {
      setError("Please fill in all required fields.");
      return;
    }

    const digits = phone.replace(/\D/g, "");
    if (digits.length !== 10) {
      setError("Phone number must be exactly 10 digits.");
      return;
    }

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

    setSubmitting(true);
    setError("");
    try {
      const patient = await getPatientProfile(trimmedPatientId);
      if (!patient) {
        setError("Patient ID not found. Please check and try again.");
        return;
      }

      // Link family member to patient with full profile details
      await linkFamilyMemberToPatient(
        user.uid,
        patient.patientId,
        trimmedFirst,
        trimmedLast,
        trimmedDob,
        digits,
        user.email!
      );

      // Write user profile with role=family and onboarded flag
      await setUserProfile(user.uid, {
        email: user.email!,
        firstName: trimmedFirst,
        lastName: trimmedLast,
        dob: trimmedDob,
        phone: digits,
        displayName: user.displayName || undefined,
        photoURL: user.photoURL || undefined,
        role: "family" as UserRole,
        onboarded: true,
        patientId: patient.patientId,
      });

      onComplete();
    } catch (err) {
      console.error("Failed to link family member:", err);
      setError("Failed to link. Please try again.");
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
            <Users className="w-6 h-6 text-primary" />
            Link to Patient
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
                  placeholder="e.g., Anjali"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="e.g., Verma"
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
                Ask the patient for their 6-character Patient ID.
              </p>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" className="w-full" disabled={submitting}>
              <Link className="w-4 h-4 mr-2" />
              {submitting ? "Linking..." : "Link to Patient"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}
