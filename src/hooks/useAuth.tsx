import { useState, useEffect } from 'react';
import { api, apiFetch, type ApiSession, type ApiUser } from "@/lib/api";

export interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  location: string | Record<string, string> | null;
  role: string | null;
  created_at: string;
  updated_at: string;
}

export function useAuth() {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [session, setSession] = useState<ApiSession | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = api.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Defer profile fetching to prevent deadlocks
          setTimeout(() => {
            fetchProfile(session.user.id);
          }, 0);
        } else {
          setProfile(null);
        }
        
        setLoading(false);
      }
    );

    // Check for existing session
    api.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        setTimeout(() => {
          fetchProfile(session.user.id);
        }, 0);
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      const { profile: data } = await apiFetch<{ profile: Profile }>('/auth/me');
      if (data.user_id === userId) setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const signOut = async () => {
    try {
      // Clean up auth state
      await api.auth.signOut();
      
      // Force page reload for clean state
      window.location.href = '/auth';
    } catch (error) {
      console.error('Error signing out:', error);
      // Force reload anyway
      window.location.href = '/auth';
    }
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return { error: 'No user logged in' };

    try {
      const body = {
        fullName: updates.full_name,
        phone: updates.phone,
        locale: (updates as Profile & { locale?: string }).locale,
        jurisdiction: typeof updates.location === 'string' ? { town: updates.location } : updates.location,
      };
      const { profile: data } = await apiFetch<{ profile: Profile }>('/profile', { method: 'PATCH', body: JSON.stringify(body) });
      setProfile(data);
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error instanceof Error ? error.message : 'Profile update failed' };
    }
  };

  return {
    user,
    session,
    profile,
    loading,
    signOut,
    updateProfile,
    isAuthenticated: !!user,
  };
}
