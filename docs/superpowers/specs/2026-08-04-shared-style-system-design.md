# Shared style system + RN code-review skill — design

Date: 2026-08-04
Status: approved

## Problem

The codebase (37 files with `StyleSheet.create` under `src/screens/` and `src/components/`) has
no shared design system. Every screen redeclares its own local `const colors = {...}` (20 files do
this independently, including near-duplicate teal variants: `#1C7876`, `#1C6B6B`, `#12524C`,
`#14504F`). `#FFFFFF` appears 146 times as a literal, `#1F3A5F` 33 times. Spacing, radii, and text
styles are hand-written per screen with no shared scale. `AuthFormKit.tsx` already has the right
idea (`authColors`, `PrimaryButton`, `FormField`) but only for the auth flow — the pattern was
never generalized.

This makes visual consistency fragile (a color tweak requires hunting N files) and every new
screen starts from a blank slate, re-deriving values that already exist elsewhere.

## Goals

- One source of truth for colors, typography, spacing, and border radii.
- A small set of shared primitive components for the UI patterns that repeat across screens
  (buttons, screen shells, cards, styled text).
- Migrate all live screens/components to the new system — not just build it and leave adoption
  to chance.
- Capture the resulting conventions in a project skill that reviews future code against them,
  alongside general React Native/Expo best practices.

## Non-goals

- The 10 orphaned legacy mockup files at `src/` root (`HomeScreen.tsx`, `ShelterDashboardScreens.tsx`,
  etc. — not imported by `RootNavigator`, documented in `CLAUDE.md`) are out of scope. They stay
  as-is.
- No new styling library/dependency (no NativeWind, Tamagui, Restyle). Plain
  `StyleSheet.create` remains the underlying mechanism — this is a token/primitive layer on top
  of it, matching the existing `AuthFormKit` pattern.
- No dark mode / multi-theme support. `app.json` fixes `userInterfaceStyle: "light"`; the app has
  one visual theme.
- No navigation, API, or auth architecture changes — those are already documented in `CLAUDE.md`
  and are working as intended.

## Design

### `src/theme/`

- **`colors.ts`** — the consolidated palette as named tokens. Near-duplicate teal/ink variants
  found across screens collapse into one scale: `teal`, `tealDark`, `ink`, `page` (background),
  `border`, `muted`, `danger`, plus the status colors already used for capability states
  (pending/approved/rejected in `ProfileScreen`/`MemberVerifyScreen`). Every screen imports from
  here; no file declares its own `colors`/`authColors` object anymore.
- **`typography.ts`** — named text styles (e.g. `heading800_22`, `body14`, `label12`) built from
  the fontSize/fontWeight combinations already in real use (weights cluster at 700/800/900; sizes
  from 10–34px). Not an invented scale — derived from what's actually on screen today.
- **`spacing.ts`** — a numeric scale covering the padding/margin/gap values found in the codebase:
  `2, 4, 8, 12, 16, 20, 24, 28, 32, 40, 48, 56, 64, 80, 96`. Every spacing value in migrated files
  maps to the nearest scale step (per user decision: fidelity to a consistent scale takes priority
  over preserving exact one-off pixel values from the original Figma export).
- **`radii.ts`** — same treatment, scale: `2, 4, 8, 12, 16, 20, 24, 32, 48`.
- **`index.ts`** — re-exports all of the above as a single `theme` object/import.

### `src/components/` additions

- **`Button.tsx`** — variants `primary` / `secondary` / `danger`, built-in `loading` state
  (several screens currently hand-roll `ActivityIndicator` inside a `TouchableOpacity`). Replaces
  `AuthFormKit`'s `PrimaryButton` and the repeated ad-hoc buttons in `HomeScreen`, `ProfileScreen`,
  etc.
- **`ScreenContainer.tsx`** — the repeated `SafeAreaView`/page-background/`ScrollView` shell every
  screen starts with.
- **`Card.tsx`** / **`Section.tsx`** — the repeated white rounded-card-with-shadow pattern (pet
  cards, info sections, list rows).
- **`AppText.tsx`** — thin `Text` wrapper taking a `variant` prop from `typography.ts`, replacing
  inline `{fontSize, fontWeight, color}` triplets.

`AuthFormKit.tsx` keeps flow-specific pieces (`AuthHeader`, step dots, `FormField`) but drops
`PrimaryButton` and `authColors` in favor of the shared `Button` and `theme/colors`.

### Migration

Every file under `src/screens/` and `src/components/` that currently has a `StyleSheet.create`
block gets migrated: local color/spacing/radius literals replaced with `theme` tokens, repeated
button/card/screen-shell markup replaced with the new primitives where it's a genuine match (not
forced where a screen's layout is meaningfully different). `App.tsx`, `src/navigation/`,
`src/auth/`, `src/api/`, and the orphaned root-level mockups are not touched.

Verification per file/batch: `pnpm typecheck` and `pnpm test` stay green throughout; spot-check
representative screens (one from each major flow — onboarding, owner home, profile) in Expo
Go/simulator afterward for visual regressions, since spacing values are intentionally shifting to
the nearest scale step.

### Reviewer skill — `.claude/skills/rn-code-review/`

A repo-scoped project skill (ships with the repo, available to any future Claude Code session
here) with a `SKILL.md` that:

- Is invokable explicitly (e.g. `/rn-review`) and is written so Claude also reaches for it
  proactively when writing or reviewing RN UI code in this repo, without being asked by name.
- Reviews against two categories:
  1. **This repo's conventions**: no hardcoded hex colors outside `src/theme/colors.ts`, no
     one-off spacing/radius numbers that duplicate an existing token, no re-implementing
     `Button`/`ScreenContainer`/`Card`/`AppText` ad hoc, adherence to the architectural patterns
     already documented in `CLAUDE.md` (single-stack navigation, `useApi`/`useAuth` usage,
     SecureStore handling).
  2. **General React Native/Expo best practices**: `FlatList`/virtualization vs `.map()` for
     lists, correct `key` usage, avoiding unnecessary re-renders and inline function/object props
     on hot paths, accessibility props, safe-area handling, platform-specific code, unnecessary
     re-fetching.
- Delivers findings the way a senior engineer would in review: what's wrong, why it matters,
  a concrete fix — not a pass/fail lint report.

## Testing

- `pnpm typecheck` and `pnpm test` after each migrated file/batch.
- Manual spot-check of at least one screen per major flow in Expo Go or the simulator after
  migration, since spacing values shift to the nearest scale step by design.
- No new automated tests are required for the theme/primitive modules themselves (they're
  presentational); existing `src/api/__tests__/client.test.ts` is unaffected.
