// The Adopt tab's Browse view: a swipeable deck. Reference: design/mobile-v3/Adopt.dc.html in
// its declared default behaviour, "Save / Not for me" — swipe right to save, left to hide from
// the feed, Undo to put the last card back, and an end card that can bring hidden pets back.
//
// ⚠️ RN's OWN Animated + PanResponder, no gesture library. The app has neither
// react-native-gesture-handler nor reanimated, and adding one is a native rebuild for every
// device build in flight. The tab bar's sliding pill already animates this way; the deck does
// too. The numbers are the artboard's: drag threshold 78, rotation dx × 0.045°, stamps fading
// in from 12 px over the next 66, a fling to ±520 in 260 ms, the two cards behind at
// translateY 13n / scale 1 − 0.05n with the third at 55% opacity.
//
// ⚠️ WHAT THE ARTBOARD SHOWS THAT THE LIST PAYLOAD CANNOT: GET /listings carries no poster
// and no distance, so the card has no shelter row and no "2 km" chip. The city sits in that
// slot instead — real, and what "near you" actually means here — and the shelter is one tap
// away on the listing. The Details overlay shows only the booleans the listing records
// (see adoptDeck.factRows); "Good with children" and "House trained" have no field.
//
// Persistence is device-local under the cache prefix (cache.readPref / writePref): there is
// no server-side shortlist yet, so a save lives on this phone, for this account, and is
// wiped with the session. Said plainly on the end card rather than implied.
import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Image, PanResponder, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { Listing } from "../api/types";
import { advance, buildDeck, cardMeta, DeckState, Dir, endSummary, factRows, feeLabel, showHidden, topId, undo } from "../adoptDeck";
import { readPref, writePref } from "../cache";
import { useReducedMotion } from "../useReducedMotion";
import { AdoptIcon, CheckIcon, VolunteerIcon, XIcon } from "./AppIcons";
import { Chip, PressScale } from "./ui";
import { colors, elevation, gradients, motion, pill, radii, squircle, typography } from "../theme";

const CARD_HEIGHT = 452;
const PHOTO_HEIGHT = 268;
const THRESHOLD = 78;
const FLING = 520;
const FLING_MS = 260;
const STAMP_FROM = 12;
const STAMP_OVER = 66;

type AdoptDeckProps = {
  listings: Listing[];
  city: string | null;
  onOpen: (listingId: string) => void;
};

