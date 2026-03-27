import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Shield,
  Wifi,
  WifiOff,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Globe,
  Lock,
  Eye,
  Clock,
  Activity,
  Server,
} from "lucide-react";
import { useNetworkEnforcement } from "@/hooks/useNetworkEnforcement";
import { PINNED_AI_DOMAINS } from "@/lib/networkEnforcement";

interface NetworkEnforcementStatusProps {
  compact?: boolean;
  showDomainDetails?: boolean;
  onAnomalyDetected?: (anomaly: any) => void;
}

const NetworkEnforcementStatus = ({
  compact = false,
  showDomainDetails = true,
  onAnomalyDetected,
}: NetworkEnforcementStatusProps) => {
  const {
    status,
    lastCheckAt,
    checksPerformed,
    anomaliesDetected,
    dohDetected,
    recentAnomalies,
    domainResults,
    isChecking,
    error,
    runCheck,
    getStatusColor,
    getStatusLabel,
  } = useNetworkEnforcement({
    onAnomalyDetected,
    autoCheck: true,
    checkIntervalMs: 120000, // 2 minutes
  });

  const formatTime = (timestamp: number | null) => {
    if (!timestamp) return 'Never';
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    return `${Math.floor(seconds / 3600)}h ago`;
  };

  const getStatusBadge = () => {
    const color = getStatusColor();
    const icons: Record<string, React.ReactNode> = {
      green: <CheckCircle className="w-3 h-3 mr-1" />,
      amber: <AlertTriangle className="w-3 h-3 mr-1" />,
      red: <XCircle className="w-3 h-3 mr-1" />,
      blue: <RefreshCw className="w-3 h-3 mr-1 animate-spin" />,
      gray: <Clock className="w-3 h-3 mr-1" />,
    };

    return (
      <Badge
        className={
          color === 'green' ? 'bg-green-500' :
          color === 'amber' ? 'bg-amber-500' :
          color === 'red' ? 'bg-red-500' :
          color === 'blue' ? 'bg-blue-500' :
          'bg-gray-500'
        }
      >
        {icons[color]}
        {getStatusLabel()}
      </Badge>
    );
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        {getStatusBadge()}
        {dohDetected && (
          <Badge variant="outline" className="border-purple-500 text-purple-600">
            <Lock className="w-3 h-3 mr-1" />
            DoH
          </Badge>
        )}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Network Enforcement Status
            </CardTitle>
            <CardDescription>
              DNS integrity, pinning verification, and anomaly detection
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => runCheck()}
            disabled={isChecking}
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${isChecking ? 'animate-spin' : ''}`} />
            Check Now
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Status</p>
            {getStatusBadge()}
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Last Check</p>
            <Badge variant="outline">
              <Clock className="w-3 h-3 mr-1" />
              {formatTime(lastCheckAt)}
            </Badge>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Domains Checked</p>
            <Badge variant="secondary">{checksPerformed}</Badge>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Anomalies</p>
            <Badge variant={anomaliesDetected > 0 ? "destructive" : "secondary"}>
              {anomaliesDetected}
            </Badge>
          </div>
        </div>

        {/* DoH Detection */}
        <div className="p-3 border rounded-lg bg-muted/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4" />
              <span className="text-sm font-medium">Encrypted DNS Detection</span>
            </div>
            {dohDetected ? (
              <Badge className="bg-purple-500">
                <Eye className="w-3 h-3 mr-1" />
                DoH Detected
              </Badge>
            ) : (
              <Badge variant="secondary">
                <Wifi className="w-3 h-3 mr-1" />
                Standard DNS
              </Badge>
            )}
          </div>
          {dohDetected && (
            <p className="text-xs text-muted-foreground mt-2">
              DNS-over-HTTPS is active. This provides privacy but may indicate bypass attempts during exams.
            </p>
          )}
        </div>

        {/* Domain Results */}
        {showDomainDetails && domainResults.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Server className="h-4 w-4" />
              Pinned Domain Status
            </div>
            <div className="grid gap-2">
              {domainResults.map((result) => (
                <div
                  key={result.domain}
                  className={`flex items-center justify-between p-2 rounded border ${
                    result.status === 'ok' ? 'border-green-200 bg-green-50' :
                    result.status === 'blocked' ? 'border-red-200 bg-red-50' :
                    result.status === 'manipulated' ? 'border-amber-200 bg-amber-50' :
                    'border-gray-200 bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {result.status === 'ok' ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : result.status === 'blocked' ? (
                      <XCircle className="h-4 w-4 text-red-600" />
                    ) : result.status === 'manipulated' ? (
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                    ) : (
                      <Clock className="h-4 w-4 text-gray-600" />
                    )}
                    <span className="text-sm font-mono">{result.domain}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{result.details}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Anomalies */}
        {recentAnomalies.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Recent Anomalies
            </div>
            <div className="max-h-48 overflow-y-auto space-y-2">
              {recentAnomalies.slice(0, 5).map((anomaly, index) => (
                <Alert key={index} className="py-2">
                  <AlertDescription className="flex items-center justify-between text-xs">
                    <span>
                      <Badge variant="outline" className="mr-2 text-xs">
                        {anomaly.anomalyType.replace(/_/g, ' ')}
                      </Badge>
                      {anomaly.domain}
                    </span>
                    <span className="text-muted-foreground">
                      {formatTime(anomaly.timestamp)}
                    </span>
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Check failed: {error}
            </AlertDescription>
          </Alert>
        )}

        {/* Privacy Notice */}
        <div className="text-xs text-muted-foreground border-t pt-3">
          <p className="flex items-center gap-1">
            <Shield className="h-3 w-3" />
            Privacy-preserving: No IP addresses or request content is logged
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default NetworkEnforcementStatus;
