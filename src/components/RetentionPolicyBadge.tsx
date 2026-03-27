import { Clock } from 'lucide-react';

interface RetentionPolicyBadgeProps {
  retentionDays: number;
  type: 'audit' | 'tamper';
}

const RetentionPolicyBadge = ({ retentionDays, type }: RetentionPolicyBadgeProps) => {
  return (
    <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-muted text-muted-foreground text-xs">
      <Clock className="w-3 h-3" />
      <span>
        {type === 'audit' ? 'Audit' : 'Event'} retention: {retentionDays} days
      </span>
    </div>
  );
};

export default RetentionPolicyBadge;
