# E2E smoke on the money paths (US-X2)

Maestro flows over the paths the app exists for. **Pre-release, not per-PR** (§15.4) —
these drive a real simulator against a real backend and take minutes, and a suite that makes
every PR slow is a suite people learn to skip.

## What is actually covered

| Flow | Path | Runs unattended |
|---|---|---|
| `10-report-a-stray.yaml` | file a report → it appears in My Reports | ✅ |
| `20-browse-and-inquire.yaml` | browse adoptable animals → inquire | ✅ |
| `30-volunteer-signup.yaml` | shift → waiver + contact consent → requested | ✅ |
| `15-owner-profile.yaml` | "You" tab → the owner's profile | ✅ |
| `50-shelter-shell.yaml` | shelter sign-in → dashboard ⇄ shelter profile | ✅ |
| `40-signup-needs-a-human.yaml` | signup → email code → home | ❌ — one value is typed by a person |

### Why the last two exist

`ProfileScreen`, `ShelterDashboardScreen` and `ShelterProfileScreen` sit behind a sign-in, so
for three sprints they were "verified by reading the diff" and a person had to be asked to log
in each time it mattered. Asking a human to be the test harness does not scale and does not
repeat. These flows do the same walk from environment variables, the same way, every run —
which is the whole argument for US-X2 in one example.

`50-shelter-shell.yaml` also asserts something no one thought to check by hand: the stack's
`initialRouteName` is always `home`, so a returning shelter account lands on the OWNER home
screen and `HomeScreen` resets it to the shelter shell after reading `/me`. If that redirect
breaks, a shelter admin opens the app into someone else's product.

`00-signin.yaml` is a subroutine the others call, not a path of its own. `50-shelter-shell`
calls it with **different** credentials via `runFlow.env`, which is why its landing assertion
is `screen.home` — the one post-login state an owner and a shelter genuinely share.

## Why signup can't run unattended

It needs the 6-digit code, and there is deliberately no way for a test to read one.
`ConsoleSender` prints it to stdout and keeps it **out of the logging system entirely**,
because §12.6 requires that CloudWatch read access must not double as "sign in as any user".
That is a good rule and this suite is not a reason to weaken it.

So `MAESTRO_OTP` is supplied by whoever runs the flow, read from the dev server's stdout.

**What would make it autonomous** — and what is deliberately *not* in this repo: a dev-only
fixed code for a single throwaway `.invalid` domain, behind three independent guards (`DEBUG`;
both settings explicitly present so no default config enables it; the domain required to end
in `.invalid`, so a typo pointing it at a real domain is refused loudly). The shape matters:
a "give me the code" endpoint whose guard fails in production hands out the live OTP for
**any** address, whereas a fixed code whose guard fails affects only a domain nobody can
register and no mail can reach. That is still an authentication bypass in the backend, it
needs the owner's explicit sign-off, and it was not added unilaterally.

Every other flow sidesteps it entirely: **sign-in needs no code.**

## Setup

Maestro **is** installed on this machine — 2.10.0, via Homebrew (`/opt/homebrew/bin/maestro`).
Elsewhere:

```bash
curl -Ls "https://get.maestro.mobile.dev" | bash
```

⚠️ **Maestro needs a JDK on PATH, and `maestro --version` is how you find out it does not have
one.** It fails with *"Unable to locate a Java Runtime"* — which reads like Maestro is missing
rather than Java. On this machine `openjdk` is installed but not linked, so every Maestro
command needs:

```bash
export JAVA_HOME=/opt/homebrew/opt/openjdk
export PATH="$JAVA_HOME/bin:$PATH"
```

Then build and install the app on a booted simulator once:

```bash
cd mobile_app && npx expo run:ios
```

⚠️ **If that fails with *"The sandbox is not in sync with the Podfile.lock"*, run `pod install`
in `ios/` — and if `pod install` then dies inside its own error reporter with
`Encoding::CompatibilityError` / "Unicode Normalization not appropriate for ASCII-8BIT", that
is CocoaPods crashing while formatting the real error, not the real error. Set a UTF-8 locale
and run it again:**

```bash
cd ios && LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 pod install
```

`expo run:ios` produces a **dev client**, so a Metro bundler must be running on 8081 for the
app to load JS at all. Maestro drives the installed `ph.kupkop.app`, not Expo Go — Expo Go
cannot be targeted by these flows, because `appId` names the real bundle identifier.

## Last full run — US-PF2, 2026-09-09, against the Sprint 11 converted screens

**8 of 9 flows pass. The ninth cannot run unattended and this is not a new fact** — see
`40-signup-needs-a-human.yaml`, whose filename has said so since it was written.

| | |
|---|---|
| 00-signin | ✅ 17s |
| 10-report-a-stray | ✅ 30s |
| 15-owner-profile | ✅ 17s |
| 20-browse-and-inquire | ✅ 19s |
| 30-volunteer-signup | ✅ 23s |
| 50-shelter-shell | ✅ 18s |
| 60-settings-and-data-rights | ✅ 28s |
| 70-offline-degradation | ✅ (backend stopped, after a signed-in session) |
| 40-signup-needs-a-human | ⛔ **not run** — `MAESTRO_OTP` is bound *before* the run, and the code is generated *during* it. No amount of reading the dev server's stdout closes that gap; only the fixed-code backend change this file already describes would, and that needs the owner's sign-off. |

Run on iPhone 17 Pro Max, iOS 26.5, against a local backend on `localhost:8000` with fixtures
from `backend/dev/e2e_fixtures.py` and a seed of 9 listings / 1 future shift.

