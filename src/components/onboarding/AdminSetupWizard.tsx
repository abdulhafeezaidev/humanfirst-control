import React, { useState } from 'react';
import { Shield, Building2, Users, Monitor, FileText, CheckCircle, ArrowRight, ArrowLeft, Info, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface AdminSetupWizardProps {
  userId: string;
  onComplete: () => void;
}

const AdminSetupWizard: React.FC<AdminSetupWizardProps> = ({ userId, onComplete }) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  
  // Form state
  const [orgName, setOrgName] = useState('');
  const [orgSlug, setOrgSlug] = useState('');
  const [enablePilotMode, setEnablePilotMode] = useState(true);
  const [policyTitle, setPolicyTitle] = useState('');
  const [policyDescription, setPolicyDescription] = useState('');
  const [blockedCategories, setBlockedCategories] = useState(['AI Tools']);

  const steps = [
    { title: 'Welcome', icon: Shield, description: 'Introduction to HumanFirst' },
    { title: 'Organization', icon: Building2, description: 'Set up your institution' },
    { title: 'Pilot Mode', icon: Monitor, description: 'Configure initial settings' },
    { title: 'First Policy', icon: FileText, description: 'Create your first exam policy' },
    { title: 'Complete', icon: CheckCircle, description: 'Ready to go!' },
  ];

  const availableCategories = ['AI Tools', 'Social Media', 'Entertainment', 'Gaming', 'Messaging'];

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

  const handleCreateOrganization = async () => {
    if (!orgName || !orgSlug) {
      toast({ title: "Please fill in all fields", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      // Create organization
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name: orgName,
          slug: orgSlug.toLowerCase().replace(/\s+/g, '-'),
          plan_type: 'pilot',
          pilot_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
        })
        .select()
        .single();

      if (orgError) throw orgError;

      // Update user profile with organization
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ organization_id: org.id })
        .eq('user_id', userId);

      if (profileError) throw profileError;

      // Create enforcement config for this org
      const { error: configError } = await supabase
        .from('enforcement_config')
        .insert({
          organization_id: org.id,
          status: 'not_connected',
          pilot_mode: enablePilotMode,
          pilot_mode_enabled_at: enablePilotMode ? new Date().toISOString() : null,
          pilot_mode_enabled_by: enablePilotMode ? userId : null,
        });

      if (configError) throw configError;

      toast({ title: "Organization created successfully!" });
      handleNext();
    } catch (error: any) {
      toast({ title: "Error creating organization", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePolicy = async () => {
    if (!policyTitle) {
      toast({ title: "Please provide a policy title", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      // Get user's organization
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('user_id', userId)
        .single();

      if (!profile?.organization_id) {
        throw new Error('Organization not found');
      }

      // Create a sample policy (scheduled for tomorrow)
      const startTime = new Date();
      startTime.setDate(startTime.getDate() + 1);
      startTime.setHours(9, 0, 0, 0);
      
      const endTime = new Date(startTime);
      endTime.setHours(12, 0, 0, 0);

      const { error } = await supabase
        .from('exam_policies')
        .insert({
          title: policyTitle,
          description: policyDescription || 'Created during setup wizard',
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          blocked_categories: blockedCategories,
          created_by: userId,
          organization_id: profile.organization_id,
          is_active: true,
        });

      if (error) throw error;

      toast({ title: "Policy created successfully!" });
      handleNext();
    } catch (error: any) {
      toast({ title: "Error creating policy", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSkipPolicy = () => {
    handleNext();
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
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
                Let's set up your privacy-first educational control platform. 
                This wizard will guide you through organization creation, 
                initial settings, and creating your first exam policy.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
              <div className="p-4 bg-success/5 border border-success/20 rounded-xl">
                <CheckCircle className="w-6 h-6 text-success mx-auto mb-2" />
                <p className="text-sm font-medium text-foreground">No Content Reading</p>
                <p className="text-xs text-muted-foreground">Privacy guaranteed</p>
              </div>
              <div className="p-4 bg-success/5 border border-success/20 rounded-xl">
                <CheckCircle className="w-6 h-6 text-success mx-auto mb-2" />
                <p className="text-sm font-medium text-foreground">No Surveillance</p>
                <p className="text-xs text-muted-foreground">Built on trust</p>
              </div>
              <div className="p-4 bg-success/5 border border-success/20 rounded-xl">
                <CheckCircle className="w-6 h-6 text-success mx-auto mb-2" />
                <p className="text-sm font-medium text-foreground">Full Transparency</p>
                <p className="text-xs text-muted-foreground">Students see everything</p>
              </div>
            </div>
          </div>
        );

      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Building2 className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">Create Your Organization</h2>
              <p className="text-muted-foreground">Set up your institution or department</p>
            </div>
            <div className="max-w-md mx-auto space-y-4">
              <div className="space-y-2">
                <Label htmlFor="orgName">Organization Name</Label>
                <Input
                  id="orgName"
                  placeholder="e.g., University of Example"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="orgSlug">Organization Slug</Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">A unique identifier for your organization used in URLs and integrations.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Input
                  id="orgSlug"
                  placeholder="e.g., university-example"
                  value={orgSlug}
                  onChange={(e) => setOrgSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                />
                <p className="text-xs text-muted-foreground">Used for identification. Letters, numbers, and hyphens only.</p>
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mx-auto mb-4">
                <Monitor className="w-8 h-8 text-amber-600" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">Pilot Mode Settings</h2>
              <p className="text-muted-foreground">Configure how HumanFirst operates initially</p>
            </div>
            <div className="max-w-lg mx-auto">
              <div className="p-6 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-xl">
                <div className="flex items-start gap-4">
                  <input
                    type="checkbox"
                    id="pilotMode"
                    checked={enablePilotMode}
                    onChange={(e) => setEnablePilotMode(e.target.checked)}
                    className="mt-1 w-5 h-5 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                  />
                  <div>
                    <label htmlFor="pilotMode" className="font-semibold text-foreground cursor-pointer">
                      Enable Pilot Mode (Recommended)
                    </label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Pilot Mode allows you to test policies without enforcing restrictions. 
                      All events are logged for compliance metrics, but students can still access services normally.
                    </p>
                    <div className="mt-3 space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-success">
                        <CheckCircle className="w-4 h-4" />
                        <span>Safe testing environment</span>
                      </div>
                      <div className="flex items-center gap-2 text-success">
                        <CheckCircle className="w-4 h-4" />
                        <span>Full logging and metrics</span>
                      </div>
                      <div className="flex items-center gap-2 text-success">
                        <CheckCircle className="w-4 h-4" />
                        <span>No disruption to students</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground text-center mt-4">
                You can disable Pilot Mode anytime from the admin dashboard when ready for full enforcement.
              </p>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">Create Your First Policy</h2>
              <p className="text-muted-foreground">Set up an exam or focus mode policy</p>
            </div>
            <div className="max-w-md mx-auto space-y-4">
              <div className="space-y-2">
                <Label htmlFor="policyTitle">Policy Title</Label>
                <Input
                  id="policyTitle"
                  placeholder="e.g., Midterm Exam - Mathematics"
                  value={policyTitle}
                  onChange={(e) => setPolicyTitle(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="policyDescription">Description (Optional)</Label>
                <Input
                  id="policyDescription"
                  placeholder="Brief description of this policy"
                  value={policyDescription}
                  onChange={(e) => setPolicyDescription(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label>Blocked Categories</Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">Select which types of services should be restricted during this exam period.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="flex flex-wrap gap-2">
                  {availableCategories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => {
                        if (blockedCategories.includes(cat)) {
                          setBlockedCategories(blockedCategories.filter(c => c !== cat));
                        } else {
                          setBlockedCategories([...blockedCategories, cat]);
                        }
                      }}
                      className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                        blockedCategories.includes(cat)
                          ? 'bg-destructive/10 border-destructive/30 text-destructive'
                          : 'bg-muted border-border text-muted-foreground hover:border-primary/50'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
              <p className="text-xs text-muted-foreground text-center pt-2">
                This will create a sample policy scheduled for tomorrow 9:00-12:00. You can edit the timing later.
              </p>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="text-center space-y-6">
            <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mx-auto">
              <CheckCircle className="w-10 h-10 text-success" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-3">Setup Complete!</h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                Your HumanFirst platform is ready. You can now manage policies, 
                invite students, and monitor compliance metrics from your dashboard.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 max-w-lg mx-auto">
              <div className="p-4 bg-muted/50 rounded-xl text-left">
                <h4 className="font-semibold text-foreground mb-1">Next Steps</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Configure AI services</li>
                  <li>• Invite students</li>
                  <li>• Review audit logs</li>
                </ul>
              </div>
              <div className="p-4 bg-muted/50 rounded-xl text-left">
                <h4 className="font-semibold text-foreground mb-1">Resources</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Trust & Ethics page</li>
                  <li>• Policy Transparency</li>
                  <li>• Data Retention settings</li>
                </ul>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6 relative">
      {/* Sign Out Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleSignOut}
        className="absolute top-4 right-4 gap-2"
      >
        <LogOut className="w-4 h-4" />
        <span className="hidden sm:inline">Sign Out</span>
      </Button>

      <div className="w-full max-w-2xl">
        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8">
          {steps.map((step, index) => (
            <React.Fragment key={step.title}>
              <div className="flex flex-col items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                  index < currentStep
                    ? 'bg-success text-success-foreground'
                    : index === currentStep
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {index < currentStep ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    <step.icon className="w-5 h-5" />
                  )}
                </div>
                <span className={`text-xs mt-1 hidden sm:block ${
                  index === currentStep ? 'text-foreground font-medium' : 'text-muted-foreground'
                }`}>
                  {step.title}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div className={`w-12 sm:w-20 h-0.5 mx-1 ${
                  index < currentStep ? 'bg-success' : 'bg-muted'
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
            {currentStep > 0 && currentStep < steps.length - 1 ? (
              <Button variant="ghost" onClick={handleBack} disabled={loading}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            ) : (
              <div />
            )}

            {currentStep === 0 && (
              <Button onClick={handleNext} className="ml-auto">
                Get Started
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            )}

            {currentStep === 1 && (
              <Button onClick={handleCreateOrganization} disabled={loading || !orgName || !orgSlug}>
                {loading ? 'Creating...' : 'Create Organization'}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            )}

            {currentStep === 2 && (
              <Button onClick={handleNext}>
                Continue
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            )}

            {currentStep === 3 && (
              <div className="flex gap-2">
                <Button variant="ghost" onClick={handleSkipPolicy}>
                  Skip for now
                </Button>
                <Button onClick={handleCreatePolicy} disabled={loading || !policyTitle}>
                  {loading ? 'Creating...' : 'Create Policy'}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            )}

            {currentStep === 4 && (
              <Button onClick={onComplete} className="ml-auto">
                Go to Dashboard
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminSetupWizard;
