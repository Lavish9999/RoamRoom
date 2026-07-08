import { makeRedirectUri } from 'expo-auth-session';
import * as QueryParams from 'expo-auth-session/build/QueryParams';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { isSupabaseConfigured, supabase } from '@/lib/supabase';

import { setStorageScope } from './storageScope';

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
const OAUTH_CALLBACK_PATH = 'auth-callback';
const NATIVE_REDIRECT_TO = `roamroom://${OAUTH_CALLBACK_PATH}`;

function getOAuthRedirectUrl() {
  return makeRedirectUri({
    scheme: 'roamroom',
    native: NATIVE_REDIRECT_TO,
    path: OAUTH_CALLBACK_PATH,
  });
}

function logOAuthRedirect(provider: AuthProvider, redirectTo: string) {
  console.log('[RoamRoom Auth] OAuth redirect', {
    provider,
    redirectTo,
    linkingUrl: Linking.createURL(OAUTH_CALLBACK_PATH),
    executionEnvironment: Constants.executionEnvironment,
    isExpoGo: Constants.executionEnvironment === ExecutionEnvironment.StoreClient,
    hostUri: Constants.expoConfig?.hostUri,
    linkingUri: Constants.linkingUri,
  });
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient && /exp:\/\/(localhost|127\.0\.0\.1)/.test(redirectTo)) {
    console.warn('[RoamRoom Auth] Expo Go generated a localhost redirect. Use a tunnel/LAN URL that your device can open, or use a development build for OAuth.');
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isReady, setIsReady] = useState(!isSupabaseConfigured);

  useEffect(() => {
    if (!supabase) return;

    supabase.auth.getSession().then(({ data }) => {
      const mapped = mapUser(data.session?.user);
      // Point local storage at this user's namespace BEFORE marking ready, so
      // no screen ever reads another account's cached data.
      setStorageScope(mapped?.id ?? null);
      setUser(mapped);
      setIsReady(true);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const mapped = mapUser(session?.user);
      setStorageScope(mapped?.id ?? null);
      setUser(mapped);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const signIn = useCallback(async (provider: AuthProvider) => {
    if (!supabase) throw new Error('Cloud sync is not configured yet.');

    const redirectTo = getOAuthRedirectUrl();
    logOAuthRedirect(provider, redirectTo);

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo, skipBrowserRedirect: true },
    });
    if (error) throw error;
    if (!data.url) throw new Error('Could not start sign in.');
    console.log('[RoamRoom Auth] Supabase OAuth start URL created', { provider, redirectTo });

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (result.type !== 'success') {
      // User dismissed the browser — not an error worth surfacing loudly.
      throw new Error('Sign in was cancelled.');
    }

    const { params, errorCode } = QueryParams.getQueryParams(result.url);
    if (errorCode) throw new Error(errorCode);

    const code = params.code;
    if (!code) throw new Error('No sign-in code was returned.');

    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    if (exchangeError) throw exchangeError;
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    // Switch back to the guest namespace immediately so the previous user's
    // trips can't remain visible after sign-out.
    setStorageScope(null);
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
