import React from 'react';
import { AlertTriangle, X, Shield, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TamperAlertProps {
  eventType: string;
  onDismiss: () => void;
}

const getEventMessage = (eventType: string): { title: string; description: string } => {
  switch (eventType) {
    case 'app_backgrounded':
      return {
        title: 'Application Minimized',
        description: 'The application was moved to the background during an active exam period. This has been logged for transparency.'
      };
    case 'app_closed_during_exam':
      return {
        title: 'Session Interrupted',
        description: 'The application session was interrupted during an active exam period. This event has been recorded.'
      };
    case 'network_disconnected':
      return {
        title: 'Network Disconnection',
        description: 'Your network connection was lost during an active exam period. This has been logged.'
      };
    case 'network_reconnected':
      return {
        title: 'Network Restored',
        description: 'Your network connection has been restored. The previous disconnection was logged.'
      };
    case 'connectivity_issue_detected':
      return {
        title: 'Connectivity Issue',
        description: 'A connectivity issue was detected that may affect protection status. This has been recorded.'
      };
    case 'extended_focus_loss':
      return {
        title: 'Extended Window Switch',
        description: 'The application window was not in focus for an extended period during exam mode. This has been logged.'
      };
    default:
      return {
        title: 'Protection Interruption',
        description: 'A protection interruption was detected and logged.'
      };
  }
};

const TamperAlert: React.FC<TamperAlertProps> = ({ eventType, onDismiss }) => {
  const { title, description } = getEventMessage(eventType);

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-xl shadow-xl max-w-md w-full p-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
        {/* Header */}
        <div className="flex items-start gap-4 mb-4">
          <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-foreground">{title}</h3>
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onDismiss} className="flex-shrink-0">
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Privacy Assurance */}
        <div className="bg-muted/50 rounded-lg p-4 mb-4">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">Your Privacy is Protected</p>
              <p className="text-xs text-muted-foreground mt-1">
                Only the timestamp and device identifier were recorded. No content, keystrokes, 
                screen captures, or personal activity were logged.
              </p>
            </div>
          </div>
        </div>

        {/* What This Means */}
        <div className="bg-primary/5 rounded-lg p-4 mb-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">What This Means</p>
              <p className="text-xs text-muted-foreground mt-1">
                This notification is for transparency. If this was unintentional (network glitch, 
                accidental tab switch, etc.), no action is required. Administrators can review 
                these events in context.
              </p>
            </div>
          </div>
        </div>

        {/* Action */}
        <Button onClick={onDismiss} className="w-full">
          I Understand
        </Button>
      </div>
    </div>
  );
};

export default TamperAlert;
