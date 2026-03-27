import React from 'react';
import { Shield, Check, X, Lock, FileText, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  ETHICAL_CONSTRAINTS, 
  V1_ENFORCEMENT_MECHANISMS,
  getConstraintDescription,
  getComplianceBadge,
} from '@/lib/ethicsValidator';

const EnforcementBoundaryCard: React.FC = () => {
  const badge = getComplianceBadge();

  const mechanisms = [
    {
      name: 'Focus Detection',
      description: 'Detects when exam app loses focus',
      detects: ['Tab hidden', 'App backgrounded', 'Extended focus loss'],
      neverDetects: ['What you switched to', 'Content viewed', 'Keyboard input'],
    },
    {
      name: 'Network Monitoring',
      description: 'Checks DNS integrity for AI service blocking',
      detects: ['DNS manipulation', 'Connectivity loss', 'DoH usage'],
      neverDetects: ['URLs visited', 'Page content', 'Traffic content'],
    },
    {
      name: 'Policy Cache',
      description: 'Stores exam policies locally with integrity checks',
      detects: ['Cache tampering', 'Stale policies', 'Sync failures'],
      neverDetects: ['Student activity', 'Browser history', 'File access'],
    },
    {
      name: 'Device Trust',
      description: 'Calculates device reliability score',
      detects: ['Event patterns', 'Session stability', 'Network anomalies'],
      neverDetects: ['Student identity', 'Academic performance', 'Behavior profiles'],
    },
  ];

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <div>
              <CardTitle className="flex items-center gap-2">
                Enforcement Boundaries
                <Lock className="w-4 h-4 text-muted-foreground" />
              </CardTitle>
              <CardDescription>v1.0 Scope - Locked</CardDescription>
            </div>
          </div>
          <Badge 
            variant={badge.status === 'compliant' ? 'default' : 'destructive'}
            className="gap-1"
          >
            <Check className="w-3 h-3" />
            Ethics Compliant
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Core Constraints */}
        <div>
          <h4 className="font-semibold mb-3 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-primary" />
            Core Ethical Constraints
          </h4>
          <div className="grid gap-2">
            {badge.constraints.map((constraint) => (
              <div 
                key={constraint.id}
                className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg"
              >
                <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                  constraint.compliant ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                }`}>
                  {constraint.compliant ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                </div>
                <div>
                  <p className="font-medium text-sm capitalize">
                    {constraint.name.replace(/_/g, ' ')}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {constraint.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Enforcement Mechanisms */}
        <div>
          <h4 className="font-semibold mb-3 flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            v1.0 Enforcement Mechanisms
          </h4>
          <div className="space-y-4">
            {mechanisms.map((mechanism) => (
              <div key={mechanism.name} className="border rounded-lg p-4">
                <h5 className="font-medium mb-1">{mechanism.name}</h5>
                <p className="text-sm text-muted-foreground mb-3">
                  {mechanism.description}
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-medium text-green-600 mb-1">
                      ✓ Detects
                    </p>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      {mechanism.detects.map((item) => (
                        <li key={item}>• {item}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-red-600 mb-1">
                      ✗ Never Detects
                    </p>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      {mechanism.neverDetects.map((item) => (
                        <li key={item}>• {item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Out of Scope */}
        <div className="p-4 bg-destructive/5 border border-destructive/20 rounded-lg">
          <h4 className="font-semibold text-destructive mb-2">
            Permanently Out of Scope
          </h4>
          <div className="flex flex-wrap gap-2">
            {[
              'Screen Recording',
              'Keystroke Logging',
              'Content Analysis',
              'Camera Access',
              'Eye Tracking',
              'Room Scanning',
              'ML Detection',
              'Proctoring',
            ].map((feature) => (
              <Badge key={feature} variant="outline" className="border-destructive/30 text-destructive">
                <X className="w-3 h-3 mr-1" />
                {feature}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default EnforcementBoundaryCard;
