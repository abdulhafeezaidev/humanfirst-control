import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  Server, 
  GitBranch, 
  Shield, 
  Activity, 
  AlertTriangle,
  CheckCircle,
  Database,
  Cloud,
  Lock,
  RefreshCw,
  Clock,
  Zap,
  Eye,
  Settings,
  Archive,
  RotateCcw,
  Bell,
  FileText,
  Layers,
  Globe,
  Terminal,
  HardDrive,
  Cpu
} from "lucide-react";

const Infrastructure = () => {
  const [featureFlags, setFeatureFlags] = useState({
    pilotMode: true,
    advancedAnalytics: false,
    realtimeSync: true,
    bulkOperations: false,
    apiV2: false,
  });

  const environments = [
    {
      name: "Development",
      slug: "dev",
      color: "bg-blue-500",
      purpose: "Feature development and testing",
      access: "Engineering team only",
      data: "Synthetic/anonymized data",
      refresh: "On-demand",
      monitoring: "Basic logging",
      features: ["All feature flags enabled", "Debug mode active", "Verbose logging", "Mock services allowed"]
    },
    {
      name: "Staging",
      slug: "staging",
      color: "bg-amber-500",
      purpose: "Pre-production validation",
      access: "Engineering + QA team",
      data: "Production-like (sanitized)",
      refresh: "Weekly from production",
      monitoring: "Full monitoring stack",
      features: ["Production parity", "Integration testing", "Performance testing", "Security scanning"]
    },
    {
      name: "Production",
      slug: "prod",
      color: "bg-green-500",
      purpose: "Live customer workloads",
      access: "Controlled via RBAC",
      data: "Live customer data",
      refresh: "N/A - Source of truth",
      monitoring: "Full + alerting",
      features: ["Feature flags controlled", "Audit logging", "Rate limiting", "Auto-scaling"]
    }
  ];

  const cicdStages = [
    { name: "Code Push", icon: GitBranch, description: "Developer pushes to feature branch", duration: "Instant" },
    { name: "Lint & Type Check", icon: FileText, description: "ESLint, TypeScript validation", duration: "~30s" },
    { name: "Unit Tests", icon: CheckCircle, description: "Jest/Vitest test suite", duration: "~2min" },
    { name: "Security Scan", icon: Shield, description: "Dependency audit, SAST", duration: "~1min" },
    { name: "Build", icon: Layers, description: "Vite production build", duration: "~1min" },
    { name: "Integration Tests", icon: Database, description: "API and DB integration", duration: "~3min" },
    { name: "Preview Deploy", icon: Globe, description: "Ephemeral preview environment", duration: "~2min" },
    { name: "Manual Review", icon: Eye, description: "Code review and approval", duration: "Variable" },
    { name: "Staging Deploy", icon: Server, description: "Deploy to staging", duration: "~2min" },
    { name: "E2E Tests", icon: Terminal, description: "Playwright/Cypress tests", duration: "~5min" },
    { name: "Production Deploy", icon: Zap, description: "Blue-green deployment", duration: "~3min" },
    { name: "Health Validation", icon: Activity, description: "Post-deploy health checks", duration: "~1min" }
  ];

  const featureFlagDefinitions = [
    {
      key: "pilotMode",
      name: "Pilot Mode",
      description: "Enable non-enforcing monitoring mode for new deployments",
      scope: "Organization",
      defaultState: "ON for pilot orgs",
      rollout: "100%",
      risk: "Low"
    },
    {
      key: "advancedAnalytics",
      name: "Advanced Analytics",
      description: "Enhanced tamper pattern analysis and ML-based detection",
      scope: "Organization",
      defaultState: "OFF",
      rollout: "Beta only",
      risk: "Medium"
    },
    {
      key: "realtimeSync",
      name: "Realtime Sync",
      description: "WebSocket-based real-time status updates",
      scope: "Global",
      defaultState: "ON",
      rollout: "100%",
      risk: "Low"
    },
    {
      key: "bulkOperations",
      name: "Bulk Operations",
      description: "Batch device enrollment and policy management",
      scope: "Organization",
      defaultState: "OFF",
      rollout: "Institution tier only",
      risk: "Medium"
    },
    {
      key: "apiV2",
      name: "API V2",
      description: "Next-generation API with improved rate limits",
      scope: "Global",
      defaultState: "OFF",
      rollout: "10% canary",
      risk: "High"
    }
  ];

  const failsafeBehaviors = [
    {
      scenario: "Backend Unreachable",
      detection: "Connection timeout after 5s",
      behavior: "Fail-OPEN (allow access)",
      rationale: "Never block learning due to infrastructure issues",
      logging: "Queue events locally, sync when restored",
      userImpact: "Seamless - no visible change",
      adminNotification: "Alert after 1 minute"
    },
    {
      scenario: "Database Connection Lost",
      detection: "Query timeout or connection error",
      behavior: "Fail-OPEN with cached policy",
      rationale: "Use last known policy state",
      logging: "Buffer to local storage",
      userImpact: "Possible stale policy (max 5 min)",
      adminNotification: "Immediate critical alert"
    },
    {
      scenario: "Edge Function Error",
      detection: "5xx response or timeout",
      behavior: "Fail-OPEN, bypass function",
      rationale: "Core blocking logic is browser-based",
      logging: "Log error, continue operation",
      userImpact: "Some analytics may be delayed",
      adminNotification: "Alert on error rate > 1%"
    },
    {
      scenario: "Rate Limit Exceeded",
      detection: "429 response from API",
      behavior: "Exponential backoff retry",
      rationale: "Protect system stability",
      logging: "Track rate limit hits",
      userImpact: "Brief delay in syncs",
      adminNotification: "Alert on sustained rate limiting"
    },
    {
      scenario: "Invalid Policy Response",
      detection: "Schema validation failure",
      behavior: "Use cached valid policy",
      rationale: "Never apply malformed policies",
      logging: "Log validation error with payload",
      userImpact: "None if cache valid",
      adminNotification: "Immediate warning alert"
    },
    {
      scenario: "Extension Update Required",
      detection: "Version mismatch detected",
      behavior: "Continue with current version",
      rationale: "Updates are non-blocking",
      logging: "Track version distribution",
      userImpact: "Prompt to update, no force",
      adminNotification: "Version adoption metrics"
    }
  ];

  const healthChecks = [
    { name: "API Gateway", endpoint: "/health", interval: "30s", timeout: "5s", threshold: 3 },
    { name: "Database", endpoint: "/health/db", interval: "60s", timeout: "10s", threshold: 2 },
    { name: "Edge Functions", endpoint: "/health/functions", interval: "60s", timeout: "15s", threshold: 3 },
    { name: "Real-time Service", endpoint: "/health/realtime", interval: "30s", timeout: "5s", threshold: 2 },
    { name: "Storage Service", endpoint: "/health/storage", interval: "120s", timeout: "10s", threshold: 3 },
    { name: "Auth Service", endpoint: "/health/auth", interval: "60s", timeout: "10s", threshold: 2 }
  ];

  const monitoringMetrics = [
    { category: "Availability", metrics: ["Uptime %", "Error rate", "Response time p50/p95/p99"], tool: "Supabase Observability" },
    { category: "Performance", metrics: ["Query latency", "Edge function duration", "CDN cache hit rate"], tool: "Built-in Analytics" },
    { category: "Security", metrics: ["Failed auth attempts", "Rate limit triggers", "Suspicious patterns"], tool: "Audit Logs" },
    { category: "Business", metrics: ["Active users", "Tamper events", "Policy compliance"], tool: "Custom Dashboard" }
  ];

  const incidentSeverities = [
    {
      level: "SEV-1",
      name: "Critical",
      definition: "Complete service outage or data breach",
      response: "Immediate (< 5 min)",
      team: "Full incident team + leadership",
      communication: "Customer notification within 1 hour",
      examples: ["Database corruption", "Auth system down", "Security breach"]
    },
    {
      level: "SEV-2",
      name: "Major",
      definition: "Partial outage affecting multiple orgs",
      response: "< 15 min",
      team: "On-call engineer + backup",
      communication: "Status page update within 30 min",
      examples: ["Edge functions down", "High error rates", "Slow performance"]
    },
    {
      level: "SEV-3",
      name: "Minor",
      definition: "Limited impact, workaround available",
      response: "< 1 hour",
      team: "On-call engineer",
      communication: "Status page if prolonged",
      examples: ["Single org issue", "Non-critical feature broken"]
    },
    {
      level: "SEV-4",
      name: "Low",
      definition: "Cosmetic or minor inconvenience",
      response: "Next business day",
      team: "Standard support",
      communication: "Ticket update",
      examples: ["UI glitch", "Documentation error"]
    }
  ];

  const rollbackStrategies = [
    {
      layer: "Frontend",
      method: "Instant rollback via CDN",
      time: "< 1 minute",
      automation: "Automated on error spike",
      details: "Previous build artifacts kept for 30 days"
    },
    {
      layer: "Edge Functions",
      method: "Version revert in Supabase",
      time: "< 2 minutes",
      automation: "Manual trigger, auto-detect issues",
      details: "Last 10 versions retained"
    },
    {
      layer: "Database Schema",
      method: "Reverse migration script",
      time: "5-30 minutes",
      automation: "Manual with validation",
      details: "All migrations are reversible"
    },
    {
      layer: "Configuration",
      method: "Config version restore",
      time: "< 1 minute",
      automation: "Automated on validation failure",
      details: "Config changes are versioned"
    }
  ];

  const backupStrategy = {
    database: {
      type: "Point-in-time Recovery",
      retention: "7 days (pilot) / 30 days (production)",
      frequency: "Continuous WAL archiving",
      rto: "< 1 hour",
      rpo: "< 5 minutes",
      testing: "Monthly restore test"
    },
    storage: {
      type: "Cross-region replication",
      retention: "As per data retention policy",
      frequency: "Real-time sync",
      rto: "< 15 minutes",
      rpo: "< 1 minute",
      testing: "Quarterly failover test"
    },
    config: {
      type: "Version controlled",
      retention: "Indefinite in Git",
      frequency: "On every change",
      rto: "Instant",
      rpo: "0 (immutable)",
      testing: "On every deployment"
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <Badge variant="outline" className="mb-2">
            <Server className="w-3 h-3 mr-1" />
            Infrastructure Architecture
          </Badge>
          <h1 className="text-4xl font-bold">HumanFirst Infrastructure & Deployment</h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Resilient, secure, and observable infrastructure designed for educational reliability
          </p>
        </div>

        <Tabs defaultValue="environments" className="space-y-6">
          <TabsList className="grid grid-cols-2 lg:grid-cols-7 w-full">
            <TabsTrigger value="environments">Environments</TabsTrigger>
            <TabsTrigger value="cicd">CI/CD</TabsTrigger>
            <TabsTrigger value="features">Feature Flags</TabsTrigger>
            <TabsTrigger value="failsafe">Fail-Safe</TabsTrigger>
            <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
            <TabsTrigger value="incidents">Incidents</TabsTrigger>
            <TabsTrigger value="backup">Backup</TabsTrigger>
          </TabsList>

          {/* Environment Separation */}
          <TabsContent value="environments" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Layers className="h-5 w-5" />
                  Environment Separation Strategy
                </CardTitle>
                <CardDescription>
                  Complete isolation between development, staging, and production
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-6">
                  {environments.map((env) => (
                    <Card key={env.slug} className="border-2">
                      <CardHeader>
                        <div className="flex items-center gap-3">
                          <div className={`w-4 h-4 rounded-full ${env.color}`}></div>
                          <CardTitle className="text-lg">{env.name}</CardTitle>
                        </div>
                        <Badge variant="outline">{env.slug}.humanfirst.app</Badge>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Purpose:</span>
                            <span className="text-right">{env.purpose}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Access:</span>
                            <span className="text-right">{env.access}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Data:</span>
                            <span className="text-right">{env.data}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Refresh:</span>
                            <span className="text-right">{env.refresh}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Monitoring:</span>
                            <span className="text-right">{env.monitoring}</span>
                          </div>
                        </div>
                        <div className="pt-3 border-t">
                          <p className="text-xs text-muted-foreground mb-2">Features:</p>
                          <div className="flex flex-wrap gap-1">
                            {env.features.map((feature) => (
                              <Badge key={feature} variant="secondary" className="text-xs">
                                {feature}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5" />
                  Isolation Guarantees
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <h4 className="font-medium flex items-center gap-2">
                      <Database className="h-4 w-4" /> Database Isolation
                    </h4>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>• Separate Supabase projects per environment</li>
                      <li>• No cross-environment database connections</li>
                      <li>• Different credentials and API keys</li>
                      <li>• Staging uses sanitized production snapshots</li>
                    </ul>
                  </div>
                  <div className="space-y-3">
                    <h4 className="font-medium flex items-center gap-2">
                      <Cloud className="h-4 w-4" /> Network Isolation
                    </h4>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>• Separate subdomains per environment</li>
                      <li>• Different SSL certificates</li>
                      <li>• Isolated CDN configurations</li>
                      <li>• Environment-specific rate limits</li>
                    </ul>
                  </div>
                  <div className="space-y-3">
                    <h4 className="font-medium flex items-center gap-2">
                      <Shield className="h-4 w-4" /> Access Control
                    </h4>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>• Role-based access per environment</li>
                      <li>• Production requires additional MFA</li>
                      <li>• Audit logs for all access</li>
                      <li>• Just-in-time production access</li>
                    </ul>
                  </div>
                  <div className="space-y-3">
                    <h4 className="font-medium flex items-center gap-2">
                      <Settings className="h-4 w-4" /> Configuration
                    </h4>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>• Environment variables per deployment</li>
                      <li>• Secrets stored in environment-specific vaults</li>
                      <li>• Feature flags can vary by environment</li>
                      <li>• Monitoring thresholds differ</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* CI/CD Pipeline */}
          <TabsContent value="cicd" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GitBranch className="h-5 w-5" />
                  CI/CD Pipeline Stages
                </CardTitle>
                <CardDescription>
                  End-to-end automated deployment pipeline with quality gates
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {cicdStages.map((stage, index) => (
                    <div key={stage.name} className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-medium text-sm">
                        {index + 1}
                      </div>
                      <div className="flex items-center gap-3 flex-1">
                        <stage.icon className="h-5 w-5 text-muted-foreground" />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{stage.name}</span>
                            <Badge variant="outline" className="text-xs">
                              <Clock className="h-3 w-3 mr-1" />
                              {stage.duration}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{stage.description}</p>
                        </div>
                      </div>
                      {index < cicdStages.length - 1 && (
                        <div className="w-8 text-center text-muted-foreground">→</div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Branch Strategy</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Badge className="bg-blue-500">feature/*</Badge>
                      <span className="text-sm">→ Preview deploys</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className="bg-amber-500">develop</Badge>
                      <span className="text-sm">→ Staging deploy</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className="bg-green-500">main</Badge>
                      <span className="text-sm">→ Production deploy</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className="bg-red-500">hotfix/*</Badge>
                      <span className="text-sm">→ Emergency production</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Quality Gates</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Test Coverage</span>
                    <div className="flex items-center gap-2">
                      <Progress value={80} className="w-24" />
                      <span className="text-sm font-medium">≥80%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">No Critical Vulnerabilities</span>
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Build Success</span>
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Code Review Approved</span>
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">E2E Tests Pass</span>
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Feature Flags */}
          <TabsContent value="features" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Feature Flag Configuration
                </CardTitle>
                <CardDescription>
                  Gradual rollout and instant kill-switch capabilities
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {featureFlagDefinitions.map((flag) => (
                    <div key={flag.key} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h4 className="font-medium">{flag.name}</h4>
                          <Badge variant={flag.risk === "Low" ? "secondary" : flag.risk === "Medium" ? "outline" : "destructive"}>
                            {flag.risk} Risk
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{flag.description}</p>
                        <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                          <span>Scope: {flag.scope}</span>
                          <span>Default: {flag.defaultState}</span>
                          <span>Rollout: {flag.rollout}</span>
                        </div>
                      </div>
                      <Switch 
                        checked={featureFlags[flag.key as keyof typeof featureFlags]}
                        onCheckedChange={(checked) => 
                          setFeatureFlags(prev => ({ ...prev, [flag.key]: checked }))
                        }
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Feature Flag Best Practices</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6 text-sm">
                  <div className="space-y-2">
                    <h4 className="font-medium text-green-600">✓ Do</h4>
                    <ul className="space-y-1 text-muted-foreground">
                      <li>• Use flags for all new features</li>
                      <li>• Set explicit rollout percentages</li>
                      <li>• Monitor metrics during rollout</li>
                      <li>• Remove flags after full rollout</li>
                      <li>• Document flag purpose and owner</li>
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium text-red-600">✗ Don't</h4>
                    <ul className="space-y-1 text-muted-foreground">
                      <li>• Leave flags indefinitely</li>
                      <li>• Use flags for config that rarely changes</li>
                      <li>• Create deeply nested flag dependencies</li>
                      <li>• Skip testing both flag states</li>
                      <li>• Roll out 100% without monitoring</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Fail-Safe Behavior */}
          <TabsContent value="failsafe" className="space-y-6">
            <Alert className="border-green-200 bg-green-50">
              <Shield className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-800">Core Principle: Fail-OPEN for Learning</AlertTitle>
              <AlertDescription className="text-green-700">
                HumanFirst never blocks access to learning resources due to infrastructure failures. 
                AI service blocking is enforcement-optional; infrastructure issues always fail open.
              </AlertDescription>
            </Alert>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Fail-Safe Behavior Matrix
                </CardTitle>
                <CardDescription>
                  How the system behaves when components fail
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2 font-medium">Scenario</th>
                        <th className="text-left p-2 font-medium">Detection</th>
                        <th className="text-left p-2 font-medium">Behavior</th>
                        <th className="text-left p-2 font-medium">User Impact</th>
                        <th className="text-left p-2 font-medium">Admin Alert</th>
                      </tr>
                    </thead>
                    <tbody>
                      {failsafeBehaviors.map((behavior) => (
                        <tr key={behavior.scenario} className="border-b">
                          <td className="p-2 font-medium">{behavior.scenario}</td>
                          <td className="p-2 text-muted-foreground">{behavior.detection}</td>
                          <td className="p-2">
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                              {behavior.behavior}
                            </Badge>
                          </td>
                          <td className="p-2 text-muted-foreground">{behavior.userImpact}</td>
                          <td className="p-2 text-muted-foreground">{behavior.adminNotification}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Graceful Degradation Hierarchy</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start gap-4 p-4 border rounded-lg bg-green-50/50">
                    <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white font-medium">1</div>
                    <div>
                      <h4 className="font-medium">Full Functionality</h4>
                      <p className="text-sm text-muted-foreground">All services operational, real-time sync, full analytics</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 p-4 border rounded-lg bg-amber-50/50">
                    <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center text-white font-medium">2</div>
                    <div>
                      <h4 className="font-medium">Reduced Functionality</h4>
                      <p className="text-sm text-muted-foreground">Cached policies, delayed sync, basic blocking only</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 p-4 border rounded-lg bg-orange-50/50">
                    <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-white font-medium">3</div>
                    <div>
                      <h4 className="font-medium">Offline Mode</h4>
                      <p className="text-sm text-muted-foreground">Local blocklist only, events queued, no admin visibility</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 p-4 border rounded-lg bg-red-50/50">
                    <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center text-white font-medium">4</div>
                    <div>
                      <h4 className="font-medium">Fail-Open Bypass</h4>
                      <p className="text-sm text-muted-foreground">Extension disabled, full access granted, logging when restored</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Monitoring */}
          <TabsContent value="monitoring" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Health Check Endpoints
                </CardTitle>
                <CardDescription>
                  Automated health monitoring for all critical services
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {healthChecks.map((check) => (
                    <div key={check.name} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></div>
                        <div>
                          <span className="font-medium">{check.name}</span>
                          <span className="text-sm text-muted-foreground ml-2">{check.endpoint}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>Every {check.interval}</span>
                        <span>Timeout: {check.timeout}</span>
                        <span>Threshold: {check.threshold} failures</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    Monitoring Metrics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {monitoringMetrics.map((category) => (
                      <div key={category.category} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">{category.category}</h4>
                          <Badge variant="outline">{category.tool}</Badge>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {category.metrics.map((metric) => (
                            <Badge key={metric} variant="secondary" className="text-xs">
                              {metric}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Bell className="h-4 w-4" />
                    Status Page Visibility
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Public status page available at status.humanfirst.app
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Core Services</span>
                      <Badge className="bg-green-500">Operational</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Browser Extension</span>
                      <Badge className="bg-green-500">Operational</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Admin Dashboard</span>
                      <Badge className="bg-green-500">Operational</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">API</span>
                      <Badge className="bg-green-500">Operational</Badge>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Subscribers notified via email on status changes
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Alerting Thresholds</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="p-4 border rounded-lg bg-amber-50">
                    <h4 className="font-medium text-amber-800">Warning</h4>
                    <ul className="text-sm text-amber-700 mt-2 space-y-1">
                      <li>• Error rate {'>'} 0.1%</li>
                      <li>• P95 latency {'>'} 2s</li>
                      <li>• CPU usage {'>'} 70%</li>
                      <li>• Memory {'>'} 80%</li>
                    </ul>
                  </div>
                  <div className="p-4 border rounded-lg bg-orange-50">
                    <h4 className="font-medium text-orange-800">Critical</h4>
                    <ul className="text-sm text-orange-700 mt-2 space-y-1">
                      <li>• Error rate {'>'} 1%</li>
                      <li>• P95 latency {'>'} 5s</li>
                      <li>• CPU usage {'>'} 90%</li>
                      <li>• Memory {'>'} 95%</li>
                    </ul>
                  </div>
                  <div className="p-4 border rounded-lg bg-red-50">
                    <h4 className="font-medium text-red-800">Emergency</h4>
                    <ul className="text-sm text-red-700 mt-2 space-y-1">
                      <li>• Error rate {'>'} 5%</li>
                      <li>• Service unreachable</li>
                      <li>• Data inconsistency</li>
                      <li>• Security breach signal</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Incident Response */}
          <TabsContent value="incidents" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Incident Severity Levels
                </CardTitle>
                <CardDescription>
                  Classification and response times for incidents
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {incidentSeverities.map((sev) => (
                    <div key={sev.level} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <Badge variant={
                            sev.level === "SEV-1" ? "destructive" :
                            sev.level === "SEV-2" ? "default" :
                            sev.level === "SEV-3" ? "secondary" : "outline"
                          }>
                            {sev.level}
                          </Badge>
                          <h4 className="font-medium">{sev.name}</h4>
                        </div>
                        <Badge variant="outline">
                          <Clock className="h-3 w-3 mr-1" />
                          Response: {sev.response}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{sev.definition}</p>
                      <div className="grid md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Team: </span>
                          {sev.team}
                        </div>
                        <div>
                          <span className="text-muted-foreground">Communication: </span>
                          {sev.communication}
                        </div>
                        <div>
                          <span className="text-muted-foreground">Examples: </span>
                          {sev.examples.join(", ")}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <RotateCcw className="h-5 w-5" />
                  Rollback Strategies
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {rollbackStrategies.map((strategy) => (
                    <div key={strategy.layer} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <h4 className="font-medium">{strategy.layer}</h4>
                        <p className="text-sm text-muted-foreground">{strategy.method}</p>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline" className="mb-1">
                          <Clock className="h-3 w-3 mr-1" />
                          {strategy.time}
                        </Badge>
                        <p className="text-xs text-muted-foreground">{strategy.automation}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Incident Response Runbook</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-medium">1</div>
                    <div>
                      <h4 className="font-medium">Detect & Alert</h4>
                      <p className="text-sm text-muted-foreground">Automated monitoring triggers alert, on-call notified via PagerDuty</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-medium">2</div>
                    <div>
                      <h4 className="font-medium">Assess & Classify</h4>
                      <p className="text-sm text-muted-foreground">Determine severity level and impact scope</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-medium">3</div>
                    <div>
                      <h4 className="font-medium">Communicate</h4>
                      <p className="text-sm text-muted-foreground">Update status page, notify stakeholders per severity</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-medium">4</div>
                    <div>
                      <h4 className="font-medium">Mitigate</h4>
                      <p className="text-sm text-muted-foreground">Apply immediate fix or rollback to restore service</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-medium">5</div>
                    <div>
                      <h4 className="font-medium">Resolve</h4>
                      <p className="text-sm text-muted-foreground">Implement permanent fix, verify resolution</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-medium">6</div>
                    <div>
                      <h4 className="font-medium">Post-Mortem</h4>
                      <p className="text-sm text-muted-foreground">Blameless analysis within 48 hours, action items tracked</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Backup & Recovery */}
          <TabsContent value="backup" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Archive className="h-5 w-5" />
                  Backup Strategy
                </CardTitle>
                <CardDescription>
                  Comprehensive data protection and recovery capabilities
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Database className="h-4 w-4" /> Database
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Type:</span>
                        <span>{backupStrategy.database.type}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Retention:</span>
                        <span>{backupStrategy.database.retention}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Frequency:</span>
                        <span>{backupStrategy.database.frequency}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">RTO:</span>
                        <span className="text-green-600">{backupStrategy.database.rto}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">RPO:</span>
                        <span className="text-green-600">{backupStrategy.database.rpo}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Testing:</span>
                        <span>{backupStrategy.database.testing}</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <HardDrive className="h-4 w-4" /> Storage
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Type:</span>
                        <span>{backupStrategy.storage.type}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Retention:</span>
                        <span>{backupStrategy.storage.retention}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Frequency:</span>
                        <span>{backupStrategy.storage.frequency}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">RTO:</span>
                        <span className="text-green-600">{backupStrategy.storage.rto}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">RPO:</span>
                        <span className="text-green-600">{backupStrategy.storage.rpo}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Testing:</span>
                        <span>{backupStrategy.storage.testing}</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Cpu className="h-4 w-4" /> Configuration
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Type:</span>
                        <span>{backupStrategy.config.type}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Retention:</span>
                        <span>{backupStrategy.config.retention}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Frequency:</span>
                        <span>{backupStrategy.config.frequency}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">RTO:</span>
                        <span className="text-green-600">{backupStrategy.config.rto}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">RPO:</span>
                        <span className="text-green-600">{backupStrategy.config.rpo}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Testing:</span>
                        <span>{backupStrategy.config.testing}</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Disaster Recovery</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Recovery Time Objectives</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Core Services:</span>
                        <span className="text-green-600">{"<"} 1 hour</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Full Platform:</span>
                        <span className="text-green-600">{"<"} 4 hours</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Complete Data:</span>
                        <span className="text-green-600">{"<"} 24 hours</span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Recovery Point Objectives</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Transactional Data:</span>
                        <span className="text-green-600">{"<"} 5 minutes</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Analytics Data:</span>
                        <span className="text-green-600">{"<"} 1 hour</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Audit Logs:</span>
                        <span className="text-green-600">{"<"} 1 minute</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Data Retention Compliance</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <Alert>
                    <Shield className="h-4 w-4" />
                    <AlertDescription>
                      All retention policies comply with PDPA, GDPR, and educational data regulations
                    </AlertDescription>
                  </Alert>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tamper Events (Pilot):</span>
                      <span>30 days</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tamper Events (Prod):</span>
                      <span>90 days</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Audit Logs (Pilot):</span>
                      <span>30 days</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Audit Logs (Prod):</span>
                      <span>365 days</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Backups:</span>
                      <span>7-30 days</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Summary */}
        <Card className="bg-muted/30">
          <CardHeader>
            <CardTitle>Infrastructure Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-3xl font-bold text-primary">3</div>
                <div className="text-sm text-muted-foreground">Isolated Environments</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-primary">12</div>
                <div className="text-sm text-muted-foreground">CI/CD Pipeline Stages</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-primary">{"<"}1hr</div>
                <div className="text-sm text-muted-foreground">Recovery Time Target</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-primary">99.9%</div>
                <div className="text-sm text-muted-foreground">Uptime Target</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Infrastructure;
