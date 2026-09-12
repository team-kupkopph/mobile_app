// The adopter's inquiry ladder. Reference: design/mobile-v3/Inquiry.dc.html.
//
// There is no GET /inquiries/{id}: this resolves the inquiry the way PlaceRequestScreen does —
// GET /me/inquiries matched by id — then fetches the listing for the pet's photo and the
// poster (the shelter). The stages ARE the inquiry; the listing is decoration on them, and its
// failure degrades the header rather than taking down the ladder.
//
// ⚠️ THREE THINGS THE ARTBOARD SHOWS THAT THIS SCREEN DOES NOT, and why:
//   · (Resolved by backend #18.) A date on each done step ("Jul 12") — /me/inquiries now sends
//     each stage's `updated_at` (null until it has moved) and the poster's `note`, which is
//     shown in place of the generic step text when they wrote one.
//   · "Replies in about a day." No response-time data exists anywhere. Omitted rather than
//     invented — the same rule as the fake clock the status bar used to show.
//   · "Message PAWS Manila." There is no messaging feature (reportContent notes the message
//     target is "modeled backend-side but has no UI trigger yet"), and the poster object
//     carries no contact. A CTA with nowhere to go is the dead control socialAuth.ts warns
//     about, so there is no sticky footer here until there is somewhere for it to lead.
//
// The badge is real. Public listings come only from a verified poster (listings/visibility.py
// public_poster_q: Verified Member OR verified shelter), so an adopter cannot have inquired on
// anything else. It names the type, as the design system requires.
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { Image, ScrollView, StyleSheet, Text, View } from "react-native";

import { ListingDetail, MyInquiry } from "../api/types";
import { useApi } from "../api/useApi";
import { STAGE_ORDER, STAGE_STEP, ladderStep, stageMeta, stageStateChip } from "../adoption";
import { AdoptIcon, CheckIcon } from "../components/AppIcons";
import { LoadStateView } from "../components/LoadStateView";
import { ScreenBackdrop } from "../components/ScreenBackground";
import { Avatar, Card, Chip, PressScale, ScreenHeader } from "../components/ui";
import { loadState } from "../net";
import { RootStackParamList } from "../navigation/types";
import { colors, gradients, motion, pill, radii, spacing, squircle, typography } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "inquiry">;

const TILE = 62;
const DOT = 30;

function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("");
}

