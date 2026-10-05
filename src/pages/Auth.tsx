import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from "@/lib/api";
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AuthForm } from '@/components/auth/AuthForm';
import { PhoneOtpForm } from '@/components/auth/PhoneOtpForm';
import { Shield, UserRoundCheck } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const quickAccounts = [
  { label: 'Citizen', email: 'citizen@crimex.cm' },
  { label: 'Dispatcher', email: 'dispatcher@crimex.cm' },
  { label: 'Police', email: 'police@crimex.cm' },
  { label: 'Administrator', email: 'admin@crimex.cm' },
];

export default function Auth() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const quickLoginEnabled = import.meta.env.VITE_ENABLE_QUICK_LOGIN !== 'false';

  useEffect(() => {
    if (!authLoading && user) navigate('/');
  }, [authLoading, navigate, user]);

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
        toast({ title: 'Welcome!', description: 'You have successfully signed in.' });
      }
      navigate('/');
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
    <div className="min-h-screen bg-background flex items-center justify-center border-t-4 border-primary p-4">
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

        <Card className="bg-card shadow-md border-border">
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

            {quickLoginEnabled && <div className="border-t pt-5">
              <div className="mb-3 flex items-center gap-2"><UserRoundCheck className="h-4 w-4 text-primary" /><p className="text-sm font-semibold">Quick access — seeded demo accounts</p></div>
              <div className="grid grid-cols-2 gap-2">
                {quickAccounts.map(account => <Button key={account.email} type="button" variant="outline" className="h-auto justify-start py-3 text-left" disabled={loading} onClick={() => handleEmailAuth(account.email, 'Cameroon@2026', false)}><span><span className="block text-sm font-semibold">{account.label}</span><span className="block max-w-32 truncate text-xs font-normal text-muted-foreground">{account.email}</span></span></Button>)}
              </div>
              <p className="mt-3 text-xs leading-5 text-muted-foreground">Run <code className="rounded bg-muted px-1 py-0.5">npm run db:seed</code> first. Quick access can be hidden with <code className="rounded bg-muted px-1 py-0.5">VITE_ENABLE_QUICK_LOGIN=false</code>.</p>
            </div>}

          </CardContent>
        </Card>
        
        <p className="text-center text-sm text-muted-foreground">
          By continuing, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
}
