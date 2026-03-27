import { format } from 'date-fns';
import { AlertTriangle, FileText, Shield, Users, Bot, Check } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ActivityItem {
  id: string;
  type: 'policy' | 'alert' | 'enforcement' | 'user' | 'ai_service';
  action: string;
  description: string;
  timestamp: string;
  resolved?: boolean;
}

interface RecentActivityProps {
  activities: ActivityItem[];
  onResolveAlert?: (id: string) => void;
  onViewAll?: () => void;
  maxItems?: number;
}

const getActivityIcon = (type: ActivityItem['type']) => {
  switch (type) {
    case 'policy':
      return <FileText className="w-4 h-4" />;
    case 'alert':
      return <AlertTriangle className="w-4 h-4" />;
    case 'enforcement':
      return <Shield className="w-4 h-4" />;
    case 'user':
      return <Users className="w-4 h-4" />;
    case 'ai_service':
      return <Bot className="w-4 h-4" />;
    default:
      return <FileText className="w-4 h-4" />;
  }
};

const getActivityColor = (type: ActivityItem['type'], resolved?: boolean) => {
  if (resolved) return 'bg-muted text-muted-foreground';
  
  switch (type) {
    case 'alert':
      return 'bg-warning/10 text-warning';
    case 'policy':
      return 'bg-primary/10 text-primary';
    case 'enforcement':
      return 'bg-success/10 text-success';
    default:
      return 'bg-muted text-muted-foreground';
  }
};

export const RecentActivity = ({
  activities,
  onResolveAlert,
  onViewAll,
  maxItems = 10,
}: RecentActivityProps) => {
  const displayActivities = activities.slice(0, maxItems);

  return (
    <Card>
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Recent Activity</CardTitle>
        {onViewAll && (
          <Button variant="ghost" size="sm" onClick={onViewAll}>
            View All
          </Button>
        )}
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[300px]">
          <div className="space-y-1 px-4 pb-4">
            {displayActivities.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No recent activity
              </div>
            ) : (
              displayActivities.map((activity) => (
                <div
                  key={activity.id}
                  className={cn(
                    'flex items-start gap-3 p-3 rounded-lg transition-colors',
                    activity.type === 'alert' && !activity.resolved
                      ? 'bg-warning/5 hover:bg-warning/10'
                      : 'hover:bg-muted/50'
                  )}
                >
                  <div className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
                    getActivityColor(activity.type, activity.resolved)
                  )}>
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground text-sm">
                        {activity.action}
                      </span>
                      {activity.resolved && (
                        <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                          Resolved
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {activity.description}
                    </p>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(activity.timestamp), 'MMM d, HH:mm')}
                    </span>
                  </div>
                  {activity.type === 'alert' && !activity.resolved && onResolveAlert && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="flex-shrink-0"
                      onClick={() => onResolveAlert(activity.id)}
                      title="Mark as resolved"
                    >
                      <Check className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default RecentActivity;
