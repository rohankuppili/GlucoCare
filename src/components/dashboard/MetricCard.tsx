import { motion } from 'framer-motion';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface MetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  trend?: 'up' | 'down';
  trendValue?: string;
  icon: LucideIcon;
  status?: 'success' | 'warning' | 'danger' | 'normal';
}

const MetricCard = ({ title, value, unit, trend, trendValue, icon: Icon, status = 'normal' }: MetricCardProps) => {
  const statusColors = {
    success: 'text-success',
    warning: 'text-warning',
    danger: 'text-danger',
    normal: 'text-foreground',
  };

  const statusBg = {
    success: 'bg-success/10',
    warning: 'bg-warning/10',
    danger: 'bg-danger/10',
    normal: 'bg-primary/10',
  };

  return (
    <Card variant="metric">
      <CardContent className="p-0">
        <div className="flex items-start justify-between mb-4">
          <div className={`w-12 h-12 rounded-xl ${statusBg[status]} flex items-center justify-center`}>
            <Icon className={`w-6 h-6 ${status === 'normal' ? 'text-primary' : statusColors[status]}`} />
          </div>
          {trend && trendValue && (
            <div className={`flex items-center gap-1 text-sm font-medium ${
              trend === 'up' ? 'text-success' : 'text-danger'
            }`}>
              {trend === 'up' ? (
                <TrendingUp className="w-4 h-4" />
              ) : (
                <TrendingDown className="w-4 h-4" />
              )}
              {trendValue}
            </div>
          )}
        </div>
        <p className="text-muted-foreground text-base mb-1">{title}</p>
        <div className="flex items-baseline gap-1">
          <span className={`text-3xl font-bold ${statusColors[status]}`}>{value}</span>
          {unit && <span className="text-lg text-muted-foreground">{unit}</span>}
        </div>
      </CardContent>
    </Card>
  );
};

export default MetricCard;
