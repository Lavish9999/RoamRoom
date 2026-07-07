import { makeRedirectUri } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { isSupabaseConfigured, supabase } from '@/lib/supabase';

// Finishes any lingering auth browser session when the app regains focus.
WebBrowser.maybeCompleteAuthSession();

export type AuthProvider = 'google' | 'apple';

export type AuthUser = {
  id: string;
  email?: string;
  name?: string;
  avatarUrl?: string;
};

type AuthContextValue = {
  /** True once the initial session lookup has finished. */
  isReady: boolean;
  /** True when Supabase credentials exist in app config. */
  isConfigured: boolean;
  user: AuthUser | null;
  signIn: (provider: AuthProvider) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

// Deep link the OAuth provider redirects back to. Works in Expo Go
// (exp://…/--/auth-callback) and standalone builds (roamroom://auth-callback).
const redirectTo = makeRedirectUri({ path: 'auth-callback' });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isReady, setIsReady] = useState(!isSupabaseConfigured);

  useEffect(() => {
    if (!supabase) return;

    supabase.auth.getSession().then(({ data }) => {
      setUser(mapUser(data.session?.user));
      setIsReady(true);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(mapUser(session?.user));
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const signIn = useCallback(async (provider: AuthProvider) => {
    if (!supabase) throw new Error('Cloud sync is not configured yet.');

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo, skipBrowserRedirect: true },
    });
    if (error) throw error;
    if (!data.url) throw new Error('Could not start sign in.');

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (result.type !== 'success') {
      // User dismissed the browser — not an error worth surfacing loudly.
      throw new Error('Sign in was cancelled.');
    }

    const code = new URL(result.url).searchParams.get('code');
    if (!code) throw new Error('No sign-in code was returned.');

    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    if (exchangeError) throw exchangeError;
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ isReady, isConfigured: isSupabaseConfigured, user, signIn, signOut }),
    [isReady, user, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}

type SupabaseUser = {
  id: string;
  email?: string;
  user_metadata?: { full_name?: string; name?: string; avatar_url?: string; picture?: string };
};

function mapUser(raw: SupabaseUser | null | undefined): AuthUser | null {
  if (!raw) return null;
  const meta = raw.user_metadata ?? {};
  return {
    id: raw.id,
    email: raw.email,
    name: meta.full_name ?? meta.name,
    avatarUrl: meta.avatar_url ?? meta.picture,
  };
}
