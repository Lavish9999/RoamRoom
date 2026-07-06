# RoamRoom MVP Roadmap

## Step 1: App Foundation

Status: complete

- Expo React Native project
- TypeScript config
- Native app shell
- Trips dashboard placeholder
- Bottom tab structure

## Step 2: Local Trip Data

Status: complete

Make trips real on-device before adding accounts or backend.

- Create trip form
- Edit trip details
- Delete/archive trip
- Persist trips locally with AsyncStorage
- Replace mock trips with app state
- Empty state when all trips are deleted

## Step 2.5: App Rebuild on expo-router + Design System

Status: complete

Rebuilt the app on expo-router (file-based routing) instead of hand-rolled
tab state, and started porting real screens from the roamroom.html design
spec instead of ad hoc UI.

- expo-router file-based routing (`app/`), replacing the single-file `App.tsx`
- `src/theme.ts` with every design token from the spec (colors, avatar colors,
  radii, shadows, type scale, chip variants) — no hard-coded hex in screens
- Shared primitives: Card, PillButton, Chip, Avatar/AvatarStack, PrimaryButton,
  SegmentedControl, ProgressRing, CoverImage
- `useTrips()` AsyncStorage hook (trips + pending invites), still local-only
- Trips home screen ported from spec: greeting header, filter pills
  (Upcoming/Traveling/Past/Invites), trip card with cover/status chip/
  countdown/avatar stack/readiness ring, quick-actions grid, invite card,
  join-by-code
- 5-step create-trip flow ported from spec: destination/dates/cover, invites
  with share link, vibe multi-select, budget comfort, blank vs. template
  picker — all persisting to AsyncStorage, with edit and delete working
- Map/Plan/Expenses/Memories tabs are still placeholders pending Step 3+

## Step 3: Itinerary Builder

Status: next

- Add days from trip dates
- Add activity to a day
- Edit activity time, category, cost, notes
- Reorder activities
- Empty states

## Step 4: Group Planning

- Invite code model
- Member list
- Voting on saved ideas
- Roles: owner, editor, viewer

## Step 5: Expenses

- Add expense
- Split equally
- Track who paid
- Show who owes who

## Step 6: Backend

- Supabase project
- Auth
- Trips table
- Members table
- Itinerary table
- Votes table
- Expenses table
- Realtime sync

## Step 7: Monetization

- Free limits
- Plus paywall
- RevenueCat products
- App Store subscription setup

## Step 8: Ship Prep

- App icon
- Splash screen
- Privacy policy
- Support URL
- TestFlight build
- App Store screenshots
