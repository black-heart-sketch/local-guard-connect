import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { api, apiBlob, apiFetch } from "@/lib/api";
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { User, Phone, MapPin, Mail, Camera, Save, ArrowLeft, BellRing } from 'lucide-react';
import { Link } from 'react-router-dom';

interface ProfileData {
  full_name: string;
  phone: string;
  location: string;
  avatar_url: string;
}

function applicationServerKey(value: string) {
  const padding = '='.repeat((4 - value.length % 4) % 4);
  const raw = atob((value + padding).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from([...raw].map(character => character.charCodeAt(0)));
}

export default function Profile() {
  const { user, profile, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushAvailable, setPushAvailable] = useState(false);
  const [profileData, setProfileData] = useState<ProfileData>({
    full_name: '',
    phone: '',
    location: '',
    avatar_url: '',
  });

  useEffect(() => {
    if (profile) {
      setProfileData({
        full_name: profile.full_name || '',
        phone: profile.phone || '',
        location: typeof profile.location === 'string' ? profile.location : [profile.location?.quarter, profile.location?.town, profile.location?.region].filter(Boolean).join(', '),
        avatar_url: profile.avatar_url || '',
      });
    }
  }, [profile]);

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    apiFetch<{ enabled: boolean }>('/push/config').then(config => setPushAvailable(config.enabled));
    navigator.serviceWorker.ready.then(registration => registration.pushManager.getSubscription()).then(subscription => setPushEnabled(Boolean(subscription)));
  }, []);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const handleInputChange = (field: keyof ProfileData, value: string) => {
    setProfileData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    setLoading(true);
    try {
      const body = new FormData();
      body.set('avatar', file);
      const { url: publicUrl } = await apiFetch<{ url: string }>('/profile/avatar', { method: 'POST', body });

      setProfileData(prev => ({
        ...prev,
        avatar_url: publicUrl
      }));

      toast({
        title: 'Success',
        description: 'Avatar uploaded successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to upload avatar',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    try {
      const { error } = await (api as any)
        .from('profiles')
        .update({
          full_name: profileData.full_name,
          phone: profileData.phone,
          location: profileData.location,
          avatar_url: profileData.avatar_url,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Profile updated successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to update profile',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const getUserInitials = () => {
    const name = profileData.full_name || user.email || 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const requestPrivacyAction = async (type: 'correction' | 'deletion' | 'objection') => {
    try {
      await apiFetch('/privacy/requests', { method: 'POST', body: JSON.stringify({ type }) });
      toast({ title: 'Request submitted', description: 'You can follow up with the CrimeX privacy team.' });
    } catch (error) { toast({ title: 'Request failed', description: error instanceof Error ? error.message : 'Please try again', variant: 'destructive' }); }
  };

  const exportMyData = async () => {
    try {
      const blob = await apiBlob('/privacy/export');
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'crimex-my-data.json';
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (error) { toast({ title: 'Export failed', description: error instanceof Error ? error.message : 'Please try again', variant: 'destructive' }); }
  };

  const togglePush = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const existing = await registration.pushManager.getSubscription();
      if (existing) {
        await apiFetch('/push/subscriptions', { method: 'DELETE', body: JSON.stringify({ endpoint: existing.endpoint }) });
        await existing.unsubscribe(); setPushEnabled(false);
        toast({ title: 'Browser alerts disabled' });
        return;
      }
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') throw new Error('Notification permission was not granted');
      const config = await apiFetch<{ enabled: boolean; publicKey: string | null }>('/push/config');
      if (!config.enabled || !config.publicKey) throw new Error('Push notifications are not configured');
      const subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: applicationServerKey(config.publicKey) });
      await apiFetch('/push/subscriptions', { method: 'POST', body: JSON.stringify(subscription.toJSON()) });
      setPushEnabled(true); toast({ title: 'Browser alerts enabled' });
    } catch (error) { toast({ title: 'Could not change browser alerts', description: error instanceof Error ? error.message : 'Try again', variant: 'destructive' }); }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Back Button */}
        <div className="mb-6">
          <Link to="/dashboard">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
        </div>

        {/* Profile Header */}
        <Card className="mb-8">
          <CardHeader className="text-center">
            <div className="flex flex-col items-center space-y-4">
              <div className="relative">
                <Avatar className="w-24 h-24">
                  <AvatarImage src={profileData.avatar_url} alt="Profile" />
                  <AvatarFallback className="text-lg">
                    {getUserInitials()}
                  </AvatarFallback>
                </Avatar>
                <label className="absolute bottom-0 right-0 bg-primary text-primary-foreground rounded-full p-2 cursor-pointer hover:bg-primary/90 transition-colors">
                  <Camera className="w-4 h-4" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                    disabled={loading}
                  />
                </label>
              </div>
              <div>
                <CardTitle className="text-2xl">
                  {profileData.full_name || 'Complete Your Profile'}
                </CardTitle>
                <CardDescription className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  {user.email}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Profile Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Profile Information
            </CardTitle>
            <CardDescription>
              Update your personal information and contact details
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveProfile} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Full Name</Label>
                  <Input
                    id="full_name"
                    value={profileData.full_name}
                    onChange={(e) => handleInputChange('full_name', e.target.value)}
                    placeholder="Enter your full name"
                    className="w-full"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      value={profileData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      placeholder="Enter your phone number"
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="location"
                    value={profileData.location}
                    onChange={(e) => handleInputChange('location', e.target.value)}
                    placeholder="Enter your location"
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-4 pt-4">
                <Link to="/dashboard">
                  <Button type="button" variant="outline">
                    Cancel
                  </Button>
                </Link>
                <Button 
                  type="submit" 
                  disabled={saving || loading}
                  className="min-w-[120px]"
                >
                  {saving ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Account Information */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
            <CardDescription>
              View your account details and settings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Account Type:</span>
                <div className="font-medium capitalize">
                  {profile?.role || 'Citizen'}
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">Member Since:</span>
                <div className="font-medium">
                  {profile?.created_at 
                    ? new Date(profile.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })
                    : 'Unknown'
                  }
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">User ID:</span>
                <div className="font-mono text-xs break-all">
                  {user.id}
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">Last Updated:</span>
                <div className="font-medium">
                  {profile?.updated_at 
                    ? new Date(profile.updated_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : 'Never'
                  }
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-8">
          <CardHeader><CardTitle className="flex items-center gap-2"><BellRing className="h-5 w-5" />Browser alerts</CardTitle><CardDescription>Receive case assignments and safety notices when this browser is closed.</CardDescription></CardHeader>
          <CardContent><Button variant={pushEnabled ? 'outline' : 'default'} disabled={!pushAvailable && !pushEnabled} onClick={togglePush}>{pushEnabled ? 'Disable browser alerts' : pushAvailable ? 'Enable browser alerts' : 'Push service not configured'}</Button></CardContent>
        </Card>

        <Card className="mt-8">
          <CardHeader><CardTitle>Privacy and personal data</CardTitle><CardDescription>Exercise your access, export, correction, objection, or deletion rights.</CardDescription></CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={exportMyData}>Export my data</Button>
            <Button variant="outline" onClick={() => requestPrivacyAction('correction')}>Request correction</Button>
            <Button variant="outline" onClick={() => requestPrivacyAction('objection')}>Object to processing</Button>
            <Button variant="destructive" onClick={() => requestPrivacyAction('deletion')}>Request account deletion</Button>
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  );
}
