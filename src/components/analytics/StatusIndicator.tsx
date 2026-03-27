import React from 'react';
import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export type StatusLevel = 'green' | 'amber' | 'red';

interface StatusIndicatorProps {
  level: StatusLevel;
  label: string;
  description?: string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  level,
  label,
  description,
  size = 'md',
  showLabel = true,
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  const containerSizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base',
  };

  const config = {
    green: {
      icon: CheckCircle2,
      bgColor: 'bg-success/10',
      textColor: 'text-success',
      borderColor: 'border-success/30',
    },
    amber: {
      icon: AlertTriangle,
      bgColor: 'bg-warning/10',
      textColor: 'text-warning',
      borderColor: 'border-warning/30',
    },
    red: {
      icon: XCircle,
      bgColor: 'bg-destructive/10',
      textColor: 'text-destructive',
      borderColor: 'border-destructive/30',
    },
  };

  const { icon: Icon, bgColor, textColor, borderColor } = config[level];

  const indicator = (
    <div
      className={`inline-flex items-center gap-1.5 rounded-full border ${bgColor} ${textColor} ${borderColor} ${containerSizeClasses[size]} font-medium`}
    >
      <Icon className={sizeClasses[size]} />
      {showLabel && <span>{label}</span>}
    </div>
  );

  if (description) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{indicator}</TooltipTrigger>
        <TooltipContent>
          <p className="max-w-xs">{description}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return indicator;
};

export default StatusIndicator;
