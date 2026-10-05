import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
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

type AuthContextValue = {
  user: ApiUser | null;
  session: ApiSession | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ data?: Profile; error: string | null }>;
  isAuthenticated: boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function profileFromUser(user: ApiUser): Profile {
  return {
    id: user.id,
    user_id: user.user_id || user.id,
    full_name: user.full_name ?? null,
    avatar_url: user.avatar_url ?? null,
    phone: user.phone ?? null,
    location: user.location ?? null,
    role: user.role ?? null,
    created_at: user.created_at || '',
    updated_at: user.updated_at || '',
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [session, setSession] = useState<ApiSession | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const applySession = (nextSession: ApiSession | null) => {
      if (!active) return;
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setProfile(nextSession?.user ? profileFromUser(nextSession.user) : null);
      setLoading(false);
    };
    const { data: { subscription } } = api.auth.onAuthStateChange((_event, nextSession) => applySession(nextSession));
    void api.auth.getSession().then(({ data }) => applySession(data.session));
    return () => { active = false; subscription.unsubscribe(); };
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    session,
    profile,
    loading,
    isAuthenticated: Boolean(user),
    signOut: async () => {
      try { await api.auth.signOut(); }
      finally { window.location.href = '/auth'; }
    },
    updateProfile: async updates => {
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
        return { error: error instanceof Error ? error.message : 'Profile update failed' };
      }
    },
  }), [loading, profile, session, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// The hook intentionally shares this module with its provider so they cannot use different contexts.
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
