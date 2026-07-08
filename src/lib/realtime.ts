import { supabase } from './supabase';

// Channel names must be unique per subscription. Supabase's channel(name)
// returns an EXISTING channel for a repeated name, and calling .on() on an
// already-subscribed channel throws "cannot add postgres_changes callbacks
// after subscribe()". A monotonic suffix guarantees a fresh channel each time
// (e.g. when two hook instances watch the same trip table).
let channelSeq = 0;

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
  channelSeq += 1;
  const channel = client
    .channel(`rt:${table}:${tripId}:${channelSeq}`)
    .on('postgres_changes', { event: '*', schema: 'public', table, filter: `trip_id=eq.${tripId}` }, () => onChange())
    .subscribe();
  return () => {
    void client.removeChannel(channel);
  };
}
