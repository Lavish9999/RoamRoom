import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

// Credentials come from app.json -> expo.extra (or an EAS secret at build time).
// They are intentionally optional: the app is offline-first and must keep
// working when the backend isn't configured yet.
const extra = (Constants.expoConfig?.extra ?? {}) as {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
};

const url = extra.supabaseUrl?.trim();
const anonKey = extra.supabaseAnonKey?.trim();

export const isSupabaseConfigured = Boolean(url && anonKey);

// A single lazy client. Null until (and unless) credentials are present.
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url!, anonKey!, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        // No URL-based session detection on native; we exchange the code manually.
        detectSessionInUrl: false,
        flowType: 'pkce',
      },
    })
  : null;
