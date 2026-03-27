import React, { useState } from 'react';
import {
  MessageSquare,
  AlertTriangle,
  Lightbulb,
  Flag,
  Send,
  CheckCircle,
  Clock,
  TrendingUp,
  Shield,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import InfoTooltip from '@/components/guidance/InfoTooltip';

type FeedbackType = 'insight' | 'risk' | 'suggestion' | 'issue';
type FeedbackPriority = 'low' | 'medium' | 'high';

interface FeedbackEntry {
  id: string;
  type: FeedbackType;
  priority: FeedbackPriority;
  message: string;
  submittedAt: Date;
  submittedBy: string;
  status: 'pending' | 'reviewed' | 'actioned';
}

interface RiskSignal {
  id: string;
  type: 'compliance' | 'trust' | 'enrollment' | 'integrity';
  severity: 'warning' | 'critical';
  title: string;
  description: string;
  detectedAt: Date;
  acknowledged: boolean;
}

interface AdminFeedbackLoopProps {
  adminName?: string;
  organizationId?: string;
  recentFeedback?: FeedbackEntry[];
  autoDetectedSignals?: RiskSignal[];
  onSubmitFeedback?: (feedback: Omit<FeedbackEntry, 'id' | 'submittedAt' | 'status'>) => void;
  onAcknowledgeSignal?: (signalId: string) => void;
  className?: string;
}

const AdminFeedbackLoop: React.FC<AdminFeedbackLoopProps> = ({
  adminName = 'Admin',
  organizationId,
  recentFeedback = [],
  autoDetectedSignals = [],
  onSubmitFeedback,
  onAcknowledgeSignal,
  className = '',
}) => {
  const [feedbackType, setFeedbackType] = useState<FeedbackType>('insight');
  const [feedbackPriority, setFeedbackPriority] = useState<FeedbackPriority>('medium');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const feedbackTypes: { value: FeedbackType; label: string; icon: React.ElementType; color: string }[] = [
    { value: 'insight', label: 'Insight', icon: Lightbulb, color: 'text-primary' },
    { value: 'risk', label: 'Risk Signal', icon: AlertTriangle, color: 'text-warning' },
    { value: 'suggestion', label: 'Suggestion', icon: TrendingUp, color: 'text-success' },
    { value: 'issue', label: 'Issue', icon: Flag, color: 'text-destructive' },
  ];

  const priorityOptions: { value: FeedbackPriority; label: string }[] = [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
  ];

  const getTypeConfig = (type: FeedbackType) => {
    return feedbackTypes.find(t => t.value === type) || feedbackTypes[0];
  };

  const getSignalIcon = (type: RiskSignal['type']) => {
    switch (type) {
      case 'compliance': return TrendingUp;
      case 'trust': return Shield;
      case 'enrollment': return CheckCircle;
      case 'integrity': return AlertTriangle;
      default: return AlertTriangle;
    }
  };

  const handleSubmitFeedback = async () => {
    if (!feedbackMessage.trim()) {
      toast({
        title: 'Feedback required',
        description: 'Please enter your feedback before submitting.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmitFeedback?.({
        type: feedbackType,
        priority: feedbackPriority,
        message: feedbackMessage,
        submittedBy: adminName,
      });

      toast({
        title: 'Feedback submitted',
        description: 'Your feedback has been recorded and will be reviewed.',
      });

      setFeedbackMessage('');
      setFeedbackType('insight');
      setFeedbackPriority('medium');
    } catch (error) {
      toast({
        title: 'Submission failed',
        description: 'There was an error submitting your feedback.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAcknowledge = (signalId: string) => {
    onAcknowledgeSignal?.(signalId);
    toast({
      title: 'Signal acknowledged',
      description: 'The risk signal has been marked as reviewed.',
    });
  };

  const unreviewedSignals = autoDetectedSignals.filter(s => !s.acknowledged);
  const criticalSignals = unreviewedSignals.filter(s => s.severity === 'critical');

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Auto-Detected Risk Signals */}
      {unreviewedSignals.length > 0 && (
        <Card className={`border-l-4 ${criticalSignals.length > 0 ? 'border-l-destructive' : 'border-l-warning'}`}>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className={`w-5 h-5 ${criticalSignals.length > 0 ? 'text-destructive' : 'text-warning'}`} />
              Detected Risk Signals
              <Badge variant={criticalSignals.length > 0 ? 'destructive' : 'secondary'}>
                {unreviewedSignals.length} unreviewed
              </Badge>
            </CardTitle>
            <CardDescription>
              Automatically detected patterns that may require attention
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {unreviewedSignals.map((signal) => {
              const SignalIcon = getSignalIcon(signal.type);
              
              return (
                <div
                  key={signal.id}
                  className={`p-4 rounded-xl border ${
                    signal.severity === 'critical' 
                      ? 'bg-destructive/10 border-destructive/30' 
                      : 'bg-warning/10 border-warning/30'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <SignalIcon className={`w-5 h-5 mt-0.5 ${
                        signal.severity === 'critical' ? 'text-destructive' : 'text-warning'
                      }`} />
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{signal.title}</h4>
                          <Badge variant={signal.severity === 'critical' ? 'destructive' : 'secondary'} className="text-xs">
                            {signal.severity}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{signal.description}</p>
                        <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Detected: {format(signal.detectedAt, 'MMM d, HH:mm')}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAcknowledge(signal.id)}
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Acknowledge
                    </Button>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Submit Feedback Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            Share Feedback
            <InfoTooltip content="Capture early insights, risk observations, or suggestions during the pilot. This helps improve the program and identify issues early." />
          </CardTitle>
          <CardDescription>
            Report observations, insights, or concerns from your pilot experience
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Feedback Type Selection */}
          <div className="space-y-3">
            <Label>Feedback Type</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {feedbackTypes.map((type) => {
                const TypeIcon = type.icon;
                const isSelected = feedbackType === type.value;
                
                return (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setFeedbackType(type.value)}
                    className={`p-3 rounded-xl border-2 transition-all ${
                      isSelected 
                        ? 'border-primary bg-primary/10' 
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <TypeIcon className={`w-5 h-5 mx-auto mb-1 ${isSelected ? 'text-primary' : type.color}`} />
                    <span className="text-sm font-medium">{type.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Priority Selection */}
          <div className="space-y-3">
            <Label>Priority Level</Label>
            <RadioGroup
              value={feedbackPriority}
              onValueChange={(value) => setFeedbackPriority(value as FeedbackPriority)}
              className="flex gap-4"
            >
              {priorityOptions.map((priority) => (
                <div key={priority.value} className="flex items-center space-x-2">
                  <RadioGroupItem value={priority.value} id={priority.value} />
                  <Label htmlFor={priority.value} className="font-normal cursor-pointer">
                    {priority.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Feedback Message */}
          <div className="space-y-3">
            <Label htmlFor="feedback-message">Your Feedback</Label>
            <Textarea
              id="feedback-message"
              placeholder="Describe your observation, insight, or concern..."
              value={feedbackMessage}
              onChange={(e) => setFeedbackMessage(e.target.value)}
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Be specific about what you observed and any context that might help.
            </p>
          </div>

          {/* Submit Button */}
          <Button
            className="w-full"
            onClick={handleSubmitFeedback}
            disabled={isSubmitting || !feedbackMessage.trim()}
          >
            <Send className="w-4 h-4 mr-2" />
            {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
          </Button>
        </CardContent>
      </Card>

      {/* Recent Feedback History */}
      {recentFeedback.length > 0 && (
        <Collapsible open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Clock className="w-5 h-5 text-muted-foreground" />
                    Recent Feedback History
                    <Badge variant="secondary">{recentFeedback.length}</Badge>
                  </CardTitle>
                  {isHistoryOpen ? (
                    <ChevronUp className="w-5 h-5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-3 pt-0">
                {recentFeedback.map((entry) => {
                  const typeConfig = getTypeConfig(entry.type);
                  const TypeIcon = typeConfig.icon;
                  
                  return (
                    <div
                      key={entry.id}
                      className="p-4 bg-muted/50 rounded-xl flex items-start gap-3"
                    >
                      <TypeIcon className={`w-5 h-5 mt-0.5 ${typeConfig.color}`} />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs">
                            {typeConfig.label}
                          </Badge>
                          <Badge 
                            variant={entry.status === 'actioned' ? 'default' : entry.status === 'reviewed' ? 'secondary' : 'outline'}
                            className="text-xs"
                          >
                            {entry.status}
                          </Badge>
                        </div>
                        <p className="text-sm">{entry.message}</p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {entry.submittedBy} • {format(entry.submittedAt, 'MMM d, HH:mm')}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}
    </div>
  );
};

export default AdminFeedbackLoop;
