import { supabase } from './supabase';

/**
 * Subscribe to live changes on a trip-scoped table. Calls `onChange` whenever a
 * row for this trip is inserted/updated/deleted by anyone. Returns an
 * unsubscribe function. No-op when the backend isn't configured.
 *
 * RLS still applies to realtime, so a user only receives changes for trips they
 * belong to. The tables are added to the `supabase_realtime` publication in
 * supabase/migrations/0001_init.sql.
 */
export function subscribeTripTable(table: string, tripId: string, onChange: () => void): () => void {
  if (!supabase) return () => {};
  const client = supabase;
  const channel = client
    .channel(`rt:${table}:${tripId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table, filter: `trip_id=eq.${tripId}` }, () => onChange())
    .subscribe();
  return () => {
    void client.removeChannel(channel);
  };
}
