import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from "@/lib/api";
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AuthForm } from '@/components/auth/AuthForm';
import { PhoneOtpForm } from '@/components/auth/PhoneOtpForm';
import { Shield } from 'lucide-react';

export default function Auth() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Check if user is already logged in
    const checkAuth = async () => {
      const { data: { session } } = await api.auth.getSession();
      if (session) {
        navigate('/');
      }
    };
    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = api.auth.onAuthStateChange(
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
        const { error } = await api.auth.signUp({
          email,
          password,
          options: { data: { locale: navigator.language.startsWith('en') ? 'en' : 'fr' } }
        });
        
        if (error) throw error;
        
        toast({
          title: 'Account created',
          description: 'Your secure CrimeX account is ready.',
        });
      } else {
        const { error } = await api.auth.signInWithPassword({
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="bg-primary/10 p-3 rounded-full">
              <Shield className="h-8 w-8 text-primary" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-primary">CrimeX</h1>
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
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="signin">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
                <TabsTrigger value="phone">Phone OTP</TabsTrigger>
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
              <TabsContent value="phone" className="space-y-4"><PhoneOtpForm /></TabsContent>
            </Tabs>

          </CardContent>
        </Card>
        
        <p className="text-center text-sm text-muted-foreground">
          By continuing, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
}
