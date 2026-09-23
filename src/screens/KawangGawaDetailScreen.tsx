// US-V8 · Kawang-Gawa shift detail — the two consents, then the request.
// Reference: screens/user/screen-kawanggawa-detail.png. GET /shifts/{shiftId} returns the
// BrowseShift shape, which carries `org_name` (Task 4b) but no location field yet; POST
// /shifts/{shiftId}/signups sends both consents together.
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Avatar, Button, ScreenHeader, chipTones } from "../components/ui";

import { useApi } from "../api/useApi";
import { LoadStateView } from "../components/LoadStateView";
import { loadState } from "../net";
import { CheckIcon, VolunteerIcon } from "../components/AppIcons";
import { RootStackParamList } from "../navigation/types";
import { TAP_SLOP } from "../touch";
import {
  ShiftDetail, detailSignupState, locationLine, shiftDurationLabel, shiftHeadline,
  shiftSlotsChip, shiftTimeRange
} from "../volunteer";
import { colors, elevation, radii, spacing, squircle, typography } from "../theme";


const card = {
  backgroundColor: colors.white, ...elevation.soft
};

const TONE = {
  amber: { bg: "#FAEEDA", fg: "#633806" }, teal: { bg: "#E2EEF0", fg: "#14504F" },
  green: { bg: "#EAF3DE", fg: "#27500A" }, grey: { bg: "#ECEAE3", fg: "#5F5E5A" }
} as const;

/** The full date. The hub's section heads say "Today"/"Friday" because the list groups by
 *  day; a detail screen is the one place that should state which Friday. */
