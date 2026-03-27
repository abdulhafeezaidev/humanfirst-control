import { Eye, Lock, Monitor, ShieldCheck, FileText, Mic } from 'lucide-react';

const privacyGuarantees = [
  {
    icon: Eye,
    title: 'No Content Reading',
    description: 'Your documents and work remain completely private',
  },
  {
    icon: Lock,
    title: 'No Keystroke Logging',
    description: 'Your typing patterns are never tracked or recorded',
  },
  {
    icon: Monitor,
    title: 'No Screen Recording',
    description: 'Your screen is never captured or monitored',
  },
  {
    icon: Mic,
    title: 'No Audio/Video Capture',
    description: 'Your camera and microphone are never accessed',
  },
  {
    icon: FileText,
    title: 'No Behavior Scoring',
    description: 'We don\'t analyze or score your behavior patterns',
  },
  {
    icon: ShieldCheck,
    title: 'No Cheating Accusations',
    description: 'Policies focus on access, not judging intent',
  },
];

interface PrivacyGuaranteesCardProps {
  compact?: boolean;
}

const PrivacyGuaranteesCard = ({ compact = false }: PrivacyGuaranteesCardProps) => {
  const displayItems = compact ? privacyGuarantees.slice(0, 3) : privacyGuarantees;
  
  return (
    <div className="glass-card p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
          <ShieldCheck className="w-5 h-5 text-success" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground">Your Privacy Guarantees</h3>
          <p className="text-sm text-muted-foreground">What we never do</p>
        </div>
      </div>

      <div className={`grid gap-4 ${compact ? 'md:grid-cols-3' : 'sm:grid-cols-2 lg:grid-cols-3'}`}>
        {displayItems.map((item) => (
          <div key={item.title} className="flex items-start gap-3 p-3 rounded-lg bg-success/5 border border-success/10">
            <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center flex-shrink-0">
              <item.icon className="w-4 h-4 text-success" />
            </div>
            <div className="min-w-0">
              <h4 className="font-medium text-foreground text-sm">{item.title}</h4>
              <p className="text-xs text-muted-foreground">{item.description}</p>
            </div>
          </div>
        ))}
      </div>
      
      {compact && (
        <p className="text-xs text-muted-foreground text-center mt-4">
          HumanFirst believes education thrives on trust, not surveillance.
        </p>
      )}
    </div>
  );
};

export default PrivacyGuaranteesCard;
