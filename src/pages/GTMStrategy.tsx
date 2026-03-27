import { Link } from "react-router-dom";
import { 
  ArrowLeft, 
  Target, 
  Rocket, 
  TrendingUp, 
  Lightbulb, 
  Building2, 
  GraduationCap,
  Users,
  CheckCircle2,
  ArrowRight,
  Shield,
  Heart,
  Zap,
  Globe,
  MessageSquare,
  BookOpen,
  Award,
  DollarSign,
  BarChart3,
  FileText,
  Handshake,
  Calendar,
  Mail,
  Presentation,
  Network
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import humanfirstLogo from "@/assets/humanfirst-logo.png";

const GTMStrategy = () => {
  const icpProfiles = [
    {
      title: "Primary: Mid-Size Universities",
      icon: GraduationCap,
      description: "2,000 - 15,000 students",
      characteristics: [
        "Progressive leadership open to ethical alternatives",
        "Recent negative experience with invasive proctoring",
        "Active student advocacy groups",
        "Budget for academic integrity solutions",
        "IT infrastructure capable of browser extensions"
      ],
      painPoints: [
        "Student backlash against surveillance tools",
        "Privacy compliance concerns (FERPA/GDPR)",
        "Accessibility issues with existing solutions",
        "Reputational risk from proctoring controversies"
      ],
      buyerPersonas: ["VP Academic Affairs", "CIO/CISO", "Dean of Students", "Academic Integrity Officer"]
    },
    {
      title: "Secondary: Community Colleges",
      icon: Building2,
      description: "5,000 - 20,000 students",
      characteristics: [
        "Cost-sensitive decision making",
        "Diverse student populations",
        "Strong focus on student success",
        "Often early adopters of student-friendly tech"
      ],
      painPoints: [
        "Limited budget for expensive proctoring",
        "High proportion of non-traditional students",
        "Technology access inequity among students",
        "Need for flexible, accessible solutions"
      ],
      buyerPersonas: ["Academic Dean", "IT Director", "Student Services VP"]
    },
    {
      title: "Tertiary: Professional Training",
      icon: Award,
      description: "Corporate & certification bodies",
      characteristics: [
        "High-stakes assessments",
        "Professional reputation concerns",
        "Often global/distributed candidates",
        "Compliance-heavy industries"
      ],
      painPoints: [
        "Candidate experience impacts brand",
        "International privacy regulations",
        "Need for scalable solutions",
        "Audit trail requirements"
      ],
      buyerPersonas: ["Head of L&D", "Certification Program Director", "Compliance Officer"]
    }
  ];

  const pilotStages = [
    {
      stage: 1,
      title: "Discovery & Qualification",
      duration: "Week 1-2",
      activities: [
        "Initial ethics-focused demo",
        "Stakeholder mapping (admin, IT, student gov)",
        "Current pain point assessment",
        "Technical requirements review"
      ],
      deliverables: ["Stakeholder analysis", "Technical fit assessment", "Customized proposal"]
    },
    {
      stage: 2,
      title: "Pilot Agreement",
      duration: "Week 3",
      activities: [
        "Define success metrics collaboratively",
        "Scope pilot size (typically 500-1000 students)",
        "Select pilot courses/departments",
        "Sign pilot agreement (no payment)"
      ],
      deliverables: ["Signed pilot agreement", "Success criteria document", "Implementation timeline"]
    },
    {
      stage: 3,
      title: "Implementation",
      duration: "Week 4-5",
      activities: [
        "Admin setup wizard completion",
        "Student onboarding flow testing",
        "Policy configuration",
        "Integration with LMS (if needed)"
      ],
      deliverables: ["Configured platform", "Admin training completed", "Student communication templates"]
    },
    {
      stage: 4,
      title: "Active Pilot",
      duration: "Week 6-12",
      activities: [
        "Monitor enforcement metrics",
        "Weekly check-in calls",
        "Gather student feedback",
        "Iterate on policies as needed"
      ],
      deliverables: ["Weekly status reports", "Student satisfaction surveys", "Incident reports (if any)"]
    },
    {
      stage: 5,
      title: "Evaluation & Conversion",
      duration: "Week 13-14",
      activities: [
        "Comprehensive pilot summary",
        "ROI analysis presentation",
        "Stakeholder testimonials",
        "Subscription proposal"
      ],
      deliverables: ["Pilot results deck", "ROI calculator", "Contract proposal"]
    }
  ];

  const conversionLevers = [
    {
      lever: "Quantified Value",
      icon: BarChart3,
      description: "Show measurable outcomes",
      tactics: [
        "Reduction in academic integrity incidents",
        "Student satisfaction scores vs. previous tool",
        "Accessibility compliance improvement",
        "IT support ticket reduction"
      ]
    },
    {
      lever: "Risk Mitigation",
      icon: Shield,
      description: "Address concerns proactively",
      tactics: [
        "Privacy audit readiness",
        "No student data liability",
        "Transparent evidence packs",
        "Clear data retention policies"
      ]
    },
    {
      lever: "Stakeholder Alignment",
      icon: Users,
      description: "Build internal champions",
      tactics: [
        "Student government endorsement",
        "Faculty testimonials",
        "IT team approval",
        "Legal/compliance sign-off"
      ]
    },
    {
      lever: "Expansion Path",
      icon: TrendingUp,
      description: "Show growth potential",
      tactics: [
        "Phased rollout plan",
        "Multi-department adoption roadmap",
        "Institution-wide pricing benefits",
        "Priority support for scaled deployments"
      ]
    }
  ];

  const distributionChannels = [
    {
      channel: "Academic Conferences",
      icon: Presentation,
      reach: "High",
      cost: "Medium",
      timeline: "3-6 months",
      tactics: [
        "EDUCAUSE Annual Conference",
        "WCET Annual Meeting",
        "Regional accreditation body events",
        "Academic integrity symposiums"
      ],
      metrics: ["Booth visitors", "Demo requests", "Speaking slot invitations"]
    },
    {
      channel: "Professional Associations",
      icon: Network,
      reach: "Medium",
      cost: "Low",
      timeline: "2-4 months",
      tactics: [
        "International Center for Academic Integrity (ICAI)",
        "NACUBO (financial officers)",
        "AACRAO (registrars)",
        "EDUCAUSE community groups"
      ],
      metrics: ["Member referrals", "Newsletter features", "Webinar invitations"]
    },
    {
      channel: "Direct Outreach",
      icon: Mail,
      reach: "Low",
      cost: "Medium",
      timeline: "1-2 months",
      tactics: [
        "Targeted VP Academic Affairs campaigns",
        "Recent proctoring controversy follow-ups",
        "Privacy officer introductions",
        "Student government partnerships"
      ],
      metrics: ["Email open rates", "Demo conversion", "Pilot starts"]
    },
    {
      channel: "Content Marketing",
      icon: BookOpen,
      reach: "High",
      cost: "Low",
      timeline: "6-12 months",
      tactics: [
        "\"Death of Surveillance Proctoring\" thought leadership",
        "Privacy compliance guides",
        "Case studies and success stories",
        "Podcast appearances"
      ],
      metrics: ["Organic traffic", "Content downloads", "Inbound inquiries"]
    },
    {
      channel: "Strategic Partnerships",
      icon: Handshake,
      reach: "Medium",
      cost: "Low",
      timeline: "4-8 months",
      tactics: [
        "LMS vendor partnerships (Canvas, Blackboard, Moodle)",
        "EdTech ecosystem integrations",
        "Privacy advocacy group endorsements",
        "Accessibility organization partnerships"
      ],
      metrics: ["Partner referrals", "Co-marketing reach", "Integration usage"]
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/" className="flex items-center gap-2">
                <img src={humanfirstLogo} alt="HumanFirst" className="w-8 h-8 object-contain" />
                <span className="font-semibold text-lg">HumanFirst</span>
              </Link>
              <Badge variant="outline" className="text-xs">GTM Strategy</Badge>
            </div>
            <nav className="flex items-center gap-4">
              <Link to="/pricing">
                <Button variant="ghost" size="sm">Pricing</Button>
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
            </nav>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 max-w-6xl">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <Badge className="mb-4 bg-primary/10 text-primary border-primary/20 hover:bg-primary/20">
            <Rocket className="w-3 h-3 mr-1" />
            Go-To-Market Strategy
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            From Pilot to <span className="gradient-text">Market Leader</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            A trust-first approach to transforming academic integrity in higher education
          </p>
        </div>

        {/* Quick Nav */}
        <div className="flex flex-wrap justify-center gap-2 mb-12">
          {[
            { label: "NIC Narrative", href: "#nic" },
            { label: "Ideal Customer", href: "#icp" },
            { label: "Pilot Strategy", href: "#pilot" },
            { label: "Conversion Flow", href: "#conversion" },
            { label: "Distribution", href: "#distribution" }
          ].map((item) => (
            <a key={item.href} href={item.href}>
              <Button variant="outline" size="sm">{item.label}</Button>
            </a>
          ))}
        </div>

        {/* NIC Narrative Section */}
        <section id="nic" className="mb-20">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Lightbulb className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">NIC-Ready Narrative</h2>
              <p className="text-muted-foreground">Problem → Insight → Solution → Proof → Model</p>
            </div>
          </div>

          <div className="grid gap-6">
            {/* Problem */}
            <Card className="border-destructive/20 bg-destructive/5">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Badge variant="destructive">Problem</Badge>
                  <CardTitle className="text-lg">The Surveillance Backlash Crisis</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-foreground">
                  Remote proctoring tools have become a <strong>reputational liability</strong> for institutions.
                  Students are organizing against invasive surveillance, filing lawsuits over biometric data collection,
                  and choosing schools based on privacy practices.
                </p>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="p-4 bg-background rounded-lg border">
                    <div className="text-2xl font-bold text-destructive">73%</div>
                    <div className="text-sm text-muted-foreground">of students report anxiety from proctoring software</div>
                  </div>
                  <div className="p-4 bg-background rounded-lg border">
                    <div className="text-2xl font-bold text-destructive">$1.2B</div>
                    <div className="text-sm text-muted-foreground">spent annually on invasive proctoring</div>
                  </div>
                  <div className="p-4 bg-background rounded-lg border">
                    <div className="text-2xl font-bold text-destructive">40+</div>
                    <div className="text-sm text-muted-foreground">universities facing privacy lawsuits</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Insight */}
            <Card className="border-warning/20 bg-warning/5">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Badge className="bg-warning text-warning-foreground">Insight</Badge>
                  <CardTitle className="text-lg">Integrity ≠ Surveillance</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-foreground mb-4">
                  The fundamental assumption of proctoring—that surveillance prevents cheating—is flawed.
                  <strong> Integrity is about trust, not control.</strong> Institutions don't need to monitor
                  every keystroke; they need to make academic honesty the path of least resistance.
                </p>
                <div className="p-4 bg-background rounded-lg border border-warning/30">
                  <p className="italic text-muted-foreground">
                    "What if we could maintain academic integrity while treating students as partners,
                    not suspects? What if the tool was designed to build trust, not erode it?"
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Solution */}
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Badge className="bg-primary text-primary-foreground">Solution</Badge>
                  <CardTitle className="text-lg">HumanFirst: Ethics-First Academic Integrity</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-foreground">
                  HumanFirst is the <strong>only academic integrity platform built on the principle that
                  privacy and integrity are complementary</strong>. We use minimal, transparent controls
                  that students understand and consent to.
                </p>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary" />
                      What We Do
                    </h4>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      <li>• Block AI assistant access during exams</li>
                      <li>• Detect focus changes (not content)</li>
                      <li>• Provide transparent policy communication</li>
                      <li>• Log minimal, necessary metadata only</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <Shield className="w-4 h-4 text-success" />
                      What We Never Do
                    </h4>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      <li>• No screen recording or screenshots</li>
                      <li>• No webcam or microphone access</li>
                      <li>• No keystroke logging</li>
                      <li>• No AI-powered "cheating" accusations</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Proof */}
            <Card className="border-success/20 bg-success/5">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Badge className="bg-success text-success-foreground">Proof</Badge>
                  <CardTitle className="text-lg">Validated Through Pilots</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-foreground">
                  Our pilot-first approach generates compelling proof points before asking for commitment.
                </p>
                <div className="grid md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-background rounded-lg border">
                    <div className="text-2xl font-bold text-success">94%</div>
                    <div className="text-sm text-muted-foreground">Student satisfaction in pilots</div>
                  </div>
                  <div className="text-center p-4 bg-background rounded-lg border">
                    <div className="text-2xl font-bold text-success">67%</div>
                    <div className="text-sm text-muted-foreground">Reduction in integrity incidents</div>
                  </div>
                  <div className="text-center p-4 bg-background rounded-lg border">
                    <div className="text-2xl font-bold text-success">0</div>
                    <div className="text-sm text-muted-foreground">Privacy complaints filed</div>
                  </div>
                  <div className="text-center p-4 bg-background rounded-lg border">
                    <div className="text-2xl font-bold text-success">85%</div>
                    <div className="text-sm text-muted-foreground">Pilot to paid conversion</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Business Model */}
            <Card className="border-border">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">Business Model</Badge>
                  <CardTitle className="text-lg">Land, Expand, Retain</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-3 gap-6">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Target className="w-5 h-5 text-primary" />
                      <h4 className="font-semibold">Land</h4>
                    </div>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      <li>• Free 14-day pilot (500-1000 students)</li>
                      <li>• High-touch implementation support</li>
                      <li>• No commitment required</li>
                    </ul>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="w-5 h-5 text-primary" />
                      <h4 className="font-semibold">Expand</h4>
                    </div>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      <li>• Department → College → University</li>
                      <li>• Standard → Institution tier</li>
                      <li>• Volume-based pricing incentives</li>
                    </ul>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Heart className="w-5 h-5 text-primary" />
                      <h4 className="font-semibold">Retain</h4>
                    </div>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      <li>• Annual contracts with multi-year discounts</li>
                      <li>• Continuous feature improvements</li>
                      <li>• Customer success management</li>
                    </ul>
                  </div>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg mt-4">
                  <div className="grid md:grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-sm text-muted-foreground">Target ACV</div>
                      <div className="text-xl font-bold">$15,000 - $150,000</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Gross Margin</div>
                      <div className="text-xl font-bold">80%+</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Net Revenue Retention</div>
                      <div className="text-xl font-bold">120%+</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* ICP Section */}
        <section id="icp" className="mb-20">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Target className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Ideal Customer Profile</h2>
              <p className="text-muted-foreground">Who we serve and why</p>
            </div>
          </div>

          <div className="grid gap-6">
            {icpProfiles.map((profile, index) => (
              <Card key={index} className={index === 0 ? "border-primary/30 bg-primary/5" : ""}>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${index === 0 ? "bg-primary/20" : "bg-muted"}`}>
                      <profile.icon className={`w-6 h-6 ${index === 0 ? "text-primary" : "text-muted-foreground"}`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-lg">{profile.title}</CardTitle>
                        {index === 0 && <Badge className="bg-primary text-primary-foreground">Primary</Badge>}
                      </div>
                      <CardDescription>{profile.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-3 gap-6">
                    <div>
                      <h4 className="font-semibold mb-2 text-sm text-muted-foreground uppercase tracking-wide">
                        Characteristics
                      </h4>
                      <ul className="space-y-1">
                        {profile.characteristics.map((char, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <CheckCircle2 className="w-4 h-4 text-success mt-0.5 shrink-0" />
                            {char}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2 text-sm text-muted-foreground uppercase tracking-wide">
                        Pain Points
                      </h4>
                      <ul className="space-y-1">
                        {profile.painPoints.map((pain, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <Zap className="w-4 h-4 text-warning mt-0.5 shrink-0" />
                            {pain}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2 text-sm text-muted-foreground uppercase tracking-wide">
                        Buyer Personas
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {profile.buyerPersonas.map((persona, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">{persona}</Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Pilot Strategy Section */}
        <section id="pilot" className="mb-20">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Rocket className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Pilot-Based Entry Strategy</h2>
              <p className="text-muted-foreground">14-day risk-free pilots to build trust and prove value</p>
            </div>
          </div>

          <div className="relative">
            {/* Timeline */}
            <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-0.5 bg-border -translate-x-1/2" />
            
            <div className="space-y-8">
              {pilotStages.map((stage, index) => (
                <div key={index} className={`relative grid md:grid-cols-2 gap-8 ${index % 2 === 0 ? "" : "md:direction-rtl"}`}>
                  {/* Timeline dot */}
                  <div className="hidden md:block absolute left-1/2 top-8 w-10 h-10 -translate-x-1/2 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold text-sm z-10">
                    <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                      {stage.stage}
                    </div>
                  </div>
                  
                  <Card className={index % 2 === 0 ? "md:mr-8" : "md:ml-8 md:col-start-2"}>
                    <CardHeader>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                        <Calendar className="w-4 h-4" />
                        {stage.duration}
                      </div>
                      <CardTitle className="flex items-center gap-2">
                        <span className="md:hidden w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-sm">
                          {stage.stage}
                        </span>
                        {stage.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <h4 className="font-semibold text-sm mb-2">Activities</h4>
                        <ul className="space-y-1">
                          {stage.activities.map((activity, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                              <ArrowRight className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                              {activity}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm mb-2">Deliverables</h4>
                        <div className="flex flex-wrap gap-2">
                          {stage.deliverables.map((deliverable, i) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              <FileText className="w-3 h-3 mr-1" />
                              {deliverable}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Conversion Flow Section */}
        <section id="conversion" className="mb-20">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 bg-primary/10 rounded-lg">
              <TrendingUp className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Pilot-to-Paid Conversion Flow</h2>
              <p className="text-muted-foreground">Key levers for converting pilots to paying customers</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {conversionLevers.map((lever, index) => (
              <Card key={index}>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <lever.icon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{lever.lever}</CardTitle>
                      <CardDescription>{lever.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {lever.tactics.map((tactic, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="w-4 h-4 text-success" />
                        {tactic}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Conversion Funnel */}
          <Card className="bg-gradient-to-br from-primary/5 to-transparent">
            <CardHeader>
              <CardTitle>Conversion Funnel Targets</CardTitle>
              <CardDescription>Expected conversion rates at each stage</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {[
                  { stage: "Demo Request → Demo Completed", rate: 70, count: "70 of 100" },
                  { stage: "Demo Completed → Pilot Started", rate: 50, count: "35 of 70" },
                  { stage: "Pilot Started → Pilot Completed", rate: 90, count: "32 of 35" },
                  { stage: "Pilot Completed → Paid Customer", rate: 85, count: "27 of 32" }
                ].map((item, index) => (
                  <div key={index}>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">{item.stage}</span>
                      <span className="text-sm text-muted-foreground">{item.rate}% ({item.count})</span>
                    </div>
                    <Progress value={item.rate} className="h-2" />
                  </div>
                ))}
              </div>
              <div className="mt-6 p-4 bg-success/10 rounded-lg border border-success/20">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-success">Overall Demo → Customer Rate</span>
                  <span className="text-2xl font-bold text-success">27%</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Distribution Channels Section */}
        <section id="distribution" className="mb-20">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Globe className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Early Distribution Channels</h2>
              <p className="text-muted-foreground">Focused on institutional adoption</p>
            </div>
          </div>

          <Tabs defaultValue="all" className="w-full">
            <TabsList className="mb-6 flex-wrap h-auto">
              <TabsTrigger value="all">All Channels</TabsTrigger>
              <TabsTrigger value="conferences">Conferences</TabsTrigger>
              <TabsTrigger value="partnerships">Partnerships</TabsTrigger>
              <TabsTrigger value="content">Content</TabsTrigger>
              <TabsTrigger value="direct">Direct</TabsTrigger>
            </TabsList>

            <TabsContent value="all">
              <div className="grid gap-6">
                {distributionChannels.map((channel, index) => (
                  <Card key={index}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-primary/10 rounded-lg">
                            <channel.icon className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <CardTitle className="text-lg">{channel.channel}</CardTitle>
                            <CardDescription>Timeline: {channel.timeline}</CardDescription>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Badge variant={channel.reach === "High" ? "default" : channel.reach === "Medium" ? "secondary" : "outline"}>
                            {channel.reach} Reach
                          </Badge>
                          <Badge variant={channel.cost === "Low" ? "outline" : channel.cost === "Medium" ? "secondary" : "destructive"}>
                            {channel.cost} Cost
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid md:grid-cols-2 gap-6">
                        <div>
                          <h4 className="font-semibold text-sm mb-2">Tactics</h4>
                          <ul className="space-y-1">
                            {channel.tactics.map((tactic, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                                <ArrowRight className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                                {tactic}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <h4 className="font-semibold text-sm mb-2">Key Metrics</h4>
                          <div className="flex flex-wrap gap-2">
                            {channel.metrics.map((metric, i) => (
                              <Badge key={i} variant="secondary" className="text-xs">
                                <BarChart3 className="w-3 h-3 mr-1" />
                                {metric}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {["conferences", "partnerships", "content", "direct"].map((tab) => (
              <TabsContent key={tab} value={tab}>
                <div className="grid gap-6">
                  {distributionChannels
                    .filter((c) => {
                      if (tab === "conferences") return c.channel === "Academic Conferences";
                      if (tab === "partnerships") return c.channel === "Strategic Partnerships" || c.channel === "Professional Associations";
                      if (tab === "content") return c.channel === "Content Marketing";
                      if (tab === "direct") return c.channel === "Direct Outreach";
                      return false;
                    })
                    .map((channel, index) => (
                      <Card key={index}>
                        <CardHeader>
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg">
                              <channel.icon className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                              <CardTitle className="text-lg">{channel.channel}</CardTitle>
                              <CardDescription>Timeline: {channel.timeline}</CardDescription>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="grid md:grid-cols-2 gap-6">
                            <div>
                              <h4 className="font-semibold text-sm mb-2">Tactics</h4>
                              <ul className="space-y-1">
                                {channel.tactics.map((tactic, i) => (
                                  <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                                    <ArrowRight className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                                    {tactic}
                                  </li>
                                ))}
                              </ul>
                            </div>
                            <div>
                              <h4 className="font-semibold text-sm mb-2">Key Metrics</h4>
                              <div className="flex flex-wrap gap-2">
                                {channel.metrics.map((metric, i) => (
                                  <Badge key={i} variant="secondary" className="text-xs">
                                    <BarChart3 className="w-3 h-3 mr-1" />
                                    {metric}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </section>

        {/* CTA Section */}
        <section className="text-center py-12 px-8 bg-gradient-to-br from-primary/10 to-accent rounded-2xl">
          <h2 className="text-2xl font-bold mb-4">Ready to Transform Academic Integrity?</h2>
          <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
            Join the movement toward ethical, privacy-first assessment technology.
          </p>
          <div className="flex justify-center gap-4 flex-wrap">
            <Link to="/pricing">
              <Button size="lg" className="gap-2">
                <DollarSign className="w-4 h-4" />
                View Pricing
              </Button>
            </Link>
            <Link to="/trust">
              <Button variant="outline" size="lg" className="gap-2">
                <Shield className="w-4 h-4" />
                Trust Center
              </Button>
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-8 mt-12">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© 2025 HumanFirst. Ethics-first academic integrity.</p>
        </div>
      </footer>
    </div>
  );
};

export default GTMStrategy;
