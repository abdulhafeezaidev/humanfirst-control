import React from 'react';
import { 
  Calendar, CheckCircle, Circle, Clock, AlertTriangle, 
  Flag, Rocket, BarChart3, Users, Shield, ArrowRight
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { format, differenceInDays, addDays, isAfter, isBefore, isToday } from 'date-fns';

interface TimelineMilestone {
  id: string;
  title: string;
  description: string;
  date: Date;
  icon: React.ElementType;
  status: 'completed' | 'current' | 'upcoming' | 'overdue';
  tasks?: string[];
}

interface PilotTimelineProps {
  pilotStartDate: Date;
  pilotEndDate: Date;
  currentMilestoneId?: string;
  completedMilestones?: string[];
  onMilestoneClick?: (milestoneId: string) => void;
}

const PilotTimeline: React.FC<PilotTimelineProps> = ({
  pilotStartDate,
  pilotEndDate,
  currentMilestoneId,
  completedMilestones = [],
  onMilestoneClick
}) => {
  const now = new Date();
  const totalDays = differenceInDays(pilotEndDate, pilotStartDate);
  const daysElapsed = Math.max(0, differenceInDays(now, pilotStartDate));
  const daysRemaining = Math.max(0, differenceInDays(pilotEndDate, now));
  const progressPercent = Math.min(100, (daysElapsed / totalDays) * 100);

  // Generate milestones based on pilot duration
  const generateMilestones = (): TimelineMilestone[] => {
    const weekDuration = totalDays / 4; // Divide into 4 phases
    
    return [
      {
        id: 'kickoff',
        title: 'Pilot Kickoff',
        description: 'Initial setup and admin training',
        date: pilotStartDate,
        icon: Rocket,
        status: getStatus(pilotStartDate, 'kickoff'),
        tasks: [
          'Complete admin training modules',
          'Configure organization settings',
          'Review ethics disclosure',
          'Set up first policy template',
        ],
      },
      {
        id: 'week1',
        title: 'Week 1: Soft Launch',
        description: 'Register devices and test policies',
        date: addDays(pilotStartDate, weekDuration),
        icon: Users,
        status: getStatus(addDays(pilotStartDate, weekDuration), 'week1'),
        tasks: [
          'Onboard first batch of students',
          'Run test exam policy',
          'Collect initial feedback',
          'Review pilot metrics',
        ],
      },
      {
        id: 'week2',
        title: 'Week 2: Expand',
        description: 'Scale to more students and policies',
        date: addDays(pilotStartDate, weekDuration * 2),
        icon: BarChart3,
        status: getStatus(addDays(pilotStartDate, weekDuration * 2), 'week2'),
        tasks: [
          'Expand to additional classes',
          'Create department-specific policies',
          'Address feedback from week 1',
          'Train additional administrators',
        ],
      },
      {
        id: 'week3',
        title: 'Week 3: Optimize',
        description: 'Refine settings based on data',
        date: addDays(pilotStartDate, weekDuration * 3),
        icon: Shield,
        status: getStatus(addDays(pilotStartDate, weekDuration * 3), 'week3'),
        tasks: [
          'Analyze compliance metrics',
          'Optimize policy templates',
          'Document best practices',
          'Prepare stakeholder report',
        ],
      },
      {
        id: 'review',
        title: 'Pilot Review',
        description: 'Final evaluation and decision',
        date: pilotEndDate,
        icon: Flag,
        status: getStatus(pilotEndDate, 'review'),
        tasks: [
          'Complete pilot assessment',
          'Gather stakeholder feedback',
          'Decide on full deployment',
          'Plan production rollout',
        ],
      },
    ];
  };

  const getStatus = (date: Date, id: string): TimelineMilestone['status'] => {
    if (completedMilestones.includes(id)) return 'completed';
    if (currentMilestoneId === id) return 'current';
    if (isBefore(date, now) && !completedMilestones.includes(id)) return 'overdue';
    return 'upcoming';
  };

  const milestones = generateMilestones();

  const getStatusColor = (status: TimelineMilestone['status']) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-600 border-green-200';
      case 'current': return 'bg-primary/10 text-primary border-primary/30';
      case 'overdue': return 'bg-red-100 text-red-600 border-red-200';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  const getStatusIcon = (status: TimelineMilestone['status']) => {
    switch (status) {
      case 'completed': return CheckCircle;
      case 'current': return Clock;
      case 'overdue': return AlertTriangle;
      default: return Circle;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Pilot Timeline</CardTitle>
              <CardDescription>
                {format(pilotStartDate, 'MMM d')} - {format(pilotEndDate, 'MMM d, yyyy')}
              </CardDescription>
            </div>
          </div>
          <Badge variant={daysRemaining <= 7 ? 'destructive' : 'secondary'}>
            {daysRemaining} days remaining
          </Badge>
        </div>

        {/* Progress Bar */}
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Pilot Progress</span>
            <span className="font-medium">{Math.round(progressPercent)}%</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Day {daysElapsed} of {totalDays}</span>
            <span>{completedMilestones.length} of {milestones.length} milestones completed</span>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-border" />

          {/* Milestones */}
          <div className="space-y-6">
            {milestones.map((milestone, index) => {
              const StatusIcon = getStatusIcon(milestone.status);
              const MilestoneIcon = milestone.icon;
              const isLast = index === milestones.length - 1;

              return (
                <div
                  key={milestone.id}
                  className={`relative pl-12 ${
                    onMilestoneClick ? 'cursor-pointer hover:bg-muted/50 -ml-3 -mr-3 pl-15 pr-3 py-3 rounded-lg' : ''
                  }`}
                  onClick={() => onMilestoneClick?.(milestone.id)}
                >
                  {/* Timeline dot */}
                  <div className={`absolute left-0 w-10 h-10 rounded-full flex items-center justify-center border-2 ${getStatusColor(milestone.status)}`}>
                    {milestone.status === 'completed' ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : (
                      <MilestoneIcon className="w-5 h-5" />
                    )}
                  </div>

                  {/* Content */}
                  <div className={`${milestone.status === 'current' ? 'p-4 bg-primary/5 border border-primary/20 rounded-lg' : ''}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-foreground">{milestone.title}</h4>
                      {milestone.status === 'current' && (
                        <Badge className="bg-primary text-primary-foreground text-xs">
                          Current
                        </Badge>
                      )}
                      {milestone.status === 'overdue' && (
                        <Badge variant="destructive" className="text-xs">
                          Overdue
                        </Badge>
                      )}
                    </div>
                    
                    <p className="text-sm text-muted-foreground mb-2">
                      {milestone.description}
                    </p>
                    
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {format(milestone.date, 'MMM d, yyyy')}
                      </span>
                      {isToday(milestone.date) && (
                        <Badge variant="outline" className="text-xs">Today</Badge>
                      )}
                    </div>

                    {/* Tasks */}
                    {milestone.tasks && milestone.status === 'current' && (
                      <div className="mt-3 space-y-1">
                        {milestone.tasks.map((task, i) => (
                          <div key={i} className="flex items-center gap-2 text-sm">
                            <Circle className="w-3 h-3 text-muted-foreground" />
                            <span className="text-muted-foreground">{task}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-6 pt-4 border-t flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Need to extend your pilot period?
          </p>
          <button className="text-sm text-primary hover:underline flex items-center gap-1">
            Contact support
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </CardContent>
    </Card>
  );
};

export default PilotTimeline;
