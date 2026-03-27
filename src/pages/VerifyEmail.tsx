import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import humanfirstLogo from '@/assets/humanfirst-logo.png';

type VerificationStatus = 'loading' | 'success' | 'error';

const VerifyEmail = () => {
  const [status, setStatus] = useState<VerificationStatus>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const handleEmailVerification = async () => {
      // Get the token from URL hash (Supabase uses hash for auth tokens)
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');
      const type = hashParams.get('type');

      // Also check query params
      const tokenHash = searchParams.get('token_hash');
      const queryType = searchParams.get('type');

      if (type === 'signup' || type === 'email_change' || queryType === 'signup') {
        // If we have tokens in the hash, the verification was successful
        if (accessToken && refreshToken) {
          try {
            const { error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

            if (error) {
              setStatus('error');
              setErrorMessage(error.message);
            } else {
              setStatus('success');
            }
          } catch (err) {
            setStatus('error');
            setErrorMessage('An unexpected error occurred');
          }
        } else if (tokenHash) {
          // Handle token hash verification
          try {
            const { error } = await supabase.auth.verifyOtp({
              token_hash: tokenHash,
              type: 'signup',
            });

            if (error) {
              setStatus('error');
              setErrorMessage(error.message);
            } else {
              setStatus('success');
            }
          } catch (err) {
            setStatus('error');
            setErrorMessage('An unexpected error occurred');
          }
        } else {
          // Check if already verified via session
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            setStatus('success');
          } else {
            setStatus('error');
            setErrorMessage('Invalid or expired verification link');
          }
        }
      } else {
        // No verification type found, check if user is already verified
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setStatus('success');
        } else {
          setStatus('error');
          setErrorMessage('Invalid verification link');
        }
      }
    };

    handleEmailVerification();
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <img src={humanfirstLogo} alt="HumanFirst" className="w-16 h-16 rounded-2xl object-contain mx-auto mb-4" />
          
          {status === 'loading' && (
            <>
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
              </div>
              <CardTitle>Verifying Your Email</CardTitle>
              <CardDescription>
                Please wait while we verify your email address...
              </CardDescription>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <CardTitle>Email Verified!</CardTitle>
              <CardDescription>
                Your email has been successfully verified. You can now access all features.
              </CardDescription>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                <XCircle className="w-8 h-8 text-destructive" />
              </div>
              <CardTitle>Verification Failed</CardTitle>
              <CardDescription>
                {errorMessage || 'We could not verify your email. The link may have expired.'}
              </CardDescription>
            </>
          )}
        </CardHeader>
        
        <CardContent className="space-y-3">
          {status === 'success' && (
            <Button
              variant="hero"
              className="w-full"
              onClick={() => navigate('/auth')}
            >
              Continue to Sign In
            </Button>
          )}

          {status === 'error' && (
            <>
              <Button
                variant="hero"
                className="w-full"
                onClick={() => navigate('/auth')}
              >
                Back to Sign In
              </Button>
              <p className="text-sm text-center text-muted-foreground">
                Need a new verification link? Sign in and we'll send you another one.
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default VerifyEmail;
