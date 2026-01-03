import { Brain, TrendingUp, Lightbulb, AlertCircle, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { HealthInsight } from '@/types';

interface InsightsPanelProps {
  insights: HealthInsight[];
}

const InsightsPanel = ({ insights }: InsightsPanelProps) => {
  const getInsightIcon = (type: HealthInsight['type']) => {
    switch (type) {
      case 'trend':
        return TrendingUp;
      case 'prediction':
        return Brain;
      case 'recommendation':
        return Lightbulb;
      case 'alert':
        return AlertCircle;
      default:
        return Lightbulb;
    }
  };

  const getInsightColor = (type: HealthInsight['type']) => {
    switch (type) {
      case 'trend':
        return 'bg-success/10 text-success';
      case 'prediction':
        return 'bg-primary/10 text-primary';
      case 'recommendation':
        return 'bg-warning/10 text-warning';
      case 'alert':
        return 'bg-danger/10 text-danger';
      default:
        return 'bg-primary/10 text-primary';
    }
  };

  return (
    <Card variant="glass">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-6 h-6 text-primary" />
            AI Health Insights
          </CardTitle>
          <Button variant="ghost" size="sm">
            View All
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-3 gap-4">
          {insights.map((insight) => {
            const Icon = getInsightIcon(insight.type);
            return (
              <div
                key={insight.id}
                className="p-5 rounded-xl bg-card/50 border border-border/50 hover:shadow-lg transition-all cursor-pointer group"
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${getInsightColor(insight.type)}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs uppercase tracking-wide text-muted-foreground">
                      {insight.type}
                    </span>
                    {insight.confidence && (
                      <span className="ml-2 text-xs text-primary">
                        {Math.round(insight.confidence * 100)}% confident
                      </span>
                    )}
                  </div>
                </div>
                <h4 className="font-semibold text-lg mb-2">{insight.title}</h4>
                <p className="text-muted-foreground text-sm mb-3">{insight.description}</p>
                
                {insight.actionItems && insight.actionItems.length > 0 && (
                  <div className="space-y-2 pt-3 border-t border-border/50">
                    <p className="text-xs font-medium text-muted-foreground uppercase">Action Items</p>
                    <ul className="space-y-1">
                      {insight.actionItems.slice(0, 2).map((item, index) => (
                        <li key={index} className="flex items-center gap-2 text-sm">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default InsightsPanel;
