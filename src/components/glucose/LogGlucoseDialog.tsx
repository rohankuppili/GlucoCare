import { useState } from "react";
import { motion } from "framer-motion";
import { Droplets, Calendar, Clock, FileText, X } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createGlucoseReading, type GlucoseReadingCreateInput } from "@/lib/firestore";
import { useAuthUser } from "@/hooks/useAuthUser";

interface LogGlucoseDialogProps {
  children?: React.ReactNode;
  onReadingCreated?: () => void;
}

const READING_TYPES: GlucoseReadingCreateInput["type"][] = [
  "fasting",
  "post-meal",
  "random",
  "bedtime",
];

export default function LogGlucoseDialog({ children, onReadingCreated }: LogGlucoseDialogProps) {
  const { user } = useAuthUser();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    value: "",
    unit: "mg/dL" as "mg/dL" | "mmol/L",
    type: "random" as GlucoseReadingCreateInput["type"],
    notes: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const valueNum = Number(form.value);
    if (!valueNum || valueNum <= 0) {
      alert("Please enter a valid glucose value");
      return;
    }

    setSubmitting(true);
    try {
      await createGlucoseReading(user.uid, {
        value: valueNum,
        unit: form.unit,
        type: form.type,
        timestamp: new Date(),
        notes: form.notes.trim() || undefined,
      });
      setOpen(false);
      setForm({ value: "", unit: "mg/dL", type: "random", notes: "" });
      onReadingCreated?.();
    } catch (err) {
      console.error("Failed to save reading:", err);
      alert("Failed to save reading. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children ?? (
          <Button variant="hero" size="lg">
            <Droplets className="w-5 h-5 mr-2" />
            Log New Reading
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Droplets className="w-6 h-6 text-primary" />
            Log Glucose Reading
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Value */}
          <div className="space-y-2">
            <Label htmlFor="value" className="text-base font-medium">
              Glucose Value
            </Label>
            <div className="flex gap-2">
              <Input
                id="value"
                type="number"
                step="any"
                placeholder="e.g., 110"
                value={form.value}
                onChange={(e) => setForm({ ...form, value: e.target.value })}
                className="flex-1 h-12 text-lg"
                required
              />
              <Select
                value={form.unit}
                onValueChange={(v: "mg/dL" | "mmol/L") => setForm({ ...form, unit: v })}
              >
                <SelectTrigger className="w-24 h-12">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mg/dL">mg/dL</SelectItem>
                  <SelectItem value="mmol/L">mmol/L</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Type */}
          <div className="space-y-2">
            <Label className="text-base font-medium">Reading Type</Label>
            <Select
              value={form.type}
              onValueChange={(v: GlucoseReadingCreateInput["type"]) =>
                setForm({ ...form, type: v })
              }
            >
              <SelectTrigger className="h-12">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {READING_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    <span className="capitalize">{type.replace("-", " ")}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="text-base font-medium">
              Notes (optional)
            </Label>
            <Textarea
              id="notes"
              placeholder="e.g., After a walk, feeling unwell..."
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={3}
            />
          </div>

          {/* Submit */}
          <Button type="submit" variant="hero" className="w-full" disabled={submitting}>
            {submitting ? "Saving..." : "Save Reading"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