export function InquiryScreen({ navigation, route }: Props) {
  const api = useApi();
  const { inquiryId } = route.params;

  const [inquiry, setInquiry] = useState<MyInquiry | null>(null);
  const [res, setRes] = useState<{ ok: boolean; status: number } | null>(null);
  const [listing, setListing] = useState<ListingDetail | null>(null);
  // The artboard opens the current step by default; tapping a step toggles it.
  const [open, setOpen] = useState<string | null>(null);

  const load = useCallback(() => {
    setRes(null);
    api.get("/me/inquiries").then((r) => {
      setRes({ ok: r.ok, status: r.status });
      const found: MyInquiry | undefined = r.ok
        ? (r.data?.results ?? []).find((iq: MyInquiry) => iq.inquiry_id === inquiryId)
        : undefined;
      setInquiry(found ?? null);
      if (found) {
        const current = found.stages.find((s) => s.state === "in_progress");
        setOpen((prev) => prev ?? current?.stage_key ?? null);
        api.get(`/listings/${found.listing.listing_id}`).then((lr) => {
          if (lr.ok) setListing(lr.data);
        });
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch on focus
  }, [inquiryId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const state = loadState(res);

  return (
    <View style={styles.screen} testID="screen.inquiry">
      <ScreenBackdrop />
      <ScreenHeader title="Your inquiry" onBack={() => navigation.goBack()} align="center" />

      {!inquiry ? (
        <LoadStateView
          state={res?.ok ? ({ kind: "gone" } as const) : state}
          subject="inquiry"
          onRetry={load}
          onBack={() => navigation.goBack()}
        />
      ) : (
        <InquiryBody
          inquiry={inquiry}
          listing={listing}
          open={open}
          onToggle={(key) => setOpen((prev) => (prev === key ? null : key))}
          onListing={() => navigation.navigate("listingDetail", { listingId: inquiry.listing.listing_id })}
        />
      )}
    </View>
  );
}

type BodyProps = {
  inquiry: MyInquiry;
  listing: ListingDetail | null;
  open: string | null;
  onToggle: (key: string) => void;
  onListing: () => void;
};

function InquiryBody({ inquiry, listing, open, onToggle, onListing }: BodyProps) {
  const pet = inquiry.listing.name;
  const poster = listing?.poster ?? null;
  const shelter = poster?.name ?? "the shelter";
  const { step, of } = ladderStep(inquiry.stages);
  const byKey = new Map(inquiry.stages.map((s) => [s.stage_key, s]));
  const photo = listing?.photos?.[0];

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* The pet. Pressable, as the artboard's `press rise` card is — and it is how the listing
          stays reachable now that the list row lands here instead of there. */}
      <PressScale scale={motion.pressScale} onPress={onListing} accessibilityRole="button"
        accessibilityLabel={`View ${pet}'s listing`} testID="card.inquiry.pet">
        <Card>
          <View style={styles.petRow}>
            <View style={styles.tile}>
              {photo ? (
                <Image source={{ uri: photo }} style={styles.tileImage} resizeMode="cover" />
              ) : (
                <AdoptIcon color={colors.teal} size={30} />
              )}
            </View>
            <View style={styles.petText}>
              <Text style={styles.petName} numberOfLines={1}>{pet}</Text>
              <Text style={styles.petMeta} numberOfLines={1}>
                {poster ? `${poster.name}${poster.city ? ` · ${poster.city}` : ""}` : capitalize(inquiry.listing.species)}
              </Text>
            </View>
            <Chip label={`Step ${step} of ${of}`} tone="info" dot={false} />
          </View>
          <View style={styles.track} accessibilityRole="progressbar"
            accessibilityValue={{ min: 0, max: of, now: step }}>
            <LinearGradient colors={gradients.button} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={[styles.fill, { width: `${Math.round((step / of) * 100)}%` }]} />
          </View>
        </Card>
      </PressScale>

      {/* The ladder. */}
      <Card style={styles.ladder}>
        <Text style={styles.sectionLabel}>Your six steps</Text>
        {STAGE_ORDER.map((key, i) => {
          const stage = byKey.get(key);
          const st = stage?.state ?? "not_started";
          const done = st === "done", skipped = st === "skipped", current = st === "in_progress";
          const last = i === STAGE_ORDER.length - 1;
          const meta = stageMeta(st, stage?.updated_at);
          const def = STAGE_STEP[key];
          // The poster's own note wins over the generic step text — it is what the artboard's
          // "PAWS Manila waived the home visit for this listing" actually is.
          const note = stage?.note || (skipped && def.skippedNote ? def.skippedNote({ pet, shelter }) : def.note({ pet, shelter }));
          const chip = stageStateChip(st);
          return (
            <PressScale key={key} scale={motion.pressScale} onPress={() => onToggle(key)}
              accessibilityRole="button" accessibilityState={{ expanded: open === key }}
              accessibilityLabel={`${def.title}, ${chip.label}`} testID={`row.inquiry.${key}`}
              style={styles.stage}>
              <View style={styles.stageRow}>
                <View style={styles.rail}>
                  {!last ? (
                    <View style={[styles.line, { backgroundColor: done || skipped ? colors.teal : colors.border }]} />
                  ) : null}
                  {done ? (
                    <LinearGradient colors={gradients.button} style={styles.dot}>
                      <CheckIcon color={colors.white} size={14} />
                    </LinearGradient>
                  ) : (
                    <View style={[styles.dot, current ? styles.dotCurrent : skipped ? styles.dotSkipped : styles.dotTodo]}>
                      {current ? <View style={styles.dotCore} /> : null}
                      {skipped ? <View style={styles.dotDash} /> : null}
                    </View>
                  )}
                </View>
                <View style={styles.stageText}>
                  <View style={styles.stageHead}>
                    <Text style={[styles.stageTitle, {
                      fontWeight: current ? "800" : done ? "700" : "600",
                      color: current || done ? colors.ink : colors.muted
                    }]}>{def.title}</Text>
                    {meta ? (
                      <Text style={[styles.stageMeta, { color: current ? colors.teal : colors.muted }]}>{meta}</Text>
                    ) : null}
                  </View>
                  {open === key ? (
                    <View style={styles.note}>
                      <Text style={styles.noteText}>{note}</Text>
                    </View>
                  ) : null}
                </View>
              </View>
            </PressScale>
          );
        })}
      </Card>

      {/* The shelter. */}
      {poster ? (
        <Card style={styles.contact}>
          <Text style={styles.sectionLabelTight}>{poster.is_shelter ? "Shelter contact" : "Rescuer contact"}</Text>
          <View style={styles.contactRow}>
            <Avatar initials={initials(poster.name)} tinted size={46} />
            <View style={styles.contactText}>
              <View style={styles.contactHead}>
                <Text style={styles.contactName} numberOfLines={1}>{poster.name}</Text>
                <Chip label={poster.is_shelter ? "Verified Shelter" : "Verified Member"} tone="success" dot={false} />
              </View>
              {poster.city ? <Text style={styles.contactMeta}>{poster.city}</Text> : null}
            </View>
          </View>
        </Card>
      ) : null}

      <Text style={styles.hint}>Tap any step to see what it involves.</Text>
    </ScrollView>
  );
}

function capitalize(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.page },
  content: { paddingHorizontal: spacing.lg, paddingTop: 12, paddingBottom: 48 },

  petRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  // squircle(62) is the artboard's 20. Filled with `soft`, which is how the app draws this
  // tile everywhere (55 sites); the canvas draws it as a gradient #EDF5F4→#DDEBE9 whose
  // midpoint is `soft` — a conformance note for the tile, not a decision for this screen.
  tile: {
    width: TILE, height: TILE, borderRadius: squircle(TILE), overflow: "hidden",
    alignItems: "center", justifyContent: "center", backgroundColor: colors.soft
  },
  tileImage: { width: TILE, height: TILE },
  petText: { flex: 1, minWidth: 0 },
  petName: { ...typography.title, color: colors.ink },
  petMeta: { marginTop: 3, ...typography.meta, color: colors.muted },
  // Fully rounded bars: pill() of their own height, not a radius from the container scale.
  track: { height: 7, marginTop: 15, borderRadius: pill(7), backgroundColor: colors.border, overflow: "hidden" },
  fill: { height: "100%", borderRadius: pill(7) },

  ladder: { marginTop: 14, paddingHorizontal: 8, paddingTop: 8, paddingBottom: 12 },
  sectionLabel: {
    paddingHorizontal: 12, paddingTop: 12, paddingBottom: 6,
    ...typography.label, textTransform: "uppercase", color: colors.muted
  },
  stage: { paddingVertical: 11, paddingHorizontal: 12 },
  stageRow: { flexDirection: "row", alignItems: "flex-start", gap: 14 },
  rail: { width: DOT, alignItems: "center" },
  // The artboard: `top: 30px; bottom: -22px; width: 3px` — from under this dot to the next.
  line: { position: "absolute", top: DOT, bottom: -22, width: 3, borderRadius: pill(3) },
  dot: { width: DOT, height: DOT, borderRadius: pill(DOT), alignItems: "center", justifyContent: "center" },
  dotCurrent: { backgroundColor: colors.white, borderWidth: 2.5, borderColor: colors.teal },
  dotCore: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.teal },
  dotSkipped: { backgroundColor: colors.greyPill },
  dotDash: { width: 10, height: 2.5, borderRadius: pill(2.5), backgroundColor: colors.muted },
  dotTodo: { backgroundColor: colors.page, borderWidth: 2, borderColor: colors.border },
  stageText: { flex: 1, minWidth: 0, paddingTop: 3 },
  stageHead: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", gap: 10 },
  // `body` for the size and the panel's 21 pt leading (the artboard's incidental 20 loses to
  // the panel, as everywhere). The weight is set per state in the JSX above — 800 / 700 / 600
  // as the artboard draws it — so the token's 400 never renders; the 600 for a step not yet
  // reached is the one fifteen-at-600 left in the app, and it is the design's.
  stageTitle: { flex: 1, ...typography.body },
  stageMeta: { ...typography.meta, fontWeight: "700" },
  note: { marginTop: 8, paddingVertical: 11, paddingHorizontal: 13, borderRadius: radii.chip, backgroundColor: colors.page },
  noteText: { ...typography.meta, lineHeight: 19, color: colors.muted },

  contact: { marginTop: 14 },
  sectionLabelTight: { ...typography.label, textTransform: "uppercase", color: colors.muted },
  contactRow: { flexDirection: "row", alignItems: "center", gap: 13, marginTop: 12 },
  contactText: { flex: 1, minWidth: 0 },
  contactHead: { flexDirection: "row", alignItems: "center", gap: 7, flexWrap: "wrap" },
  contactName: { ...typography.subtitle, fontWeight: "800", color: colors.ink, flexShrink: 1 },
  contactMeta: { marginTop: 3, ...typography.meta, color: colors.muted },

  hint: { marginTop: 18, textAlign: "center", ...typography.meta, color: colors.muted }
});
