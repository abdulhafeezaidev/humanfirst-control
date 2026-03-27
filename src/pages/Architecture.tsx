import { Link } from "react-router-dom";
import { 
  ArrowLeft, 
  Shield, 
  Users, 
  Building2, 
  Lock,
  Key,
  Database,
  Server,
  Layers,
  GitBranch,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Zap,
  Eye,
  FileText,
  Settings,
  Activity,
  BarChart3,
  Globe,
  HardDrive,
  Network,
  ShieldCheck,
  UserCheck,
  UserX,
  Scale,
  Gauge,
  TrendingUp,
  AlertCircle,
  Info
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import humanfirstLogo from "@/assets/humanfirst-logo.png";

const Architecture = () => {
  const roles = [
    {
      role: "super_admin",
      label: "Super Admin",
      color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
      description: "Full system access within organization. Can manage all settings, users, and configurations.",
      permissions: [
        { permission: "Manage Exam Policies", granted: true },
        { permission: "Manage AI Services", granted: true },
        { permission: "Toggle Enforcement", granted: true },
        { permission: "Manage User Roles", granted: true },
        { permission: "View Audit Logs", granted: true },
        { permission: "View Tamper Events", granted: true },
        { permission: "Resolve Tamper Events", granted: true },
        { permission: "Toggle Pilot Mode", granted: true },
        { permission: "Delete Users", granted: true },
        { permission: "Change Logging Settings", granted: true },
        { permission: "Access API Keys", granted: true },
        { permission: "Configure SSO", granted: true }
      ],
      count: "1-2 per organization",
      assignedBy: "System / Support"
    },
    {
      role: "admin",
      label: "Admin",
      color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
      description: "Day-to-day administrative access. Can manage policies and respond to events.",
      permissions: [
        { permission: "Manage Exam Policies", granted: true },
        { permission: "Manage AI Services", granted: true },
        { permission: "Toggle Enforcement", granted: false },
        { permission: "Manage User Roles", granted: false },
        { permission: "View Audit Logs", granted: true },
        { permission: "View Tamper Events", granted: true },
        { permission: "Resolve Tamper Events", granted: true },
        { permission: "Toggle Pilot Mode", granted: false },
        { permission: "Delete Users", granted: false },
        { permission: "Change Logging Settings", granted: false },
        { permission: "Access API Keys", granted: false },
        { permission: "Configure SSO", granted: false }
      ],
      count: "2-10 per organization",
      assignedBy: "Super Admin"
    },
    {
      role: "viewer",
      label: "Viewer",
      color: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
      description: "Read-only access for oversight and auditing. Cannot make changes.",
      permissions: [
        { permission: "Manage Exam Policies", granted: false },
        { permission: "Manage AI Services", granted: false },
        { permission: "Toggle Enforcement", granted: false },
        { permission: "Manage User Roles", granted: false },
        { permission: "View Audit Logs", granted: true },
        { permission: "View Tamper Events", granted: true },
        { permission: "Resolve Tamper Events", granted: false },
        { permission: "Toggle Pilot Mode", granted: false },
        { permission: "Delete Users", granted: false },
        { permission: "Change Logging Settings", granted: false },
        { permission: "Access API Keys", granted: false },
        { permission: "Configure SSO", granted: false }
      ],
      count: "Unlimited",
      assignedBy: "Super Admin / Admin"
    },
    {
      role: "student",
      label: "Student",
      color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
      description: "End-user with minimal permissions. Can view their own policies and status.",
      permissions: [
        { permission: "Manage Exam Policies", granted: false },
        { permission: "Manage AI Services", granted: false },
        { permission: "Toggle Enforcement", granted: false },
        { permission: "Manage User Roles", granted: false },
        { permission: "View Audit Logs", granted: false },
        { permission: "View Tamper Events", granted: false },
        { permission: "Resolve Tamper Events", granted: false },
        { permission: "Toggle Pilot Mode", granted: false },
        { permission: "Delete Users", granted: false },
        { permission: "Change Logging Settings", granted: false },
        { permission: "Access API Keys", granted: false },
        { permission: "Configure SSO", granted: false }
      ],
      count: "Based on plan limits",
      assignedBy: "Admin"
    }
  ];

  const tenantIsolationLayers = [
    {
      layer: "Database Layer",
      icon: Database,
      description: "Row-Level Security (RLS) enforces tenant isolation at the database level",
      mechanisms: [
        "All tables include organization_id foreign key",
        "RLS policies filter all queries by user's organization",
        "Security definer functions prevent policy bypass",
        "No cross-tenant data access possible via SQL"
      ],
      example: `-- Example RLS policy
CREATE POLICY "Users can only see their org data"
ON public.exam_policies
FOR SELECT USING (
  organization_id = public.get_user_organization(auth.uid())
);`
    },
    {
      layer: "Application Layer",
      icon: Layers,
      description: "Frontend and API enforce tenant context on all operations",
      mechanisms: [
        "User session includes organization context",
        "All API calls scoped to user's organization",
        "UI only displays tenant-specific data",
        "No URL manipulation can access other tenants"
      ],
      example: `// All queries include org filter
const { data } = await supabase
  .from('exam_policies')
  .select('*')
  // RLS automatically filters by org`
    },
    {
      layer: "Authentication Layer",
      icon: Key,
      description: "JWT tokens bind users to organizations with role claims",
      mechanisms: [
        "User role stored in separate user_roles table",
        "Organization membership verified on each request",
        "Session invalidation on role changes",
        "No shared credentials between tenants"
      ],
      example: `// Role check via security definer
SELECT public.has_role(auth.uid(), 'admin');
SELECT public.get_user_organization(auth.uid());`
    },
    {
      layer: "Network Layer",
      icon: Network,
      description: "API endpoints and edge functions enforce tenant boundaries",
      mechanisms: [
        "Edge functions verify organization context",
        "Rate limiting per organization and user",
        "Separate API quotas per tenant",
        "No direct database access from client"
      ],
      example: `// Edge function with org validation
const orgId = await getOrgFromUser(userId);
if (!orgId) throw new Error('Unauthorized');`
    }
  ];

  const rateLimits = [
    { action: "API Calls (general)", limit: "100/min", scope: "User", burst: "150" },
    { action: "Login Attempts", limit: "5/min", scope: "IP", burst: "10" },
    { action: "Policy Create/Update", limit: "10/min", scope: "User", burst: "20" },
    { action: "Tamper Event Ingestion", limit: "1000/min", scope: "Organization", burst: "2000" },
    { action: "Audit Log Queries", limit: "30/min", scope: "User", burst: "50" },
    { action: "Export Requests", limit: "5/hour", scope: "User", burst: "10" },
    { action: "Webhook Calls", limit: "100/min", scope: "Organization", burst: "200" }
  ];

  const auditedActions = [
    { action: "policy.create", description: "Exam policy created", severity: "info" },
    { action: "policy.update", description: "Exam policy modified", severity: "info" },
    { action: "policy.delete", description: "Exam policy deleted", severity: "warn" },
    { action: "policy.activate", description: "Exam policy activated", severity: "info" },
    { action: "enforcement.toggle", description: "Enforcement mode changed", severity: "warn" },
    { action: "pilot_mode.toggle", description: "Pilot mode toggled", severity: "warn" },
    { action: "user.role_change", description: "User role modified", severity: "warn" },
    { action: "user.delete", description: "User removed from organization", severity: "error" },
    { action: "user.invite", description: "User invited to organization", severity: "info" },
    { action: "settings.update", description: "Organization settings changed", severity: "info" },
    { action: "export.download", description: "Data export downloaded", severity: "info" },
    { action: "tamper.resolve", description: "Tamper event resolved", severity: "info" },
    { action: "ai_service.block", description: "AI service blocking updated", severity: "info" },
    { action: "auth.login", description: "Admin login", severity: "info" },
    { action: "auth.logout", description: "Admin logout", severity: "info" },
    { action: "auth.failed", description: "Failed login attempt", severity: "warn" }
  ];

  const faultContainment = [
    {
      fault: "Single Tenant Overload",
      description: "One organization generates excessive load (tamper events, API calls)",
      containment: [
        "Per-organization rate limiting",
        "Separate processing queues per tenant",
        "Circuit breaker on tenant operations",
        "Automatic throttling when thresholds exceeded"
      ],
      impact: "Other tenants unaffected"
    },
    {
      fault: "Database Connection Exhaustion",
      description: "Connection pool depleted by high-load operations",
      containment: [
        "Connection pooling with per-tenant quotas",
        "Query timeout limits (30s default)",
        "Read replicas for heavy queries",
        "Automatic connection recycling"
      ],
      impact: "Graceful degradation with retry"
    },
    {
      fault: "Data Corruption",
      description: "Malformed data or bug causes data integrity issues",
      containment: [
        "Transaction isolation per operation",
        "Foreign key constraints prevent orphans",
        "Audit trail enables rollback investigation",
        "Point-in-time recovery capability"
      ],
      impact: "Limited to affected tenant"
    },
    {
      fault: "Extension/Client Misbehavior",
      description: "Browser extension sends invalid or excessive data",
      containment: [
        "Input validation at API boundary",
        "Schema validation on all payloads",
        "Rate limiting per device ID",
        "Anomaly detection and alerting"
      ],
      impact: "Misbehaving client blocked"
    },
    {
      fault: "Admin Account Compromise",
      description: "Attacker gains access to admin credentials",
      containment: [
        "Session invalidation on password change",
        "Audit logging of all admin actions",
        "Alert on unusual access patterns",
        "Role-based access limits blast radius"
      ],
      impact: "Limited to compromised org"
    }
  ];

  const scaleAssumptions = {
    current: [
      { metric: "Organizations", limit: "100", notes: "Single database, shared compute" },
      { metric: "Users per Organization", limit: "5,000", notes: "Based on plan limits" },
      { metric: "Concurrent Sessions", limit: "10,000", notes: "Per organization" },
      { metric: "Tamper Events/Day", limit: "100,000", notes: "Per organization" },
      { metric: "Audit Log Entries/Day", limit: "50,000", notes: "Per organization" },
      { metric: "Active Exam Policies", limit: "50", notes: "Per organization" },
      { metric: "API Requests/Second", limit: "1,000", notes: "Across all tenants" }
    ],
    future: [
      { 
        phase: "Phase 1: Vertical Scaling",
        trigger: "> 100 organizations",
        changes: [
          "Upgrade database tier",
          "Add read replicas",
          "Implement caching layer (Redis)",
          "CDN for static assets"
        ]
      },
      { 
        phase: "Phase 2: Service Isolation",
        trigger: "> 500 organizations",
        changes: [
          "Separate tamper event processing service",
          "Dedicated audit log database",
          "Background job queue (Temporal/BullMQ)",
          "Edge function auto-scaling"
        ]
      },
      { 
        phase: "Phase 3: Physical Tenant Isolation",
        trigger: "Enterprise customers or compliance requirements",
        changes: [
          "Dedicated database per enterprise tenant",
          "Isolated compute resources",
          "Dedicated edge function deployments",
          "Data residency compliance (region-specific)"
        ]
      }
    ]
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/" className="flex items-center gap-2">
                <img src={humanfirstLogo} alt="HumanFirst" className="w-8 h-8 object-contain" />
                <span className="font-semibold">HumanFirst</span>
              </Link>
              <Badge variant="outline" className="text-xs">Architecture</Badge>
            </div>
            <div className="flex items-center gap-2">
              <Link to="/threats">
                <Button variant="ghost" size="sm">Threat Model</Button>
              </Link>
              <Link to="/trust">
                <Button variant="ghost" size="sm">Trust Center</Button>
              </Link>
              <Link to="/">
                <Button variant="outline" size="sm" className="gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  Home
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Hero */}
        <div className="text-center mb-12">
          <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">
            <Layers className="w-3 h-3 mr-1" />
            Technical Documentation
          </Badge>
          <h1 className="text-3xl md:text-4xl font-bold mb-4">
            Multi-Tenant Architecture
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Strong tenant isolation, role-based access control, and fault containment
          </p>
        </div>

        <Tabs defaultValue="isolation" className="w-full">
          <TabsList className="mb-8 flex-wrap h-auto">
            <TabsTrigger value="isolation" className="gap-2">
              <Shield className="w-4 h-4" />
              Tenant Isolation
            </TabsTrigger>
            <TabsTrigger value="rbac" className="gap-2">
              <Users className="w-4 h-4" />
              RBAC
            </TabsTrigger>
            <TabsTrigger value="ratelimit" className="gap-2">
              <Gauge className="w-4 h-4" />
              Rate Limiting
            </TabsTrigger>
            <TabsTrigger value="audit" className="gap-2">
              <FileText className="w-4 h-4" />
              Audit Logging
            </TabsTrigger>
            <TabsTrigger value="fault" className="gap-2">
              <AlertCircle className="w-4 h-4" />
              Fault Containment
            </TabsTrigger>
            <TabsTrigger value="scale" className="gap-2">
              <TrendingUp className="w-4 h-4" />
              Scale
            </TabsTrigger>
          </TabsList>

          {/* Tenant Isolation Tab */}
          <TabsContent value="isolation">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-primary" />
                    Multi-Tenant Model
                  </CardTitle>
                  <CardDescription>
                    HumanFirst uses a shared-infrastructure, logically-isolated multi-tenant architecture
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold mb-3">Tenant = Organization</h4>
                      <p className="text-sm text-muted-foreground mb-4">
                        Each organization (university, college, training provider) is a tenant with:
                      </p>
                      <ul className="space-y-2 text-sm">
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-success" />
                          Unique organization ID (UUID)
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-success" />
                          Separate user namespace
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-success" />
                          Independent policies and configurations
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-success" />
                          Isolated data with RLS enforcement
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-success" />
                          Plan-based feature and limit controls
                        </li>
                      </ul>
                    </div>
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <h4 className="font-semibold mb-3">Data Isolation Guarantee</h4>
                      <p className="text-sm text-muted-foreground">
                        Every table containing tenant data includes an <code className="bg-muted px-1 rounded">organization_id</code> column 
                        with Row-Level Security policies that prevent any cross-tenant data access. 
                        This is enforced at the database level, making bypass impossible even with 
                        application bugs.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="grid gap-6">
                {tenantIsolationLayers.map((layer, index) => (
                  <Card key={index}>
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <layer.icon className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{layer.layer}</CardTitle>
                          <CardDescription>{layer.description}</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid md:grid-cols-2 gap-6">
                        <div>
                          <h4 className="font-semibold text-sm mb-2">Mechanisms</h4>
                          <ul className="space-y-2">
                            {layer.mechanisms.map((mech, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                                <CheckCircle2 className="w-4 h-4 text-success mt-0.5 shrink-0" />
                                {mech}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <h4 className="font-semibold text-sm mb-2">Example</h4>
                          <pre className="text-xs bg-muted p-3 rounded-lg overflow-x-auto">
                            <code>{layer.example}</code>
                          </pre>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* RBAC Tab */}
          <TabsContent value="rbac">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-primary" />
                    Role-Based Access Control
                  </CardTitle>
                  <CardDescription>
                    Four distinct roles with clear permission boundaries
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="p-4 bg-primary/5 rounded-lg border border-primary/20 mb-4">
                    <div className="flex items-start gap-3">
                      <Info className="w-5 h-5 text-primary mt-0.5" />
                      <div className="text-sm">
                        <strong>Security Note:</strong> Roles are stored in a separate <code className="bg-muted px-1 rounded">user_roles</code> table, 
                        not in user profiles. This prevents privilege escalation attacks where users could modify their own role.
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {roles.map((role, index) => (
                <Card key={index}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Badge className={role.color}>{role.label}</Badge>
                        <span className="text-sm text-muted-foreground">{role.count}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">Assigned by: {role.assignedBy}</span>
                    </div>
                    <CardDescription className="mt-2">{role.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {role.permissions.map((perm, i) => (
                        <div 
                          key={i}
                          className={`flex items-center gap-2 text-xs p-2 rounded ${
                            perm.granted 
                              ? "bg-success/10 text-success" 
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {perm.granted 
                            ? <CheckCircle2 className="w-3 h-3" />
                            : <XCircle className="w-3 h-3" />
                          }
                          {perm.permission}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}

              <Card className="border-warning/20 bg-warning/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-warning">
                    <AlertTriangle className="w-5 h-5" />
                    Permission Enforcement
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold mb-2">Client-Side (UI)</h4>
                      <ul className="space-y-1 text-sm text-muted-foreground">
                        <li>• Hide UI elements user cannot access</li>
                        <li>• Disable buttons for unauthorized actions</li>
                        <li>• Route guards on admin pages</li>
                        <li>• Permission checks before rendering</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">Server-Side (RLS + Functions)</h4>
                      <ul className="space-y-1 text-sm text-muted-foreground">
                        <li>• RLS policies check role on every query</li>
                        <li>• Security definer functions verify permissions</li>
                        <li>• Edge functions validate before processing</li>
                        <li>• <strong>This is the actual security boundary</strong></li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Rate Limiting Tab */}
          <TabsContent value="ratelimit">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Gauge className="w-5 h-5 text-primary" />
                    Rate Limiting Strategy
                  </CardTitle>
                  <CardDescription>
                    Multi-level rate limiting to prevent abuse and ensure fair resource allocation
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Action</TableHead>
                          <TableHead>Limit</TableHead>
                          <TableHead>Scope</TableHead>
                          <TableHead>Burst Allowance</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rateLimits.map((limit, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">{limit.action}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{limit.limit}</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary">{limit.scope}</Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground">{limit.burst}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              <div className="grid md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Implementation</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="font-semibold text-sm mb-2">Database Function</h4>
                      <pre className="text-xs bg-muted p-3 rounded-lg overflow-x-auto">
{`-- Check and increment rate limit
SELECT check_rate_limit(
  user_id::text,  -- identifier
  'user',         -- type
  'api_call',     -- action
  100             -- limit per window
);`}
                      </pre>
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm mb-2">Sliding Window</h4>
                      <p className="text-sm text-muted-foreground">
                        Uses 1-minute windows with request counting. Exceeding limits returns 
                        429 Too Many Requests with retry-after header.
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Response Handling</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <h4 className="font-semibold text-sm mb-1">Under Limit</h4>
                      <p className="text-xs text-muted-foreground">Request proceeds normally</p>
                    </div>
                    <div className="p-3 bg-warning/10 rounded-lg border border-warning/20">
                      <h4 className="font-semibold text-sm mb-1">Approaching Limit (80%)</h4>
                      <p className="text-xs text-muted-foreground">Warning header added to response</p>
                    </div>
                    <div className="p-3 bg-destructive/10 rounded-lg border border-destructive/20">
                      <h4 className="font-semibold text-sm mb-1">Limit Exceeded</h4>
                      <p className="text-xs text-muted-foreground">429 response with retry-after</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Audit Logging Tab */}
          <TabsContent value="audit">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary" />
                    Admin Action Logging
                  </CardTitle>
                  <CardDescription>
                    Comprehensive audit trail for all administrative actions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-3 gap-4 mb-6">
                    <div className="p-4 bg-muted/50 rounded-lg text-center">
                      <div className="text-2xl font-bold text-primary">100%</div>
                      <p className="text-sm text-muted-foreground">Admin actions logged</p>
                    </div>
                    <div className="p-4 bg-muted/50 rounded-lg text-center">
                      <div className="text-2xl font-bold text-primary">90 days</div>
                      <p className="text-sm text-muted-foreground">Default retention</p>
                    </div>
                    <div className="p-4 bg-muted/50 rounded-lg text-center">
                      <div className="text-2xl font-bold text-primary">Immutable</div>
                      <p className="text-sm text-muted-foreground">Write-once, no deletion</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Audited Actions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Action Code</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Severity</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {auditedActions.map((action, index) => (
                          <TableRow key={index}>
                            <TableCell>
                              <code className="text-xs bg-muted px-2 py-1 rounded">{action.action}</code>
                            </TableCell>
                            <TableCell>{action.description}</TableCell>
                            <TableCell>
                              <Badge variant={
                                action.severity === "error" ? "destructive" :
                                action.severity === "warn" ? "outline" : "secondary"
                              }>
                                {action.severity}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Audit Log Entry Schema</CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="text-xs bg-muted p-4 rounded-lg overflow-x-auto">
{`{
  "id": "uuid",
  "action": "policy.create",
  "actor_id": "user-uuid",
  "target": "exam_policies",
  "target_id": "policy-uuid",
  "organization_id": "org-uuid",
  "timestamp": "2025-01-19T12:00:00Z",
  "metadata": {
    "severity": "info",
    "timestamp_ms": 1737288000000,
    "changes": {
      "title": { "from": null, "to": "Midterm Exam" }
    },
    "ip_hash": "sha256:abc123...",
    "user_agent": "Mozilla/5.0..."
  }
}`}
                  </pre>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Fault Containment Tab */}
          <TabsContent value="fault">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-primary" />
                    Fault Containment Strategies
                  </CardTitle>
                  <CardDescription>
                    How we prevent failures in one tenant from affecting others
                  </CardDescription>
                </CardHeader>
              </Card>

              {faultContainment.map((fault, index) => (
                <Card key={index}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Zap className="w-4 h-4 text-warning" />
                        {fault.fault}
                      </CardTitle>
                      <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                        {fault.impact}
                      </Badge>
                    </div>
                    <CardDescription>{fault.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <h4 className="font-semibold text-sm mb-2">Containment Measures</h4>
                    <ul className="grid md:grid-cols-2 gap-2">
                      {fault.containment.map((measure, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Shield className="w-4 h-4 text-primary shrink-0" />
                          {measure}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}

              <Card className="bg-gradient-to-br from-primary/5 to-transparent">
                <CardHeader>
                  <CardTitle>Blast Radius Minimization</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="text-center p-4">
                      <div className="w-16 h-16 mx-auto bg-success/10 rounded-full flex items-center justify-center mb-2">
                        <Shield className="w-8 h-8 text-success" />
                      </div>
                      <h4 className="font-semibold">Tenant Boundary</h4>
                      <p className="text-xs text-muted-foreground">Faults cannot cross organization boundaries</p>
                    </div>
                    <div className="text-center p-4">
                      <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center mb-2">
                        <Layers className="w-8 h-8 text-primary" />
                      </div>
                      <h4 className="font-semibold">Layer Isolation</h4>
                      <p className="text-xs text-muted-foreground">Database, app, and network layers fail independently</p>
                    </div>
                    <div className="text-center p-4">
                      <div className="w-16 h-16 mx-auto bg-warning/10 rounded-full flex items-center justify-center mb-2">
                        <Activity className="w-8 h-8 text-warning" />
                      </div>
                      <h4 className="font-semibold">Graceful Degradation</h4>
                      <p className="text-xs text-muted-foreground">Core functions remain available during partial outages</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Scale Tab */}
          <TabsContent value="scale">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-primary" />
                    Current Scale Assumptions
                  </CardTitle>
                  <CardDescription>
                    Design limits for the current shared-infrastructure model
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Metric</TableHead>
                          <TableHead>Current Limit</TableHead>
                          <TableHead>Notes</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {scaleAssumptions.current.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">{item.metric}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{item.limit}</Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">{item.notes}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              <div className="grid gap-6">
                {scaleAssumptions.future.map((phase, index) => (
                  <Card key={index} className={index === 2 ? "border-primary/30" : ""}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{phase.phase}</CardTitle>
                        <Badge variant={index === 2 ? "default" : "secondary"}>
                          Trigger: {phase.trigger}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <ul className="grid md:grid-cols-2 gap-2">
                        {phase.changes.map((change, i) => (
                          <li key={i} className="flex items-center gap-2 text-sm">
                            <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                            {change}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Card className="bg-gradient-to-br from-purple-500/5 to-primary/5 border-primary/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <HardDrive className="w-5 h-5 text-primary" />
                    Physical Isolation Options (Enterprise)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold mb-3">Dedicated Database</h4>
                      <ul className="space-y-2 text-sm text-muted-foreground">
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-success mt-0.5" />
                          Separate PostgreSQL instance per enterprise tenant
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-success mt-0.5" />
                          Complete data isolation at infrastructure level
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-success mt-0.5" />
                          Custom backup and retention policies
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-success mt-0.5" />
                          Independent scaling and performance tuning
                        </li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-3">Data Residency Compliance</h4>
                      <ul className="space-y-2 text-sm text-muted-foreground">
                        <li className="flex items-start gap-2">
                          <Globe className="w-4 h-4 text-primary mt-0.5" />
                          Region-specific deployment (EU, APAC, etc.)
                        </li>
                        <li className="flex items-start gap-2">
                          <Globe className="w-4 h-4 text-primary mt-0.5" />
                          GDPR Article 28 compliance capability
                        </li>
                        <li className="flex items-start gap-2">
                          <Globe className="w-4 h-4 text-primary mt-0.5" />
                          Dedicated edge functions in same region
                        </li>
                        <li className="flex items-start gap-2">
                          <Globe className="w-4 h-4 text-primary mt-0.5" />
                          Audit trail for data location
                        </li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-6 mt-12">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© 2025 HumanFirst. Architecture documentation for technical review.</p>
        </div>
      </footer>
    </div>
  );
};

export default Architecture;
