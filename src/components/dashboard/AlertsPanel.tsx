import { useMemo, useState } from 'react';
import { Bell, AlertTriangle, Calendar, Pill, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert } from '@/types';

interface AlertsPanelProps {
  alerts: Alert[];
}

const AlertsPanel = ({ alerts }: AlertsPanelProps) => {
  const [showAll, setShowAll] = useState(false);

  const sortedAlerts = useMemo(() => {
    return [...alerts].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [alerts]);

  const visibleAlerts = showAll ? sortedAlerts : sortedAlerts.slice(0, 3);

  const getAlertIcon = (type: Alert['type']) => {
    switch (type) {
      case 'glucose-high':
      case 'glucose-low':
        return AlertTriangle;
      case 'medication-reminder':
        return Pill;
      case 'appointment':
        return Calendar;
      default:
        return Bell;
    }
  };

  const getSeverityStyles = (severity: Alert['severity']) => {
    switch (severity) {
      case 'critical':
        return 'bg-danger/10 border-danger text-danger';
      case 'warning':
        return 'bg-warning/10 border-warning text-warning';
      default:
        return 'bg-primary/10 border-primary text-primary';
    }
  };

  return (
    <Card variant="glass" className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-6 h-6 text-primary" />
            Alerts & Reminders
          </CardTitle>
          {sortedAlerts.length > 3 && (
            <Button variant="ghost" size="sm" onClick={() => setShowAll((prev) => !prev)}>
              {showAll ? 'Show Less' : 'View All'}
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {visibleAlerts.map((alert) => {
          const Icon = getAlertIcon(alert.type);
          return (
            <div
              key={alert.id}
              className={`p-4 rounded-xl border-l-4 ${getSeverityStyles(alert.severity)} transition-all hover:shadow-md cursor-pointer`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  alert.severity === 'critical' ? 'bg-danger/20' :
                  alert.severity === 'warning' ? 'bg-warning/20' :
                  'bg-primary/20'
                }`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-foreground">{alert.title}</h4>
                  <p className="text-sm text-muted-foreground line-clamp-2">{alert.message}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            </div>
          );
        })}

        {sortedAlerts.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Bell className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No alerts at this time</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AlertsPanel;
