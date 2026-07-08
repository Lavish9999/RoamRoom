-- Patch for live databases that already ran 0001_init.sql.
--
-- Bug: creating a trip silently failed to persist, so its invite code could
-- never be found. `INSERT INTO trips ... RETURNING *` applies the SELECT policy
-- to the new row, but the owner's trip_members row isn't visible yet, so the
-- row was filtered out, the request errored, and the whole insert rolled back.
--
-- Fix: let owners always select their own trips. Safe to run multiple times.

drop policy if exists "trips_select" on public.trips;
create policy "trips_select" on public.trips
  for select to authenticated using (owner_id = auth.uid() or is_trip_member(id));