export function AdoptDeck({ listings, city, onOpen }: AdoptDeckProps) {
  const reduced = useReducedMotion();
  const ids = useMemo(() => listings.map((l) => l.listing_id), [listings]);
  const byId = useMemo(() => new Map(listings.map((l) => [l.listing_id, l])), [listings]);

  const [deck, setDeck] = useState<DeckState | null>(null);
  const [facts, setFacts] = useState(false);

  // Load the persisted shortlist / hidden list once, then rebuild whenever the feed changes
  // (a filter chip, a refetch) while keeping what the person has already decided.
  useEffect(() => {
    let alive = true;
    Promise.all([readPref<string[]>("adopt.saved"), readPref<string[]>("adopt.hidden")]).then(([saved, hidden]) => {
      if (alive) setDeck((prev) => buildDeck(ids, prev?.saved ?? saved ?? [], prev?.hidden ?? hidden ?? []));
    });
    return () => { alive = false; };
  }, [ids]);

  function commit(next: DeckState) {
    setDeck(next);
    setFacts(false);
    void writePref("adopt.saved", next.saved);
    void writePref("adopt.hidden", next.hidden);
  }

  // The top card's drag. One Animated.Value drives translateX, rotation and both stamps, so
  // they can never disagree about where the card is.
  //
  // ⚠️ THE JS DRIVER, ON PURPOSE, AND MEASURED. With useNativeDriver the card promoted after
  // a fling kept the geometry of the card behind — 0.95 scale, 13 pt low; measured on device
  // at photo-left 51.7 pt / top 295.7 pt against a fresh card's 42.3 / 271.3 — and a fresh
  // key on promotion did not change it. Switching the driver alone put the promoted card at
  // 42.3 / 271.3 exactly. The fling is one 260 ms transform after the finger lifts, which the
  // JS thread handles without strain; if it ever stutters, the fix is three fixed slot views
  // that swap content instead of cards that mount and unmount, not the native driver back.
  const dx = useRef(new Animated.Value(0)).current;
  const flinging = useRef(false);

  function settle(dir: Dir) {
    if (!deck || flinging.current || !topId(deck)) return;
    flinging.current = true;
    const after = () => {
      flinging.current = false;
      dx.setValue(0);
      commit(advance(deck, dir));
    };
    if (reduced) { after(); return; }
    Animated.timing(dx, { toValue: dir * FLING, duration: FLING_MS, easing: motion.easing, useNativeDriver: false }).start(after);
  }

  const pan = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dx) > 6 && Math.abs(g.dx) > Math.abs(g.dy),
    onPanResponderMove: (_e, g) => { if (!flinging.current) dx.setValue(g.dx); },
    onPanResponderRelease: (_e, g) => {
      if (Math.abs(g.dx) > THRESHOLD) settle(g.dx > 0 ? 1 : -1);
      else Animated.spring(dx, { toValue: 0, useNativeDriver: false, friction: 7 }).start();
    },
    onPanResponderTerminate: () => Animated.spring(dx, { toValue: 0, useNativeDriver: false }).start()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- settle reads the latest deck via closure below
  }), [deck, reduced]);

  if (!deck) return null;

  const top = topId(deck);
  const stack = deck.order.slice(deck.index, deck.index + 3).map((id) => byId.get(id)).filter(Boolean) as Listing[];
  const rotate = dx.interpolate({ inputRange: [-FLING, FLING], outputRange: [`${-FLING * 0.045}deg`, `${FLING * 0.045}deg`] });
  const savedOpacity = dx.interpolate({ inputRange: [STAMP_FROM, STAMP_FROM + STAMP_OVER], outputRange: [0, 1], extrapolate: "clamp" });
  const hiddenOpacity = dx.interpolate({ inputRange: [-(STAMP_FROM + STAMP_OVER), -STAMP_FROM], outputRange: [1, 0], extrapolate: "clamp" });
  const where = city ? ` near ${city}` : "";
  const position = top
    ? `${deck.index + 1} of ${deck.order.length}${where}`
    : `You have seen all ${deck.order.length}${where}`;

  return (
    <View testID="deck.adopt">
      <View style={styles.positionRow}>
        <Text style={styles.position}>{position}</Text>
        <PressScale scale={motion.chipScale} onPress={() => commit(undo(deck))} disabled={!deck.gone.length}
          accessibilityRole="button" accessibilityLabel="Undo the last swipe"
          accessibilityState={{ disabled: !deck.gone.length }} testID="btn.adopt.undo"
          style={[styles.undo, { opacity: deck.gone.length ? 1 : 0.35 }]}>
          <Text style={styles.undoLabel}>Undo</Text>
        </PressScale>
      </View>

      <View style={styles.stage}>
        {top ? (
          // Painted back to front so the top card is last, and on top, without z-index games.
          [...stack].reverse().map((l, ri) => {
            const n = stack.length - 1 - ri;
            const isTop = n === 0;
            const behind = { transform: [{ translateY: n * 13 }, { scale: 1 - n * 0.05 }], opacity: n === 2 ? 0.55 : 1 };
            const dragged = { transform: [{ translateX: dx }, { rotate }] };
            return (
              <Animated.View
                key={l.listing_id}
                style={[styles.card, isTop ? dragged : behind]}
                {...(isTop ? pan.panHandlers : {})}
              >
                <PressScale onPress={isTop ? () => onOpen(l.listing_id) : undefined} disabled={!isTop}
                  accessibilityRole="button" accessibilityLabel={`${l.pet.name}, open listing`}
                  // `card.adopt.0` is the contract 20-browse-and-inquire.yaml taps; the index is
                  // the card's place in the visible stack, so the top card is always 0.
                  testID={`card.adopt.${n}`} style={styles.cardInner}>
                  <View style={styles.photo}>
                    {l.photo_url ? (
                      <Image source={{ uri: l.photo_url }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                    ) : (
                      <View style={styles.photoEmpty}><AdoptIcon color={colors.teal} size={64} /></View>
                    )}
                    <View style={styles.cityChip}><Text style={styles.cityChipText}>{l.city}</Text></View>
                    {isTop && facts ? (
                      <View style={styles.facts}>
                        {factRows(l.pet).length ? factRows(l.pet).map((f) => (
                          <View key={f.label} style={styles.factRow}>
                            <View style={[styles.factTile, { backgroundColor: f.ok ? colors.successBg : colors.greyPill }]}>
                              {f.ok ? <CheckIcon color={colors.success} size={12} /> : <XIcon color={colors.muted} size={12} />}
                            </View>
                            <Text style={styles.factLabel}>{f.label}</Text>
                          </View>
                        )) : (
                          <Text style={styles.factsEmpty}>The shelter hasn't recorded health details yet. Ask on the listing.</Text>
                        )}
                      </View>
                    ) : null}
                    {isTop ? (
                      <>
                        <Animated.View style={[styles.stamp, styles.stampSaved, { opacity: savedOpacity }]} pointerEvents="none">
                          <LinearGradient colors={gradients.button} style={styles.stampFill}><Text style={styles.stampText}>SAVED</Text></LinearGradient>
                        </Animated.View>
                        <Animated.View style={[styles.stamp, styles.stampHidden, { opacity: hiddenOpacity }]} pointerEvents="none">
                          <LinearGradient colors={gradients.danger} style={styles.stampFill}><Text style={styles.stampText}>NOT FOR ME</Text></LinearGradient>
                        </Animated.View>
                      </>
                    ) : null}
                  </View>
                  <View style={styles.body}>
                    <View style={styles.nameRow}>
                      <Text style={styles.name} numberOfLines={1}>{l.pet.name}</Text>
                      <Chip label="Available" tone="success" />
                    </View>
                    <Text style={styles.meta} numberOfLines={1}>{cardMeta(l.pet)}</Text>
                    <Text style={styles.fee}>{feeLabel(l.adoption_fee)}</Text>
                  </View>
                </PressScale>
              </Animated.View>
            );
          })
        ) : (
          <View style={[styles.card, styles.end]} testID="deck.adopt.end">
            <View style={styles.endTile}><AdoptIcon color={colors.teal} size={38} /></View>
            <Text style={styles.endTitle}>That is everyone nearby</Text>
            <Text style={styles.endBody}>{endSummary(deck)}</Text>
            <Text style={styles.endNote}>Saved and hidden pets are remembered on this phone.</Text>
            {deck.hidden.length ? (
              <PressScale scale={motion.ctaScale} dip onPress={() => commit(showHidden(deck, ids))}
                accessibilityRole="button" testID="btn.adopt.showHidden" style={styles.endButton}>
                <LinearGradient colors={gradients.button} style={styles.endButtonFill}>
                  <View style={styles.topHighlight} />
                  <Text style={styles.endButtonText}>Show hidden again</Text>
                </LinearGradient>
              </PressScale>
            ) : null}
          </View>
        )}
      </View>

      {top ? (
        <>
          <View style={styles.actions}>
            <PressScale onPress={() => settle(-1)} accessibilityRole="button" accessibilityLabel="Not for me"
              testID="btn.adopt.hide" style={[styles.round, styles.roundPlain]}>
              <XIcon color={colors.ink} size={24} />
            </PressScale>
            <PressScale onPress={() => setFacts((f) => !f)} accessibilityRole="button"
              accessibilityState={{ expanded: facts }} testID="btn.adopt.details" style={styles.details}>
              <Text style={styles.detailsText}>{facts ? "Hide" : "Details"}</Text>
            </PressScale>
            <PressScale onPress={() => settle(1)} accessibilityRole="button" accessibilityLabel="Save to shortlist"
              testID="btn.adopt.save" style={styles.round}>
              <LinearGradient colors={gradients.button} style={styles.roundFill}>
                <View style={styles.topHighlight} />
                <VolunteerIcon color={colors.white} size={26} />
              </LinearGradient>
            </PressScale>
          </View>
          <Text style={styles.hint}>
            Swipe right to save, left to hide from your feed. Hidden pets stop appearing — bring them back any time.
          </Text>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  positionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 6 },
  position: { ...typography.meta, fontWeight: "700", color: colors.muted },
  undo: { height: 32, paddingHorizontal: 13, borderRadius: pill(32), justifyContent: "center", backgroundColor: colors.white, ...elevation.soft },
  undoLabel: { ...typography.meta, fontWeight: "700", color: colors.teal },

  stage: { height: CARD_HEIGHT, marginTop: 12 },
  card: {
    position: "absolute", left: 0, right: 0, top: 0, height: CARD_HEIGHT,
    borderRadius: radii.hero, backgroundColor: colors.white, ...elevation.deck
  },
  cardInner: { flex: 1, borderRadius: radii.hero, overflow: "hidden" },
  photo: { height: PHOTO_HEIGHT, backgroundColor: colors.soft },
  photoEmpty: { flex: 1, alignItems: "center", justifyContent: "center" },
  cityChip: {
    position: "absolute", right: 14, top: 14, height: 30, paddingHorizontal: 12, borderRadius: pill(30),
    justifyContent: "center", backgroundColor: colors.glass
  },
  cityChipText: { ...typography.meta, fontWeight: "800", color: colors.tealDark },
  facts: { ...StyleSheet.absoluteFillObject, padding: 18, justifyContent: "center", gap: 10, backgroundColor: "rgba(255,255,255,0.88)" },
  factRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  factTile: { width: 26, height: 26, borderRadius: squircle(26), alignItems: "center", justifyContent: "center" },
  // ⚠️ BOLD FIFTEEN, three times on this card — fact labels at 700, the Details and
  // "Show hidden again" labels at 800 — because the artboard uses 15 / 700–800 as its
  // small-button size and the ramp has no such step (`body` is closed at 400). Written as
  // drawn and counted in the ratchet; see typeRampAdoption for the running total.
  factLabel: { fontSize: 15, fontWeight: "700", color: colors.ink },
  factsEmpty: { ...typography.body, color: colors.muted, textAlign: "center" },
  stamp: { position: "absolute", top: 96 },
  stampSaved: { left: 18, transform: [{ rotate: "-11deg" }] },
  stampHidden: { right: 18, transform: [{ rotate: "11deg" }] },
  // 15 is the artboard's; on a 37 pt stamp it is not a pill and not a container step.
  stampFill: { paddingVertical: 9, paddingHorizontal: 16, borderRadius: 15, ...elevation.card },
  stampText: { ...typography.section, letterSpacing: 0.6, color: colors.white },

  body: { paddingVertical: 16, paddingHorizontal: 18 },
  nameRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  name: { ...typography.hero, color: colors.ink, flexShrink: 1 },
  meta: { marginTop: 5, ...typography.body, color: colors.muted },
  fee: { marginTop: 13, ...typography.meta, color: colors.muted },

  end: { padding: 24, alignItems: "center", justifyContent: "center" },
  endTile: { width: 76, height: 76, borderRadius: squircle(76), alignItems: "center", justifyContent: "center", backgroundColor: colors.soft },
  endTitle: { marginTop: 20, ...typography.title, color: colors.ink, textAlign: "center" },
  endBody: { marginTop: 8, maxWidth: 250, ...typography.body, color: colors.muted, textAlign: "center" },
  endNote: { marginTop: 10, maxWidth: 250, ...typography.meta, color: colors.muted, textAlign: "center" },
  endButton: { marginTop: 22, borderRadius: pill(50), overflow: "hidden" },
  endButtonFill: { height: 50, paddingHorizontal: 24, alignItems: "center", justifyContent: "center" },
  endButtonText: { fontSize: 15, fontWeight: "800", color: colors.white },

  actions: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 16, marginTop: 18 },
  round: { width: 58, height: 58, borderRadius: pill(58), overflow: "hidden", ...elevation.card },
  roundPlain: { backgroundColor: colors.white, alignItems: "center", justifyContent: "center" },
  roundFill: { flex: 1, alignItems: "center", justifyContent: "center" },
  details: { height: 50, paddingHorizontal: 22, borderRadius: pill(50), justifyContent: "center", backgroundColor: colors.glass, ...elevation.soft },
  detailsText: { fontSize: 15, fontWeight: "800", color: colors.ink },
  topHighlight: { position: "absolute", top: 0, left: 0, right: 0, height: 1, backgroundColor: "rgba(255,255,255,0.34)" },
  hint: { marginTop: 14, ...typography.meta, lineHeight: 19, color: colors.muted, textAlign: "center" }
});
