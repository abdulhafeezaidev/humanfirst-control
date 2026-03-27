import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, AlertTriangle, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLicenseTier } from '@/hooks/useLicenseTier';

export const PilotExpiryBanner = () => {
  const navigate = useNavigate();
  const { licenseStatus } = useLicenseTier();
  const [timeRemaining, setTimeRemaining] = useState<string>('');

  useEffect(() => {
    if (!licenseStatus.expiresAt || licenseStatus.planType !== 'pilot') return;

    const updateCountdown = () => {
      const now = new Date();
      const diff = licenseStatus.expiresAt!.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeRemaining('Expired');
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      if (days > 0) {
        setTimeRemaining(`${days}d ${hours}h remaining`);
      } else if (hours > 0) {
        setTimeRemaining(`${hours}h ${minutes}m remaining`);
      } else {
        setTimeRemaining(`${minutes}m remaining`);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [licenseStatus.expiresAt, licenseStatus.planType]);

  if (licenseStatus.planType !== 'pilot') return null;

  const isExpired = licenseStatus.isExpired;
  const isUrgent = licenseStatus.daysRemaining !== null && licenseStatus.daysRemaining <= 7;

  return (
    <div
      className={`px-4 py-3 flex items-center justify-between gap-4 ${
        isExpired
          ? 'bg-destructive/10 border-b border-destructive/20'
          : isUrgent
          ? 'bg-warning/10 border-b border-warning/20'
          : 'bg-accent border-b border-border'
      }`}
    >
      <div className="flex items-center gap-3">
        {isExpired ? (
          <AlertTriangle className="w-5 h-5 text-destructive" />
        ) : isUrgent ? (
          <AlertTriangle className="w-5 h-5 text-warning" />
        ) : (
          <Clock className="w-5 h-5 text-muted-foreground" />
        )}
        <div>
          <p className={`font-medium ${isExpired ? 'text-destructive' : 'text-foreground'}`}>
            {isExpired
              ? 'Pilot Period Expired'
              : `Pilot License: ${timeRemaining}`}
          </p>
          <p className="text-sm text-muted-foreground">
            {isExpired
              ? 'Policy creation is locked. Existing policies remain active. Upgrade to continue.'
              : isUrgent
              ? 'Your pilot is ending soon. Upgrade to keep full access.'
              : 'Upgrade anytime to unlock all features and remove limits.'}
          </p>
        </div>
      </div>
      <Button
        onClick={() => navigate('/pricing')}
        variant={isExpired || isUrgent ? 'default' : 'outline'}
        size="sm"
        className="shrink-0"
      >
        <Zap className="w-4 h-4 mr-1" />
        {isExpired ? 'Upgrade Now' : 'View Plans'}
      </Button>
    </div>
  );
};

export default PilotExpiryBanner;
