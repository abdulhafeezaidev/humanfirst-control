import React from 'react';
import { AlertTriangle, CheckCircle, Clock, User, Monitor, Wifi, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format, formatDistanceToNow } from 'date-fns';
import InfoTooltip from '@/components/guidance/InfoTooltip';
import RetentionPolicyBadge from '@/components/RetentionPolicyBadge';

interface TamperEvent {
  id: string;
  user_id: string;
  device_id: string;
  event_type: string;
  timestamp: string;
  resolved: boolean;
  resolved_at: string | null;
  notes: string | null;
}

interface TamperEventsListProps {
  events: TamperEvent[];
  retentionDays?: number;
  onResolve?: (eventId: string) => void;
  canManage?: boolean;
  showHeader?: boolean;
  className?: string;
}

const TamperEventsList: React.FC<TamperEventsListProps> = ({
  events,
  retentionDays,
  onResolve,
  canManage = false,
  showHeader = true,
  className = ''
}) => {
  const getEventIcon = (type: string) => {
    switch (type) {
      case 'app_backgrounded':
      case 'extended_focus_loss':
        return Monitor;
      case 'network_disconnected':
        return WifiOff;
      case 'network_reconnected':
        return Wifi;
      default:
        return AlertTriangle;
    }
  };

  const getEventLabel = (type: string): string => {
    const labels: Record<string, string> = {
      'app_backgrounded': 'App Backgrounded',
      'app_closed_during_exam': 'App Closed',
      'network_disconnected': 'Network Lost',
      'network_reconnected': 'Network Restored',
      'connectivity_issue_detected': 'Connectivity Issue',
      'extended_focus_loss': 'Focus Lost',
    };
    return labels[type] || type.replace(/_/g, ' ');
  };

  const unresolvedCount = events.filter(e => !e.resolved).length;

  return (
    <div className={`glass-card ${className}`}>
      {showHeader && (
        <div className="p-6 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-semibold text-foreground">Tamper Events</h3>
              <InfoTooltip 
                content="Tamper events are logged when the system detects potential integrity issues like app switching or network disconnection during exam mode. These are informational only and do not imply wrongdoing."
              />
              {unresolvedCount > 0 && (
                <span className="px-2 py-0.5 text-xs font-medium bg-destructive/10 text-destructive rounded-full">
                  {unresolvedCount} unresolved
                </span>
              )}
            </div>
            {retentionDays && (
              <RetentionPolicyBadge retentionDays={retentionDays} type="tamper" />
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Logged integrity events during exam periods (not accusations)
          </p>
        </div>
      )}

      <div className="divide-y divide-border">
        {events.length === 0 ? (
          <div className="p-12 text-center">
            <CheckCircle className="w-12 h-12 text-success mx-auto mb-4" />
            <h4 className="text-lg font-semibold text-foreground mb-2">No Events Recorded</h4>
            <p className="text-muted-foreground">No tamper events have been detected.</p>
          </div>
        ) : (
          events.map((event) => {
            const EventIcon = getEventIcon(event.event_type);
            return (
              <div key={event.id} className="p-4 flex items-start gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  event.resolved 
                    ? 'bg-muted' 
                    : 'bg-destructive/10'
                }`}>
                  <EventIcon className={`w-5 h-5 ${
                    event.resolved ? 'text-muted-foreground' : 'text-destructive'
                  }`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-foreground">
                      {getEventLabel(event.event_type)}
                    </span>
                    {event.resolved ? (
                      <span className="px-2 py-0.5 text-xs font-medium bg-success/10 text-success rounded-full flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        Resolved
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-600 rounded-full">
                        Pending
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {format(new Date(event.timestamp), 'MMM d, HH:mm')}
                      <span className="text-muted-foreground/70">
                        ({formatDistanceToNow(new Date(event.timestamp), { addSuffix: true })})
                      </span>
                    </span>
                    <span className="truncate max-w-[200px]" title={event.device_id}>
                      Device: {event.device_id.slice(0, 12)}...
                    </span>
                  </div>
                  {event.notes && (
                    <p className="text-sm text-muted-foreground mt-2 italic">"{event.notes}"</p>
                  )}
                </div>
                {canManage && !event.resolved && onResolve && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => onResolve(event.id)}
                  >
                    Mark Resolved
                  </Button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default TamperEventsList;
