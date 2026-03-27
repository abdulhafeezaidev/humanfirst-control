import { Link } from "react-router-dom";
import { 
  ArrowLeft, 
  Shield, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle,
  Wifi,
  Smartphone,
  User,
  Target,
  Zap,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Globe,
  Server,
  Monitor,
  Key,
  Users,
  Clock,
  TrendingUp,
  FileWarning,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Info,
  HelpCircle,
  Layers,
  Network,
  Cpu,
  Chrome
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import humanfirstLogo from "@/assets/humanfirst-logo.png";

interface Threat {
  id: string;
  name: string;
  description: string;
  category: "network" | "device" | "account";
  likelihood: "Low" | "Medium" | "High" | "Very High";
  impact: "Low" | "Medium" | "High" | "Very High";
  riskScore: number;
  attackVector: string;
  mitigations: string[];
  detection: string;
  privacyNote: string;
}

const ThreatModel = () => {
  const threats: Threat[] = [
    // Network-Level Threats
    {
      id: "NET-001",
      name: "VPN/Proxy Bypass",
      description: "Student routes traffic through VPN or proxy to access blocked AI services from a different network location.",
      category: "network",
      likelihood: "High",
      impact: "High",
      riskScore: 9,
      attackVector: "Student installs VPN client or uses browser-based proxy to tunnel requests, bypassing DNS-level or network-level blocks.",
      mitigations: [
        "Block known VPN/proxy service domains at browser extension level",
        "Detect common VPN browser extensions and flag as configuration issue",
        "Use multiple detection layers (DNS + direct IP + extension)",
        "Provide clear policy stating VPN use during exams is prohibited"
      ],
      detection: "Extension detects VPN extension presence; unusual network patterns flagged",
      privacyNote: "We detect VPN presence, not VPN traffic content. No deep packet inspection."
    },
    {
      id: "NET-002",
      name: "DNS Manipulation",
      description: "Student modifies local DNS settings to resolve blocked domains to alternative servers.",
      category: "network",
      likelihood: "Medium",
      impact: "High",
      riskScore: 7,
      attackVector: "Modify hosts file or DNS settings to point blocked AI domains to mirror servers or localhost tunnels.",
      mitigations: [
        "Extension validates responses from known AI service endpoints",
        "Check for domain resolution anomalies (expected vs actual IPs)",
        "Block based on response content patterns, not just domain names",
        "Rate-limit unusual resolution patterns"
      ],
      detection: "Response validation fails; domain-IP mismatch detected",
      privacyNote: "We check if domains resolve correctly, not what content is accessed."
    },
    {
      id: "NET-003",
      name: "Alternative AI Mirror Access",
      description: "Student accesses AI services through unofficial mirrors, self-hosted instances, or API wrappers.",
      category: "network",
      likelihood: "Medium",
      impact: "High",
      riskScore: 7,
      attackVector: "Use third-party sites hosting AI interfaces, personal API deployments, or browser extensions that proxy to AI services.",
      mitigations: [
        "Maintain blocklist of known AI mirror domains",
        "Crowdsource mirror discovery through admin reporting",
        "Use heuristic detection for AI-like response patterns",
        "Block general-purpose API proxy services during exams"
      ],
      detection: "Known mirror domain access; heuristic pattern matching",
      privacyNote: "We block domains, not analyze response content for AI detection."
    },
    {
      id: "NET-004",
      name: "Mobile Hotspot Switching",
      description: "Student disconnects from monitored network and uses personal mobile hotspot without detection.",
      category: "network",
      likelihood: "High",
      impact: "Medium",
      riskScore: 6,
      attackVector: "Switch to mobile data or personal hotspot to access AI services from unmonitored network.",
      mitigations: [
        "Extension operates at browser level, independent of network",
        "Maintain blocking regardless of network changes",
        "Detect network change events and log (not content)",
        "Policy enforcement at browser, not network layer"
      ],
      detection: "Network change event logged; blocking continues regardless",
      privacyNote: "We log that network changed, not which network or its details."
    },

    // Device-Level Threats
    {
      id: "DEV-001",
      name: "Extension Disable/Uninstall",
      description: "Student disables or uninstalls the HumanFirst browser extension during an exam.",
      category: "device",
      likelihood: "High",
      impact: "High",
      riskScore: 9,
      attackVector: "Right-click extension icon → Remove, or navigate to chrome://extensions and disable.",
      mitigations: [
        "Heartbeat monitoring detects extension absence within 30 seconds",
        "Admin dashboard shows real-time extension health",
        "Session marked as 'extension disconnected' immediately",
        "Enterprise deployment can use Chrome policies to prevent removal"
      ],
      detection: "Heartbeat failure triggers immediate tamper event",
      privacyNote: "We detect extension presence, not browser activity during absence."
    },
    {
      id: "DEV-002",
      name: "Second Browser Usage",
      description: "Student opens a different browser without the extension to access AI services.",
      category: "device",
      likelihood: "High",
      impact: "High",
      riskScore: 9,
      attackVector: "Open Firefox/Edge/Safari while Chrome with extension remains open but unused.",
      mitigations: [
        "Detect window focus loss from monitored browser",
        "Log extended periods of inactivity on exam page",
        "Clear policy communication about single-browser requirement",
        "LMS can detect submission patterns (rapid answers after long pauses)"
      ],
      detection: "Focus loss events; extended inactivity periods flagged",
      privacyNote: "We detect focus left monitored browser, not what other app was used."
    },
    {
      id: "DEV-003",
      name: "Second Device Usage",
      description: "Student uses a phone, tablet, or second computer to access AI services.",
      category: "device",
      likelihood: "Very High",
      impact: "High",
      riskScore: 10,
      attackVector: "Simply pick up phone or use nearby laptop to query AI, type answers back on monitored device.",
      mitigations: [
        "OUT OF SCOPE for HumanFirst - requires invasive webcam monitoring",
        "Policy-based mitigation: clear communication of honor code",
        "Exam design mitigation: time limits that make multi-device impractical",
        "Institutional option: proctored exam rooms for high-stakes assessments"
      ],
      detection: "Cannot detect without invasive monitoring (webcam/room scanning)",
      privacyNote: "We explicitly do NOT attempt to detect this. It would require surveillance."
    },
    {
      id: "DEV-004",
      name: "Extension Tampering/Modification",
      description: "Student modifies extension code to disable blocking functionality.",
      category: "device",
      likelihood: "Low",
      impact: "High",
      riskScore: 5,
      attackVector: "Load unpacked extension after modifying source, or use developer tools to alter runtime behavior.",
      mitigations: [
        "Extension integrity verification on each load",
        "Server-side validation of extension version and hash",
        "Detect developer mode/unpacked extension loading",
        "Heartbeat includes integrity checksum"
      ],
      detection: "Integrity check failure; version mismatch; developer mode detection",
      privacyNote: "We verify our extension integrity, not inspect other extensions."
    },
    {
      id: "DEV-005",
      name: "Virtual Machine Evasion",
      description: "Student runs exam in VM while accessing AI services on host machine.",
      category: "device",
      likelihood: "Low",
      impact: "High",
      riskScore: 4,
      attackVector: "Run browser in VM with extension, access AI on host, copy/paste through shared clipboard.",
      mitigations: [
        "Detect common VM indicators (but not block - many legitimate uses)",
        "Flag VM usage for admin awareness, not automatic penalty",
        "Time-based analysis: VM setups take effort, deter casual cheaters",
        "Policy documentation: VM usage during exams prohibited"
      ],
      detection: "VM environment indicators detected and logged",
      privacyNote: "We detect VM presence, not host machine activity."
    },

    // Account-Level Threats
    {
      id: "ACC-001",
      name: "Account Sharing",
      description: "Student shares credentials with another person who takes the exam on their behalf.",
      category: "account",
      likelihood: "Medium",
      impact: "High",
      riskScore: 7,
      attackVector: "Share login credentials; proxy test-taker completes exam from different location/device.",
      mitigations: [
        "Device binding: flag when same account appears on new device",
        "Geolocation anomalies: flag distant location changes (not block)",
        "LMS integration: compare IP patterns with historical access",
        "Policy enforcement: clear academic integrity consequences"
      ],
      detection: "New device ID; significant location change; unusual access pattern",
      privacyNote: "We track device IDs (hashed), not precise location or IP addresses."
    },
    {
      id: "ACC-002",
      name: "Session Hijacking",
      description: "Attacker intercepts student session to manipulate exam or inject answers.",
      category: "account",
      likelihood: "Low",
      impact: "High",
      riskScore: 4,
      attackVector: "Man-in-the-middle attack; session token theft; XSS exploitation.",
      mitigations: [
        "HTTPS-only with strict transport security",
        "Session tokens with short expiry and rotation",
        "Device binding for session validation",
        "CSP headers preventing XSS"
      ],
      detection: "Session-device mismatch; token anomalies; concurrent session alerts",
      privacyNote: "Standard security practices, no additional user monitoring required."
    },
    {
      id: "ACC-003",
      name: "Admin Account Compromise",
      description: "Attacker gains access to admin account to modify policies or access data.",
      category: "account",
      likelihood: "Low",
      impact: "Very High",
      riskScore: 8,
      attackVector: "Phishing, credential stuffing, social engineering targeting administrators.",
      mitigations: [
        "Require MFA for all admin accounts",
        "Audit logging of all policy changes",
        "Role-based access control with least privilege",
        "Alert on unusual admin activity patterns"
      ],
      detection: "Audit log review; unusual policy changes; access from new locations",
      privacyNote: "Admin activity is logged for security; student data access is audited."
    },
    {
      id: "ACC-004",
      name: "Privilege Escalation",
      description: "Student or viewer attempts to gain admin privileges to disable monitoring.",
      category: "account",
      likelihood: "Low",
      impact: "Very High",
      riskScore: 6,
      attackVector: "Exploit RLS policy gaps; API manipulation; role assignment vulnerabilities.",
      mitigations: [
        "Strict RLS policies on all tables",
        "Server-side role verification for all admin actions",
        "Regular security audits of permission model",
        "Separation of role assignment from regular admin functions"
      ],
      detection: "Failed privilege escalation attempts logged; anomaly detection",
      privacyNote: "Security logging only; no impact on student privacy."
    }
  ];

  const integrityStates = [
    {
      state: "Green",
      label: "Normal",
      icon: ShieldCheck,
      color: "text-success",
      bgColor: "bg-success/10",
      borderColor: "border-success/30",
      description: "No integrity concerns detected. Extension active, policies enforced, no tamper events.",
      signals: [
        "Extension heartbeat active and healthy",
        "No blocked access attempts in session",
        "Consistent focus on exam window",
        "Device ID matches registered device",
        "No policy violations detected"
      ],
      adminAction: "No action required. Standard monitoring."
    },
    {
      state: "Amber",
      label: "Attention Needed",
      icon: ShieldAlert,
      color: "text-warning",
      bgColor: "bg-warning/10",
      borderColor: "border-warning/30",
      description: "Potential integrity concern detected. May be benign but warrants attention.",
      signals: [
        "Blocked AI access attempt detected (1-2 attempts)",
        "Extended focus loss from exam window (>30 seconds)",
        "Network change detected during exam",
        "New device ID for existing account",
        "Extension reconnected after brief disconnection",
        "VM environment detected"
      ],
      adminAction: "Review tamper log. May require follow-up with student. Do not assume violation."
    },
    {
      state: "Red",
      label: "Integrity Alert",
      icon: ShieldX,
      color: "text-destructive",
      bgColor: "bg-destructive/10",
      borderColor: "border-destructive/30",
      description: "Significant integrity concern detected. Likely requires investigation.",
      signals: [
        "Multiple blocked AI access attempts (3+)",
        "Extension disabled/uninstalled during exam",
        "Extension integrity check failed",
        "Concurrent session from different device",
        "Persistent focus loss (>5 minutes cumulative)",
        "VPN detected and active during exam",
        "Known evasion pattern detected"
      ],
      adminAction: "Flag for academic integrity review. Collect evidence pack. Contact student for explanation."
    }
  ];

  const scopeItems = {
    inScope: [
      {
        item: "AI Assistant Blocking",
        description: "Block access to ChatGPT, Claude, Gemini, and other AI assistants during exams",
        how: "Domain and URL pattern blocking at browser extension level"
      },
      {
        item: "Focus Change Detection",
        description: "Detect when student leaves the exam browser window or tab",
        how: "Browser visibility API events, logged as focus_lost/focus_gained"
      },
      {
        item: "Extension Health Monitoring",
        description: "Verify that the extension remains active during exam sessions",
        how: "Periodic heartbeat to server, tampering triggers immediate alert"
      },
      {
        item: "Device Binding",
        description: "Associate student accounts with specific devices to detect account sharing",
        how: "Hashed device fingerprint (no PII), flag on new device appearance"
      },
      {
        item: "Policy Transparency",
        description: "Ensure students always know what is being monitored and blocked",
        how: "Student dashboard shows active policies, blocked categories, and all logged events"
      },
      {
        item: "Tamper Event Logging",
        description: "Log integrity-relevant events for admin review",
        how: "Timestamp, event type, device ID - no content, no keystrokes, no screenshots"
      },
      {
        item: "VPN/Proxy Detection",
        description: "Detect presence of VPN or proxy tools that could bypass blocking",
        how: "Extension presence detection, not traffic inspection"
      }
    ],
    outOfScope: [
      {
        item: "Second Device Detection",
        description: "Detecting if a student uses a phone or second computer",
        why: "Would require webcam/room monitoring - violates our privacy principles",
        alternative: "Policy-based: honor code, exam design, proctored rooms for high-stakes"
      },
      {
        item: "Screen Recording",
        description: "Recording or capturing student's screen during exams",
        why: "Invasive surveillance; captures personal information visible on screen",
        alternative: "Focus detection provides sufficient signal without content capture"
      },
      {
        item: "Webcam/Microphone Access",
        description: "Recording video or audio of students during exams",
        why: "Core privacy violation; disproportionate to integrity goals",
        alternative: "In-person proctoring for highest-stakes assessments"
      },
      {
        item: "Keystroke Logging",
        description: "Recording what students type during exams",
        why: "Captures sensitive content; enables extensive profiling",
        alternative: "AI blocking at access point, not content analysis"
      },
      {
        item: "Biometric Collection",
        description: "Facial recognition, eye tracking, or other biometrics",
        why: "Highest-risk personal data; discrimination concerns; regulatory issues",
        alternative: "None needed - not aligned with trust-based approach"
      },
      {
        item: "AI Cheating Accusations",
        description: "Automated determination that a student used AI to cheat",
        why: "High false positive rates; unfair to students; legal liability",
        alternative: "Provide evidence to instructors; humans make integrity decisions"
      },
      {
        item: "Content Analysis",
        description: "Reading or analyzing what students type, paste, or submit",
        why: "Invasive; captures all content including personal thoughts",
        alternative: "Instructors review submissions; we only enforce access controls"
      },
      {
        item: "Background Application Monitoring",
        description: "Tracking which applications are running on student's computer",
        why: "Excessive surveillance; captures personal application usage",
        alternative: "Browser-level focus detection only"
      }
    ]
  };

  const getLikelihoodColor = (likelihood: string) => {
    switch (likelihood) {
      case "Very High":
      case "High":
        return "bg-destructive/10 text-destructive border-destructive/30";
      case "Medium":
        return "bg-warning/10 text-warning border-warning/30";
      case "Low":
        return "bg-success/10 text-success border-success/30";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case "Very High":
      case "High":
        return "bg-destructive/10 text-destructive border-destructive/30";
      case "Medium":
        return "bg-warning/10 text-warning border-warning/30";
      case "Low":
        return "bg-success/10 text-success border-success/30";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getRiskColor = (score: number) => {
    if (score >= 8) return "bg-destructive text-destructive-foreground";
    if (score >= 5) return "bg-warning text-warning-foreground";
    return "bg-success text-success-foreground";
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "network":
        return Network;
      case "device":
        return Cpu;
      case "account":
        return User;
      default:
        return Shield;
    }
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
              <Badge variant="outline" className="text-xs">Threat Model</Badge>
            </div>
            <div className="flex items-center gap-2">
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
            <Shield className="w-3 h-3 mr-1" />
            Security Documentation
          </Badge>
          <h1 className="text-3xl md:text-4xl font-bold mb-4">
            HumanFirst Threat Model
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Comprehensive analysis of bypass attempts and mitigation strategies 
            <strong className="text-foreground"> without invasive monitoring</strong>
          </p>
        </div>

        <Tabs defaultValue="threats" className="w-full">
          <TabsList className="mb-8 flex-wrap h-auto">
            <TabsTrigger value="threats" className="gap-2">
              <AlertTriangle className="w-4 h-4" />
              Threat Analysis
            </TabsTrigger>
            <TabsTrigger value="states" className="gap-2">
              <Shield className="w-4 h-4" />
              Integrity States
            </TabsTrigger>
            <TabsTrigger value="scope" className="gap-2">
              <Target className="w-4 h-4" />
              Scope Definition
            </TabsTrigger>
          </TabsList>

          {/* Threats Tab */}
          <TabsContent value="threats">
            <div className="space-y-8">
              {/* Risk Matrix Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-primary" />
                    Risk Matrix Overview
                  </CardTitle>
                  <CardDescription>
                    Threats categorized by likelihood and impact
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>ID</TableHead>
                          <TableHead>Threat</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead className="text-center">Likelihood</TableHead>
                          <TableHead className="text-center">Impact</TableHead>
                          <TableHead className="text-center">Risk</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {threats.sort((a, b) => b.riskScore - a.riskScore).map((threat) => {
                          const CategoryIcon = getCategoryIcon(threat.category);
                          return (
                            <TableRow key={threat.id}>
                              <TableCell className="font-mono text-sm">{threat.id}</TableCell>
                              <TableCell className="font-medium">{threat.name}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className="gap-1">
                                  <CategoryIcon className="w-3 h-3" />
                                  {threat.category}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge variant="outline" className={getLikelihoodColor(threat.likelihood)}>
                                  {threat.likelihood}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge variant="outline" className={getImpactColor(threat.impact)}>
                                  {threat.impact}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge className={getRiskColor(threat.riskScore)}>
                                  {threat.riskScore}/10
                                </Badge>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {/* Detailed Threat Cards by Category */}
              {["network", "device", "account"].map((category) => {
                const categoryThreats = threats.filter((t) => t.category === category);
                const CategoryIcon = getCategoryIcon(category);
                const categoryLabels: Record<string, string> = {
                  network: "Network-Level Threats",
                  device: "Device-Level Threats",
                  account: "Account-Level Threats"
                };

                return (
                  <div key={category}>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <CategoryIcon className="w-5 h-5 text-primary" />
                      </div>
                      <h2 className="text-xl font-bold">{categoryLabels[category]}</h2>
                      <Badge variant="secondary">{categoryThreats.length} threats</Badge>
                    </div>

                    <Accordion type="single" collapsible className="space-y-4 mb-8">
                      {categoryThreats.map((threat) => (
                        <AccordionItem 
                          key={threat.id} 
                          value={threat.id}
                          className="border rounded-lg px-4"
                        >
                          <AccordionTrigger className="hover:no-underline py-4">
                            <div className="flex items-center gap-4 text-left flex-1">
                              <Badge className={getRiskColor(threat.riskScore)}>
                                {threat.riskScore}/10
                              </Badge>
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-xs text-muted-foreground">{threat.id}</span>
                                  <span className="font-semibold">{threat.name}</span>
                                </div>
                                <p className="text-sm text-muted-foreground mt-1">{threat.description}</p>
                              </div>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="pt-2 pb-4 space-y-4">
                            <div className="grid md:grid-cols-2 gap-4">
                              <div>
                                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                                  <Zap className="w-4 h-4 text-destructive" />
                                  Attack Vector
                                </h4>
                                <p className="text-sm text-muted-foreground">{threat.attackVector}</p>
                              </div>
                              <div>
                                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                                  <Eye className="w-4 h-4 text-primary" />
                                  Detection Method
                                </h4>
                                <p className="text-sm text-muted-foreground">{threat.detection}</p>
                              </div>
                            </div>

                            <div>
                              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                                <Shield className="w-4 h-4 text-success" />
                                Mitigations
                              </h4>
                              <ul className="space-y-1">
                                {threat.mitigations.map((mitigation, i) => (
                                  <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                                    <CheckCircle2 className="w-4 h-4 text-success mt-0.5 shrink-0" />
                                    {mitigation}
                                  </li>
                                ))}
                              </ul>
                            </div>

                            <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
                              <h4 className="font-semibold text-sm mb-1 flex items-center gap-2">
                                <EyeOff className="w-4 h-4 text-primary" />
                                Privacy Note
                              </h4>
                              <p className="text-sm text-muted-foreground">{threat.privacyNote}</p>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </div>
                );
              })}
            </div>
          </TabsContent>

          {/* Integrity States Tab */}
          <TabsContent value="states">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Admin-Visible Integrity States</CardTitle>
                  <CardDescription>
                    Clear, actionable status indicators based on tamper signals
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Administrators see a simple traffic-light system that summarizes student integrity status
                    without exposing detailed monitoring data. States are based on objective signals, not
                    subjective judgments or AI accusations.
                  </p>
                </CardContent>
              </Card>

              <div className="grid gap-6">
                {integrityStates.map((state) => {
                  const IconComponent = state.icon;
                  return (
                    <Card key={state.state} className={`${state.borderColor} border-2`}>
                      <CardHeader className={state.bgColor}>
                        <div className="flex items-center gap-4">
                          <div className={`p-3 rounded-full ${state.bgColor}`}>
                            <IconComponent className={`w-8 h-8 ${state.color}`} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <CardTitle className={state.color}>{state.state}</CardTitle>
                              <Badge variant="outline" className={`${state.color} border-current`}>
                                {state.label}
                              </Badge>
                            </div>
                            <CardDescription className="mt-1">{state.description}</CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-6">
                        <div className="grid md:grid-cols-2 gap-6">
                          <div>
                            <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                              <Layers className="w-4 h-4" />
                              Triggering Signals
                            </h4>
                            <ul className="space-y-2">
                              {state.signals.map((signal, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm">
                                  <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                                    state.state === "Green" ? "bg-success" :
                                    state.state === "Amber" ? "bg-warning" : "bg-destructive"
                                  }`} />
                                  {signal}
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                              <User className="w-4 h-4" />
                              Recommended Admin Action
                            </h4>
                            <p className="text-sm text-muted-foreground p-3 bg-muted/50 rounded-lg">
                              {state.adminAction}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="py-4">
                  <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-primary mt-1 shrink-0" />
                    <div>
                      <h4 className="font-semibold">Important Principles</h4>
                      <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                        <li>• <strong>States are indicators, not accusations.</strong> Red status means "review needed," not "cheating confirmed."</li>
                        <li>• <strong>Humans make integrity decisions.</strong> HumanFirst provides evidence; instructors make judgments.</li>
                        <li>• <strong>Students can see their own status.</strong> Transparency means they know when events are logged.</li>
                        <li>• <strong>Context matters.</strong> A focus loss could be a notification, not a cheat attempt.</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Scope Tab */}
          <TabsContent value="scope">
            <div className="space-y-8">
              {/* In Scope */}
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-success/10 rounded-lg">
                    <CheckCircle2 className="w-5 h-5 text-success" />
                  </div>
                  <h2 className="text-xl font-bold">In Scope</h2>
                  <Badge className="bg-success text-success-foreground">What We Monitor</Badge>
                </div>

                <div className="grid gap-4">
                  {scopeItems.inScope.map((item, index) => (
                    <Card key={index} className="border-success/20">
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-5 h-5 text-success" />
                            <CardTitle className="text-base">{item.item}</CardTitle>
                          </div>
                        </div>
                        <CardDescription>{item.description}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="text-sm bg-muted/50 p-3 rounded-lg">
                          <span className="font-medium">How:</span> {item.how}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Out of Scope */}
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-destructive/10 rounded-lg">
                    <XCircle className="w-5 h-5 text-destructive" />
                  </div>
                  <h2 className="text-xl font-bold">Explicitly Out of Scope</h2>
                  <Badge variant="destructive">What We NEVER Do</Badge>
                </div>

                <div className="grid gap-4">
                  {scopeItems.outOfScope.map((item, index) => (
                    <Card key={index} className="border-destructive/20">
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <XCircle className="w-5 h-5 text-destructive" />
                            <CardTitle className="text-base">{item.item}</CardTitle>
                          </div>
                        </div>
                        <CardDescription>{item.description}</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="text-sm bg-destructive/5 p-3 rounded-lg border border-destructive/20">
                          <span className="font-medium text-destructive">Why Not:</span> {item.why}
                        </div>
                        <div className="text-sm bg-muted/50 p-3 rounded-lg">
                          <span className="font-medium">Alternative:</span> {item.alternative}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Summary Card */}
              <Card className="bg-gradient-to-br from-primary/5 via-transparent to-success/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-primary" />
                    The HumanFirst Philosophy
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold mb-3">Our Threat Model Accepts:</h4>
                      <ul className="space-y-2 text-sm text-muted-foreground">
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-success mt-0.5" />
                          We cannot prevent all forms of cheating
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-success mt-0.5" />
                          Determined bad actors will find ways around any system
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-success mt-0.5" />
                          Some threats require invasive monitoring to address
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-success mt-0.5" />
                          Perfect security is impossible and undesirable
                        </li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-3">Our Threat Model Rejects:</h4>
                      <ul className="space-y-2 text-sm text-muted-foreground">
                        <li className="flex items-start gap-2">
                          <XCircle className="w-4 h-4 text-destructive mt-0.5" />
                          Treating all students as potential cheaters
                        </li>
                        <li className="flex items-start gap-2">
                          <XCircle className="w-4 h-4 text-destructive mt-0.5" />
                          Collecting data disproportionate to the threat
                        </li>
                        <li className="flex items-start gap-2">
                          <XCircle className="w-4 h-4 text-destructive mt-0.5" />
                          Sacrificing privacy for marginal security gains
                        </li>
                        <li className="flex items-start gap-2">
                          <XCircle className="w-4 h-4 text-destructive mt-0.5" />
                          Automated accusations without human review
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
          <p>© 2025 HumanFirst. Security documentation for internal and partner use.</p>
        </div>
      </footer>
    </div>
  );
};

export default ThreatModel;
