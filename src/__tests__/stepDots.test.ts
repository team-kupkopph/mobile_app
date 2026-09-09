/**
 * The progress dots must not lie about how many steps remain.
 *
 * ⚠️ THIS HAS ALREADY CAUSED A REAL UX BUG HERE. The owner signup journey has THREE stops and
 * the shelter one has FOUR, and the shelter flow was once drawn with the owner's dot count —
 * so a shelter admin three screens in was shown "almost done" with a whole step still to come.
 * SHELTER_STEP_COUNT exists because of that.
 *
 * The fragile part is not the shelter-only screens, which hardcode the right constant. It is
 * the TWO SCREENS THAT SERVE BOTH JOURNEYS: Otp and Signup are reached by owners and shelters
 * alike, so their dot count has to be a branch on which journey the user is actually in.
 * A refactor that "simplifies" either branch to a constant silently reintroduces the bug for
 * one of the two audiences, and nothing about the screen will look wrong while it does.
 */
import { readdirSync, readFileSync } from "fs";
import { join } from "path";

const SCREENS = join(__dirname, "..", "screens");
const read = (f: string) => readFileSync(join(SCREENS, f), "utf8");

const files = readdirSync(SCREENS).filter((f) => f.endsWith(".tsx"));
const usesHeader = files.filter((f) => f !== "AuthFormKit.tsx" && /<AuthHeader/.test(read(f)));

/** Reached only from the shelter journey — these may hardcode the shelter count. */
const SHELTER_ONLY = [
  "ShelterTierScreen.tsx",
  "ShelterContactScreen.tsx",
  "ShelterSetupScreen.tsx",
  "ShelterPhoneVerifyScreen.tsx"
];

/** Reached from BOTH journeys — these must branch, never hardcode. */
const DUAL_JOURNEY = ["OtpScreen.tsx", "SignupScreen.tsx"];

describe("signup progress dots", () => {
  it("found the screens it means to check", () => {
    // ⚠️ Assert the scan found something before trusting that it found nothing.
    expect(usesHeader.length).toBeGreaterThanOrEqual(SHELTER_ONLY.length + DUAL_JOURNEY.length);
  });

  it("the two journeys are still different lengths", () => {
    const kit = read("AuthFormKit.tsx");
    expect(kit).toMatch(/AUTH_STEP_COUNT\s*=\s*3/);
    expect(kit).toMatch(/SHELTER_STEP_COUNT\s*=\s*4/);
  });

  it.each(SHELTER_ONLY)("%s uses the shelter count", (file) => {
    expect(read(file)).toMatch(/stepCount=\{SHELTER_STEP_COUNT\}/);
  });

  it.each(DUAL_JOURNEY)("%s branches on the journey instead of hardcoding", (file) => {
    const src = read(file);
    // It must mention the shelter count...
    expect(src).toMatch(/SHELTER_STEP_COUNT/);
    // ...but never as an unconditional value, which is the shape that breaks one audience.
    expect(src).not.toMatch(/stepCount=\{SHELTER_STEP_COUNT\}/);
    // The branch itself: a ternary choosing the count from the journey.
    expect(src).toMatch(/stepCount=\{[^}]*\?[^}]*SHELTER_STEP_COUNT/);
  });
});
