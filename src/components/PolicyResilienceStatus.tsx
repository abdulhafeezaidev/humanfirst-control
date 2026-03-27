import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Shield,
  RefreshCw,
  Database,
  Clock,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Wifi,
  WifiOff,
  Eye,
  Timer,
  HardDrive,
  Fingerprint,
} from "lucide-react";
import { usePolicyResilience, PolicyResilienceState, GracePeriodState } from "@/hooks/usePolicyResilience";
import { getCacheMetadata } from "@/lib/policyCache";

interface PolicyResilienceStatusProps {
  organizationId: string | null;
  userId: string | null;
  compact?: boolean;
}

const PolicyResilienceStatus = ({
  organizationId,
  userId,
  compact = false,
}: PolicyResilienceStatusProps) => {
  const {
    policies,
    activePolicyId,
    source,
    cacheValid,
    integrityStatus,
    lastSyncAt,
    syncError,
    rebootDetected,
    inGracePeriod,
    graceState,
    forceRefresh,
    isInGracePeriod,
  } = usePolicyResilience({
    organizationId,
    userId,
  });

  const [cacheInfo, setCacheInfo] = useState<{
    exists: boolean;
    age_ms: number | null;
    policy_count: number;
    checksum_prefix: string | null;
  } | null>(null);

  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const loadCacheInfo = async () => {
      const info = await getCacheMetadata();
      setCacheInfo(info);
    };
    loadCacheInfo();

    const interval = setInterval(loadCacheInfo, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await forceRefresh();
      const info = await getCacheMetadata();
      setCacheInfo(info);
    } finally {
      setIsRefreshing(false);
    }
  };

  const getIntegrityBadge = () => {
    switch (integrityStatus) {
      case 'valid':
        return (
          <Badge className="bg-green-500">
            <CheckCircle className="w-3 h-3 mr-1" />
            Valid
          </Badge>
        );
      case 'stale':
        return (
          <Badge className="bg-amber-500">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Stale
          </Badge>
        );
      case 'invalid':
        return (
          <Badge variant="destructive">
            <XCircle className="w-3 h-3 mr-1" />
            Invalid
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary">
            <Clock className="w-3 h-3 mr-1" />
            Unknown
          </Badge>
        );
    }
  };

  const getSourceBadge = () => {
    if (source === 'server') {
      return (
        <Badge variant="outline" className="border-green-500 text-green-600">
          <Wifi className="w-3 h-3 mr-1" />
          Live
        </Badge>
      );
    } else if (source === 'cache') {
      return (
        <Badge variant="outline" className="border-amber-500 text-amber-600">
          <Database className="w-3 h-3 mr-1" />
          Cached
        </Badge>
      );
    }
    return (
      <Badge variant="outline">
        <Clock className="w-3 h-3 mr-1" />
        Loading
      </Badge>
    );
  };

  const formatAge = (ms: number | null) => {
    if (ms === null) return 'N/A';
    if (ms < 60000) return `${Math.round(ms / 1000)}s ago`;
    if (ms < 3600000) return `${Math.round(ms / 60000)}m ago`;
    return `${Math.round(ms / 3600000)}h ago`;
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        {getIntegrityBadge()}
        {getSourceBadge()}
        {isInGracePeriod() && (
          <Badge variant="outline" className="border-blue-500 text-blue-600">
            <Timer className="w-3 h-3 mr-1" />
            Grace
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
              <Shield className="h-5 w-5" />
              Policy Resilience Status
            </CardTitle>
            <CardDescription>
              Cache integrity, sync status, and grace periods
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
            Sync
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Integrity</p>
            {getIntegrityBadge()}
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Source</p>
            {getSourceBadge()}
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Policies</p>
            <Badge variant="secondary">{policies.length} loaded</Badge>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Last Sync</p>
            <Badge variant="outline">
              {lastSyncAt ? formatAge(Date.now() - lastSyncAt) : 'Never'}
            </Badge>
          </div>
        </div>

        {/* Cache Details */}
        {cacheInfo && cacheInfo.exists && (
          <div className="p-3 border rounded-lg bg-muted/30 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <HardDrive className="h-4 w-4" />
              Local Cache
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>
                <span className="text-muted-foreground">Age: </span>
                {formatAge(cacheInfo.age_ms)}
              </div>
              <div>
                <span className="text-muted-foreground">Policies: </span>
                {cacheInfo.policy_count}
              </div>
              <div className="flex items-center gap-1">
                <Fingerprint className="h-3 w-3 text-muted-foreground" />
                <span className="font-mono">{cacheInfo.checksum_prefix}...</span>
              </div>
            </div>
          </div>
        )}

        {/* Grace Periods */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Timer className="h-4 w-4" />
            Grace Periods
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className={`p-2 rounded border text-center ${
              graceState.visibilityGraceActive ? 'border-blue-500 bg-blue-50' : ''
            }`}>
              <Eye className="h-4 w-4 mx-auto mb-1" />
              <p className="text-xs">Visibility</p>
              <p className="text-xs text-muted-foreground">
                {graceState.config.visibility_change_ms / 1000}s
              </p>
            </div>
            <div className={`p-2 rounded border text-center ${
              graceState.connectivityGraceActive ? 'border-blue-500 bg-blue-50' : ''
            }`}>
              <WifiOff className="h-4 w-4 mx-auto mb-1" />
              <p className="text-xs">Network</p>
              <p className="text-xs text-muted-foreground">
                {graceState.config.connectivity_loss_ms / 1000}s
              </p>
            </div>
            <div className={`p-2 rounded border text-center ${
              graceState.rebootGraceActive ? 'border-blue-500 bg-blue-50' : ''
            }`}>
              <RefreshCw className="h-4 w-4 mx-auto mb-1" />
              <p className="text-xs">Reboot</p>
              <p className="text-xs text-muted-foreground">
                {graceState.config.reboot_grace_ms / 1000}s
              </p>
            </div>
          </div>
        </div>

        {/* Alerts */}
        {rebootDetected && inGracePeriod && (
          <Alert className="border-blue-200 bg-blue-50">
            <Timer className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-700">
              Browser restart detected. Grace period active - no tamper events will be logged.
            </AlertDescription>
          </Alert>
        )}

        {syncError && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Sync failed: {syncError}. Using cached policies.
            </AlertDescription>
          </Alert>
        )}

        {integrityStatus === 'invalid' && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              Cache integrity check failed. Policies may have been tampered with locally.
            </AlertDescription>
          </Alert>
        )}

        {/* Active Policy */}
        {activePolicyId && (
          <div className="p-3 border rounded-lg border-green-200 bg-green-50">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-green-800">
                Active Policy Enforced
              </span>
            </div>
            <p className="text-xs text-green-700 mt-1">
              ID: {activePolicyId.slice(0, 8)}...
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PolicyResilienceStatus;
