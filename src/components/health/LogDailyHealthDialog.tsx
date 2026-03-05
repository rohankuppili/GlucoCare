import { useState } from "react";
import { Activity, Droplets } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useAuthUser } from "@/hooks/useAuthUser";
import { toast } from "sonner";
import { upsertActivityLog, upsertDailyHealthMetrics } from "@/lib/firestore";

interface LogDailyHealthDialogProps {
  children?: React.ReactNode;
  onSaved?: () => Promise<void> | void;
}

export default function LogDailyHealthDialog({ children, onSaved }: LogDailyHealthDialogProps) {
  const { user } = useAuthUser();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    date: new Date().toISOString().split("T")[0],
    fastingGlucose: "",
    postMealGlucose: "",
    bloodPressureSystolic: "",
    bloodPressureDiastolic: "",
    heartRate: "",
    weight: "",
    hba1c: "",
    caloriesBurned: "",
    notes: "",
  });

  const parseOptionalNumber = (v: string): number | undefined => {
    if (!v.trim()) return undefined;
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const fasting = Number(form.fastingGlucose);
    const postMeal = Number(form.postMealGlucose);
    if (!form.date || !Number.isFinite(fasting) || fasting <= 0 || !Number.isFinite(postMeal) || postMeal <= 0) {
      toast.error("Date, fasting glucose, and post-meal glucose are required.");
      return;
    }

    setSaving(true);
    try {
      await upsertDailyHealthMetrics(user.uid, {
        date: form.date,
        fastingGlucose: fasting,
        postMealGlucose: postMeal,
        bloodPressureSystolic: parseOptionalNumber(form.bloodPressureSystolic),
        bloodPressureDiastolic: parseOptionalNumber(form.bloodPressureDiastolic),
        heartRate: parseOptionalNumber(form.heartRate),
        weight: parseOptionalNumber(form.weight),
        hba1c: parseOptionalNumber(form.hba1c),
        caloriesBurned: parseOptionalNumber(form.caloriesBurned),
        notes: form.notes.trim() || undefined,
      });
      const calories = parseOptionalNumber(form.caloriesBurned);
      if (typeof calories === "number") {
        await upsertActivityLog(user.uid, {
          date: form.date,
          caloriesBurned: calories,
          source: "daily-health",
        });
      }
      await onSaved?.();
      toast.success("Daily health log saved.");
      setOpen(false);
    } catch (error) {
      console.error("Failed to save daily health log:", error);
      toast.error("Failed to save daily health log.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children ?? (
          <Button variant="hero" size="lg">
            <Activity className="w-5 h-5 mr-2" />
            Log Daily Health
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-xl max-h-[85vh] p-0 overflow-hidden flex flex-col">
        <DialogHeader className="sticky top-0 z-10 bg-background border-b px-6 py-4">
          <DialogTitle className="flex items-center gap-2">
            <Droplets className="w-5 h-5 text-primary" />
            Daily Health Entry
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSave} className="flex-1 min-h-0 space-y-4 overflow-y-auto px-6 py-4">
          <div className="space-y-2">
            <Label>Date</Label>
            <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Fasting Glucose (required)</Label>
              <Input
                type="number"
                value={form.fastingGlucose}
                onChange={(e) => setForm({ ...form, fastingGlucose: e.target.value })}
                placeholder="mg/dL"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Post-Meal Glucose (required)</Label>
              <Input
                type="number"
                value={form.postMealGlucose}
                onChange={(e) => setForm({ ...form, postMealGlucose: e.target.value })}
                placeholder="mg/dL"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>BP Systolic (optional)</Label>
              <Input
                type="number"
                value={form.bloodPressureSystolic}
                onChange={(e) => setForm({ ...form, bloodPressureSystolic: e.target.value })}
                placeholder="e.g., 120"
              />
            </div>
            <div className="space-y-2">
              <Label>BP Diastolic (optional)</Label>
              <Input
                type="number"
                value={form.bloodPressureDiastolic}
                onChange={(e) => setForm({ ...form, bloodPressureDiastolic: e.target.value })}
                placeholder="e.g., 80"
              />
            </div>
            <div className="space-y-2">
              <Label>Heart Rate / BPM (optional)</Label>
              <Input
                type="number"
                value={form.heartRate}
                onChange={(e) => setForm({ ...form, heartRate: e.target.value })}
                placeholder="e.g., 72"
              />
            </div>
            <div className="space-y-2">
              <Label>Weight (kg, optional)</Label>
              <Input
                type="number"
                step="0.1"
                value={form.weight}
                onChange={(e) => setForm({ ...form, weight: e.target.value })}
                placeholder="e.g., 74.5"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>HbA1c (optional)</Label>
            <Input
              type="number"
              step="0.1"
              value={form.hba1c}
              onChange={(e) => setForm({ ...form, hba1c: e.target.value })}
              placeholder="e.g., 6.8"
            />
          </div>

          <div className="space-y-2">
            <Label>Daily Calories Burned (optional)</Label>
            <Input
              type="number"
              value={form.caloriesBurned}
              onChange={(e) => setForm({ ...form, caloriesBurned: e.target.value })}
              placeholder="e.g., 420"
            />
          </div>

          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Any additional notes"
              rows={3}
            />
          </div>

          <Button type="submit" variant="hero" className="w-full" disabled={saving}>
            {saving ? "Saving..." : "Save Daily Log"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
