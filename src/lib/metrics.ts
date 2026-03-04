import type { GlucoseReading, GlucoseStats } from '@/types';

export const calculateGlucoseStats = (readings: GlucoseReading[]): GlucoseStats => {
  if (readings.length === 0) {
    return {
      average: 0,
      min: 0,
      max: 0,
      inRangePercentage: 0,
      belowRangePercentage: 0,
      aboveRangePercentage: 0,
      timeInRange: 0,
      readings: 0,
    };
  }

  const values = readings.map((r) => r.value);
  const average = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
  const min = Math.min(...values);
  const max = Math.max(...values);

  const inRange = values.filter((v) => v >= 70 && v <= 140).length;
  const belowRange = values.filter((v) => v < 70).length;
  const aboveRange = values.filter((v) => v > 140).length;

  return {
    average,
    min,
    max,
    inRangePercentage: Math.round((inRange / values.length) * 100),
    belowRangePercentage: Math.round((belowRange / values.length) * 100),
    aboveRangePercentage: Math.round((aboveRange / values.length) * 100),
    timeInRange: Math.round((inRange / values.length) * 24 * (readings.length / 4)),
    readings: readings.length,
  };
};
