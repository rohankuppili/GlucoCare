import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from 'recharts';
import { HbA1cReading } from '@/types';

interface HbA1cChartProps {
  readings: HbA1cReading[];
}

const HbA1cChart = ({ readings }: HbA1cChartProps) => {
  const chartData = useMemo(() => {
    return readings.map((reading) => ({
      date: new Date(reading.timestamp).toLocaleDateString('en-US', {
        month: 'short',
        year: '2-digit',
      }),
      value: reading.value,
      status: reading.value < 5.7 ? 'normal' : reading.value < 6.5 ? 'prediabetic' : 'diabetic',
    }));
  }, [readings]);

  const getBarColor = (value: number) => {
    if (value < 5.7) return 'hsl(150, 60%, 45%)'; // Normal
    if (value < 6.5) return 'hsl(40, 95%, 50%)'; // Prediabetic
    if (value < 7.0) return 'hsl(15, 85%, 60%)'; // Controlled diabetic
    return 'hsl(0, 70%, 55%)'; // Uncontrolled
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const value = payload[0].value;
      let status = 'Normal';
      if (value >= 5.7 && value < 6.5) status = 'Prediabetic';
      else if (value >= 6.5 && value < 7.0) status = 'Well Controlled';
      else if (value >= 7.0) status = 'Needs Improvement';

      return (
        <div className="glass-card p-4 shadow-lg">
          <p className="font-semibold mb-2">{label}</p>
          <p className="text-lg">
            <span className="font-bold" style={{ color: getBarColor(value) }}>
              {value}%
            </span>
          </p>
          <p className="text-sm text-muted-foreground">{status}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full">
      <div className="h-[240px] w-full">
        <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          
          {/* Target line */}
          <ReferenceLine
            y={7}
            stroke="hsl(0, 70%, 55%)"
            strokeDasharray="5 5"
            strokeOpacity={0.6}
            label={{ value: 'Target <7%', position: 'right', fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
          />
          
          <XAxis
            dataKey="date"
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
            dy={10}
          />
          <YAxis
            domain={[4, 10]}
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
            dx={-10}
            tickFormatter={(value) => `${value}%`}
          />
          <Tooltip content={<CustomTooltip />} />
          
          <Bar dataKey="value" radius={[8, 8, 0, 0]} maxBarSize={60}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getBarColor(entry.value)} />
            ))}
          </Bar>
        </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="mt-3 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 px-2 pb-1">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-success" />
          <span className="text-sm text-muted-foreground">&lt;5.7% Normal</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-warning" />
          <span className="text-sm text-muted-foreground">5.7-6.4% Prediabetic</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-accent" />
          <span className="text-sm text-muted-foreground">6.5-7% Controlled</span>
        </div>
      </div>
    </div>
  );
};

export default HbA1cChart;
