import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Users,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Info,
} from "lucide-react";
import { useMultipleDeviceTrust } from "@/hooks/useDeviceTrust";
import { TrustLevel, getTrustLevelDisplay } from "@/lib/deviceTrust";

interface DeviceTrustOverviewProps {
  deviceIds: string[];
  title?: string;
  showTable?: boolean;
}

const DeviceTrustOverview = ({
  deviceIds,
  title = "Device Trust Overview",
  showTable = true,
}: DeviceTrustOverviewProps) => {
  const { scores, isLoading } = useMultipleDeviceTrust(deviceIds);

  const stats = useMemo(() => {
    if (scores.size === 0) {
      return {
        total: 0,
        high: 0,
        medium: 0,
        low: 0,
        critical: 0,
        averageScore: 0,
        distribution: [] as { level: TrustLevel; count: number; percentage: number }[],
      };
    }

    const levelCounts = { high: 0, medium: 0, low: 0, critical: 0 };
    let totalScore = 0;

    scores.forEach(score => {
      levelCounts[score.level]++;
      totalScore += score.score;
    });

    const total = scores.size;
    const distribution: { level: TrustLevel; count: number; percentage: number }[] = [
      { level: 'high', count: levelCounts.high, percentage: (levelCounts.high / total) * 100 },
      { level: 'medium', count: levelCounts.medium, percentage: (levelCounts.medium / total) * 100 },
      { level: 'low', count: levelCounts.low, percentage: (levelCounts.low / total) * 100 },
      { level: 'critical', count: levelCounts.critical, percentage: (levelCounts.critical / total) * 100 },
    ];

    return {
      total,
      ...levelCounts,
      averageScore: Math.round(totalScore / total),
      distribution,
    };
  }, [scores]);

  const sortedDevices = useMemo(() => {
    return Array.from(scores.entries())
      .sort((a, b) => a[1].score - b[1].score) // Sort by score ascending (worst first)
      .slice(0, 10); // Top 10 devices needing attention
  }, [scores]);

  const getShieldIcon = (level: TrustLevel, className = "h-4 w-4") => {
    switch (level) {
      case 'high':
        return <ShieldCheck className={`${className} text-green-600`} />;
      case 'medium':
        return <Shield className={`${className} text-amber-600`} />;
      case 'low':
        return <ShieldAlert className={`${className} text-orange-600`} />;
      case 'critical':
        return <ShieldX className={`${className} text-red-600`} />;
    }
  };

  const getLevelColor = (level: TrustLevel) => {
    switch (level) {
      case 'high': return 'bg-green-500';
      case 'medium': return 'bg-amber-500';
      case 'low': return 'bg-orange-500';
      case 'critical': return 'bg-red-500';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <span>Calculating trust scores for {deviceIds.length} devices...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                {title}
              </CardTitle>
              <CardDescription>
                Trust score analysis for {stats.total} devices
              </CardDescription>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold">{stats.averageScore}</div>
              <p className="text-sm text-muted-foreground">Average Score</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Trust Level Distribution */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Users className="h-4 w-4" />
              Trust Level Distribution
            </div>

            {/* Visual Bar */}
            <div className="h-4 rounded-full overflow-hidden flex">
              {stats.distribution.map(({ level, percentage }) => (
                percentage > 0 && (
                  <TooltipProvider key={level}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div 
                          className={`${getLevelColor(level)} transition-all`}
                          style={{ width: `${percentage}%` }}
                        />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{getTrustLevelDisplay(level).label}: {Math.round(percentage)}%</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )
              ))}
            </div>

            {/* Legend */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {stats.distribution.map(({ level, count, percentage }) => {
                const display = getTrustLevelDisplay(level);
                return (
                  <div 
                    key={level} 
                    className={`p-3 rounded-lg border ${display.bgColor}`}
                  >
                    <div className="flex items-center gap-2">
                      {getShieldIcon(level)}
                      <span className={`text-sm font-medium ${display.color}`}>
                        {display.label}
                      </span>
                    </div>
                    <div className="mt-1">
                      <span className="text-2xl font-bold">{count}</span>
                      <span className="text-sm text-muted-foreground ml-1">
                        ({Math.round(percentage)}%)
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Alerts Summary */}
          {(stats.low > 0 || stats.critical > 0) && (
            <div className="p-4 border rounded-lg border-amber-200 bg-amber-50">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-amber-800">Attention Required</h4>
                  <p className="text-sm text-amber-700 mt-1">
                    {stats.critical > 0 && (
                      <span className="font-medium">{stats.critical} device{stats.critical > 1 ? 's' : ''} in critical status. </span>
                    )}
                    {stats.low > 0 && (
                      <span>{stats.low} device{stats.low > 1 ? 's' : ''} with low trust. </span>
                    )}
                    Review these devices for potential issues.
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Devices Needing Attention */}
      {showTable && sortedDevices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Devices Needing Attention
            </CardTitle>
            <CardDescription>
              Devices with lowest trust scores
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Device ID</TableHead>
                  <TableHead>Trust Level</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Top Concern</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedDevices.map(([deviceId, score]) => {
                  const display = getTrustLevelDisplay(score.level);
                  const topConcern = score.factors.find(f => f.impact === 'negative');
                  
                  return (
                    <TableRow key={deviceId}>
                      <TableCell className="font-mono text-sm">
                        {deviceId.slice(0, 20)}...
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getShieldIcon(score.level)}
                          <Badge 
                            variant="outline"
                            className={`${display.color} border-current`}
                          >
                            {display.label}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-bold">{score.score}</span>
                          <Progress 
                            value={score.score} 
                            className="w-16 h-1.5"
                          />
                        </div>
                      </TableCell>
                      <TableCell>
                        {topConcern ? (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex items-center gap-1 text-sm text-red-600 cursor-help">
                                  <TrendingDown className="h-3 w-3" />
                                  {topConcern.name}
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{topConcern.description}</p>
                                {topConcern.recommendation && (
                                  <p className="mt-1 text-xs text-muted-foreground">
                                    Tip: {topConcern.recommendation}
                                  </p>
                                )}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DeviceTrustOverview;
