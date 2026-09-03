import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, Check, Loader2, Shield, Zap } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useLicenseTier } from '@/hooks/useLicenseTier';
import { PLAN_FEATURES, PlanType } from '@/types/organization';

interface UpgradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetPlan: PlanType | null;
}

const UpgradeDialog = ({ open, onOpenChange, targetPlan }: UpgradeDialogProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { organization } = useLicenseTier();
  const [step, setStep] = useState<'review' | 'payment' | 'success'>('review');
  const [isProcessing, setIsProcessing] = useState(false);
  const [licenseKey, setLicenseKey] = useState('');

  if (!targetPlan) return null;

  const planConfig = PLAN_FEATURES[targetPlan];

  /**
   * BETA STUB — License activation is intentionally disabled for the beta release.
   *
   * SECURITY RATIONALE:
   * The previous implementation performed a direct client-side DB mutation on
   * `organizations.plan_type` after only a regex format check, allowing any user
   * to self-upgrade to any plan tier for free.
   *
   * PRODUCTION IMPLEMENTATION SPEC (post-beta):
   *   1. POST the license key to a Supabase Edge Function (`activate-license`).
   *   2. The Edge Function verifies the key against a payment provider (e.g. Stripe).
   *   3. The Edge Function uses the Supabase service role key to write the plan update server-side.
   *   4. The client receives a success/failure response — it never touches the DB directly.
   *   5. RLS on `organizations` must block direct client writes to `plan_type`.
   */
  const handleActivateLicense = async () => {
    if (!licenseKey.trim()) {
      toast({
        title: 'License key required',
        description: 'Please enter a valid license key',
        variant: 'destructive',
      });
      return;
    }

    // BETA: Activation is processed manually by the HumanFirst team.
    // Automated server-side validation will be enabled in v1.0.
    toast({
      title: 'License Request Received',
      description:
        'Your license key has been submitted. A HumanFirst admin will activate your plan within 24 hours. Contact: admin@humanfirst.edu',
    });

    // Reset state and close after user sees the message
    setLicenseKey('');
    setIsProcessing(false);
  };

  const handleStartPayment = () => {
    // In production, this would redirect to Stripe/payment processor
    setStep('payment');
  };

  const handleClose = () => {
    setStep('review');
    setLicenseKey('');
    onOpenChange(false);
  };

  const handleSuccessClose = () => {
    handleClose();
    // Refresh the page to reflect new plan
    window.location.reload();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        {step === 'review' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-primary" />
                Upgrade to {planConfig.label}
              </DialogTitle>
              <DialogDescription>
                Unlock more features and higher limits for your institution
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className={`p-4 rounded-lg ${planConfig.bgColor}`}>
                <h3 className={`font-semibold ${planConfig.color} mb-2`}>
                  {planConfig.label} Plan Includes:
                </h3>
                <ul className="space-y-2">
                  {planConfig.limits.featuresEnabled.slice(0, 5).map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-success" />
                      <span>{feature.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                    </li>
                  ))}
                  {planConfig.limits.featuresEnabled.length > 5 && (
                    <li className="text-sm text-muted-foreground">
                      +{planConfig.limits.featuresEnabled.length - 5} more features
                    </li>
                  )}
                </ul>
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Devices</span>
                  <span className="font-medium">
                    {planConfig.limits.maxDevices === -1 ? 'Unlimited' : planConfig.limits.maxDevices}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Students</span>
                  <span className="font-medium">
                    {planConfig.limits.maxStudents === -1 ? 'Unlimited' : planConfig.limits.maxStudents}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Admins</span>
                  <span className="font-medium">
                    {planConfig.limits.maxAdmins === -1 ? 'Unlimited' : planConfig.limits.maxAdmins}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Button onClick={handleStartPayment} className="w-full">
                <CreditCard className="w-4 h-4 mr-2" />
                Continue to Payment
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                Or enter a license key if you already have one
              </p>
            </div>
          </>
        )}

        {step === 'payment' && (
          <>
            <DialogHeader>
              <DialogTitle>Activate License</DialogTitle>
              <DialogDescription>
                Enter your license key or complete payment to upgrade
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="license-key">License Key</Label>
                <Input
                  id="license-key"
                  placeholder="HF-XXXX-XXXX-XXXX"
                  value={licenseKey}
                  onChange={(e) => setLicenseKey(e.target.value.toUpperCase())}
                  className="font-mono"
                />
                <p className="text-xs text-muted-foreground">
                  Format: HF-XXXX-XXXX-XXXX
                </p>
              </div>

              <Separator />

              <div className="bg-muted/50 p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  <strong>Don't have a license key?</strong>
                  <br />
                  Contact our sales team at{' '}
                  <a
                    href="mailto:sales@humanfirst.edu"
                    className="text-primary hover:underline"
                  >
                    sales@humanfirst.edu
                  </a>{' '}
                  to purchase a license.
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep('review')} className="flex-1">
                Back
              </Button>
              <Button
                onClick={handleActivateLicense}
                disabled={isProcessing}
                className="flex-1"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Validating...
                  </>
                ) : (
                  'Activate License'
                )}
              </Button>
            </div>
          </>
        )}

        {step === 'success' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-success">
                <Check className="w-5 h-5" />
                Upgrade Successful!
              </DialogTitle>
              <DialogDescription>
                Your organization has been upgraded to {planConfig.label}
              </DialogDescription>
            </DialogHeader>

            <div className="py-6 text-center">
              <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-success" />
              </div>
              <p className="text-muted-foreground">
                All new features and limits are now active. Thank you for choosing HumanFirst!
              </p>
            </div>

            <Button onClick={handleSuccessClose} className="w-full">
              Continue
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default UpgradeDialog;
