// US-V8 · Task 5 (K30, G9) — the "My shifts" half of the Kawang-Gawa hub's segmented control.
// Folds what used to be two separate screens (KawangGawaScheduleScreen's upcoming/requested,
// KawangGawaHistoryScreen's stats + history) into one component the hub renders at index 1,
// over the same `/me/signups` payload the hub already fetches for its impact strip. Pure
// presentation: the hub owns the fetch, the load state, and where `onOpen`/`onCancel` go.
import { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { addToCalendar } from "../../calendarShare";
import { VolunteerIcon } from "../AppIcons";
import {
  historyHours, historyLateNote, locationLine, MySignupItem, MySignups, shiftHeadline, shiftTypeLabel,
  signupStatusCard
} from "../../volunteer";
import { TAP_SLOP } from "../../touch";
import { useLargeText } from "../../useLargeText";
import { colors, maxFontScale, squircle, typography } from "../../theme";
import { Card, Chip } from "../ui";

function shiftDateLabel(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function shiftWhenLabel(startsAt: string, endsAt: string): string {
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  const date = start.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  const startTime = start.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  const endTime = end.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return `${date} · ${startTime}–${endTime}`;
}

// Sum of `item.hours` across completed shifts only — the numeric aggregate for the Hours stat.
// `historyHours` (from ../../volunteer) formats a single item for display; it isn't summed itself.
function totalCompletedHours(history: MySignupItem[]): number {
  return history
    .filter((i) => i.status === "completed")
    .reduce((sum, i) => sum + (i.hours ?? 0), 0);
}

function hoursLabel(total: number): string {
  return Number.isInteger(total) ? `${total}h` : `${total.toFixed(1)}h`;
}

function StatusChip({ item }: { item: MySignupItem }) {
  const { label, tone } = signupStatusCard(item);
  return <Chip label={label} tone={tone} />;
}

// A small, separately-tappable affordance on an upcoming/requested card. Nested inside the
// card's own TouchableOpacity (which, on an Upcoming row, navigates to check-in) — RN's touch
// responder system lets the innermost Touchable claim the gesture, so tapping "Cancel" never
// also fires the card tap.
function CancelLink({ label = "Cancel", onPress }: { label?: string; onPress: () => void }) {
  return (
    <TouchableOpacity activeOpacity={0.6} onPress={onPress} hitSlop={TAP_SLOP} style={styles.cancelLink}>
      <Text style={styles.cancelLinkText}>{label}</Text>
    </TouchableOpacity>
  );
}

// G5 · same "Add to calendar" share action as the check-in screen, nested the same way
// CancelLink is — inside the card's own TouchableOpacity, so tapping it never also opens
// check-in. Busy state is local: this list can hold several cards mid-share at once.
function CalendarLink({ item }: { item: MySignupItem }) {
  const [busy, setBusy] = useState(false);

  async function onPress() {
    if (busy) return;
    setBusy(true);
    try {
      await addToCalendar(item);
    } catch {
      // No error slot on a list card — the OS share sheet not opening is visible on its own.
    } finally {
      setBusy(false);
    }
  }

  return (
    <TouchableOpacity activeOpacity={0.6} onPress={onPress} hitSlop={TAP_SLOP} style={styles.calendarLink} disabled={busy}>
      <Text style={styles.calendarLinkText}>Add to calendar</Text>
    </TouchableOpacity>
  );
}

function ShiftCardBody({ item }: { item: MySignupItem }) {
  // At Dynamic Type AX3 and up icon | copy | chip cannot share a line, so the card stacks.
  const large = useLargeText();
  return (
    <>
      <View style={styles.cardIcon}>
        <VolunteerIcon color={colors.teal} size={22} />
      </View>
      <View style={large ? styles.cardCopyLarge : styles.cardCopy}>
        <Text style={styles.cardTitle} maxFontSizeMultiplier={maxFontScale.title}>{shiftHeadline(item.shift)}</Text>
        <Text style={styles.cardOrg}>{item.shift.org_name}</Text>
        <Text style={styles.cardMeta}>{shiftWhenLabel(item.shift.starts_at, item.shift.ends_at)}</Text>
        {/* G2 · once the shelter approves, `location` shows up on the embedded shift — the
            meeting point earns its own line rather than crowding the time line. */}
        {item.shift.location && (
          <Text style={styles.cardLocation}>{locationLine(item.shift.location)}</Text>
        )}
        {/* G9 · once the shelter assigns an animal, name it here — the volunteer should not
            have to open check-in just to find out who they're walking. */}
        {item.assigned_animal && (
          <Text style={styles.cardLocation}>You'll walk {item.assigned_animal.name}</Text>
        )}
      </View>
      <StatusChip item={item} />
    </>
  );
}

function HistoryRow({ item }: { item: MySignupItem }) {
  const large = useLargeText();
  const hours = item.status === "completed" ? historyHours(item) : null;
  const lateNote = historyLateNote(item);
  return (
    <Card style={styles.card}>
      <View style={[styles.cardRow, large && styles.cardRowLarge]}>
        <View style={styles.cardIcon}>
          <VolunteerIcon color={colors.teal} size={22} />
        </View>
        <View style={large ? styles.cardCopyLarge : styles.cardCopy}>
          <Text style={styles.cardTitle} maxFontSizeMultiplier={maxFontScale.title}>{shiftTypeLabel(item.shift.type)}</Text>
          <Text style={styles.cardOrg}>
            {item.shift.org_name} · {shiftDateLabel(item.shift.starts_at)}
            {hours ? ` · ${hours}` : ""}
          </Text>
          {lateNote && <Text style={styles.lateNote}>{lateNote}</Text>}
        </View>
        <StatusChip item={item} />
      </View>
    </Card>
  );
}

export function MyShifts({
  data, onOpen, onCancel
}: {
  data: MySignups;
  onOpen: (item: MySignupItem) => void;
  onCancel: (item: MySignupItem) => void;
}) {
  const { requested, upcoming, history, reliability } = data;
  const isEmpty = requested.length === 0 && upcoming.length === 0 && history.length === 0;
  const large = useLargeText();

  // F-R2-3 · the stats card renders for a brand-new account too — zeroes and all — so My shifts
  // has the same shape on day one as on day ninety, with the empty copy beneath it rather than
  // in place of it. (The hub's impact strip is the one place zeroes are hidden: see
  // volunteerTotalsLabel.)
  return (
    <View>
      <Card style={[styles.statsCard, large && styles.statsCardLarge]}>
        <View style={large ? styles.statColLarge : styles.statCol}>
          <Text style={styles.statValue} maxFontSizeMultiplier={maxFontScale.title}>{reliability.shifts_completed}</Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
        <View style={large ? styles.statDividerLarge : styles.statDivider} />
        <View style={large ? styles.statColLarge : styles.statCol}>
          <Text style={styles.statValue} maxFontSizeMultiplier={maxFontScale.title}>{hoursLabel(totalCompletedHours(history))}</Text>
          <Text style={styles.statLabel}>Hours</Text>
        </View>
        <View style={large ? styles.statDividerLarge : styles.statDivider} />
        <View style={large ? styles.statColLarge : styles.statCol}>
          <Text style={styles.statValue} maxFontSizeMultiplier={maxFontScale.title}>{reliability.no_shows}</Text>
          <Text style={styles.statLabel}>No-shows</Text>
        </View>
      </Card>

      {requested.length > 0 && (
        <>
          <Text style={styles.sectionLabel}>Awaiting approval</Text>
          {requested.map((item) => (
            <Card key={item.signup_id} style={[styles.card, styles.cardColumn]}>
              <View style={[styles.cardRow, large && styles.cardRowLarge]}>
                <ShiftCardBody item={item} />
              </View>
              <View style={styles.cancelOnlyRow}>
                <CancelLink label="Cancel request" onPress={() => onCancel(item)} />
              </View>
            </Card>
          ))}
        </>
      )}

      {upcoming.length > 0 && (
        <>
          <Text style={styles.sectionLabel}>Upcoming shifts</Text>
          {upcoming.map((item) => (
            <TouchableOpacity
              key={item.signup_id}
              activeOpacity={0.85}
              onPress={() => onOpen(item)}
              accessibilityRole="button"
              accessibilityLabel="Volunteer shift — open to check in"
              // US-W1 · a card with a NESTED touchable (CancelLink) gets its own accessible
              // container flattened by iOS — a VoiceOver user reaching "open to check in" has
              // no other way to reach Cancel. The action joins the element's rotor instead:
              // reachable without moving the visual link or the card's layout.
              accessibilityActions={[{ name: "cancel", label: "Cancel this shift" }]}
              onAccessibilityAction={(event) => {
                if (event.nativeEvent.actionName === "cancel") onCancel(item);
              }}
            >
              <Card style={styles.cardColumn}>
                <View style={[styles.cardRow, large && styles.cardRowLarge]}>
                  <ShiftCardBody item={item} />
                </View>
                <View style={styles.cardLinkRow}>
                  <CalendarLink item={item} />
                  <CancelLink onPress={() => onCancel(item)} />
                </View>
              </Card>
            </TouchableOpacity>
          ))}
        </>
      )}

      {history.length > 0 && (
        <>
          <Text style={styles.sectionLabel}>Shift history</Text>
          {history.map((item) => <HistoryRow key={item.signup_id} item={item} />)}
        </>
      )}

      {isEmpty && (
        <View style={styles.emptyWrap}>
          <Text style={styles.empty}>No shifts yet. Browse and request one — it'll show up here.</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  emptyWrap: { paddingTop: 6, paddingHorizontal: 8 },
  empty: { color: colors.muted, ...typography.body, textAlign: "center" },
  statsCard: { flexDirection: "row", alignItems: "center", paddingVertical: 20, marginBottom: 18 },
  statCol: { flex: 1, alignItems: "center" },
  // large: one stat per line. The base `flex: 1` survives in a style array and would collapse the text in a column (`flex: 0` is what works, #189).
  statsCardLarge: { flexDirection: "column", alignItems: "stretch" },
  statColLarge: { flex: 0, alignSelf: "stretch", flexGrow: 0, flexBasis: "auto", alignItems: "center" },
  statDividerLarge: { width: "100%", height: 1, marginVertical: 12, backgroundColor: colors.border },
  statDivider: { width: 1, height: 40, backgroundColor: colors.border },
  statValue: { color: colors.ink, ...typography.hero },
  statLabel: { marginTop: 4, color: colors.muted, ...typography.meta, fontWeight: "700" },
  sectionLabel: { marginTop: 18, marginBottom: 12, color: colors.ink, ...typography.subtitle, fontWeight: "800" },
  card: { marginBottom: 12 },
  cardColumn: { marginBottom: 12 },
  cardRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  cardRowLarge: { flexDirection: "column", alignItems: "flex-start" },
  cardCopy: { flex: 1 },
  cardCopyLarge: { flex: 0, alignSelf: "stretch", flexGrow: 0, flexBasis: "auto" },
  cardLinkRow: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", columnGap: 12, marginTop: 10 },
  cancelOnlyRow: { alignItems: "flex-end", marginTop: 10 },
  cancelLink: { paddingVertical: 4, paddingHorizontal: 4 },
  cancelLinkText: { color: colors.danger, ...typography.meta, fontWeight: "800" },
  calendarLink: { paddingVertical: 4, paddingHorizontal: 4 },
  calendarLinkText: { color: colors.teal, ...typography.meta, fontWeight: "800" },
  // Squircle (0.32 × size), not a circle — VolunteerHub.dc.html calls out "MyShifts draws a
  // circle today" as the one thing this row's tile still had to fix.
  cardIcon: { width: 44, height: 44, borderRadius: squircle(44), backgroundColor: colors.soft,
              alignItems: "center", justifyContent: "center" },
  cardTitle: { color: colors.ink, ...typography.subtitle, fontWeight: "800" },
  cardOrg: { marginTop: 2, color: colors.muted, ...typography.meta, fontWeight: "700" },
  cardMeta: { marginTop: 6, color: colors.teal, ...typography.meta, fontWeight: "700" },
  cardLocation: { marginTop: 4, color: colors.muted, ...typography.caption, fontWeight: "600" },
  lateNote: { marginTop: 4, color: colors.danger, ...typography.caption, fontWeight: "700" }
});
