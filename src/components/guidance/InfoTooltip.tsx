import React from 'react';
import { Info, HelpCircle } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface InfoTooltipProps {
  content: string;
  variant?: 'info' | 'help';
  side?: 'top' | 'right' | 'bottom' | 'left';
  className?: string;
}

const InfoTooltip: React.FC<InfoTooltipProps> = ({ 
  content, 
  variant = 'info',
  side = 'top',
  className = ''
}) => {
  const Icon = variant === 'help' ? HelpCircle : Info;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Icon className={`w-4 h-4 text-muted-foreground cursor-help hover:text-foreground transition-colors ${className}`} />
      </TooltipTrigger>
      <TooltipContent side={side} className="max-w-xs">
        <p className="text-sm">{content}</p>
      </TooltipContent>
    </Tooltip>
  );
};

export default InfoTooltip;
