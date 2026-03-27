import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Check, X, Zap, Shield, Building2, 
  Users, Monitor, GraduationCap, Clock, Star
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLicenseTier } from '@/hooks/useLicenseTier';
import { PLAN_FEATURES, FEATURE_LABELS, PlanType } from '@/types/organization';
import UpgradeDialog from '@/components/license/UpgradeDialog';
import humanfirstLogo from '@/assets/humanfirst-logo.png';

const PRICING_DATA: Record<PlanType, {
  price: string;
  period: string;
  description: string;
  tagline: string;
  highlights: string[];
  ethicsNote: string;
}> = {
  pilot: {
    price: 'Free',
    period: '10 weeks',
    description: 'Evaluate HumanFirst with your institution',
    tagline: 'No commitment. No credit card.',
    highlights: [
      'Up to 50 students enrolled',
      '10 registered devices',
      '2 administrator accounts',
      'Full exam & focus policies',
      'Tamper awareness (non-accusatory)',
      'Weekly pilot metrics reports',
      'Student transparency portal',
      'Dedicated onboarding support',
    ],
    ethicsNote: 'Same privacy guarantees as paid plans—no hidden surveillance.',
  },
  standard: {
    price: 'Contact us',
    period: '',
    description: 'Complete integrity solution for departments & schools',
    tagline: 'Most institutions start here.',
    highlights: [
      'Up to 500 students',
      '100 registered devices',
      '5 administrator accounts',
      'Everything in Pilot, plus:',
      '90-day audit log retention',
      'AI service blocking (ChatGPT, etc.)',
      'Shareable policy transparency links',
      'Priority email & chat support',
    ],
    ethicsNote: 'Extended retention for compliance reviews—still zero content access.',
  },
  institution: {
    price: 'Custom',
    period: '',
    description: 'Campus-wide deployment with enterprise controls',
    tagline: 'For universities and school districts.',
    highlights: [
      'Unlimited students & devices',
      'Unlimited administrator accounts',
      'Everything in Standard, plus:',
      'Custom institutional branding',
      'REST API for LMS integration',
      'SAML/OAuth Single Sign-On',
      'Dedicated customer success manager',
      'SLA with uptime guarantee',
    ],
    ethicsNote: 'Enterprise scale with the same ethical foundation—never surveillance.',
  },
};

const ALL_FEATURES = [
  { key: 'basic_policies', label: 'Exam & Focus Policies', description: 'Time-windowed enforcement without content inspection' },
  { key: 'tamper_detection', label: 'Tamper Awareness', description: 'Detect interruptions with grace periods—never accusations' },
  { key: 'audit_logs', label: 'Administrative Audit Trail', description: 'Every admin action logged for institutional accountability' },
  { key: 'ai_service_blocking', label: 'AI Service Blocking', description: 'Block ChatGPT, Claude, and other AI tools during exams' },
  { key: 'policy_sharing', label: 'Transparency Links', description: 'Public read-only view of active policies for students' },
  { key: 'custom_branding', label: 'Institutional Branding', description: 'Your logo, colors, and domain for a seamless experience' },
  { key: 'api_access', label: 'Integration API', description: 'Connect to your LMS, SIS, or identity provider' },
  { key: 'sso', label: 'Enterprise SSO', description: 'SAML 2.0 and OAuth 2.0 for centralized authentication' },
];

const PRIVACY_GUARANTEES = [
  { icon: 'eye-off', label: 'No Content Reading', description: 'We never see what students type or view' },
  { icon: 'keyboard-off', label: 'No Keystroke Logging', description: 'Zero capture of typing patterns or input' },
  { icon: 'camera-off', label: 'No Screen Recording', description: 'No screenshots, recordings, or camera access' },
  { icon: 'brain-off', label: 'No Behavioral Profiling', description: 'No ML models analyzing student behavior' },
  { icon: 'gavel', label: 'No Cheating Accusations', description: 'Alerts are factual events, never judgments' },
];

