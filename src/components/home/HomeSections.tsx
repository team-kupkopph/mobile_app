/**
 * The surfaces Home is made of — rendered by BOTH the signed-in Home and the guest Home.
 *
 * ⚠️ WHY THIS FILE EXISTS. HomeGuestScreen was written against a V1 mock ("screen-home-guest
 * .png") and then never followed Home through V2 and V3: by Sprint 11 the signed-in Home drew
 * a gradient report card, squircle avatars, `SectionHeader`, and three sections, while the
 * guest Home — the first screen a visitor ever sees — drew a flat teal card, circle avatars, a
 * hand-rolled section title, one section, and a "See nearby strays" row the signed-in Home had
 * dropped two stories earlier. Two screens, one product, and the one a newcomer judges the app
 * by was the stale one.
 *
 * The rule now: Home's pieces are defined ONCE, here, and each shell composes them. What
 * differs between the shells is data and destinations — the guest fetches the public
 * endpoints and gated taps open the SignupWall — never the drawing. A section that exists on
 * one Home exists on the other unless it is genuinely about the account (verification status,
 * the spotlight on your own report, the My-reports trail, the bell).
 */
import { ReactNode } from "react";
import { Image, ImageSourcePropType, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { Listing } from "../../api/types";
import { colors, elevation, radii, spacing, typography } from "../../theme";
import { gradients, heroDirection } from "../../theme/v3";
import { TAP_SLOP } from "../../touch";
import { Avatar } from "../ui";

const paw = require("../../../assets/paw-white.png") as ImageSourcePropType;

/** The shape both Homes read from GET /reports/map. */
export type MapReport = { report_id: string; species: string; condition: string; city: string | null };
/** The shape both Homes read from GET /stories — StoriesScreen's card, by structure. */
export type StoryRowData = { story_id: string; caption: string; author: { name: string; city?: string | null } };

/** Spacing between Home's sections: the first `SectionHeader` sits closer to what precedes it. */
export const sectionSpacing = StyleSheet.create({
  first: { marginTop: 18 },
  next: { marginTop: 34 }
});

type HomeHeaderProps = {
  greeting: string;
  /** Replaces the city row — "Pet owner · Verified Member pending". */
  roleLine?: string;
  city: string;
  /** Omit and the city is shown without a "Change ›" — a guest's city is fixed. */
  onChangeCity?: () => void;
  /** The bell for a member, the "Log in" pill for a guest. */
  right?: ReactNode;
};

export function HomeHeader({ greeting, roleLine, city, onChangeCity, right }: HomeHeaderProps) {
  return (
    <View style={styles.headerRow}>
      <View style={styles.headerCopy}>
        <Text style={styles.greeting}>{greeting}</Text>
        {roleLine ? (
          <Text style={styles.role}>{roleLine}</Text>
        ) : (
          <View style={styles.cityRow}>
            <Text style={styles.cityText}>{city}</Text>
            {onChangeCity ? (
              <TouchableOpacity hitSlop={TAP_SLOP} activeOpacity={0.75} onPress={onChangeCity}>
                <Text style={styles.cityChange}>Change ›</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        )}
      </View>
      {right}
    </View>
  );
}

/** "Saw a stray?" — the three-stop brand gradient with the paw, on both Homes. */
export function ReportStrayCard({ onPress, testID }: { onPress: () => void; testID?: string }) {
  return (
    <LinearGradient
      colors={gradients.hero}
      start={heroDirection.start}
      end={heroDirection.end}
      style={styles.reportCard}
    >
      <View>
        <Text style={styles.reportTitle}>Saw a stray?</Text>
        <Text style={styles.reportText}>Report it in seconds — help is near.</Text>
        <TouchableOpacity
          testID={testID}
          activeOpacity={0.85}
          style={styles.reportButton}
          onPress={onPress}
          hitSlop={TAP_SLOP}
        >
          <Text style={styles.reportButtonText}>Report now</Text>
        </TouchableOpacity>
      </View>
      <Image source={paw} resizeMode="contain" style={styles.reportPaw} />
    </LinearGradient>
  );
}

export function ListingRow({ listing, onPress, testID }: { listing: Listing; onPress: () => void; testID?: string }) {
  return (
    <TouchableOpacity testID={testID} activeOpacity={0.75} style={styles.row} onPress={onPress}>
      {/* ⚠️ SQUIRCLE, NOT A CIRCLE. The design system calls the rounded square "a deliberate
          V2 replacement for the old circular avatar". The guest Home kept a circle here for
          two sprints after the signed-in Home lost its last one. */}
      <Avatar size={52}>
        <Image source={paw} resizeMode="contain" style={styles.avatarPaw} />
      </Avatar>
      <View style={styles.copy}>
        <Text style={styles.name}>{listing.pet.name}</Text>
        <Text style={styles.details}>
          {[listing.pet.species, listing.pet.breed, listing.city].filter(Boolean).join(" · ")}
        </Text>
      </View>
      <View style={styles.availableBadge}>
        <Text style={styles.availableText}>Available</Text>
      </View>
    </TouchableOpacity>
  );
}

export function StoryRow({ story, onPress }: { story: StoryRowData; onPress: () => void }) {
  return (
    <TouchableOpacity activeOpacity={0.75} style={[styles.row, styles.rowSpaced]} onPress={onPress}>
      {/* Tinted: a story's author is shown as an organisation-style tile, so the same person
          keeps the same colour across Home, Stories and a story's detail. */}
      <Avatar initials={storyInitials(story.author.name)} tinted size={44} />
      <View style={styles.copy}>
        <Text style={styles.name} numberOfLines={1}>{story.caption}</Text>
        <Text style={styles.details} numberOfLines={1}>
          {story.author.name}{story.author.city ? ` · ${story.author.city}` : ""}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

export function StrayRow({ report, onPress }: { report: MapReport; onPress: () => void }) {
  return (
    <TouchableOpacity activeOpacity={0.75} style={[styles.row, styles.rowSpaced]} onPress={onPress}>
      <Avatar size={52}>
        <Image source={paw} resizeMode="contain" style={styles.avatarPaw} />
      </Avatar>
      <View style={styles.copy}>
        <Text style={styles.name}>{report.species} · {report.city ?? "Nearby"}</Text>
        <Text style={styles.details}>{report.condition} · needs pickup</Text>
      </View>
      <View style={conditionBadgeStyle(report.condition)}>
        <Text style={conditionTextStyle(report.condition)}>{conditionLabel(report.condition)}</Text>
      </View>
    </TouchableOpacity>
  );
}

export function EmptyNote({ children }: { children: string }) {
  return <Text style={styles.emptyNote}>{children}</Text>;
}

/** Same two-letter fallback StoriesScreen and StoryDetailScreen already use. */
function storyInitials(name: string) {
  return name.split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("") || "?";
}

function conditionLabel(condition: string): string {
  if (condition === "injured" || condition === "sick") return "Urgent";
  if (condition === "pregnant") return "Special";
  return "Stable";
}

function conditionBadgeStyle(condition: string) {
  if (condition === "injured" || condition === "sick") return styles.urgentBadge;
  if (condition === "pregnant") return styles.specialBadge;
  return styles.stableBadge;
}

function conditionTextStyle(condition: string) {
  if (condition === "injured" || condition === "sick") return styles.urgentText;
  if (condition === "pregnant") return styles.specialText;
  return styles.stableText;
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  headerCopy: { flex: 1, marginRight: spacing.sm },
  greeting: { color: colors.ink, ...typography.title, lineHeight: 28 },
  role: { marginTop: 6, color: colors.muted, ...typography.meta },
  cityRow: { marginTop: 6, flexDirection: "row", alignItems: "center", gap: 8 },
  cityText: { color: colors.ink, ...typography.strong, fontWeight: "700" },
  cityChange: { color: colors.teal, ...typography.meta, fontWeight: "700" },
  reportCard: {
    height: 140,
    marginTop: 14,
    // V3 radius scale: 26 hero / 24 card / 18 row. The fill is the three-stop brand gradient
    // rather than flat colors.teal — overflow hidden so it cannot bleed the corners.
    borderRadius: radii.hero,
    overflow: "hidden",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingLeft: 20,
    paddingRight: 16,
    paddingTop: 15
  },
  reportTitle: { color: colors.white, ...typography.title, lineHeight: 28 },
  reportText: { marginTop: 9, color: "#D5ECE8", ...typography.meta },
  reportButton: {
    // §13.4 · the drawn pill is 38 pt, under the 44 pt minimum. `minHeight` raises the real
    // target without repainting the design, and TAP_SLOP on the element covers the rest.
    // This is the control someone uses in a hurry, standing over an animal — the last one
    // that should be fiddly to press.
    width: 136,
    height: 38,
    minHeight: 44,
    marginTop: 14,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white
  },
  reportButtonText: { color: "#126B69", ...typography.meta, fontWeight: "800" },
  reportPaw: { width: 72, height: 72, marginTop: 4 },
  row: {
    height: 68,
    marginTop: 10,
    borderRadius: radii.tile,
    alignItems: "center",
    flexDirection: "row",
    paddingHorizontal: 13,
    backgroundColor: colors.white,
    ...elevation.soft
  },
  /** Story and stray rows sit a little further apart than the adopt rows do. */
  rowSpaced: { marginTop: 16 },
  avatarPaw: { width: 24, height: 24, tintColor: colors.teal },
  copy: { flex: 1, marginLeft: 14 },
  name: { color: colors.ink, ...typography.subtitle, fontWeight: "800" },
  details: { marginTop: 5, color: colors.muted, ...typography.caption, fontWeight: "600" },
  availableBadge: { minWidth: 92, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: "#E1F2D3" },
  availableText: { color: "#356A24", ...typography.meta, fontWeight: "800" },
  urgentBadge: { width: 68, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: colors.warningBg },
  urgentText: { color: colors.warningStrong, ...typography.meta, fontWeight: "800" },
  specialBadge: { minWidth: 68, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: colors.soft },
  specialText: { color: colors.teal, ...typography.meta, fontWeight: "800" },
  stableBadge: { minWidth: 68, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: "#E1F2D3" },
  stableText: { color: "#356A24", ...typography.meta, fontWeight: "800" },
  emptyNote: { marginTop: 12, color: colors.muted, ...typography.meta, textAlign: "center" }
});
