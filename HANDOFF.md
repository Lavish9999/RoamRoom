# RoamRoom — Handoff

Expo React Native group-trip-planning app. This doc is the context for anyone
(human or AI) picking up the work.

## Folders (Windows)

- **App code (edit here):** `C:\Users\dixon\RoamRoom-app`
  - `app/` — expo-router screens, including `app/(tabs)/` (the 5 bottom tabs),
    `app/trip/[id].tsx`, `app/create/`, `app/settings.tsx`, `app/sign-in.tsx`.
  - `src/components/` — shared UI (Card, PrimaryButton, SegmentedControl, …).
  - `src/state/` — hooks + React contexts (useTrips, useItinerary, useExpenses,
    useMapPlaces, useMemories, ToastContext, **AuthContext**).
  - `src/data/` — types + seed data (`types.ts`, `itinerary.ts`, `expenses.ts`,
    `mapPlaces.ts`, `checklist.ts`).
  - `src/lib/` — `supabase.ts` (backend client).
  - `src/utils/`, `src/theme.ts` (design tokens).
  - `supabase/migrations/0001_init.sql` — database schema.
- **GitHub repo:** https://github.com/Lavish9999/RoamRoom (branch `main`).

> The app folder is **not** a git repo. To ship: clone the repo into a temp
> folder, copy changed files over, normalize line endings (`sed -i 's/\r$//'`),
> `git commit`, then `git push origin HEAD:main`. GitHub Actions CI runs
> `tsc --noEmit` + `expo export` on every push.

## Stack & conventions

- Expo SDK 54, React Native 0.81, TypeScript, expo-router, Hermes engine.
- Tested in **Expo Go** — no dev/custom build yet.
- **Dark theme.** Use tokens from `src/theme.ts` (colors/radii/shadows/type);
  don't hardcode hex. `src/utils/textDefaults.ts` sets the default text color.
- Hermes can't parse `new Date("July 17, 2026")` → use `src/utils/parseDate.ts`.

## Validate before every push

```
npm run typecheck        # tsc --noEmit
npx expo export -p ios   # bundle must build
```

## Current state

All 5 tabs (Trips / Map / Plan / Expenses / Memories) are functional with local
AsyncStorage persistence. We are mid-way through adding a **Supabase backend**
for real multi-user collaboration. The app is **offline-first**: it runs fully
on-device when no backend credentials are set.

### Done & pushed
- **Auth foundation.** `src/lib/supabase.ts` (guarded client — reads
  `app.json` → `expo.extra.supabaseUrl` / `supabaseAnonKey`; null until set;
  PKCE + AsyncStorage sessions). `src/state/AuthContext.tsx` — `useAuth()` with
  Apple/Google OAuth via `expo-web-browser` + `expo-auth-session` (works in
  Expo Go, no dev build). `app/sign-in.tsx` modal + Account section in
  `app/settings.tsx`.
- **Database schema.** `supabase/migrations/0001_init.sql` — `trips`,
  `trip_members` (sharing), `itinerary_items`, `places`, `expenses`,
  `checklist_items`, `place_votes`; all gated by membership-based RLS
  (`is_trip_member`). Includes `join_trip_by_code`, auto owner membership,
  profile-on-signup trigger, and realtime publication. Re-runnable.

### Blocked on user (external setup)
1. Create the Supabase project → paste **Project URL** + **anon key** into
   `app.json` `expo.extra`.
2. Run `supabase/migrations/0001_init.sql` in the Supabase SQL editor.
3. Configure **Google** OAuth (Google Cloud Console → OAuth client → Supabase).
4. Configure **Apple** OAuth (Services ID + Sign in with Apple key → Supabase).
   User has an Apple Developer account.

Until keys are set, `useAuth().isConfigured` is false, the sign-in screen shows
a "not set up" notice, and everything stays on-device.

## Next task — Phase 3: syncing

Wire `src/state/useTrips.ts`, `useItinerary.ts`, `useExpenses.ts`,
`useMapPlaces.ts` to read/write Supabase, keeping AsyncStorage as the offline
cache. Make the invite code call `join_trip_by_code` so a friend joins the real
shared trip instead of a local copy. Match the shapes in `src/data/*` to the
columns in `0001_init.sql`.

Later phases: place voting (`place_votes`), split-aware expenses, presence, and
a native one-tap "Sign in with Apple" button (needs a dev build).
