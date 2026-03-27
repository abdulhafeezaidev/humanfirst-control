import React from 'react';
import { LucideIcon, X, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface GuidanceCardProps {
  title: string;
  description: string;
  icon?: LucideIcon;
  variant?: 'info' | 'tip' | 'warning';
  dismissible?: boolean;
  onDismiss?: () => void;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

const GuidanceCard: React.FC<GuidanceCardProps> = ({
  title,
  description,
  icon: Icon = Lightbulb,
  variant = 'info',
  dismissible = false,
  onDismiss,
  action,
  className = ''
}) => {
  const variantStyles = {
    info: 'bg-primary/5 border-primary/20 text-primary',
    tip: 'bg-success/5 border-success/20 text-success',
    warning: 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/50 text-amber-600',
  };

  return (
    <div className={`p-4 rounded-xl border ${variantStyles[variant]} ${className}`}>
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
          variant === 'info' ? 'bg-primary/10' : variant === 'tip' ? 'bg-success/10' : 'bg-amber-100 dark:bg-amber-900/30'
        }`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4 className="font-semibold text-foreground">{title}</h4>
            {dismissible && onDismiss && (
              <button 
                onClick={onDismiss}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
          {action && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={action.onClick}
              className="mt-2 -ml-2"
            >
              {action.label}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default GuidanceCard;
