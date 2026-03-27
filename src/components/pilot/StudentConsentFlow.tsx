import React, { useState } from 'react';
import { 
  Shield, CheckCircle, Eye, Keyboard, Monitor, Camera, 
  ArrowRight, ArrowLeft, FileText, Download, Users,
  AlertTriangle, Lock, Heart, Scale
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface StudentConsentFlowProps {
  userId: string;
  studentName: string;
  organizationName: string;
  onConsentComplete: () => void;
  onDecline?: () => void;
}

const StudentConsentFlow: React.FC<StudentConsentFlowProps> = ({
  userId,
  studentName,
  organizationName,
  onConsentComplete,
  onDecline
}) => {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(0);
  const [consents, setConsents] = useState({
    understood_privacy: false,
    understood_policies: false,
    understood_data_rights: false,
    consent_to_processing: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const steps = [
    { title: 'Privacy Commitments', icon: Shield },
    { title: 'How It Works', icon: FileText },
    { title: 'Your Rights', icon: Scale },
    { title: 'Consent', icon: CheckCircle },
  ];

  const handleConsent = async () => {
    const allConsented = Object.values(consents).every(v => v);
    if (!allConsented) {
      toast({
        title: 'Please acknowledge all items',
        description: 'You must review and acknowledge all consent items to continue.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          ethics_accepted_at: new Date().toISOString() 
        })
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: 'Consent recorded',
        description: 'Thank you! You can now use HumanFirst.',
      });
      
      onConsentComplete();
    } catch (error) {
      console.error('Error saving consent:', error);
      toast({
        title: 'Error',
        description: 'Failed to save your consent. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">
                Our Privacy Commitments
              </h2>
              <p className="text-muted-foreground">
                HumanFirst is built on trust, not surveillance. Here's what we promise:
              </p>
            </div>

            <div className="grid gap-4">
              {[
                { icon: Eye, title: 'No Content Reading', desc: 'We never read, scan, or analyze your documents, messages, or academic work.' },
                { icon: Keyboard, title: 'No Keystroke Logging', desc: 'Your typing patterns and keyboard input are never recorded or analyzed.' },
                { icon: Monitor, title: 'No Screen Recording', desc: 'Your screen is never captured, recorded, or transmitted to anyone.' },
                { icon: Camera, title: 'No Camera Access', desc: 'We never access your camera or microphone. No facial recognition, ever.' },
                { icon: AlertTriangle, title: 'No Cheating Accusations', desc: 'HumanFirst never labels behavior as "cheating" - we provide tools, not verdicts.' },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-4 p-4 bg-success/5 border border-success/20 rounded-lg">
                  <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center flex-shrink-0">
                    <item.icon className="w-5 h-5 text-success" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground">{item.title}</h4>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">
                How HumanFirst Works
              </h2>
              <p className="text-muted-foreground">
                Understanding what happens during exam periods
              </p>
            </div>

            <div className="space-y-4">
              <Card className="border-primary/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Clock className="w-4 h-4 text-primary" />
                    Time-Based Policies
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Your institution creates exam policies with specific start and end times. 
                    You'll always see exactly when restrictions are active and when they end.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-primary/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Lock className="w-4 h-4 text-primary" />
                    Category Restrictions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    During exams, certain categories of services (like AI tools or social media) 
                    may be temporarily restricted. You'll see which categories are affected.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-primary/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="w-4 h-4 text-primary" />
                    Focus Signals
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    We may detect when the app loses focus (like switching tabs) during exams. 
                    This is only about timing - we never see what you switched to.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Scale className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">
                Your Data Rights
              </h2>
              <p className="text-muted-foreground">
                You have control over your data
              </p>
            </div>

            <div className="space-y-4">
              {[
                { 
                  title: 'Right to Access', 
                  desc: 'Request a copy of any data we hold about you at any time.' 
                },
                { 
                  title: 'Right to Deletion', 
                  desc: 'Request deletion of your data, subject to legal retention requirements.' 
                },
                { 
                  title: 'Right to Know', 
                  desc: 'Understand exactly what data is collected and why.' 
                },
                { 
                  title: 'Data Minimization', 
                  desc: 'We collect only the minimum data necessary for policy enforcement.' 
                },
                { 
                  title: 'Limited Retention', 
                  desc: 'Your data is automatically deleted according to retention policies.' 
                },
              ].map((right, i) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-foreground">{right.title}</h4>
                    <p className="text-sm text-muted-foreground">{right.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
              <p className="text-sm text-muted-foreground">
                <Heart className="w-4 h-4 inline mr-1 text-primary" />
                To exercise any of these rights, contact your institution's administrator 
                or email our support team.
              </p>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-success/10 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-success" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">
                Consent & Acknowledgment
              </h2>
              <p className="text-muted-foreground">
                Please review and acknowledge the following
              </p>
            </div>

            <div className="space-y-4">
              {[
                {
                  key: 'understood_privacy',
                  label: 'I understand that HumanFirst does not read my content, log keystrokes, record my screen, or access my camera.',
                },
                {
                  key: 'understood_policies',
                  label: 'I understand that exam policies may temporarily restrict access to certain services during defined time periods.',
                },
                {
                  key: 'understood_data_rights',
                  label: 'I understand my data rights including access, deletion, and the institution\'s data retention practices.',
                },
                {
                  key: 'consent_to_processing',
                  label: `I consent to ${organizationName} using HumanFirst for exam integrity purposes as described above.`,
                },
              ].map((item) => (
                <div 
                  key={item.key}
                  className={`flex items-start gap-3 p-4 rounded-lg border transition-colors ${
                    consents[item.key as keyof typeof consents]
                      ? 'bg-success/5 border-success/30'
                      : 'bg-muted/50 border-border'
                  }`}
                >
                  <Checkbox
                    id={item.key}
                    checked={consents[item.key as keyof typeof consents]}
                    onCheckedChange={(checked) => 
                      setConsents(prev => ({ ...prev, [item.key]: checked === true }))
                    }
                    className="mt-0.5"
                  />
                  <label htmlFor={item.key} className="text-sm cursor-pointer leading-relaxed">
                    {item.label}
                  </label>
                </div>
              ))}
            </div>

            <Separator />

            <div className="flex items-center justify-between gap-4">
              <Button 
                variant="ghost" 
                onClick={onDecline}
                className="text-muted-foreground"
              >
                I don't consent
              </Button>
              <Button 
                onClick={handleConsent}
                disabled={!Object.values(consents).every(v => v) || isSubmitting}
              >
                {isSubmitting ? 'Saving...' : 'I Consent & Continue'}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Progress */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {steps.map((step, index) => (
            <React.Fragment key={step.title}>
              <div 
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${
                  index === currentStep
                    ? 'bg-primary text-primary-foreground'
                    : index < currentStep
                      ? 'bg-success/10 text-success'
                      : 'bg-muted text-muted-foreground'
                }`}
              >
                {index < currentStep ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <step.icon className="w-4 h-4" />
                )}
                <span className="hidden sm:inline">{step.title}</span>
              </div>
              {index < steps.length - 1 && (
                <div className={`w-8 h-0.5 ${
                  index < currentStep ? 'bg-success' : 'bg-muted'
                }`} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Content */}
        <Card className="border-primary/20">
          <CardContent className="p-8">
            {renderStep()}

            {/* Navigation (not on consent step) */}
            {currentStep < 3 && (
              <div className="flex items-center justify-between mt-8 pt-6 border-t">
                {currentStep > 0 ? (
                  <Button variant="ghost" onClick={() => setCurrentStep(currentStep - 1)}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                  </Button>
                ) : (
                  <div />
                )}
                <Button onClick={() => setCurrentStep(currentStep + 1)}>
                  Continue
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Download Policy */}
        <div className="mt-4 text-center">
          <button className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
            <Download className="w-3 h-3" />
            Download full privacy policy
          </button>
        </div>
      </div>
    </div>
  );
};

// Missing Clock import - add it
import { Clock } from 'lucide-react';

export default StudentConsentFlow;
