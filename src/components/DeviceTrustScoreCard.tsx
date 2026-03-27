import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Info,
  TrendingUp,
  TrendingDown,
  Minus,
  Clock,
  Activity,
  Wifi,
  CheckCircle,
  AlertTriangle,
  FileText,
} from "lucide-react";
import { useDeviceTrust } from "@/hooks/useDeviceTrust";
import { TrustScore, TrustFactor, TrustLevel, getTrustLevelDisplay } from "@/lib/deviceTrust";

interface DeviceTrustScoreCardProps {
  deviceId: string;
  userId?: string;
  showBreakdown?: boolean;
  showFactors?: boolean;
  showExplanation?: boolean;
  compact?: boolean;
}

const DeviceTrustScoreCard = ({
  deviceId,
  userId,
  showBreakdown = true,
  showFactors = true,
  showExplanation = false,
  compact = false,
}: DeviceTrustScoreCardProps) => {
  const {
    trustScore,
    isLoading,
    error,
    displayProps,
    adminExplanation,
    refresh,
  } = useDeviceTrust({ deviceId, userId });

  const [isExpanded, setIsExpanded] = useState(false);
  const [showAllFactors, setShowAllFactors] = useState(false);

  const getShieldIcon = (level: TrustLevel) => {
    const iconClass = "h-6 w-6";
    switch (level) {
      case 'high':
        return <ShieldCheck className={`${iconClass} text-green-600`} />;
      case 'medium':
        return <Shield className={`${iconClass} text-amber-600`} />;
      case 'low':
        return <ShieldAlert className={`${iconClass} text-orange-600`} />;
      case 'critical':
        return <ShieldX className={`${iconClass} text-red-600`} />;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-amber-500';
    if (score >= 40) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getImpactIcon = (impact: 'positive' | 'negative' | 'neutral') => {
    switch (impact) {
      case 'positive':
        return <TrendingUp className="h-3 w-3 text-green-600" />;
      case 'negative':
        return <TrendingDown className="h-3 w-3 text-red-600" />;
      default:
        return <Minus className="h-3 w-3 text-gray-400" />;
    }
  };

  if (isLoading) {
    return (
      <Card className={compact ? 'p-3' : ''}>
        <CardContent className={compact ? 'p-0' : 'pt-6'}>
          <div className="flex items-center gap-2 text-muted-foreground">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span className="text-sm">Calculating trust score...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={compact ? 'p-3' : ''}>
        <CardContent className={compact ? 'p-0' : 'pt-6'}>
          <div className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm">{error}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!trustScore || !displayProps) {
    return null;
  }

  if (compact) {
    return (
      <div className="flex items-center gap-3">
        {getShieldIcon(trustScore.level)}
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <span className={`text-sm font-medium ${displayProps.color}`}>
              {displayProps.label}
            </span>
            <span className="text-lg font-bold">{trustScore.score}</span>
          </div>
          <Progress 
            value={trustScore.score} 
            className="h-1.5 mt-1"
          />
        </div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {getShieldIcon(trustScore.level)}
            <div>
              <CardTitle className="text-lg">Device Trust Score</CardTitle>
              <CardDescription className="text-xs">
                Device: {deviceId.slice(0, 20)}...
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-right">
              <div className="text-3xl font-bold">{trustScore.score}</div>
              <Badge className={displayProps.color.replace('text-', 'bg-').replace('-600', '-500')}>
                {displayProps.label}
              </Badge>
            </div>
            <Button variant="ghost" size="icon" onClick={refresh}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Score Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Overall Trust</span>
            <span className="font-medium">{trustScore.score}/100</span>
          </div>
          <Progress 
            value={trustScore.score} 
            className="h-2"
          />
          <p className={`text-sm ${displayProps.color}`}>
            {displayProps.description}
          </p>
        </div>

        {/* Score Breakdown */}
        {showBreakdown && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Activity className="h-4 w-4" />
              Score Breakdown
            </div>
            <div className="grid gap-2">
              <ScoreBar 
                label="Tamper Events" 
                score={trustScore.breakdown.tamperScore} 
                maxScore={30} 
                icon={<Shield className="h-3 w-3" />}
              />
              <ScoreBar 
                label="Stability" 
                score={trustScore.breakdown.stabilityScore} 
                maxScore={25}
                icon={<Activity className="h-3 w-3" />}
              />
              <ScoreBar 
                label="Compliance" 
                score={trustScore.breakdown.complianceScore} 
                maxScore={25}
                icon={<CheckCircle className="h-3 w-3" />}
              />
              <ScoreBar 
                label="Network" 
                score={trustScore.breakdown.networkScore} 
                maxScore={10}
                icon={<Wifi className="h-3 w-3" />}
              />
              <ScoreBar 
                label="History" 
                score={trustScore.breakdown.historyScore} 
                maxScore={10}
                icon={<Clock className="h-3 w-3" />}
              />
            </div>
          </div>
        )}

        {/* Trust Factors */}
        {showFactors && (
          <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between p-2 h-auto">
                <span className="flex items-center gap-2 text-sm font-medium">
                  <Info className="h-4 w-4" />
                  Trust Factors ({trustScore.factors.length})
                </span>
                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-2 pt-2">
              {(showAllFactors ? trustScore.factors : trustScore.factors.slice(0, 5)).map((factor, index) => (
                <FactorRow key={factor.id} factor={factor} />
              ))}
              {trustScore.factors.length > 5 && !showAllFactors && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setShowAllFactors(true)}
                  className="w-full text-xs"
                >
                  Show {trustScore.factors.length - 5} more factors
                </Button>
              )}
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Admin Explanation */}
        {showExplanation && adminExplanation && (
          <Collapsible>
            <CollapsibleTrigger asChild>
              <Button variant="outline" size="sm" className="w-full">
                <FileText className="h-4 w-4 mr-2" />
                View Full Explanation
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3">
              <div className="p-3 bg-muted rounded-lg text-sm whitespace-pre-wrap font-mono">
                {adminExplanation}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Last Calculated */}
        <div className="text-xs text-muted-foreground pt-2 border-t">
          Last calculated: {new Date(trustScore.lastCalculated).toLocaleString()}
        </div>
      </CardContent>
    </Card>
  );
};

// Score bar component
const ScoreBar = ({ 
  label, 
  score, 
  maxScore, 
  icon 
}: { 
  label: string; 
  score: number; 
  maxScore: number;
  icon: React.ReactNode;
}) => {
  const percentage = (score / maxScore) * 100;
  const color = percentage >= 80 ? 'bg-green-500' : 
                percentage >= 60 ? 'bg-amber-500' : 
                percentage >= 40 ? 'bg-orange-500' : 'bg-red-500';

  return (
    <div className="flex items-center gap-2">
      <div className="w-4 text-muted-foreground">{icon}</div>
      <div className="flex-1">
        <div className="flex justify-between text-xs mb-1">
          <span>{label}</span>
          <span className="text-muted-foreground">{score}/{maxScore}</span>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div 
            className={`h-full ${color} rounded-full transition-all`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    </div>
  );
};

// Factor row component
const FactorRow = ({ factor }: { factor: TrustFactor }) => {
  const impactColors = {
    positive: 'border-green-200 bg-green-50',
    negative: 'border-red-200 bg-red-50',
    neutral: 'border-gray-200 bg-gray-50',
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`p-2 rounded border ${impactColors[factor.impact]} cursor-help`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {factor.impact === 'positive' ? (
                  <TrendingUp className="h-3 w-3 text-green-600" />
                ) : factor.impact === 'negative' ? (
                  <TrendingDown className="h-3 w-3 text-red-600" />
                ) : (
                  <Minus className="h-3 w-3 text-gray-400" />
                )}
                <span className="text-sm font-medium">{factor.name}</span>
              </div>
              <Badge 
                variant={factor.impact === 'positive' ? 'default' : factor.impact === 'negative' ? 'destructive' : 'secondary'}
                className="text-xs"
              >
                {factor.value > 0 ? '+' : ''}{factor.value}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1 ml-5">
              {factor.description}
            </p>
          </div>
        </TooltipTrigger>
        {factor.recommendation && (
          <TooltipContent side="left" className="max-w-xs">
            <p className="text-sm"><strong>Recommendation:</strong> {factor.recommendation}</p>
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );
};

export default DeviceTrustScoreCard;
