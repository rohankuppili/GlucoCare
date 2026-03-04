import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
} from 'recharts';
import { GlucoseReading } from '@/types';

interface GlucoseChartProps {
  readings: GlucoseReading[];
}

const GlucoseChart = ({ readings }: GlucoseChartProps) => {
  const chartData = useMemo(() => {
    // Group readings by day and calculate averages
    const dailyData: { [key: string]: { fasting: number[]; postMeal: number[]; date: string } } = {};
    
    readings.forEach((reading) => {
      const date = new Date(reading.timestamp).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
      
      if (!dailyData[date]) {
        dailyData[date] = { fasting: [], postMeal: [], date };
      }
      
      if (reading.type === 'fasting') {
        dailyData[date].fasting.push(reading.value);
      } else {
        dailyData[date].postMeal.push(reading.value);
      }
    });
    
    return Object.values(dailyData).map((day) => ({
      date: day.date,
      fasting: day.fasting.length > 0 
        ? Math.round(day.fasting.reduce((a, b) => a + b, 0) / day.fasting.length)
        : null,
      postMeal: day.postMeal.length > 0 
        ? Math.round(day.postMeal.reduce((a, b) => a + b, 0) / day.postMeal.length)
        : null,
    }));
  }, [readings]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="glass-card p-4 shadow-lg">
          <p className="font-semibold mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.value} mg/dL
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full">
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 0, bottom: 16 }}
        >
          <defs>
            <linearGradient id="fastingGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(175, 65%, 40%)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="hsl(175, 65%, 40%)" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="postMealGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(15, 85%, 60%)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="hsl(15, 85%, 60%)" stopOpacity={0} />
            </linearGradient>
          </defs>
          
          <CartesianGrid 
            strokeDasharray="3 3" 
            stroke="hsl(var(--border))" 
            vertical={false}
          />
          
          {/* Healthy range reference area */}
          <ReferenceArea
            y1={70}
            y2={140}
            fill="hsl(150, 60%, 45%)"
            fillOpacity={0.1}
          />
          
          {/* Target lines */}
          <ReferenceLine
            y={70}
            stroke="hsl(150, 60%, 45%)"
            strokeDasharray="5 5"
            strokeOpacity={0.6}
          />
          <ReferenceLine
            y={140}
            stroke="hsl(40, 95%, 50%)"
            strokeDasharray="5 5"
            strokeOpacity={0.6}
          />
          
          <XAxis 
            dataKey="date" 
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
            dy={10}
          />
          <YAxis 
            domain={[50, 200]}
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
            dx={-10}
          />
          <Tooltip content={<CustomTooltip />} />
          
          <Line
            type="monotone"
            dataKey="fasting"
            name="Fasting"
            stroke="hsl(175, 65%, 40%)"
            strokeWidth={3}
            dot={{ fill: 'hsl(175, 65%, 40%)', strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, strokeWidth: 2 }}
            connectNulls
          />
          <Line
            type="monotone"
            dataKey="postMeal"
            name="Post-Meal"
            stroke="hsl(15, 85%, 60%)"
            strokeWidth={3}
            dot={{ fill: 'hsl(15, 85%, 60%)', strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, strokeWidth: 2 }}
            connectNulls
          />
        </LineChart>
        </ResponsiveContainer>
      </div>
      
      {/* Legend */}
      <div className="mt-3 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 px-2 pb-1">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-primary" />
          <span className="text-sm text-muted-foreground">Fasting</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-accent" />
          <span className="text-sm text-muted-foreground">Post-Meal</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-3 rounded bg-success/20" />
          <span className="text-sm text-muted-foreground">Target Range (70-140)</span>
        </div>
      </div>
    </div>
  );
};

export default GlucoseChart;
