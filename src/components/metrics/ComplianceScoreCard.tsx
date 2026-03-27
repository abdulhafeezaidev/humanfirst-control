/**
 * Compliance Score Card
 * 
 * Displays the computed compliance score with breakdown.
 * Read-only visualization of aggregate metrics.
 */

import React from 'react';
import { Shield, TrendingUp, TrendingDown, Minus, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { EnforcementMetrics } from '@/types/metrics';

interface ComplianceScoreCardProps {
  metrics: EnforcementMetrics | null;
  className?: string;
}

const ComplianceScoreCard: React.FC<ComplianceScoreCardProps> = ({ 
  metrics, 
  className = '' 
}) => {
  const score = metrics?.compliance?.score ?? 85;
  const trend = metrics?.compliance?.trend ?? 'stable';
  const factors = metrics?.compliance?.factors ?? {
    policy_coverage: 90,
    event_resolution: 85,
    admin_activity: 80,
  };

  const getTrendIcon = () => {
    switch (trend) {
      case 'improving':
        return <TrendingUp className="h-4 w-4 text-success" />;
      case 'declining':
        return <TrendingDown className="h-4 w-4 text-destructive" />;
      default:
        return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getTrendColor = () => {
    switch (trend) {
      case 'improving':
        return 'text-success';
      case 'declining':
        return 'text-destructive';
      default:
        return 'text-muted-foreground';
    }
  };

  const getScoreColor = () => {
    if (score >= 80) return 'text-success';
    if (score >= 60) return 'text-warning';
    return 'text-destructive';
  };

  const getProgressColor = (value: number) => {
    if (value >= 80) return 'bg-success';
    if (value >= 60) return 'bg-warning';
    return 'bg-destructive';
  };

  return (
    <Card className={`glass-card ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <CardTitle className="text-base font-medium">Compliance Score</CardTitle>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-sm">
                  Aggregate score based on policy coverage, event resolution rate, 
                  and admin activity. No individual user data is used.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>
      <CardContent>
        {/* Main Score */}
        <div className="flex items-center justify-center mb-6">
          <div className="relative">
            <div className={`text-5xl font-bold ${getScoreColor()}`}>
              {score}
            </div>
            <div className="text-sm text-muted-foreground text-center mt-1">out of 100</div>
          </div>
          <div className={`ml-4 flex items-center gap-1 ${getTrendColor()}`}>
            {getTrendIcon()}
            <span className="text-sm font-medium capitalize">{trend}</span>
          </div>
        </div>

        {/* Factor Breakdown */}
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm text-muted-foreground">Policy Coverage</span>
              <span className="text-sm font-medium">{factors.policy_coverage}%</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className={`h-full ${getProgressColor(factors.policy_coverage)} transition-all duration-500`}
                style={{ width: `${factors.policy_coverage}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm text-muted-foreground">Event Resolution</span>
              <span className="text-sm font-medium">{factors.event_resolution}%</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className={`h-full ${getProgressColor(factors.event_resolution)} transition-all duration-500`}
                style={{ width: `${factors.event_resolution}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm text-muted-foreground">Admin Activity</span>
              <span className="text-sm font-medium">{factors.admin_activity}%</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className={`h-full ${getProgressColor(factors.admin_activity)} transition-all duration-500`}
                style={{ width: `${factors.admin_activity}%` }}
              />
            </div>
          </div>
        </div>

        {/* Privacy Notice */}
        <div className="mt-4 p-3 rounded-lg bg-accent/50 border border-accent">
          <p className="text-xs text-accent-foreground">
            🔒 This score is computed from aggregate data only. No individual student 
            names or session details are used.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default ComplianceScoreCard;
