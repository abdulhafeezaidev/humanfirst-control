import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, ArrowLeft, Lock, Mail, User, Heart, Shield, GraduationCap, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';
import humanfirstLogo from '@/assets/humanfirst-logo.png';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const signupSchema = loginSchema.extend({
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
});

const emailSchema = z.object({
  email: z.string().email('Please enter a valid email'),
});

/** Turn opaque network errors into actionable messages. */
function friendlyAuthError(err: Error): string {
  const msg = err.message?.toLowerCase() ?? '';
  if (msg.includes('no such host') || msg.includes('name or service not known') || msg.includes('cannot resolve') || msg.includes('dns')) {
    return 'The app cannot resolve the configured Supabase host. Check VITE_SUPABASE_URL in .env and confirm your DNS/network can reach that project.';
  }
  if (msg.includes('failed to fetch') || msg.includes('networkerror') || msg.includes('load failed')) {
    return 'Unable to reach the server. Please check your internet connection and try again. If the problem persists, the database may be temporarily unavailable.';
  }
  return err.message;
}

type UserType = 'admin' | 'student' | null;
type AuthView = 'selection' | 'login' | 'forgot-password';

const Auth = () => {
  const [userType, setUserType] = useState<UserType>(null);
  const [authView, setAuthView] = useState<AuthView>('selection');
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const { signIn, signUp, user, role } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (user && role) {
      // Route admin roles to admin dashboard, students to student dashboard
      const isAdminRole = role === 'super_admin' || role === 'admin' || role === 'viewer';
      navigate(isAdminRole ? '/admin' : '/student');
    }
  }, [user, role, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setIsSubmitting(true);

    try {
      if (isLogin) {
        const result = loginSchema.safeParse({ email, password });
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

        const { error } = await signIn(email, password);
        if (error) {
          toast({
            title: "Sign in failed",
            description: friendlyAuthError(error),
            variant: "destructive",
          });
        }
      } else {
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
            description: friendlyAuthError(error),
            variant: "destructive",
          });
        } else {
          toast({
            title: "Account created!",
            description: "Please check your email to verify your account, then sign in.",
          });
          setIsLogin(true);
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setIsSubmitting(true);

    try {
      const result = emailSchema.safeParse({ email });
      if (!result.success) {
        setErrors({ email: result.error.errors[0].message });
        setIsSubmitting(false);
        return;
      }

      const redirectUrl = `${window.location.origin}/reset-password`;
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });

      if (error) {
        toast({
          title: "Failed to send reset email",
          description: friendlyAuthError(error),
          variant: "destructive",
        });
      } else {
        setResetEmailSent(true);
        toast({
          title: "Reset email sent",
          description: "Check your inbox for the password reset link.",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackToSelection = () => {
    setUserType(null);
    setAuthView('selection');
    setEmail('');
    setPassword('');
    setFullName('');
    setErrors({});
    setResetEmailSent(false);
  };

  const handleBackToLogin = () => {
    setAuthView('login');
    setErrors({});
    setResetEmailSent(false);
  };

  // Forgot Password screen
  if (authView === 'forgot-password') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <button
              onClick={handleBackToLogin}
              className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4 transition-colors text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to sign in
            </button>
            <div className="flex items-center gap-3 mb-2">
              <img src={humanfirstLogo} alt="HumanFirst" className="w-10 h-10 rounded-xl object-contain" />
              <span className="text-xl font-bold text-foreground">HumanFirst</span>
            </div>
            <CardTitle>Reset Your Password</CardTitle>
            <CardDescription>
              {resetEmailSent 
                ? "We've sent you an email with a link to reset your password."
                : "Enter your email address and we'll send you a link to reset your password."
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {resetEmailSent ? (
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                  <p className="text-sm text-muted-foreground">
                    Didn't receive the email? Check your spam folder or{' '}
                    <button 
                      onClick={() => setResetEmailSent(false)}
                      className="text-primary font-medium hover:underline"
                    >
                      try again
                    </button>
                  </p>
                </div>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleBackToLogin}
                >
                  Back to Sign In
                </Button>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email"
                      className="pl-12 h-12 rounded-xl"
                    />
                  </div>
                  {errors.email && (
                    <p className="text-destructive text-sm mt-1">{errors.email}</p>
                  )}
                </div>

                <Button
                  type="submit"
                  variant="hero"
                  size="lg"
                  className="w-full"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    'Send Reset Link'
                  )}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Role selection screen
  if (!userType || authView === 'selection') {
    return (
      <div className="min-h-screen bg-background flex">
        {/* Left side - Selection */}
        <div className="flex-1 flex flex-col justify-center px-8 lg:px-16 xl:px-24">
          <div className="max-w-md w-full mx-auto">
            <button
              onClick={() => navigate('/')}
              className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to home
            </button>

            <div className="mb-8 animate-fade-in">
              <div className="flex items-center gap-3 mb-4">
                <img src={humanfirstLogo} alt="HumanFirst" className="w-12 h-12 rounded-2xl object-contain" />
                <span className="text-2xl font-bold text-foreground">HumanFirst</span>
              </div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                Welcome to HumanFirst
              </h1>
              <p className="text-muted-foreground">
                Select your role to continue
              </p>
            </div>

            <div className="space-y-4 animate-slide-up delay-100">
              <Card 
                className="cursor-pointer transition-all hover:border-primary hover:shadow-lg group"
                onClick={() => { setUserType('admin'); setAuthView('login'); }}
              >
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <Shield className="w-7 h-7 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-foreground">Administrator</h3>
                    <p className="text-sm text-muted-foreground">
                      Manage policies, view analytics, and oversee enforcement
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card 
                className="cursor-pointer transition-all hover:border-primary hover:shadow-lg group"
                onClick={() => { setUserType('student'); setAuthView('login'); }}
              >
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-accent/50 flex items-center justify-center group-hover:bg-accent transition-colors">
                    <GraduationCap className="w-7 h-7 text-foreground" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-foreground">Student</h3>
                    <p className="text-sm text-muted-foreground">
                      View active policies and understand your privacy rights
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="mt-8 pt-6 border-t border-border">
              <Link 
                to="/trust" 
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                <Heart className="w-4 h-4" />
                Read our Trust & Ethics commitment
              </Link>
            </div>
          </div>
        </div>

        {/* Right side - Visual */}
        <div className="hidden lg:flex flex-1 bg-gradient-to-br from-primary/5 via-accent to-primary/10 items-center justify-center p-16">
          <div className="max-w-lg text-center animate-fade-in">
            <img src={humanfirstLogo} alt="HumanFirst" className="w-24 h-24 rounded-3xl object-contain mx-auto mb-8" />
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Privacy by Design
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              HumanFirst is built on the principle that education thrives on trust, not surveillance. 
              We help create focused learning environments while respecting student privacy.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <span className="trust-badge">No Screen Recording</span>
              <span className="trust-badge">No Keystroke Logging</span>
              <span className="trust-badge">No Content Reading</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Login/Signup form
  return (
    <div className="min-h-screen bg-background flex">
      {/* Left side - Form */}
      <div className="flex-1 flex flex-col justify-center px-8 lg:px-16 xl:px-24">
        <div className="max-w-md w-full mx-auto">
          <button
            onClick={handleBackToSelection}
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to role selection
          </button>

          <div className="mb-8 animate-fade-in">
            <div className="flex items-center gap-3 mb-4">
              <img src={humanfirstLogo} alt="HumanFirst" className="w-12 h-12 rounded-2xl object-contain" />
              <span className="text-2xl font-bold text-foreground">HumanFirst</span>
            </div>
            
            {/* Role indicator */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
              {userType === 'admin' ? (
                <>
                  <Shield className="w-4 h-4" />
                  Administrator
                </>
              ) : (
                <>
                  <GraduationCap className="w-4 h-4" />
                  Student
                </>
              )}
            </div>
            
            <h1 className="text-3xl font-bold text-foreground mb-2">
              {isLogin ? 'Welcome back' : 'Create an account'}
            </h1>
            <p className="text-muted-foreground">
              {isLogin
                ? `Sign in to access your ${userType === 'admin' ? 'admin dashboard' : 'student portal'}`
                : 'Join the privacy-first education platform'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5 animate-slide-up delay-100">
            {!isLogin && (
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
                    placeholder="Enter your full name"
                    className="pl-12 h-12 rounded-xl"
                  />
                </div>
                {errors.fullName && (
                  <p className="text-destructive text-sm mt-1">{errors.fullName}</p>
                )}
              </div>
            )}

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
                  placeholder="Enter your email"
                  className="pl-12 h-12 rounded-xl"
                />
              </div>
              {errors.email && (
                <p className="text-destructive text-sm mt-1">{errors.email}</p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-foreground">
                  Password
                </label>
                {isLogin && (
                  <button
                    type="button"
                    onClick={() => setAuthView('forgot-password')}
                    className="text-sm text-primary hover:underline"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
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
              {isSubmitting ? 'Please wait...' : isLogin ? 'Sign In' : 'Create Account'}
            </Button>
          </form>

          <p className="mt-6 text-center text-muted-foreground animate-fade-in delay-200">
            {isLogin ? "Don't have an account?" : 'Already have an account?'}{' '}
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setErrors({});
              }}
              className="text-primary font-semibold hover:underline"
            >
              {isLogin ? 'Sign up' : 'Sign in'}
            </button>
          </p>

          {userType === 'admin' && isLogin && (
            <p className="mt-4 text-center text-sm text-muted-foreground">
              New administrator?{' '}
              <Link to="/admin/signup" className="text-primary font-semibold hover:underline">
                Set up your institution
              </Link>
            </p>
          )}

          <div className="mt-6 pt-6 border-t border-border">
            <Link 
              to="/trust" 
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              <Heart className="w-4 h-4" />
              Read our Trust & Ethics commitment
            </Link>
          </div>
        </div>
      </div>

      {/* Right side - Visual */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-primary/5 via-accent to-primary/10 items-center justify-center p-16">
        <div className="max-w-lg text-center animate-fade-in">
          <img src={humanfirstLogo} alt="HumanFirst" className="w-24 h-24 rounded-3xl object-contain mx-auto mb-8" />
          <h2 className="text-3xl font-bold text-foreground mb-4">
            {userType === 'admin' ? 'Administrator Access' : 'Student Portal'}
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            {userType === 'admin' 
              ? 'Manage exam policies, monitor enforcement status, and ensure academic integrity while respecting student privacy.'
              : 'View active policies affecting you, understand your privacy rights, and stay informed about enforcement boundaries.'
            }
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <span className="trust-badge">No Screen Recording</span>
            <span className="trust-badge">No Keystroke Logging</span>
            <span className="trust-badge">No Content Reading</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
