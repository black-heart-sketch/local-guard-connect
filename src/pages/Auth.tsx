import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { AuthForm } from '@/components/auth/AuthForm';
import { SocialLogin } from '@/components/auth/SocialLogin';
import { Shield, User, UserCog, Badge } from 'lucide-react';

export default function Auth() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Check if user is already logged in
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate('/');
      }
    };
    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          toast({
            title: 'Welcome!',
            description: 'You have successfully signed in.',
          });
          navigate('/');
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [navigate, toast]);

  const handleEmailAuth = async (email: string, password: string, isSignUp: boolean) => {
    setLoading(true);
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`
          }
        });
        
        if (error) throw error;
        
        toast({
          title: 'Check your email!',
          description: 'We sent you a confirmation link to complete your registration.',
        });
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        
        if (error) throw error;
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Authentication Error',
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSocialAuth = async (provider: 'google' | 'twitter' | 'github') => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/`
        }
      });
      
      if (error) throw error;
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Authentication Error', 
        description: error.message,
      });
    }
  };

  // Development shortcuts - Remove in production
  const devLogin = async (role: 'citizen' | 'admin' | 'police') => {
    setLoading(true);
    const devCredentials = {
      citizen: { email: 'citizen@test.com', password: 'password123' },
      admin: { email: 'admin@test.com', password: 'password123' },
      police: { email: 'police@test.com', password: 'password123' }
    };

    const creds = devCredentials[role];
    
    try {
      // Try to sign in first
      let { error } = await supabase.auth.signInWithPassword({
        email: creds.email,
        password: creds.password,
      });

      // If user doesn't exist, create them
      if (error && error.message.includes('Invalid login credentials')) {
        const { error: signUpError } = await supabase.auth.signUp({
          email: creds.email,
          password: creds.password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: {
              full_name: role === 'citizen' ? 'Test Citizen' : role === 'admin' ? 'Test Admin' : 'Test Police',
              role: role
            }
          }
        });

        if (signUpError) throw signUpError;

        // Try signing in again
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: creds.email,
          password: creds.password,
        });

        if (signInError) throw signInError;
      } else if (error) {
        throw error;
      }

      toast({
        title: `Signed in as ${role}`,
        description: `Development login successful`,
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Dev Login Error',
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="bg-primary/10 p-3 rounded-full">
              <Shield className="h-8 w-8 text-primary" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-primary">Local Guard Connect</h1>
          <p className="text-muted-foreground">
            Secure community crime reporting platform
          </p>
        </div>

        <Card className="backdrop-blur-sm bg-card/95 shadow-lg border-border/50">
          <CardHeader>
            <CardTitle>Welcome Back</CardTitle>
            <CardDescription>
              Sign in to your account or create a new one to get started
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Tabs defaultValue="signin" className="space-y-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>
              
              <TabsContent value="signin" className="space-y-4">
                <AuthForm
                  mode="signin"
                  onSubmit={handleEmailAuth}
                  loading={loading}
                />
              </TabsContent>
              
              <TabsContent value="signup" className="space-y-4">
                <AuthForm
                  mode="signup"
                  onSubmit={handleEmailAuth}
                  loading={loading}
                />
              </TabsContent>
            </Tabs>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
              </div>
            </div>

            <SocialLogin onSocialAuth={handleSocialAuth} />
          </CardContent>
        </Card>

        {/* Development Quick Login - Remove in production */}
        <Card className="backdrop-blur-sm bg-card/95 shadow-lg border-border/50 border-dashed">
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Development Shortcuts</CardTitle>
            <CardDescription className="text-xs">
              Quick login buttons for testing (remove in production)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => devLogin('citizen')}
                disabled={loading}
                className="justify-start text-xs"
              >
                <User className="h-3 w-3 mr-2" />
                Login as Citizen
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => devLogin('admin')}
                disabled={loading}
                className="justify-start text-xs"
              >
                <UserCog className="h-3 w-3 mr-2" />
                Login as Admin
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => devLogin('police')}
                disabled={loading}
                className="justify-start text-xs"
              >
                <Badge className="h-3 w-3 mr-2" />
                Login as Police
              </Button>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              These accounts will be created automatically if they don't exist
            </p>
          </CardContent>
        </Card>
        
        <p className="text-center text-sm text-muted-foreground">
          By continuing, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
}