# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Kupkop PH — an Expo React Native (Expo SDK 54) app for a pet adoption / rescue platform, covering
owner, shelter, and volunteer/rescuer flows. TypeScript throughout, strict mode on.

## Commands

```sh
pnpm install          # install deps (pnpm is the lockfile in use; npm/yarn also work per README)
pnpm start            # start Expo dev server
pnpm ios              # start + open iOS Simulator
pnpm android           # start + open Android Emulator
pnpm web               # start + open web
pnpm typecheck         # tsc --noEmit
pnpm test              # jest (jest-expo preset)
npx jest path/to/file.test.ts       # run a single test file
npx jest -t "test name substring"   # run tests matching a name
```

There is no lint script or ESLint config in this repo — don't assume one exists.

⚠️ **`@types/node` and `babel-preset-expo` are declared dependencies, and must stay that way.** Both
were previously undeclared and resolved by accident: `@types/node` was being found in the PARENT
`KupkopPH` checkout via Node's upward module resolution, so `tsc --noEmit` passed on every
developer machine and failed in CI, where only `mobile_app` is checked out. That kept CI red on
every branch, `main` included, for reasons no individual change had caused.

Requires an `EXPO_PUBLIC_API_BASE` env var (see `.env.example`) pointing at the backend API; defaults
to `http://localhost:8000/api/v1` if unset. Any screen that calls `useApi()` needs that backend
reachable to do anything meaningful.

## Architecture

### Entry and provider stack

`index.js` → `App.tsx` → `SafeAreaProvider` → `AuthProvider` → `NavigationContainer` (with
`SessionGuard` + `RootNavigator` inside).

### Auth (`src/auth/`)

- `AuthContext.tsx` holds `tokens` (access/refresh) and a cached `city` string in React state,
  persisted to `expo-secure-store`. There is no `GET /me/location` endpoint, so `city` is cached
  client-side after the user picks one rather than re-derived from `/me`.
- Any `tokens → null` transition (not just an explicit `signOut()`) is treated as "session ended"
  and also clears the cached `city` — this matters because the API client itself calls
  `setTokens(null)` directly on an unrecoverable 401, bypassing `signOut()`.
- `SessionGuard.tsx` watches for that same transition and, if the user is stranded on a
  non-auth screen when it happens, resets navigation back to `welcome`. It only fires once on
  mount/token-change, not on every navigation, so screens listed in `AUTH_SCREENS` (guest/auth/
  recovery routes) are excluded to avoid interrupting flows that legitimately run signed-out.

### API client (`src/api/`)

- `client.ts` exports `createApi(getTokens, setTokens)`, a thin `fetch` wrapper with a one-shot
  401 → refresh → retry cycle. On refresh failure it calls `setTokens(null)`, which is what
  triggers the SessionGuard redirect above.
- `useApi()` (`useApi.ts`) is the hook screens actually use — memoized on `tokens` so a token
  refresh produces a client that carries the new access token.
- `types.ts` has the shared response shapes (`Me`, `Listing`, `Capability`, `ApiError`).

### Navigation (`src/navigation/`)

Single `Stack.Navigator` for the entire app (`RootNavigator.tsx`) — not split into separate
"auth stack" / "app stack" navigators. This is deliberate: flows like signup cross what would be
the auth/app boundary mid-navigation (OTP verification calls `setTokens()` partway through, but
still needs to route on to `signupSuccess` before landing on `home`). A token-gated two-stack
navigator would yank the user straight into the app stack the instant tokens are set, stranding
the in-between screens. `initialRouteName` is still gated on `tokens` for a returning,
already-authenticated user. Route params are typed centrally in `types.ts`
(`RootStackParamList`).

### Guest intent (`src/guestIntent.ts`)

A module-level singleton (not React state/context) that remembers what a guest was trying to do
(adopt/report/volunteer/save/account) across the guest → accountType → signup → otp →
signupSuccess → home chain, without threading it through every route's params and without
persisting to SecureStore (a stale intent surviving an app relaunch would be surprising). Read
via `takeIntent()`, which clears on read — resuming an intent is one-shot. `HomeScreen` only
calls it when arriving via `signupSuccess`'s reset with `justSignedUp: true`, not on every arrival
at Home, so an unrelated later sign-in doesn't resurface a stale intent from an abandoned signup.

### Screens (`src/screens/`) — this is the active screen set

All live screens wired into `RootNavigator` live here. `AuthFormKit.tsx` is the shared UI kit
(headers, form fields, buttons, color palette) for the onboarding/auth screens — reuse it rather
than restyling from scratch when touching that flow.

### Components (`src/components/`)

- `OwnerTabs.tsx` — the 4-tab floating bottom bar (Home/Adopt/Volunteer/You) used by owner-shell
  screens. Not a React Navigation tab navigator: this is a single native-stack app, so each screen
  renders this bar itself and tab presses just call `navigate()`.
- `ShelterTabs.tsx` — the shelter-side equivalent (Home/Animals/Donate/Requests/You). Currently
  only referenced by the orphaned mockups below, not by any wired-in screen — relevant if you're
  working on this branch's shelter dashboard.
- `SignupWall.tsx` — the modal signup gate shown when a guest taps a gated action. Copy is keyed
  by `GuestIntentAction`. This is the signup gate only; the separate "Verified Member" gate
  (`MemberUpgradeScreen`) is a different, already-built flow — don't conflate the two.
