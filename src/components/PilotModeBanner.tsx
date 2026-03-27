import React from 'react';
import { FlaskConical } from 'lucide-react';

interface PilotModeBannerProps {
  className?: string;
}

const PilotModeBanner: React.FC<PilotModeBannerProps> = ({ className = '' }) => {
  return (
    <div className={`bg-amber-500 text-amber-950 ${className}`}>
      <div className="container mx-auto px-6 py-2 flex items-center justify-center gap-2 text-sm font-medium">
        <FlaskConical className="w-4 h-4" />
        <span>Pilot / Demo Environment</span>
        <span className="hidden sm:inline">— Policies are simulated and do not permanently lock devices</span>
      </div>
    </div>
  );
};

export default PilotModeBanner;
