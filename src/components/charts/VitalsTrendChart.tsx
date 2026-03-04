import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { DailyHealthMetricsDoc } from "@/lib/firestore";

type VitalsMetric = "blood-pressure" | "heart-rate" | "weight";

interface VitalsTrendChartProps {
  metric: VitalsMetric;
  data: DailyHealthMetricsDoc[];
}

export default function VitalsTrendChart({ metric, data }: VitalsTrendChartProps) {
  const chartData = useMemo(() => {
    return data
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((d) => ({
        date: new Date(`${d.date}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        systolic: d.bloodPressureSystolic ?? null,
        diastolic: d.bloodPressureDiastolic ?? null,
        heartRate: d.heartRate ?? null,
        weight: d.weight ?? null,
      }));
  }, [data]);

  const isBloodPressure = metric === "blood-pressure";
  const title = metric === "blood-pressure" ? "Blood Pressure Trend" : metric === "heart-rate" ? "Heart Rate Trend" : "Weight Trend";

  return (
    <div className="w-full">
      <p className="text-sm font-medium mb-2">{title}</p>
      <div className="h-[260px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 16, right: 20, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
            />
            <Tooltip />
            {isBloodPressure ? (
              <>
                <Line type="monotone" dataKey="systolic" name="Systolic" stroke="hsl(15, 85%, 60%)" strokeWidth={2.5} dot={{ r: 3 }} connectNulls />
                <Line type="monotone" dataKey="diastolic" name="Diastolic" stroke="hsl(175, 65%, 40%)" strokeWidth={2.5} dot={{ r: 3 }} connectNulls />
              </>
            ) : (
              <Line
                type="monotone"
                dataKey={metric === "heart-rate" ? "heartRate" : "weight"}
                name={metric === "heart-rate" ? "BPM" : "Weight (kg)"}
                stroke="hsl(175, 65%, 40%)"
                strokeWidth={2.5}
                dot={{ r: 3 }}
                connectNulls
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
        {isBloodPressure ? (
          <>
            <span className="inline-flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-accent" />Systolic</span>
            <span className="inline-flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-primary" />Diastolic</span>
          </>
        ) : (
          <span className="inline-flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-primary" />Recorded values</span>
        )}
      </div>
    </div>
  );
}
