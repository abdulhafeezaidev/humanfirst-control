import React, { useState } from 'react';
import { Shield, CheckCircle, AlertTriangle, Eye, Keyboard, Camera, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface EthicsDisclosureProps {
  userId: string;
  role: 'admin' | 'student';
  onAccepted: () => void;
}

const EthicsDisclosure: React.FC<EthicsDisclosureProps> = ({ userId, role, onAccepted }) => {
  const [acknowledged, setAcknowledged] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleAccept = async () => {
    if (!acknowledged) return;
    
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ ethics_accepted_at: new Date().toISOString() })
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: "Welcome!",
        description: "You can now access the application.",
      });
      
      onAccepted();
    } catch (error) {
      console.error('Error saving ethics acceptance:', error);
      toast({
        title: "Error",
        description: "Failed to save your acknowledgment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl border-primary/20">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Ethics & Privacy Disclosure</CardTitle>
          <CardDescription className="text-base">
            Please review our commitment to your privacy and academic integrity
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Core Privacy Commitments */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              Our Privacy Commitments
            </h3>
            
            <div className="grid gap-3">
              <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                <Eye className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">No Content Reading</p>
                  <p className="text-sm text-muted-foreground">
                    We never read, scan, or analyze the content of your documents, messages, or academic work.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                <Keyboard className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">No Keystroke Logging</p>
                  <p className="text-sm text-muted-foreground">
                    We do not record or monitor your keystrokes or typing patterns.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                <Camera className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">No Screen or Camera Recording</p>
                  <p className="text-sm text-muted-foreground">
                    We never capture screenshots, record your screen, or access your camera.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Exam Mode Information */}
          <div className="space-y-3">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              About Exam Mode
            </h3>
            <p className="text-muted-foreground">
              During scheduled exam periods, access to certain AI services may be temporarily restricted 
              to maintain academic integrity. You will always be informed when restrictions are active 
              and when they will end.
            </p>
          </div>

          {/* Policy Control */}
          <div className="space-y-3">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              Policy Administration
            </h3>
            <p className="text-muted-foreground">
              Exam policies and restrictions are managed by authorized administrators within your 
              institution. All administrative actions are logged for accountability and transparency.
            </p>
          </div>

          {/* Admin-specific note */}
          {role === 'admin' && (
            <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg space-y-2">
              <h3 className="font-semibold text-primary">Administrator Responsibilities</h3>
              <p className="text-sm text-muted-foreground">
                As an administrator, you have the ability to create and manage exam policies that affect 
                students. Please exercise this responsibility thoughtfully:
              </p>
              <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1 ml-2">
                <li>All your actions are recorded in an immutable audit log</li>
                <li>Students can see when policies are active and their restrictions</li>
                <li>Use restrictions only when necessary for academic integrity</li>
                <li>Communicate policy changes clearly to affected students</li>
              </ul>
            </div>
          )}

          {/* Acknowledgment */}
          <div className="pt-4 border-t space-y-4">
            <div className="flex items-start gap-3">
              <Checkbox 
                id="acknowledge" 
                checked={acknowledged}
                onCheckedChange={(checked) => setAcknowledged(checked === true)}
              />
              <label 
                htmlFor="acknowledge" 
                className="text-sm cursor-pointer leading-relaxed"
              >
                I have read and understand the ethics and privacy disclosure. I acknowledge that 
                {role === 'admin' 
                  ? ' my administrative actions will be logged and I will use my privileges responsibly.'
                  : ' AI services may be restricted during exam periods as determined by my institution.'}
              </label>
            </div>
            
            <Button 
              onClick={handleAccept} 
              disabled={!acknowledged || isSubmitting}
              className="w-full"
              size="lg"
            >
              {isSubmitting ? 'Saving...' : 'Continue to Application'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EthicsDisclosure;
