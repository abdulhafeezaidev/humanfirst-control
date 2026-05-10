import React, { useState } from 'react';
import { 
  Shield, CheckCircle, ArrowRight, ArrowLeft, Eye, Lock, Monitor, 
  FlaskConical, AlertTriangle, Download, Smartphone, Laptop, Info,
  Terminal, ShieldCheck, Activity
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface StudentOnboardingProps {
  onComplete: () => void;
}

const StudentOnboarding: React.FC<StudentOnboardingProps> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    { title: 'Welcome', description: 'Introduction' },
    { title: 'Privacy', description: 'Your rights' },
    { title: 'Desktop App', description: 'Agent Setup' },
    { title: 'How it Works', description: 'Understanding policies' },
    { title: 'Pilot Mode', description: 'Testing period' },
    { title: 'Ready', description: 'Get started' },
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="text-center space-y-6">
            <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
              <Shield className="w-10 h-10 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-3">Welcome to HumanFirst</h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                Your institution uses HumanFirst to manage focus periods during exams. 
                This platform is built on trust and transparency — not surveillance.
              </p>
            </div>
            <div className="p-4 bg-success/5 border border-success/20 rounded-xl max-w-md mx-auto">
              <p className="text-sm text-foreground">
                <strong>Key Promise:</strong> HumanFirst never reads your content, 
                logs your keystrokes, records your screen, or makes accusations about your behavior.
              </p>
            </div>
          </div>
        );

      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-foreground">Your Privacy Guarantees</h2>
              <p className="text-muted-foreground">What HumanFirst explicitly does NOT do</p>
            </div>
            <div className="grid sm:grid-cols-2 gap-4 max-w-lg mx-auto">
              <div className="p-5 bg-success/5 border border-success/20 rounded-xl">
                <div className="flex items-center gap-3 mb-2">
                  <Eye className="w-6 h-6 text-success" />
                  <span className="font-semibold text-foreground">No Content Reading</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Your documents, messages, and typing content are never accessed or stored.
                </p>
              </div>
              <div className="p-5 bg-success/5 border border-success/20 rounded-xl">
                <div className="flex items-center gap-3 mb-2">
                  <Lock className="w-6 h-6 text-success" />
                  <span className="font-semibold text-foreground">No Keystroke Logging</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Your typing patterns and keyboard activity are never tracked.
                </p>
              </div>
              <div className="p-5 bg-success/5 border border-success/20 rounded-xl">
                <div className="flex items-center gap-3 mb-2">
                  <Monitor className="w-6 h-6 text-success" />
                  <span className="font-semibold text-foreground">No Screen Recording</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Your screen is never captured, recorded, or monitored.
                </p>
              </div>
              <div className="p-5 bg-success/5 border border-success/20 rounded-xl">
                <div className="flex items-center gap-3 mb-2">
                  <AlertTriangle className="w-6 h-6 text-success" />
                  <span className="font-semibold text-foreground">No Accusations</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  HumanFirst never labels behavior as "cheating" or makes judgments about you.
                </p>
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Terminal className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">The Background Agent</h2>
              <p className="text-muted-foreground">How the desktop app works on Windows</p>
            </div>
            <div className="max-w-lg mx-auto space-y-4">
              <div className="p-4 bg-muted/50 rounded-xl flex gap-4">
                <ShieldCheck className="w-6 h-6 text-primary shrink-0 mt-1" />
                <div>
                  <h4 className="font-semibold text-foreground">Silent Background Protection</h4>
                  <p className="text-sm text-muted-foreground">
                    A small background agent (ControlPlane.Agent) manages network policies locally. 
                    It doesn't slow down your computer and stays idle when no exams are active.
                  </p>
                </div>
              </div>
              <div className="p-4 bg-muted/50 rounded-xl flex gap-4">
                <Activity className="w-6 h-6 text-primary shrink-0 mt-1" />
                <div>
                  <h4 className="font-semibold text-foreground">Real-time Connection</h4>
                  <p className="text-sm text-muted-foreground">
                    The app connects to the agent using a secure "Named Pipe". 
                    This ensures the website and the desktop app stay in sync instantly.
                  </p>
                </div>
              </div>
              <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl">
                <p className="text-xs text-center text-muted-foreground leading-relaxed">
                  <strong>Pro Tip:</strong> If the app feels "stuck", you can use the <strong>Desktop Diagnostics</strong> 
                  link on your dashboard to check the agent's health.
                </p>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-foreground">How Policies Work</h2>
              <p className="text-muted-foreground">Understanding exam mode and restrictions</p>
            </div>
            <div className="max-w-lg mx-auto space-y-4">
              <div className="p-5 bg-muted/50 rounded-xl">
                <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                  📅 Time-Based Policies
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">Policies only apply during their scheduled time window.</p>
                    </TooltipContent>
                  </Tooltip>
                </h4>
                <p className="text-sm text-muted-foreground">
                  Exam policies have specific start and end times. You'll always know 
                  exactly when restrictions begin and end.
                </p>
              </div>
              <div className="p-5 bg-muted/50 rounded-xl">
                <h4 className="font-semibold text-foreground mb-2">🚫 Category-Based Restrictions</h4>
                <p className="text-sm text-muted-foreground">
                  Policies restrict categories of services (like AI Tools or Social Media), 
                  not individual actions. You'll see which categories are blocked.
                </p>
              </div>
              <div className="p-5 bg-muted/50 rounded-xl">
                <h4 className="font-semibold text-foreground mb-2">👀 Full Transparency</h4>
                <p className="text-sm text-muted-foreground">
                  Your dashboard shows exactly what's restricted and why. 
                  No hidden monitoring — what you see is what happens.
                </p>
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mx-auto mb-4">
                <FlaskConical className="w-8 h-8 text-amber-600" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">Understanding Pilot Mode</h2>
              <p className="text-muted-foreground">What it means when you see the yellow banner</p>
            </div>
            <div className="max-w-lg mx-auto">
              <div className="p-6 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-xl">
                <div className="flex items-start gap-4">
                  <FlaskConical className="w-8 h-8 text-amber-600 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-foreground mb-2">Pilot / Demo Environment</h4>
                    <p className="text-sm text-muted-foreground mb-4">
                      When Pilot Mode is active, you'll see a yellow banner at the top of your screen. 
                      This means:
                    </p>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-success mt-0.5 flex-shrink-0" />
                        <span className="text-muted-foreground">Policies are being <strong className="text-foreground">tested</strong>, not enforced</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-success mt-0.5 flex-shrink-0" />
                        <span className="text-muted-foreground">You can still access all services normally</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-success mt-0.5 flex-shrink-0" />
                        <span className="text-muted-foreground">Compliance metrics are logged for administrators</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-success mt-0.5 flex-shrink-0" />
                        <span className="text-muted-foreground">No permanent restrictions or device locks</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground text-center mt-4">
                Pilot Mode helps your institution test the system before full deployment.
              </p>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="text-center space-y-6">
            <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mx-auto">
              <CheckCircle className="w-10 h-10 text-success" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-3">You're All Set!</h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                You now understand how HumanFirst works. Your dashboard will show 
                you active policies, upcoming exam periods, and your privacy guarantees.
              </p>
            </div>
            <div className="p-5 bg-primary/5 border border-primary/20 rounded-xl max-w-md mx-auto">
              <h4 className="font-semibold text-foreground mb-2">Quick Reference</h4>
              <ul className="text-sm text-muted-foreground space-y-1 text-left">
                <li>• <strong>Green banner</strong> = No active restrictions</li>
                <li>• <strong>Yellow banner</strong> = Exam mode active (or Pilot Mode)</li>
                <li>• <strong>Desktop Helper</strong> = Use diagnostics if connection fails</li>
              </ul>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        {/* Progress */}
        <div className="flex items-center justify-center mb-8">
          {steps.map((step, index) => (
            <React.Fragment key={step.title}>
              <div className={`w-3 h-3 rounded-full transition-colors ${
                index <= currentStep ? 'bg-primary' : 'bg-muted'
              }`} />
              {index < steps.length - 1 && (
                <div className={`w-8 sm:w-12 h-0.5 ${
                  index < currentStep ? 'bg-primary' : 'bg-muted'
                }`} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Step Content */}
        <div className="glass-card p-8">
          {renderStepContent()}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
            {currentStep > 0 ? (
              <Button variant="ghost" onClick={handleBack}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            ) : (
              <div />
            )}

            {currentStep < steps.length - 1 ? (
              <Button onClick={handleNext}>
                Continue
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={onComplete}>
                Go to Dashboard
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>
        </div>

        {/* Skip option */}
        {currentStep < steps.length - 1 && (
          <p className="text-center mt-4">
            <button 
              onClick={onComplete}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Skip introduction →
            </button>
          </p>
        )}
      </div>
    </div>
  );
};

export default StudentOnboarding;
