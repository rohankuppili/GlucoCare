import { useState } from "react";
import { motion } from "framer-motion";
import { Stethoscope, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthUser } from "@/hooks/useAuthUser";
import { setUserProfile, createDoctorProfile, getDoctorByDoctorId } from "@/lib/roles";
import { UserRole } from "@/types/roles";

interface DoctorSetupProps {
  onComplete: () => void;
}

export default function DoctorSetup({ onComplete }: DoctorSetupProps) {
  const { user } = useAuthUser();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dob, setDob] = useState("");
  const [phone, setPhone] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [doctorId, setDoctorId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pre-fill names from Google displayName on first render if possible
  if (user && !firstName && !lastName && user.displayName) {
    const parts = user.displayName.split(" ");
    setFirstName(parts[0] || "");
    setLastName(parts.slice(1).join(" ") || "");
  }

  const generateDoctorId = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "";
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `DR-${result}`;
  };

  if (!doctorId) {
    setDoctorId(generateDoctorId());
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setError(null);

    const trimmedFirst = firstName.trim();
    const trimmedLast = lastName.trim();
    const trimmedDob = dob.trim();

    if (!trimmedFirst || !trimmedLast || !trimmedDob || !phone) {
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
    try {
      // Ensure doctorId is unique (avoid collisions)
      const existing = await getDoctorByDoctorId(doctorId);
      if (existing) {
        setError("That Doctor ID is already taken. Please refresh to generate a new one.");
        return;
      }

      // Create doctor profile with generated doctorId
      await createDoctorProfile({
        uid: user.uid,
        doctorId,
        firstName: trimmedFirst,
        lastName: trimmedLast,
        dob: trimmedDob,
        phone: digits,
        email: user.email!,
        licenseNumber: licenseNumber.trim() || undefined,
      });

      // Write user profile with role=doctor and onboarded flag
      await setUserProfile(user.uid, {
        email: user.email!,
        firstName: trimmedFirst,
        lastName: trimmedLast,
        dob: trimmedDob,
        phone: digits,
        displayName: user.displayName || undefined,
        photoURL: user.photoURL || undefined,
        role: "doctor" as UserRole,
        onboarded: true,
        doctorId,
      });

      onComplete();
    } catch (err) {
      console.error("Failed to set up doctor:", err);
      setError("Failed to set up doctor. Please try again.");
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
            <Stethoscope className="w-6 h-6 text-primary" />
            Doctor Setup
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
                  placeholder="e.g., Rahul"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="e.g., Sharma"
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
              <Label htmlFor="licenseNumber">License Number (optional)</Label>
              <Input
                id="licenseNumber"
                value={licenseNumber}
                onChange={(e) => setLicenseNumber(e.target.value)}
                placeholder="e.g., MD123456"
              />
            </div>

            <div className="space-y-2">
              <Label>Your Doctor ID</Label>
              <div className="flex gap-2">
                <Input
                  value={doctorId}
                  readOnly
                  className="font-mono text-center text-lg"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={async () => {
                    await navigator.clipboard.writeText(doctorId);
                  }}
                  title="Copy Doctor ID"
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Share this ID with your patients so they can link their accounts to you.
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