**Why this run mattered:** Sprint 11 rewrote the chrome these flows tap. US-CH1 collapsed three
tab bars into one, moving `tab.adopt` / `tab.volunteer` / `tab.home` out of JSX attributes and
into item objects; US-CH2 replaced the per-screen headers on 23 screens, moving `btn.back` into
a shared component. `70-offline-degradation` exercises all four of those selectors **and** the
assertion the whole of Track R came from — that the rescue map must not say "No strays reported
near" when it simply could not reach the server. It passed unchanged.

⚠️ **Budget your runs: login is 20/hour per IP** (`login_ip` in `config/settings.py`, alongside
`login_identifier` at 10/hour). Seven flows sign in, so a full pass costs ~8 attempts and you
get roughly **two per hour**. Fix things between runs rather than retrying blind — and never
poll the endpoint to check whether the throttle cleared, because each probe is itself an
attempt against the same limit.

## Credentials

**Nothing in this repository should ever contain a real credential.** The flows read them
from the environment, and `e2eSelectors.test.ts` fails the build if a literal address or
password appears in a flow file.

`MAESTRO_EMAIL` / `MAESTRO_PASSWORD` belong to a **throwaway account on a dev or staging
backend** — never a real user's, and never a production account.

Create or refresh both fixtures with the accounts, capabilities and shelter profile the flows
need — the owner's Verified Member standing included, without which the inquiry is correctly
refused:

```bash
cd backend && eval "$(DJANGO_DEBUG=1 .venv/bin/python dev/e2e_fixtures.py)"
```

It refuses to run outside `DEBUG`, refuses any address that is not `.invalid`, and generates
new passwords every run.

```bash
cd mobile_app && \
  MAESTRO_EMAIL=... MAESTRO_PASSWORD=... \
  MAESTRO_SHELTER_EMAIL=... MAESTRO_SHELTER_PASSWORD=... \
  maestro test e2e/
```

⚠️ **Two accounts, not one.** `MAESTRO_SHELTER_*` must be an account whose `account_type` is
`shelter` — the shelter shell is unreachable otherwise, and the owner credentials cannot get
there no matter what they tap.

The signup flow additionally needs a fresh address each run (signup deliberately reports
"this email already has an account" — the one place enumeration is allowed):

```bash
MAESTRO_SIGNUP_EMAIL="smoke+$(date +%s)@e2e.invalid" \
MAESTRO_SIGNUP_PASSWORD=... \
MAESTRO_OTP=123456 \
  maestro test e2e/flows/40-signup-needs-a-human.yaml
```

## Environment the flows need

Learned by running them, each one a real failure first:

| Requirement | Why |
|---|---|
| `clearKeychain` before launch | tokens live in SecureStore (the iOS keychain), which `clearState` does **not** wipe — the app relaunched still signed in |
| `location: inuse` permission | the report flow's submit is gated on a GPS fix; without the grant it waits forever on a dialog no assertion mentions. `allow` is rejected for location specifically |
| a simulated location | `xcrun simctl location <udid> set 14.6507,121.1029` — permission alone gives no fix |
| an account that can inquire | the adoption inquiry is gated on Verified Member + verified phone (US-A3/A4). A bare account is correctly refused, so the fixture needs the same standing a real adopter has |
| ⚠️ **never poll the login endpoint to see if the throttle cleared** | each probe is itself a login attempt against the same IP limit, so the loop keeps the lockout alive indefinitely. Wait passively |
| ⚠️ **login is rate-limited BY IP** | running the sign-in repeatedly trips `LoginIpThrottle` (HTTP 429, ~30 min) and then **every** account from that machine is refused — a fresh fixture does not dodge it. This is the backend working; space the runs out |

## Seed requirements

`20-browse-and-inquire` needs at least one listing and `30-volunteer-signup` at least one open
shift. If the seed is empty they fail on a missing `card.adopt.0` / `card.kawanggawa.0` —
**which is the correct outcome.** A flow that skips itself when its fixture is empty is the
same green-but-checked-nothing failure US-G1 was written about.

## ⚠️ Text assertions: plain ASCII only

Learned across three failed attempts on one assertion. **Every text assertion that failed
contained a non-alphanumeric character; every one that passed was plain ASCII words.**

| assertion | result |
|---|---|
| `"Inquiry sent"`, `"Back to home"`, `"No strays reported near"` | matched |
| `"You're offline"` (apostrophe) | **failed against a screen displaying exactly that** |
| `"Dog · Injured"` (middle dot) | **failed against a screen displaying exactly that** |

Both failures were verified by screenshot and by comparing the bytes — the app and the flow
held the identical character. Whatever the cause, the lesson is the same one this suite is
built on: **assert an id.** Text assertions are reserved for the one case that genuinely needs
literal copy — the forbidden empty state in the offline walk — and even there the accompanying
positive assertion is by id.

## Selectors, and why they aren't text

Flows match on `testID`, not on visible copy. Maestro can match text and every tutorial does,
but Track R rewrote user-facing copy across 42 screens in one sprint — a suite pinned to copy
fails on every wording change until someone deletes it. The id is a contract between the app
and the flows; the copy stays free to improve.

Naming: `screen.<route>` (matching the `Stack.Screen` name exactly), `btn.<screen>.<action>`,
`field.<screen>.<name>`, `chk.<screen>.<name>`, `card.<list>.<index>`, `tab.<key>` for the
owner shell and `tab.shelter.<key>` for the shelter one.

## What guards this between releases

`src/__tests__/e2eSelectors.test.ts` runs in the normal unit suite, in milliseconds, with no
simulator. It checks that every selector a flow references exists in the app, that screen
anchors match real routes, and that no credential is committed.

⚠️ **It does not prove the flows pass.** It proves the flows and the app have not drifted
apart — the single most common way a pre-release suite rots into a pile of failures on ship
day. "The selectors are wired" is the claim; "E2E is covered" is not.
