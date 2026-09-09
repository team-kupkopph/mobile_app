// The V3 primitives.
//
// ⚠️ Deliberately only the two Sign in actually uses. reachable.test.ts requires every .tsx to
// have an importer, and it is right to: an API with no caller is speculative code, and this
// repo has already paid for 1,406 lines of it. The remaining primitives — Card, Chip, Avatar,
// SegmentedControl, SectionHeader — are written and waiting on branch
// sprint11/fd3-primitives, and each lands with its own first consumer.
export { Field } from "./Field";
export { Button, type ButtonVariant } from "./Button";
export { Chip, chipTones, type ChipTone } from "./Chip";
export { TabBar, TAB_BAR, type TabBarItem } from "./TabBar";
