import { useState } from "react";
import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import DeleteAccountButton from "@/components/auth/DeleteAccountButton";
import { MEDICATION_REMINDER_SLOTS } from "@/lib/firestore";

type DashboardSettingsDialogProps = {
  showMedicationReminderToggle?: boolean;
  medicationReminderEnabled?: boolean;
  medicationReminderSaving?: boolean;
  onMedicationReminderChange?: (enabled: boolean) => Promise<void> | void;
};

export default function DashboardSettingsDialog({
  showMedicationReminderToggle = false,
  medicationReminderEnabled = true,
  medicationReminderSaving = false,
  onMedicationReminderChange,
}: DashboardSettingsDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="glass" size="icon-lg" aria-label="Open settings">
          <Settings className="w-6 h-6" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>Manage reminders and account actions.</DialogDescription>
        </DialogHeader>

        {showMedicationReminderToggle ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4 rounded-xl border p-4">
              <div className="space-y-1">
                <Label htmlFor="med-reminder-toggle" className="text-base">
                  Medication Email Reminders
                </Label>
                <p className="text-sm text-muted-foreground">
                  Sends medication reminder emails automatically based on your prescription timings.
                </p>
              </div>
              <Switch
                id="med-reminder-toggle"
                checked={medicationReminderEnabled}
                disabled={medicationReminderSaving}
                onCheckedChange={(checked) => {
                  void onMedicationReminderChange?.(checked);
                }}
              />
            </div>

            <div className="rounded-xl border p-4">
              <p className="text-sm font-medium mb-2">Reminder schedule</p>
              <div className="space-y-1 text-sm text-muted-foreground">
                {MEDICATION_REMINDER_SLOTS.map((slot) => (
                  <p key={slot.slot}>{slot.emailLabel}</p>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        <Separator />
        <div className="flex justify-end">
          <DeleteAccountButton variant="destructive" />
        </div>
      </DialogContent>
    </Dialog>
  );
}
