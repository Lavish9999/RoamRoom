# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

RoamRoom is a group trip-planning app, currently an Expo/React Native (TypeScript) MVP. The
product plan lives in `docs/MVP_ROADMAP.md` — check it to see which step is "next" before adding
features, since later steps (group planning, expenses, backend/Supabase, monetization) are
intentionally not built yet and are represented only as placeholder tab screens.

## Commands

```
npm start        # expo start (dev server, pick platform from the CLI menu)
npm run ios      # expo start --ios
npm run android  # expo start --android
npm run web      # expo start --web
npm run typecheck  # tsc --noEmit
```

There is no lint script and no test runner configured in this repo — `typecheck` is the only
automated check available.

## Architecture

- **Routing**: `expo-router` (file-based), entry point is `expo-router/entry` (see `package.json`
  `main`). There is no more `App.tsx` / hand-rolled tab state.
  - `app/_layout.tsx` — root `Stack`: `(tabs)` group + `create` (presented as a modal).
  - `app/(tabs)/_layout.tsx` — `Tabs` navigator with a custom floating/frosted tab bar
    (`src/components/TabBar.tsx`) matching the spec's tab bar styling. Routes: `index` (Trips home,
    fully built), `map`/`plan`/`expenses`/`memories` (still `PlaceholderScreen`s — Step 3+ work).
  - `app/create/` — the 5-step create-trip wizard (`step-1.tsx` … `step-5.tsx`), wrapped by
    `app/create/_layout.tsx` in a `CreateTripProvider` (`src/state/CreateTripContext.tsx`) that
    holds the in-progress draft across steps via React Context — this is wizard-scoped state, not a
    global store. Step 5 finalizes the draft into a real `Trip` (`src/utils/buildTrip.ts`) and calls
    `useTrips().addTrip`.
- **Design system**: `src/theme.ts` is the only place design tokens (colors, avatar colors, radii,
  shadows, type scale, chip variants) may be defined — screens/components must consume it, never
  hard-code hex values. `src/components/` holds the shared primitives (Card, PillButton, Chip,
  Avatar/AvatarStack, PrimaryButton, SegmentedControl, ProgressRing, CoverImage, TabBar,
  StepHeader, PlaceholderScreen) that every screen is built from.
- **State + persistence**: `src/state/useTrips.ts` is a small AsyncStorage-backed hook (not a global
  store) — it reloads on focus (`useFocusEffect`) so screens stay in sync without prop drilling.
  Storage keys are versioned (`roamroom.trips.v2`, `roamroom.invites.v2` in `src/state/storage.ts`);
  bump the version again if the `Trip`/`TripInvite` shape changes incompatibly. There is still no
  backend — everything is on-device. `src/state/ToastContext.tsx` is a separate small global context
  for toast messages (used for "coming soon" affordances and confirmations).
- **Trip model**: `src/data/types.ts` (`Trip`, `TripInvite`, `Member`, etc). `src/data/seed.ts` holds
  the canonical Tokyo Spring Trip + Lisbon invite fixtures used to seed a fresh install (see Design
  source of truth below) — don't hand-edit those values without checking the spec first.
- **Cover art**: trip covers are gradient placeholders (`src/data/covers.ts` + `CoverImage`
  component using `expo-linear-gradient`), keyed by the same `CoverKey`s the prototype's SVG scene
  art used (`tokyo`, `lisbon`, `kyoto`, ...). The prototype's hand-drawn SVG art was intentionally
  not recreated — don't add it without checking with the user first.

## Static preview files (unrelated to the Expo app)

`index.html`, `roamroom.html`, and `404.html` at the repo root are identical GitHub Pages loader
shims (served at https://lavish9999.github.io/RoamRoom/) — they are **not** the Expo web build
output. At runtime each fetches a *pinned historical commit's* `roamroom.html` (a hand-authored
static HTML/CSS/JS mockup) from `raw.githubusercontent.com`, applies regex patches to its CSS/JS,
and `document.write()`s the result. When updating the live preview, the pinned commit SHA in the
`SOURCE_URL` constant inside these files must be updated deliberately — editing `App.tsx` has no
effect on this preview.

## Design source of truth

- The **full prototype** version of `roamroom.html` (not the loader shim currently checked in at
  that path — see above) is the pixel-level design spec and source of truth for every screen,
  design token, copy string, and sample datum in the product. It lives in git history prior to the
  loader-shim deploys (e.g. `git show faf7031:roamroom.html`). When building any screen in the Expo
  app, match this spec as closely as possible — **never redesign** it.
- **Design tokens** (from the prototype's `:root` CSS block):
  - `bg` `#F7F5F0`, `ink` `#10151C`, `secondary` `#7A808A`, `button` `#101827`, `blue` `#4A7DFF`,
    `coral` `#FF6B5A`, `green` `#2ED18C`, `card` `#FFFFFF`, `border` `#E8E4DC`
  - Radii: 18–28px. Shadows: soft.
- **Avatar colors**: Robert `#3E5C76`, Maya `#C96F4A`, Chris `#5B8A5B`, Lena `#8A6FB0`.
- **Canonical sample data**: trip "Tokyo Spring Trip", dates **May 12–18, 2026** (not May 12–19),
  status Planning, countdown "In 2 days", setup **67% (4 of 6)** (not 68%), members Robert (Owner),
  Maya (Planner), Chris (Traveler), Lena (Traveler). This lives in `src/data/seed.ts` — any code
  using the old May 12–19 / 68% values is stale and should be fixed to match this. Note the
  countdown itself ("In 2 days") is computed live from the real device date in the app
  (`src/utils/date.ts`), so it will only literally read "In 2 days" when run two days before the
  seed trip's start date — that's expected, not a bug.
- `index.html` and `404.html` are **generated** GitHub Pages artifacts (loader shims pointing at a
  pinned commit) — never hand-edit them directly; regenerate/update them deliberately if the pinned
  source commit needs to change.
