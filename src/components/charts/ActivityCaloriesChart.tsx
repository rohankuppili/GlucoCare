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
import type { ActivityLogDoc } from "@/lib/firestore";

interface ActivityCaloriesChartProps {
  data: ActivityLogDoc[];
}

export default function ActivityCaloriesChart({ data }: ActivityCaloriesChartProps) {
  const chartData = useMemo(() => {
    return data
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((d) => ({
        date: new Date(`${d.date}T00:00:00`).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        calories: d.caloriesBurned,
      }));
  }, [data]);

  return (
    <div className="w-full">
      <p className="text-sm font-medium mb-2">Activity Calories Trend</p>
      <div className="h-[240px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 16, right: 20, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
            <Tooltip />
            <Line type="monotone" dataKey="calories" name="Calories burned" stroke="hsl(43, 96%, 56%)" strokeWidth={2.5} dot={{ r: 3 }} connectNulls />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
