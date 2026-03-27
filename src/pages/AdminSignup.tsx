import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Eye, EyeOff, ArrowLeft, Lock, Mail, User, Building2, Shield, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';
import humanfirstLogo from '@/assets/humanfirst-logo.png';

const signupSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
});

const institutionSchema = z.object({
  institutionName: z.string().min(3, 'Institution name must be at least 3 characters'),
  institutionSlug: z.string().min(3, 'Slug must be at least 3 characters').regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens'),
});

interface InvitationData {
  id: string;
  email: string;
  role: string;
  organization_id: string;
  organization_name: string;
  expires_at: string;
  is_valid: boolean;
}

const AdminSignup = () => {
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get('token');
  
  const [step, setStep] = useState<'signup' | 'institution'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [institutionName, setInstitutionName] = useState('');
  const [institutionSlug, setInstitutionSlug] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [invitationLoading, setInvitationLoading] = useState(!!inviteToken);
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  
  const { signUp, user, role } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Check for invitation token
  useEffect(() => {
    const checkInvitation = async () => {
      if (!inviteToken) {
        setInvitationLoading(false);
        return;
      }
      
      try {
        const { data, error } = await supabase.rpc('get_invitation_by_token', {
          p_token: inviteToken
        });
        
        if (error) throw error;
        
        if (data && data.length > 0) {
          const inv = data[0] as InvitationData;
          if (inv.is_valid) {
            setInvitation(inv);
            setEmail(inv.email);
          } else {
            toast({
              title: "Invalid Invitation",
              description: "This invitation has expired or already been used.",
              variant: "destructive",
            });
          }
        }
      } catch (error) {
        console.error('Error checking invitation:', error);
      } finally {
        setInvitationLoading(false);
      }
    };
    
    checkInvitation();
  }, [inviteToken, toast]);

  // Redirect if already logged in with role
  useEffect(() => {
    if (user && role && !isCreatingAccount) {
      const isAdminRole = role === 'super_admin' || role === 'admin' || role === 'viewer';
      navigate(isAdminRole ? '/admin' : '/student');
    }
  }, [user, role, navigate, isCreatingAccount]);

  // Auto-generate slug from institution name
  useEffect(() => {
    if (institutionName) {
      const slug = institutionName
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .substring(0, 50);
      setInstitutionSlug(slug);
    }
  }, [institutionName]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setIsSubmitting(true);
    setIsCreatingAccount(true);

    try {
      const result = signupSchema.safeParse({ email, password, fullName });
      if (!result.success) {
        const fieldErrors: Record<string, string> = {};
        result.error.errors.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(fieldErrors);
        setIsSubmitting(false);
        return;
      }

      const { error } = await signUp(email, password, fullName);
      if (error) {
        toast({
          title: "Sign up failed",
          description: error.message,
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      // If this is an invitation-based signup, use the invitation
      if (invitation && inviteToken) {
        // Wait for auth to complete
        const { data: { user: newUser } } = await supabase.auth.getUser();
        if (newUser) {
          const { data: useResult, error: useError } = await supabase.rpc('use_admin_invitation', {
            p_token: inviteToken,
            p_user_id: newUser.id
          }) as { data: { success: boolean; error?: string } | null; error: Error | null };
          
          if (useError || !useResult?.success) {
            toast({
              title: "Invitation Error",
              description: useResult?.error || "Failed to apply invitation",
              variant: "destructive",
            });
          } else {
            toast({
              title: "Welcome!",
              description: `You've joined ${invitation.organization_name} as ${invitation.role}`,
            });
            setIsCreatingAccount(false);
            navigate('/admin');
          }
        }
      } else {
        // New institution signup - proceed to step 2
        toast({
          title: "Account created!",
          description: "Now let's set up your institution.",
        });
        setStep('institution');
        // Keep isCreatingAccount true during institution setup
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateInstitution = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setIsSubmitting(true);

    try {
      const result = institutionSchema.safeParse({ institutionName, institutionSlug });
      if (!result.success) {
        const fieldErrors: Record<string, string> = {};
        result.error.errors.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(fieldErrors);
        setIsSubmitting(false);
        return;
      }

      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        toast({
          title: "Session Error",
          description: "Please sign in again",
          variant: "destructive",
        });
        setStep('signup');
        setIsSubmitting(false);
        return;
      }

      const { data: createResult, error: createError } = await supabase.rpc('create_institution_with_owner', {
        p_user_id: currentUser.id,
        p_institution_name: institutionName,
        p_institution_slug: institutionSlug
      }) as { data: { success: boolean; error?: string } | null; error: Error | null };

      if (createError || !createResult?.success) {
        toast({
          title: "Failed to create institution",
          description: createResult?.error || createError?.message || "Unknown error",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      toast({
        title: "Institution Created!",
        description: `Welcome to ${institutionName}. You're now the Owner.`,
      });
      
      setIsCreatingAccount(false);
      // Force refresh auth context
      window.location.href = '/admin';
    } finally {
      setIsSubmitting(false);
    }
  };

  if (invitationLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Checking invitation...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left side - Form */}
      <div className="flex-1 flex flex-col justify-center px-8 lg:px-16 xl:px-24">
        <div className="max-w-md w-full mx-auto">
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to home
          </button>

          {/* Header */}
          <div className="mb-8 animate-fade-in">
            <div className="flex items-center gap-3 mb-4">
              <img src={humanfirstLogo} alt="HumanFirst" className="w-12 h-12 rounded-2xl object-contain" />
              <span className="text-2xl font-bold text-foreground">HumanFirst</span>
            </div>
            
            {invitation ? (
              <>
                <h1 className="text-3xl font-bold text-foreground mb-2">
                  Join {invitation.organization_name}
                </h1>
                <p className="text-muted-foreground">
                  You've been invited as <span className="font-semibold text-primary">{invitation.role}</span>
                </p>
              </>
            ) : step === 'signup' ? (
              <>
                <h1 className="text-3xl font-bold text-foreground mb-2">
                  Create Admin Account
                </h1>
                <p className="text-muted-foreground">
                  Start your institution's journey with HumanFirst
                </p>
              </>
            ) : (
              <>
                <h1 className="text-3xl font-bold text-foreground mb-2">
                  Set Up Your Institution
                </h1>
                <p className="text-muted-foreground">
                  As the first admin, you'll be the Owner
                </p>
              </>
            )}
          </div>

          {/* Progress indicator */}
          {!invitation && (
            <div className="flex items-center gap-2 mb-8">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full ${step === 'signup' ? 'bg-primary text-primary-foreground' : 'bg-primary/20 text-primary'}`}>
                {step === 'institution' ? <Check className="w-4 h-4" /> : '1'}
              </div>
              <div className={`flex-1 h-1 ${step === 'institution' ? 'bg-primary' : 'bg-muted'}`} />
              <div className={`flex items-center justify-center w-8 h-8 rounded-full ${step === 'institution' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                2
              </div>
            </div>
          )}

          {step === 'signup' ? (
            <form onSubmit={handleSignup} className="space-y-5 animate-slide-up">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Your full name"
                    className="pl-12 h-12 rounded-xl"
                  />
                </div>
                {errors.fullName && (
                  <p className="text-destructive text-sm mt-1">{errors.fullName}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@institution.edu"
                    className="pl-12 h-12 rounded-xl"
                    disabled={!!invitation}
                  />
                </div>
                {errors.email && (
                  <p className="text-destructive text-sm mt-1">{errors.email}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    className="pl-12 pr-12 h-12 rounded-xl"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-destructive text-sm mt-1">{errors.password}</p>
                )}
              </div>

              <Button
                type="submit"
                variant="hero"
                size="lg"
                className="w-full"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Creating Account...' : invitation ? 'Join Institution' : 'Continue'}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleCreateInstitution} className="space-y-5 animate-slide-up">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Institution Name
                </label>
                <div className="relative">
                  <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    type="text"
                    value={institutionName}
                    onChange={(e) => setInstitutionName(e.target.value)}
                    placeholder="Springfield High School"
                    className="pl-12 h-12 rounded-xl"
                  />
                </div>
                {errors.institutionName && (
                  <p className="text-destructive text-sm mt-1">{errors.institutionName}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Institution Slug
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">humanfirst.app/</span>
                  <Input
                    type="text"
                    value={institutionSlug}
                    onChange={(e) => setInstitutionSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    placeholder="springfield-hs"
                    className="pl-32 h-12 rounded-xl"
                  />
                </div>
                <p className="text-muted-foreground text-xs mt-1">
                  This will be your unique institution URL
                </p>
                {errors.institutionSlug && (
                  <p className="text-destructive text-sm mt-1">{errors.institutionSlug}</p>
                )}
              </div>

              <div className="bg-accent/50 rounded-xl p-4 border border-border">
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-medium text-foreground text-sm">You'll be the Owner</p>
                    <p className="text-muted-foreground text-xs mt-1">
                      As the first admin, you have full control including inviting other admins and setting institution policies.
                    </p>
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                variant="hero"
                size="lg"
                className="w-full"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Creating Institution...' : 'Create Institution'}
              </Button>
            </form>
          )}

          <p className="mt-6 text-center text-muted-foreground animate-fade-in">
            Already have an account?{' '}
            <Link to="/auth" className="text-primary font-semibold hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>

      {/* Right side - Visual */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-primary/5 via-accent to-primary/10 items-center justify-center p-16">
        <div className="max-w-lg text-center animate-fade-in">
          <img src={humanfirstLogo} alt="HumanFirst" className="w-24 h-24 rounded-3xl object-contain mx-auto mb-8" />
          <h2 className="text-3xl font-bold text-foreground mb-4">
            Institution-First Design
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed mb-8">
            HumanFirst is built for educational institutions. Create your organization, 
            invite your team, and manage focused learning environments together.
          </p>
          
          <div className="space-y-4 text-left">
            <div className="flex items-start gap-3 bg-background/50 rounded-lg p-4">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Building2 className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground">Owner Role</p>
                <p className="text-sm text-muted-foreground">Full control over institution settings and admin management</p>
              </div>
            </div>
            <div className="flex items-start gap-3 bg-background/50 rounded-lg p-4">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Shield className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground">Standard Admin</p>
                <p className="text-sm text-muted-foreground">Manage policies and schedules within the institution</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminSignup;
