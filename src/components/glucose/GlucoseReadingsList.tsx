import { useState } from "react";
import { Trash2, Calendar, Clock, Droplets, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useAuthUser } from "@/hooks/useAuthUser";
import { deleteGlucoseReading, type GlucoseReadingDoc } from "@/lib/firestore";
import { getGlucoseStatus } from "@/types";

interface GlucoseReadingsListProps {
  readings: GlucoseReadingDoc[];
  onDeleted?: () => void;
}

export default function GlucoseReadingsList({ readings, onDeleted }: GlucoseReadingsListProps) {
  const { user } = useAuthUser();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (readingId: string) => {
    if (!user) return;
    setDeletingId(readingId);
    try {
      await deleteGlucoseReading(user.uid, readingId);
      onDeleted?.();
    } catch (err) {
      console.error("Failed to delete reading:", err);
      alert("Failed to delete reading. Please try again.");
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (readings.length === 0) {
    return (
      <Card variant="glass">
        <CardContent className="p-8 text-center">
          <Droplets className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-lg font-medium mb-2">No glucose readings yet</p>
          <p className="text-muted-foreground">Start by logging your first reading above.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="glass">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Droplets className="w-5 h-5 text-primary" />
          Recent Readings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {readings.map((reading) => {
          const status = getGlucoseStatus(reading.value);
          const statusColor = {
            normal: "text-success",
            elevated: "text-warning",
            high: "text-danger",
            critical: "text-danger",
            low: "text-glucose-low",
          }[status];

          return (
            <div
              key={reading.id}
              className="p-4 rounded-xl bg-card/50 border border-border/50 hover:shadow-md transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <div className={`text-2xl font-bold ${statusColor}`}>
                      {reading.value}
                    </div>
                    <div className="text-xs text-muted-foreground">{reading.unit}</div>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                      <Calendar className="w-4 h-4" />
                      {formatDate(reading.timestamp)}
                      <Clock className="w-4 h-4 ml-2" />
                      {formatTime(reading.timestamp)}
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="capitalize text-muted-foreground">
                        {reading.type.replace("-", " ")}
                      </span>
                      {reading.notes && (
                        <>
                          <span className="text-muted-foreground">•</span>
                          <span className="text-muted-foreground truncate max-w-xs">
                            {reading.notes}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-destructive"
                      disabled={deletingId === reading.id}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete this reading?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. The glucose reading of{" "}
                        <strong>{reading.value} {reading.unit}</strong> from{" "}
                        {formatDate(reading.timestamp)} at {formatTime(reading.timestamp)} will be permanently removed.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDelete(reading.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        {deletingId === reading.id ? "Deleting..." : "Delete"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