function shiftDateLabel(startsAt: string): string {
  return new Date(startsAt).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

/** K19 · a full-width status row in the shared `Chip` tones, for the one-of-four states a
 *  viewer's own signup can be in. Not `Chip` itself — `Chip` is a compact inline pill; this
 *  is the bottom-of-screen block that used to be the Request button's spot, so it reads as
 *  a statement rather than a tag. */
function StatusNote({ tone, text }: { tone: keyof typeof chipTones; text: string }) {
  const { bg, fg } = chipTones[tone];
  return (
    <View style={[statusNoteStyles.note, { backgroundColor: bg }]}>
      <Text style={[statusNoteStyles.text, { color: fg }]}>{text}</Text>
    </View>
  );
}

const statusNoteStyles = StyleSheet.create({
  note: { marginTop: 8, borderRadius: radii.notice, paddingHorizontal: 16, paddingVertical: 16 },
  text: { ...typography.meta, fontWeight: "700", lineHeight: 19 }
});

type Props = NativeStackScreenProps<RootStackParamList, "kawanggawaDetail">;

export function KawangGawaDetailScreen({ navigation, route }: Props) {
  const api = useApi();
  const { shiftId } = route.params;

  const [shift, setShift] = useState<ShiftDetail | null>(null);
  // US-R4 · was three hand-rolled booleans that collapsed offline, 5xx and "deleted"
  // into one sentence. Keeping the RESULT lets the shared view say which it was — and
  // a 404 here is ordinary: these routes are reached from a push notification about a
  // shift that may since have been cancelled.
  const [res, setRes] = useState<{ ok: boolean; status: number } | null>(null);


  const [waiverChecked, setWaiverChecked] = useState(false);
  const [contactChecked, setContactChecked] = useState(false);
  const [waiverHighlight, setWaiverHighlight] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);

  const load = useCallback(() => {
    setRes(null);
    api.get(`/shifts/${shiftId}`).then((r) => {
      setRes({ ok: r.ok, status: r.status });
      if (r.ok) setShift(r.data);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch on focus
  }, [shiftId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  // K19 · what the viewer's own relationship to this shift is, for the bottom block's switch.
  const mineState = shift ? detailSignupState(shift) : "none";

  // ⚠️ NOT a `canRequest` that disables the button. The design system's rule is explicit:
  // never disable a submit control because the form is incomplete — a disabled button gives
  // someone nothing to press and no way to find out why. The waiver is still an absolute gate
  // (D-S5-1); it just moved from "cannot be pressed" to "press it and be told exactly which
  // consent is missing". `submit()` below refuses, so the request cannot be made without it.
  //
  // `submitting` is the one thing that still disables, and it is not a validation state — it
  // stops a double POST while the first is in flight, and the spinner says so.
  async function submit() {
    if (submitting) return;

    // The waiver is the only required consent (D-S5-1). Contact sharing is optional (D1):
    // it is an RA 10173 exception the volunteer opts INTO, so it can never block a request.
    if (!waiverChecked) {
      setWaiverHighlight(true);
      setError(undefined);
      return;
    }
    if (shift?.status !== "open") {
      setError("This shift is no longer open.");
      return;
    }

    setSubmitting(true);
    setError(undefined);
    setWaiverHighlight(false);
    const res = await api.post(`/shifts/${shiftId}/signups`, {
      waiver_accepted: true,
      contact_share_consent: contactChecked
    });
    setSubmitting(false);
    if (res.ok) {
      navigation.navigate("kawanggawaRequested");
      return;
    }
    const code = res.data?.error?.code;
    if (res.status === 409 && code === "already_requested") {
      setError("You've already requested this shift.");
      return;
    }
    if (res.status === 409 && code === "shift_not_open") {
      setError("This shift is no longer open.");
      load();
      return;
    }
    if (res.status === 422 && code === "waiver_required") {
      setWaiverHighlight(true);
      setError("Please agree to the volunteer waiver to continue.");
      return;
    }
    setError(res.data?.error?.message ?? "Couldn't send your request. Try again.");
  }

  return (
    <View style={styles.screen} testID="screen.kawanggawaDetail">
      <ScreenHeader title="Volunteer" onBack={() => navigation.goBack()} />

      {!shift ? (
        <LoadStateView state={loadState(res)} subject="shift" onRetry={load}
          onBack={() => navigation.goBack()} />
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.heroRow}>
            <Avatar size={52}>
              <VolunteerIcon color={colors.teal} size={26} />
            </Avatar>
            <Text style={styles.heroTitle}>{shiftHeadline(shift)}</Text>
          </View>

          <Text style={styles.orgName}>{shift.org_name}</Text>

          {/* Matched to the hub card 2026-09-09. This said "5 of 5 slots left" while the card
              the user had just tapped said "5 slots" — one shift, two vocabularies, one tap
              apart. Same three tiers as the card now: day, time · duration, toned chip. */}
          <View style={styles.infoCard}>
            <Text style={styles.infoDate}>{shiftDateLabel(shift.starts_at)}</Text>
            <Text style={styles.infoWhen}>
              {shiftTimeRange(shift.starts_at, shift.ends_at)} · {shiftDurationLabel(shift.starts_at, shift.ends_at)}
            </Text>
            <View style={styles.infoDivider} />
            {(() => {
              const chip = shiftSlotsChip(shift.slots_left, shift.capacity);
              return (
                <View style={[styles.infoChip, { backgroundColor: TONE[chip.tone].bg }]}>
                  <Text style={[styles.infoChipText, { color: TONE[chip.tone].fg }]}>{chip.label}</Text>
                </View>
              );
            })()}
          </View>

          {shift.status !== "open" && (
            <Text style={styles.notOpenNote}>This shift is no longer open for requests.</Text>
          )}

          {/* P2 · what/where/who (G1, G2, K19). Sections are skipped rather than shown empty —
              a shelter that hasn't written a description yet shouldn't get a blank heading. */}
          {!!shift.description?.trim() && (
            <>
              <Text style={styles.sectionLabel}>What you'll do</Text>
              <Text style={styles.sectionBody}>{shift.description}</Text>
            </>
          )}

          <Text style={styles.sectionLabel}>Where</Text>
          {shift.location ? (
            <Text style={styles.sectionBody}>{locationLine(shift.location)}</Text>
          ) : (
            <>
              <Text style={styles.sectionBody}>
                {shift.city}{shift.province ? `, ${shift.province}` : ""}
              </Text>
              <Text style={styles.sectionMuted}>
                The exact meeting point is shared once the shelter confirms you.
              </Text>
            </>
          )}

          {mineState === "approved" && shift.shelter_contact && (
            <>
              <Text style={styles.sectionLabel}>Contact</Text>
              <View style={styles.contactCard}>
                <Text style={styles.contactName}>{shift.shelter_contact.name}</Text>
                {!!shift.shelter_contact.phone && (
                  <TouchableOpacity
                    style={styles.contactRow}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel={`Call ${shift.shelter_contact.name}`}
                    onPress={() => Linking.openURL(`tel:${shift.shelter_contact!.phone}`)}
                  >
                    <Text style={styles.contactRowText}>{shift.shelter_contact.phone}</Text>
                  </TouchableOpacity>
                )}
                {!!shift.shelter_contact.email && (
                  <TouchableOpacity
                    style={styles.contactRow}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel={`Email ${shift.shelter_contact.name}`}
                    onPress={() => Linking.openURL(`mailto:${shift.shelter_contact!.email}`)}
                  >
                    <Text style={styles.contactRowText}>{shift.shelter_contact.email}</Text>
                  </TouchableOpacity>
                )}
              </View>
            </>
          )}

          {/* K19 · the screen used to offer Request to someone who had already requested, and
              the only feedback was a 409. It now says where they stand. */}
          {mineState === "requested" && (
            <StatusNote tone="warning" text="You've requested this shift. The shelter will confirm soon." />
          )}
          {mineState === "approved" && (
            <StatusNote tone="success" text="You're confirmed for this shift." />
          )}
          {mineState === "closed_for_you" && (
            <StatusNote tone="neutral" text="You've already done this shift." />
          )}
          {mineState === "none" && (
            <>
              <Text style={styles.sectionLabel}>Before you request</Text>

              <TouchableOpacity
                testID="chk.kawanggawaDetail.waiver"
                activeOpacity={0.85}
                style={[styles.consentRow, waiverHighlight && styles.consentRowAlert]}
                onPress={() => {
                  setWaiverChecked((v) => !v);
                  if (waiverHighlight) setWaiverHighlight(false);
                }}
              >
                <View style={[styles.consentBox, waiverChecked && styles.consentBoxChecked, waiverHighlight && styles.consentBoxAlert]}>
                  {waiverChecked && <CheckIcon color="#FFFFFF" size={13} />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.consentText}>
                    I agree to the{" "}
                    <Text style={styles.consentLink} onPress={() => navigation.navigate("waiver")}>
                      volunteer waiver & guidelines
                    </Text>
                    .
                  </Text>
                  <Text style={styles.consentHelper}>Tap the link to read what's there so far.</Text>
                  {/* Inside the tinted block on purpose. Sitting between the two rows, this read
                      as if it belonged to the row BELOW whenever only one consent was missing. */}
                  {waiverHighlight && (
                    <Text testID="err.kawanggawaDetail.waiver" style={styles.consentError}>
                      Agree to the waiver to request this shift.
                    </Text>
                  )}
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                testID="chk.kawanggawaDetail.contact"
                activeOpacity={0.85}
                style={styles.consentRow}
                onPress={() => setContactChecked((v) => !v)}
              >
                <View style={[styles.consentBox, contactChecked && styles.consentBoxChecked]}>
                  {contactChecked && <CheckIcon color="#FFFFFF" size={13} />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.consentText}>
                    Share my phone number and email with {shift.org_name} for this shift.
                  </Text>
                  <Text style={styles.consentHelper}>
                    Optional. The shelter can still approve you without it.
                  </Text>
                </View>
              </TouchableOpacity>

              {!!error && <Text style={styles.formError}>{error}</Text>}

              <Button
                testID="btn.kawanggawaDetail.request"
                label="Request"
                onPress={submit}
                loading={submitting}
                accessibilityLabel="Request this shift"
                style={styles.submitButton}
              />
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.page },
  content: { paddingHorizontal: spacing.lg, paddingTop: 22, paddingBottom: 60 },
  heroRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  // Squircle, matching the hub card's tile — V2 replaced round tiles with rounded squares.
  heroTitle: { flex: 1, color: colors.ink, ...typography.hero },
  orgName: { marginTop: 14, color: colors.ink, ...typography.subtitle, fontWeight: "800" },
  infoCard: { marginTop: 16, borderRadius: radii.tile, paddingHorizontal: 18, paddingVertical: 16, ...card },
  infoDate: { color: colors.ink, ...typography.subtitle, fontWeight: "800" },
  infoWhen: { marginTop: 4, color: colors.teal, ...typography.strong, fontWeight: "700" },
  infoDivider: { marginTop: 14, height: 1, backgroundColor: colors.border },
  infoChip: { marginTop: 14, alignSelf: "flex-start", paddingHorizontal: 12, height: 28,
              borderRadius: 14, justifyContent: "center" },
  infoChipText: { ...typography.meta, fontWeight: "800" },
  notOpenNote: { marginTop: 14, color: colors.danger, ...typography.meta, fontWeight: "700" },
  sectionLabel: { marginTop: 28, marginBottom: 12, color: colors.ink, ...typography.subtitle, fontWeight: "800" },
  sectionBody: { color: colors.ink, ...typography.meta, fontWeight: "600", lineHeight: 20 },
  sectionMuted: { marginTop: 6, color: colors.muted, ...typography.caption, fontWeight: "600", lineHeight: 18 },
  contactCard: { marginTop: 4, borderRadius: radii.notice, backgroundColor: colors.soft, overflow: "hidden" },
  contactName: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6, color: colors.ink,
                 ...typography.meta, fontWeight: "800" },
  contactRow: { minHeight: 44, paddingHorizontal: 16, paddingVertical: 12, justifyContent: "center" },
  contactRowText: { color: colors.teal, ...typography.meta, fontWeight: "700" },
  consentRow: {
    marginBottom: 14, borderRadius: radii.notice, flexDirection: "row", alignItems: "flex-start",
    paddingHorizontal: 16, paddingVertical: 16, gap: 14, backgroundColor: colors.soft
  },
  consentRowAlert: { backgroundColor: "#FBEEEC" },
  consentBox: {
    width: 26, height: 26, borderRadius: 7, borderWidth: 1.5, borderColor: colors.teal,
    alignItems: "center", justifyContent: "center", backgroundColor: colors.white, marginTop: 1
  },
  consentBoxChecked: { backgroundColor: colors.teal },
  consentBoxAlert: { borderColor: colors.danger },
  consentText: { color: colors.tealDark, ...typography.meta, fontWeight: "700", lineHeight: 19 },
  consentLink: { textDecorationLine: "underline" },
  consentHelper: { marginTop: 6, color: colors.muted, ...typography.caption, fontWeight: "600" },
  formError: { marginTop: 4, marginBottom: 10, color: colors.danger, ...typography.meta, fontWeight: "700" },
  submitButton: { marginTop: 8 },
  consentError: { marginTop: 8, color: colors.danger, ...typography.meta, fontWeight: "700" }
});
