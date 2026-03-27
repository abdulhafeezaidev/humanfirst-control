import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Shield, ArrowLeft, Eye, Keyboard, Monitor, Camera, 
  Scale, Clock, Database, Lock, Users, FileText, CheckCircle, XCircle,
  Heart, AlertTriangle, Download, BookOpen, ScrollText, Globe, 
  Building2, GraduationCap, ChevronDown, ChevronRight, ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import EvidencePackDownloader from '@/components/trust/EvidencePackDownloader';
import PrivacyPolicy from '@/components/trust/PrivacyPolicy';
import DataRightsSection from '@/components/trust/DataRightsSection';
import EnforcementBoundaryCard from '@/components/trust/EnforcementBoundaryCard';
import humanfirstLogo from '@/assets/humanfirst-logo.png';

const TrustAndEthics = () => {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<string | null>(null);

  const whatWeControl = [
    {
      icon: Clock,
      title: 'Time-Based Focus Policies',
      description: 'Administrators can define exam windows during which certain app categories are restricted.',
      details: 'Policies have clear start and end times. Students always see when restrictions are active and when they will end.',
    },
    {
      icon: Database,
      title: 'Category Blocking',
      description: 'During active policies, access to AI tools, social media, and entertainment apps may be limited.',
      details: 'Blocking is category-based, not content-based. We block access to domains, not monitor what you do on them.',
    },
    {
      icon: AlertTriangle,
      title: 'Focus Integrity Alerts',
      description: 'We detect when the app loses focus or network connectivity during exams, helping maintain fairness.',
      details: 'We detect the event (e.g., app lost focus) but not what you switched to or why. No content is ever captured.',
    },
    {
      icon: FileText,
      title: 'Audit Logs',
      description: 'Administrative actions are logged for accountability, with configurable retention periods.',
      details: 'Only admin actions are logged (policy changes, settings updates). Student activity content is never logged.',
    },
  ];

  const whatWeNeverDo = [
    {
      icon: Eye,
      title: 'No Content Reading',
      description: 'We never access, read, scan, or analyze any content you type, view, or create.',
      pledge: 'Your documents, messages, emails, and creative work remain completely private. We have no technical capability to read them.',
    },
    {
      icon: Keyboard,
      title: 'No Keystroke Logging',
      description: 'We do not track individual keystrokes, typing patterns, or any form of keyboard activity.',
      pledge: 'What you type is your business alone. We cannot and do not record your keyboard input.',
    },
    {
      icon: Monitor,
      title: 'No Screen Recording',
      description: 'Your screen is never captured, recorded, or transmitted.',
      pledge: 'We cannot see what you are looking at or working on. Screenshots and screen recording are not part of our system.',
    },
    {
      icon: Camera,
      title: 'No Camera or Microphone Access',
      description: 'We never access your camera or microphone.',
      pledge: 'There is no facial recognition, eye tracking, room scanning, or audio monitoring of any kind.',
    },
    {
      icon: Scale,
      title: 'No Cheating Accusations',
      description: 'HumanFirst does not make judgments about academic integrity.',
      pledge: 'We focus on enabling focus, not making accusations about student behavior. We provide tools, not verdicts.',
    },
    {
      icon: Users,
      title: 'No Behavioral Profiling',
      description: 'We do not build profiles based on your behavior or browsing patterns.',
      pledge: 'Your data is not used for analytics, marketing, or building behavioral models.',
    },
  ];

  const complianceFrameworks = [
    {
      id: 'gdpr',
      name: 'GDPR Alignment',
      region: 'European Union',
      icon: Globe,
      principles: [
        { title: 'Lawful Basis', description: 'Processing based on legitimate educational interests with transparent notice' },
        { title: 'Purpose Limitation', description: 'Data used only for exam integrity, never for other purposes' },
        { title: 'Data Minimization', description: 'We collect only the minimum data necessary for policy enforcement' },
        { title: 'Storage Limitation', description: 'Configurable retention with automatic deletion' },
        { title: 'Right to Access', description: 'Students can request a copy of their data at any time' },
        { title: 'Right to Erasure', description: 'Data can be deleted upon request, subject to legal retention requirements' },
      ],
      disclaimer: 'HumanFirst is designed with GDPR principles in mind. Compliance depends on how your institution configures and uses the system. We recommend consulting with your Data Protection Officer.',
    },
    {
      id: 'ferpa',
      name: 'FERPA Alignment',
      region: 'United States',
      icon: Building2,
      principles: [
        { title: 'Educational Records', description: 'Minimal data collection means minimal protected records' },
        { title: 'Legitimate Educational Interest', description: 'Access restricted to those with valid educational need' },
        { title: 'Parent/Student Rights', description: 'Transparent about what data is collected and retained' },
        { title: 'Directory Information', description: 'No personal identifiers shared without consent' },
        { title: 'Annual Notification', description: 'Policy transparency features support notification requirements' },
        { title: 'Consent Mechanisms', description: 'Built-in consent flows for data processing acknowledgement' },
      ],
      disclaimer: 'HumanFirst supports FERPA compliance goals. Your institution remains the data controller and is responsible for ensuring overall FERPA compliance.',
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 sm:gap-3 min-w-0">
            <img src={humanfirstLogo} alt="HumanFirst" className="w-8 h-8 sm:w-10 sm:h-10 object-contain flex-shrink-0" />
            <span className="text-lg sm:text-xl font-bold text-foreground truncate">HumanFirst</span>
          </Link>
          <nav className="hidden md:flex items-center gap-4 lg:gap-6">
            <a href="#privacy" className="text-sm text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap">
              Privacy Policy
            </a>
            <a href="#compliance" className="text-sm text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap">
              Compliance
            </a>
            <a href="#evidence" className="text-sm text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap">
              Evidence Pack
            </a>
          </nav>
          <Button onClick={() => navigate('/auth')} variant="default" size="sm" className="sm:h-10 sm:px-4 flex-shrink-0">
            Sign In
          </Button>
        </div>
      </header>

      {/* Back Navigation */}
      <div className="container mx-auto px-6 py-6">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
      </div>

      {/* Hero Section */}
      <section className="container mx-auto px-6 pb-16">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-accent rounded-full mb-6">
            <Heart className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-accent-foreground">Our Commitment to You</span>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            Trust & Ethics Center
          </h1>
          
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            HumanFirst is built on the belief that education thrives on trust, not surveillance. 
            This page explains exactly what we do, what we don't do, and why.
          </p>

          {/* Quick Links */}
          <div className="flex flex-wrap justify-center gap-3">
            <Button variant="outline" asChild>
              <a href="#privacy">
                <ScrollText className="w-4 h-4 mr-2" />
                Privacy Policy
              </a>
            </Button>
            <Button variant="outline" asChild>
              <a href="#compliance">
                <Globe className="w-4 h-4 mr-2" />
                Compliance Info
              </a>
            </Button>
            <Button variant="outline" asChild>
              <a href="#evidence">
                <Download className="w-4 h-4 mr-2" />
                Download Evidence Pack
              </a>
            </Button>
          </div>
        </div>
      </section>

      {/* Purpose Section */}
      <section className="py-16 px-6 bg-accent/30">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-3xl font-bold text-foreground mb-6 text-center">
            Our Purpose
          </h2>
          <div className="glass-card p-8 md:p-10">
            <p className="text-lg text-muted-foreground leading-relaxed mb-6">
              HumanFirst exists to help educational institutions create focused learning environments 
              during high-stakes assessments—without resorting to invasive monitoring that treats 
              students as suspects.
            </p>
            <p className="text-lg text-muted-foreground leading-relaxed">
              We believe in <strong className="text-foreground">enabling focus</strong>, not enforcing surveillance. 
              Our tools help administrators set clear boundaries while respecting student privacy and dignity.
            </p>
          </div>
        </div>
      </section>

      {/* What We Control Section */}
      <section className="py-16 px-6">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-3xl font-bold text-foreground mb-4 text-center">
            What HumanFirst Controls
          </h2>
          <p className="text-center text-muted-foreground mb-10 max-w-2xl mx-auto">
            These are the only capabilities our system provides. Everything is visible and transparent to students.
          </p>
          
          <div className="grid md:grid-cols-2 gap-6">
            {whatWeControl.map((item) => (
              <Card key={item.title}>
                <CardHeader className="pb-2">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <item.icon className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{item.title}</CardTitle>
                      <CardDescription className="mt-1">{item.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                    <strong>How it works:</strong> {item.details}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* What We Never Do Section */}
      <section className="py-16 px-6 bg-destructive/5">
        <div className="container mx-auto max-w-4xl">
          <div className="flex items-center justify-center gap-3 mb-4">
            <XCircle className="w-8 h-8 text-destructive" />
            <h2 className="text-3xl font-bold text-foreground">
              What We NEVER Do
            </h2>
          </div>
          <p className="text-center text-muted-foreground mb-10 max-w-2xl mx-auto">
            These are firm boundaries. These capabilities are not built into HumanFirst and never will be.
          </p>
          
          <div className="grid md:grid-cols-2 gap-6">
            {whatWeNeverDo.map((item) => (
              <Card key={item.title} className="border-destructive/20">
                <CardHeader className="pb-2">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center flex-shrink-0">
                      <item.icon className="w-6 h-6 text-destructive" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{item.title}</CardTitle>
                      <CardDescription className="mt-1">{item.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-success bg-success/10 p-3 rounded-lg">
                    <strong>Our pledge:</strong> {item.pledge}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Privacy Policy Section */}
      <section id="privacy" className="py-16 px-6 scroll-mt-20">
        <div className="container mx-auto max-w-4xl">
          <div className="flex items-center justify-center gap-3 mb-4">
            <ScrollText className="w-8 h-8 text-primary" />
            <h2 className="text-3xl font-bold text-foreground">
              Privacy Policy
            </h2>
          </div>
          <p className="text-center text-muted-foreground mb-10 max-w-2xl mx-auto">
            Plain-language explanation of how we handle your data
          </p>
          
          <PrivacyPolicy />
        </div>
      </section>

      {/* Data Rights Section */}
      <section className="py-16 px-6 bg-accent/30">
        <div className="container mx-auto max-w-4xl">
          <DataRightsSection />
        </div>
      </section>

      {/* Compliance Section */}
      <section id="compliance" className="py-16 px-6 scroll-mt-20">
        <div className="container mx-auto max-w-4xl">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Globe className="w-8 h-8 text-primary" />
            <h2 className="text-3xl font-bold text-foreground">
              Regulatory Alignment
            </h2>
          </div>
          <p className="text-center text-muted-foreground mb-10 max-w-2xl mx-auto">
            How HumanFirst aligns with major privacy regulations
          </p>

          <Tabs defaultValue="gdpr" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8">
              <TabsTrigger value="gdpr" className="gap-2">
                <Globe className="w-4 h-4" />
                GDPR (EU)
              </TabsTrigger>
              <TabsTrigger value="ferpa" className="gap-2">
                <Building2 className="w-4 h-4" />
                FERPA (US)
              </TabsTrigger>
            </TabsList>

            {complianceFrameworks.map((framework) => (
              <TabsContent key={framework.id} value={framework.id}>
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <framework.icon className="w-6 h-6 text-primary" />
                      <div>
                        <CardTitle>{framework.name}</CardTitle>
                        <CardDescription>{framework.region}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-4">
                      {framework.principles.map((principle) => (
                        <div key={principle.title} className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
                          <CheckCircle className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                          <div>
                            <h4 className="font-medium text-foreground">{principle.title}</h4>
                            <p className="text-sm text-muted-foreground">{principle.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="p-4 bg-warning/10 border border-warning/20 rounded-lg">
                      <p className="text-sm text-muted-foreground">
                        <strong className="text-foreground">Important:</strong> {framework.disclaimer}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </section>

      {/* Enforcement Boundaries Section */}
      <section id="enforcement" className="py-16 px-6 scroll-mt-20">
        <div className="container mx-auto max-w-4xl">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Lock className="w-8 h-8 text-primary" />
            <h2 className="text-3xl font-bold text-foreground">
              v1.0 Enforcement Boundaries
            </h2>
          </div>
          <p className="text-center text-muted-foreground mb-10 max-w-2xl mx-auto">
            Complete documentation of what our system can and cannot do — locked for v1.0
          </p>

          <EnforcementBoundaryCard />
        </div>
      </section>

      {/* Evidence Pack Section */}
      <section id="evidence" className="py-16 px-6 bg-accent/30 scroll-mt-20">
        <div className="container mx-auto max-w-4xl">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Download className="w-8 h-8 text-primary" />
            <h2 className="text-3xl font-bold text-foreground">
              Audit & Evidence Pack
            </h2>
          </div>
          <p className="text-center text-muted-foreground mb-10 max-w-2xl mx-auto">
            Downloadable documentation for compliance review, audits, and institutional records
          </p>

          <EvidencePackDownloader />
        </div>
      </section>

      {/* Commitment Section */}
      <section className="py-16 px-6">
        <div className="container mx-auto max-w-3xl text-center">
          <div className="glass-card p-10 bg-gradient-to-br from-primary/5 to-accent">
            <img src={humanfirstLogo} alt="HumanFirst" className="w-16 h-16 mx-auto mb-6 object-contain" />
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
              Our Promise
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed mb-6">
              The statements on this page describe actual system behavior. If we ever expand our 
              capabilities, this page will be updated first—before any changes are deployed.
            </p>
            <p className="text-muted-foreground mb-6">
              This page was last updated: <strong>January 2026</strong>
            </p>
            <Button onClick={() => navigate('/auth')} variant="default">
              Get Started
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 px-6 border-t border-border">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <img src={humanfirstLogo} alt="HumanFirst" className="w-8 h-8 object-contain" />
              <span className="font-semibold text-foreground">HumanFirst</span>
            </div>
            <div className="flex items-center gap-6">
              <Link to="/pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Pricing
              </Link>
              <a href="#privacy" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Privacy Policy
              </a>
              <a href="#compliance" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Compliance
              </a>
            </div>
            <p className="text-sm text-muted-foreground">
              Privacy-first educational control
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default TrustAndEthics;
