import React from 'react';
import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import StatusIndicator, { StatusLevel } from './StatusIndicator';
import InfoTooltip from '@/components/guidance/InfoTooltip';

interface MetricCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: LucideIcon;
  iconColor?: string;
  iconBgColor?: string;
  status?: StatusLevel;
  statusLabel?: string;
  delta?: number;
  deltaLabel?: string;
  tooltip?: string;
  className?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor = 'text-primary',
  iconBgColor = 'bg-primary/10',
  status,
  statusLabel,
  delta,
  deltaLabel,
  tooltip,
  className = '',
}) => {
  const getDeltaDisplay = () => {
    if (delta === undefined) return null;
    
    const isPositive = delta > 0;
    const isNegative = delta < 0;
    const isNeutral = delta === 0;
    
    return (
      <div className={`flex items-center gap-1 text-sm font-medium ${
        isPositive ? 'text-success' : isNegative ? 'text-destructive' : 'text-muted-foreground'
      }`}>
        {isPositive && <TrendingUp className="w-4 h-4" />}
        {isNegative && <TrendingDown className="w-4 h-4" />}
        {isNeutral && <Minus className="w-4 h-4" />}
        <span>
          {isPositive && '+'}
          {typeof delta === 'number' ? `${delta.toFixed(1)}%` : delta}
        </span>
        {deltaLabel && <span className="text-muted-foreground font-normal">{deltaLabel}</span>}
      </div>
    );
  };

  return (
    <div className={`glass-card p-5 ${className}`}>
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl ${iconBgColor} flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
        {status && statusLabel && (
          <StatusIndicator level={status} label={statusLabel} size="sm" />
        )}
      </div>
      
      <div className="flex items-center gap-2 mb-1">
        <h4 className="text-sm font-medium text-muted-foreground">{title}</h4>
        {tooltip && <InfoTooltip content={tooltip} />}
      </div>
      
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold text-foreground">{value}</span>
        {getDeltaDisplay()}
      </div>
      
      {subtitle && (
        <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
      )}
    </div>
  );
};

export default MetricCard;