- `BottomTabs.tsx`, `TopStatus.tsx`, `AppIcons.tsx` — smaller shared UI pieces.

### Design system (`src/theme/`, `src/components/ui/`) — Sprint 11

`src/theme/` is the single source for colour, radius, spacing, type, depth and gradients. Import
from `../theme`, never a raw hex.

- `colors.ts` — consolidated from **77 distinct hex literals across 1,117 occurrences** that the
  app actually carried. Every token names the design source it came from and records the
  near-identical values it absorbs, so a collapse is reviewable rather than silent.
- `radii.ts` — five container values, plus `pill(height)` and `squircle(size)`. ⚠️ A pill radius is
  half its element's height and is **not** on the scale; snapping it visibly un-rounds the pill.
  Squircle tiles use `0.32 × size`, the rule `v2squircle()` already used in the design source.
- `typography.ts` — an eight-step ramp. ⚠️ **Designed, not measured**: the app contained 29 distinct
  font sizes, and cataloguing those would preserve the drift under nicer names.
- `elevation.ts` — three depth steps. The canvas layers two shadows per surface; React Native gives
  one, so each step is the ambient half and the contact half is dropped rather than faked.

`src/components/ui/` holds the primitives. ⚠️ **`Button` has no `disabled` prop, deliberately.** A
disabled submit gives the user nothing to press and no reason why; `loading` exists and is a
different thing. `Field` takes an `error` and renders it **under itself** — there is no form-level
error summary to import, because a "3 fields need attention" banner makes people hunt.

**Not every screen is converted.** `designSystem.test.ts` carries an explicit allow-list of the ones
that are; add to it in the story that converts a screen, never automatically.

**The design source** is the approved canvas —
<https://claude.ai/code/artifact/255650cf-a5f6-46f9-8607-3fabaa6c96d8> — whose working files live in
`design/mobile-v3/` in the `library` repo, including `gen-backdrop.mjs`, which regenerates the two
mesh assets deterministically. ⚠️ Treat the canvas as a proposal the guards get to veto: it
specified a 48 pt segmented control, which at 5 pt padding makes each segment 38 pt, and
`touchTargets` rejected it.

### Orphaned legacy files — HISTORICAL, and the guard that replaced this note

⚠️ **This section used to list four dead mockups under `src/`. They are gone.** Only
`src/WelcomeScreen.tsx` remains there, and it is live — imported by `RootNavigator`.

The history is worth keeping because it is why `reachable.test.ts` exists. Ten mockup files —
1,406 lines — sat unreferenced after the React Navigation rewrite. They were not merely dead:

1. **They absorbed maintenance.** A touch-target sweep "fixed" 14 controls across them — real work,
   on screens no user can open.
2. **They inflated the guards.** `touchTargets` and `accessibility` scan all of `src/`, so every
   number those guards printed was partly about screens that do not exist.

`reachable.test.ts` now requires every `.tsx` under `src/` to be reachable from an entry point, so
this cannot recur. ⚠️ It is also why a new primitive cannot be merged before something imports it —
an API with no caller is the same problem wearing better clothes.

### User story comments

Comments frequently reference user story IDs (`US-A1`, `US-A1b`, `US-X1`, `US-A4`, etc.) and
screenshot references (`screens/user/screen-home.png`) tying the implementation back to a design
spec — grep commit messages/comments for a `US-*` tag to find all code belonging to one feature.

## Testing

**29 test files.** (This section previously claimed there was one — it was written when that was
true and never updated. If you are reading a count here, re-run `find src -name "*.test.ts*"`
before trusting it.)

`src/api/__tests__/client.test.ts` covers the refresh-and-retry logic in `createApi`, mocking
`global.fetch` directly rather than using a network-mocking library — follow that pattern for new
API-client tests.

### The guards, and why each exists

Most of `src/__tests__/` is not unit tests of behaviour. It is a set of **source scans that encode
decisions somebody already had to make twice**, and each one names the bug it came from:

| Guard | Holds |
|---|---|
| `designSystem` | converted screens define no colour of their own |
| `backdropContrast` | text tokens clear 4.5:1 over the **mesh backdrop**, not just white |
| `tabBarContrast` | tab icons clear 3:1 — asserted on TOKENS, not per-file copies |
| `touchTargets` | every text-only control declares a 44 pt target |
| `accessibility` | labels, and no submit disabled by validation |
| `authEnumeration` | sign-in and recovery never reveal whether an account exists |
| `stepDots` | the dual-journey screens branch instead of hardcoding a step count |
| `e2eSelectors` | the ids the Maestro flows tap still exist |
| `reachable` | every `.tsx` is reachable from an entry point |

⚠️ **Two habits these encode, both learned the hard way.**

**Assert the scan found something before believing it found nothing.** Every source-scan guard in
this project has under-reported at least once, usually printing a plausible *smaller* number rather
than failing. In a cleanup sprint a count that quietly drops reads as progress.

**Assert on tokens, never on per-file copies.** `tabBarContrast` once imported `TAB_COLORS` from
three screens; a refactor renamed those exports, the import went with them, and the test kept
passing **by testing nothing** while a 1.60:1 tab icon shipped.