const Pricing = () => {
  const navigate = useNavigate();
  const { licenseStatus } = useLicenseTier();
  const [upgradeDialogOpen, setUpgradeDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PlanType | null>(null);

  const handleSelectPlan = (plan: PlanType) => {
    if (plan === licenseStatus.planType) return;
    if (plan === 'institution') {
      // Contact sales flow
      window.open('mailto:sales@humanfirst.edu?subject=Institution Plan Inquiry', '_blank');
      return;
    }
    setSelectedPlan(plan);
    setUpgradeDialogOpen(true);
  };

  const getPlanIcon = (plan: PlanType) => {
    switch (plan) {
      case 'pilot':
        return Clock;
      case 'standard':
        return Star;
      case 'institution':
        return Building2;
    }
  };

  const isCurrentPlan = (plan: PlanType) => licenseStatus.planType === plan;
  const isUpgrade = (plan: PlanType) => {
    const order: PlanType[] = ['pilot', 'standard', 'institution'];
    return order.indexOf(plan) > order.indexOf(licenseStatus.planType);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-50">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={humanfirstLogo} alt="HumanFirst" className="w-10 h-10 object-contain" />
            <span className="text-xl font-bold text-foreground">HumanFirst</span>
          </div>
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-6 py-12 max-w-6xl">
        {/* Hero */}
        <div className="text-center mb-12">
          <Badge className="mb-4" variant="outline">
            <Shield className="w-3 h-3 mr-1" />
            Ethical AI Control
          </Badge>
          <h1 className="text-4xl font-bold text-foreground mb-4">
            Integrity Without Surveillance
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-6">
            Every plan includes our complete privacy commitment. No content reading, 
            no keystroke logging, no behavioral profiling—at any tier.
          </p>
          <p className="text-sm text-muted-foreground max-w-xl mx-auto">
            Built for institutions that value both academic integrity and student trust.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          {(['pilot', 'standard', 'institution'] as PlanType[]).map((plan) => {
            const Icon = getPlanIcon(plan);
            const config = PLAN_FEATURES[plan];
            const pricing = PRICING_DATA[plan];
            const isCurrent = isCurrentPlan(plan);
            const isUpgradeOption = isUpgrade(plan);

            return (
              <Card
                key={plan}
                className={`relative ${
                  plan === 'standard' ? 'border-primary shadow-lg scale-105' : ''
                } ${isCurrent ? 'ring-2 ring-primary' : ''}`}
              >
                {plan === 'standard' && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground">
                      Most Popular
                    </Badge>
                  </div>
                )}
                {isCurrent && (
                  <div className="absolute -top-3 right-4">
                    <Badge variant="outline" className="bg-background">
                      Current Plan
                    </Badge>
                  </div>
                )}
                <CardHeader className="text-center pb-2">
                  <div className={`w-12 h-12 rounded-xl ${config.bgColor} flex items-center justify-center mx-auto mb-4`}>
                    <Icon className={`w-6 h-6 ${config.color}`} />
                  </div>
                  <CardTitle className="text-2xl">{config.label}</CardTitle>
                  <CardDescription>{pricing.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center mb-4">
                    <span className="text-4xl font-bold text-foreground">
                      {pricing.price}
                    </span>
                    {pricing.period && (
                      <span className="text-muted-foreground ml-1">{pricing.period}</span>
                    )}
                  </div>
                  <p className="text-center text-sm text-muted-foreground mb-6">
                    {pricing.tagline}
                  </p>

                  <ul className="space-y-2.5 mb-6">
                    {pricing.highlights.map((highlight, idx) => (
                      <li key={highlight} className="flex items-start gap-2 text-sm">
                        <Check className={`w-4 h-4 shrink-0 mt-0.5 ${
                          highlight.startsWith('Everything in') ? 'text-primary' : 'text-success'
                        }`} />
                        <span className={highlight.startsWith('Everything in') ? 'font-medium text-primary' : ''}>
                          {highlight}
                        </span>
                      </li>
                    ))}
                  </ul>

                  {/* Ethics note */}
                  <div className="bg-accent/50 rounded-lg p-3 mb-4">
                    <p className="text-xs text-muted-foreground text-center">
                      {pricing.ethicsNote}
                    </p>
                  </div>

                  <Button
                    className="w-full"
                    variant={plan === 'pilot' ? 'outline' : 'default'}
                    disabled={isCurrent}
                    onClick={() => handleSelectPlan(plan)}
                  >
                    {isCurrent ? (
                      'Current Plan'
                    ) : plan === 'pilot' ? (
                      'Start Pilot'
                    ) : plan === 'institution' ? (
                      'Contact Sales'
                    ) : (
                      'Request Quote'
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Feature Comparison Table */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-foreground text-center mb-8">
            Feature Comparison
          </h2>
          <Tabs defaultValue="features" className="w-full">
            <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-8">
              <TabsTrigger value="features">Features</TabsTrigger>
              <TabsTrigger value="limits">Limits</TabsTrigger>
            </TabsList>

            <TabsContent value="features">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-4 px-4 font-medium text-muted-foreground">
                        Feature
                      </th>
                      {(['pilot', 'standard', 'institution'] as PlanType[]).map((plan) => (
                        <th
                          key={plan}
                          className="text-center py-4 px-4 font-semibold text-foreground"
                        >
                          {PLAN_FEATURES[plan].label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {ALL_FEATURES.map((feature) => (
                      <tr key={feature.key} className="border-b border-border">
                        <td className="py-4 px-4">
                          <div>
                            <p className="font-medium text-foreground">{feature.label}</p>
                            <p className="text-sm text-muted-foreground">{feature.description}</p>
                          </div>
                        </td>
                        {(['pilot', 'standard', 'institution'] as PlanType[]).map((plan) => {
                          const hasFeature = PLAN_FEATURES[plan].limits.featuresEnabled.includes(feature.key);
                          return (
                            <td key={plan} className="text-center py-4 px-4">
                              {hasFeature ? (
                                <Check className="w-5 h-5 text-success mx-auto" />
                              ) : (
                                <X className="w-5 h-5 text-muted-foreground/30 mx-auto" />
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TabsContent>

            <TabsContent value="limits">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-4 px-4 font-medium text-muted-foreground">
                        Resource
                      </th>
                      {(['pilot', 'standard', 'institution'] as PlanType[]).map((plan) => (
                        <th
                          key={plan}
                          className="text-center py-4 px-4 font-semibold text-foreground"
                        >
                          {PLAN_FEATURES[plan].label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-border">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <Monitor className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium">Devices</span>
                        </div>
                      </td>
                      {(['pilot', 'standard', 'institution'] as PlanType[]).map((plan) => (
                        <td key={plan} className="text-center py-4 px-4 font-medium">
                          {PLAN_FEATURES[plan].limits.maxDevices === -1 
                            ? 'Unlimited' 
                            : PLAN_FEATURES[plan].limits.maxDevices}
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b border-border">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <GraduationCap className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium">Students</span>
                        </div>
                      </td>
                      {(['pilot', 'standard', 'institution'] as PlanType[]).map((plan) => (
                        <td key={plan} className="text-center py-4 px-4 font-medium">
                          {PLAN_FEATURES[plan].limits.maxStudents === -1 
                            ? 'Unlimited' 
                            : PLAN_FEATURES[plan].limits.maxStudents}
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b border-border">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium">Admins</span>
                        </div>
                      </td>
                      {(['pilot', 'standard', 'institution'] as PlanType[]).map((plan) => (
                        <td key={plan} className="text-center py-4 px-4 font-medium">
                          {PLAN_FEATURES[plan].limits.maxAdmins === -1 
                            ? 'Unlimited' 
                            : PLAN_FEATURES[plan].limits.maxAdmins}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Privacy Promise Section */}
        <div className="bg-accent rounded-2xl p-8 mb-16">
          <div className="text-center mb-8">
            <Shield className="w-12 h-12 text-primary mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-foreground mb-2">
              The HumanFirst Privacy Guarantee
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              These commitments apply to every plan—Pilot, Standard, and Institution. 
              They are non-negotiable and built into our architecture.
            </p>
          </div>
          
          <div className="grid md:grid-cols-5 gap-4">
            <div className="text-center p-4">
              <div className="w-10 h-10 rounded-full bg-background flex items-center justify-center mx-auto mb-3">
                <Shield className="w-5 h-5 text-primary" />
              </div>
              <p className="font-medium text-sm text-foreground">No Content Reading</p>
              <p className="text-xs text-muted-foreground mt-1">We never see what students type or view</p>
            </div>
            <div className="text-center p-4">
              <div className="w-10 h-10 rounded-full bg-background flex items-center justify-center mx-auto mb-3">
                <Shield className="w-5 h-5 text-primary" />
              </div>
              <p className="font-medium text-sm text-foreground">No Keystroke Logging</p>
              <p className="text-xs text-muted-foreground mt-1">Zero capture of typing patterns</p>
            </div>
            <div className="text-center p-4">
              <div className="w-10 h-10 rounded-full bg-background flex items-center justify-center mx-auto mb-3">
                <Shield className="w-5 h-5 text-primary" />
              </div>
              <p className="font-medium text-sm text-foreground">No Screen Recording</p>
              <p className="text-xs text-muted-foreground mt-1">No screenshots or recordings</p>
            </div>
            <div className="text-center p-4">
              <div className="w-10 h-10 rounded-full bg-background flex items-center justify-center mx-auto mb-3">
                <Shield className="w-5 h-5 text-primary" />
              </div>
              <p className="font-medium text-sm text-foreground">No Behavioral Profiling</p>
              <p className="text-xs text-muted-foreground mt-1">No ML analyzing students</p>
            </div>
            <div className="text-center p-4">
              <div className="w-10 h-10 rounded-full bg-background flex items-center justify-center mx-auto mb-3">
                <Shield className="w-5 h-5 text-primary" />
              </div>
              <p className="font-medium text-sm text-foreground">No Accusations</p>
              <p className="text-xs text-muted-foreground mt-1">Events, never judgments</p>
            </div>
          </div>
        </div>

        {/* Upgrade Path Explanation */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-foreground text-center mb-8">
            Your Path Forward
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="border-dashed">
              <CardHeader className="text-center">
                <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 flex items-center justify-center mx-auto mb-2 text-lg font-bold">
                  1
                </div>
                <CardTitle className="text-lg">Start with Pilot</CardTitle>
              </CardHeader>
              <CardContent className="text-center text-sm text-muted-foreground">
                <p>
                  10-week evaluation period with full functionality. 
                  No payment required. Dedicated onboarding support. 
                  Weekly metrics reports to measure success.
                </p>
              </CardContent>
            </Card>
            <Card className="border-dashed">
              <CardHeader className="text-center">
                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 flex items-center justify-center mx-auto mb-2 text-lg font-bold">
                  2
                </div>
                <CardTitle className="text-lg">Graduate to Standard</CardTitle>
              </CardHeader>
              <CardContent className="text-center text-sm text-muted-foreground">
                <p>
                  After proving value, upgrade seamlessly. 
                  Extended limits for department-wide deployment. 
                  Longer retention for compliance needs. 
                  Pricing locked for 60 days post-pilot.
                </p>
              </CardContent>
            </Card>
            <Card className="border-dashed">
              <CardHeader className="text-center">
                <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 flex items-center justify-center mx-auto mb-2 text-lg font-bold">
                  3
                </div>
                <CardTitle className="text-lg">Scale to Institution</CardTitle>
              </CardHeader>
              <CardContent className="text-center text-sm text-muted-foreground">
                <p>
                  Campus-wide rollout with unlimited scale. 
                  Enterprise SSO and API integration. 
                  Dedicated customer success. 
                  Custom SLA to meet your requirements.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Call to Action */}
        <div className="text-center bg-primary/5 rounded-2xl p-8 border border-primary/20">
          <h2 className="text-xl font-bold text-foreground mb-2">
            Ready to protect academic integrity ethically?
          </h2>
          <p className="text-muted-foreground mb-6 max-w-lg mx-auto">
            Start with a free pilot. No credit card required. 
            We'll help you measure success before any commitment.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button size="lg" onClick={() => handleSelectPlan('pilot')}>
              Start Free Pilot
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate('/trust')}>
              Read Our Ethics Charter
            </Button>
          </div>
        </div>
      </main>

      {/* Upgrade Dialog */}
      <UpgradeDialog
        open={upgradeDialogOpen}
        onOpenChange={setUpgradeDialogOpen}
        targetPlan={selectedPlan}
      />
    </div>
  );
};

export default Pricing;
