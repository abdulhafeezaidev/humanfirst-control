import React from 'react';
import { FlaskConical, CheckCircle, AlertTriangle, TrendingUp, Clock, Users } from 'lucide-react';
import InfoTooltip from '@/components/guidance/InfoTooltip';

interface PilotModeMetricsProps {
  totalEvents: number;
  resolvedEvents: number;
  activeStudents: number;
  pilotDaysRemaining?: number;
  className?: string;
}

const PilotModeMetrics: React.FC<PilotModeMetricsProps> = ({
  totalEvents,
  resolvedEvents,
  activeStudents,
  pilotDaysRemaining,
  className = ''
}) => {
  const complianceRate = totalEvents > 0 
    ? Math.round(((totalEvents - (totalEvents - resolvedEvents)) / totalEvents) * 100)
    : 100;

  return (
    <div className={`glass-card p-6 ${className}`}>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
          <FlaskConical className="w-5 h-5 text-amber-600" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            Pilot Mode Metrics
            <InfoTooltip 
              content="These metrics show compliance during Pilot Mode. Events are logged but policies are not enforced."
            />
          </h3>
          <p className="text-sm text-muted-foreground">Safe testing with full visibility</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-muted/50 rounded-xl">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <TrendingUp className="w-4 h-4" />
            <span className="text-xs font-medium">Compliance Rate</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-foreground">{complianceRate}%</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Based on resolved events</p>
        </div>

        <div className="p-4 bg-muted/50 rounded-xl">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-xs font-medium">Total Events</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-foreground">{totalEvents}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Detected during pilot</p>
        </div>

        <div className="p-4 bg-muted/50 rounded-xl">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <CheckCircle className="w-4 h-4" />
            <span className="text-xs font-medium">Resolved</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-success">{resolvedEvents}</span>
            <span className="text-sm text-muted-foreground">/ {totalEvents}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Events addressed</p>
        </div>

        <div className="p-4 bg-muted/50 rounded-xl">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Users className="w-4 h-4" />
            <span className="text-xs font-medium">Active Students</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-foreground">{activeStudents}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">In pilot program</p>
        </div>
      </div>

      {pilotDaysRemaining !== undefined && (
        <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-lg">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-600" />
            <span className="text-sm font-medium text-amber-700 dark:text-amber-400">
              {pilotDaysRemaining} days remaining in pilot period
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default PilotModeMetrics;
