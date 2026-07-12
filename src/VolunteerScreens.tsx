import { Image, ImageSourcePropType, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useState } from "react";

import { TopStatus } from "./components/TopStatus";

const paw = require("../assets/paw-white.png") as ImageSourcePropType;

type VolunteerScreenProps = {
  onBack: () => void;
  onCancelShift?: () => void;
  onOpenDetail?: () => void;
  onRequestSent?: () => void;
  onShowSchedule?: () => void;
};

type Opportunity = {
  title: string;
  shelter: string;
  date: string;
  slots: string;
  icon: "paw" | "bowl" | "calendar" | "brush";
};

const opportunities: Opportunity[] = [
  { title: "Morning dog walk", shelter: "PAWS Manila · Marikina", date: "Sat, Jul 12 · 8–10 AM", slots: "4 slots", icon: "paw" },
  { title: "Feed the rescue pack", shelter: "Marikina AWG", date: "Sun, Jul 13 · 7–9 AM", slots: "2 slots", icon: "bowl" },
  { title: "Adoption day helper", shelter: "PAWS Manila", date: "Sat, Jul 19 · 1–5 PM", slots: "6 slots", icon: "calendar" },
  { title: "Kennel cleaning", shelter: "Pasig Pound", date: "Sun, Jul 20 · 9–11 AM", slots: "5 slots", icon: "brush" }
];

export function VolunteerScreen({ onBack, onCancelShift, onOpenDetail }: VolunteerScreenProps) {
  const [tab, setTab] = useState<"browse" | "shifts">("browse");
  const [filter, setFilter] = useState("All");

  return (
    <View style={styles.screen}>
      <Header title="Kawang-Gawa" onBack={onBack} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <SegmentedControl
          left="Browse"
          right="My shifts"
          active={tab === "browse" ? "left" : "right"}
          onLeft={() => setTab("browse")}
          onRight={() => setTab("shifts")}
        />

        {tab === "browse" ? (
          <>
            <Text style={styles.largeTitle}>Volunteer with shelters</Text>
            <View style={styles.chipRow}>
              {["All", "Walking", "Feeding", "Events"].map((item) => (
                <TouchableOpacity key={item} activeOpacity={0.8} onPress={() => setFilter(item)} style={[styles.filterChip, filter === item && styles.activeFilterChip]}>
                  <Text style={[styles.filterText, filter === item && styles.activeFilterText]}>{item}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {opportunities.map((item, index) => (
              <OpportunityCard key={item.title} item={item} onPress={index === 0 ? onOpenDetail : undefined} />
            ))}
          </>
        ) : (
          <ScheduleContent onCancelShift={onCancelShift} />
        )}
      </ScrollView>
    </View>
  );
}

export function VolunteerDetailScreen({ onBack, onRequestSent }: VolunteerScreenProps) {
  const [waiver, setWaiver] = useState(true);
  const [contact, setContact] = useState(true);

  return (
    <View style={styles.screen}>
      <Header title="Volunteer" onBack={onBack} />
      <ScrollView contentContainerStyle={styles.detailContent} showsVerticalScrollIndicator={false}>
        <View style={styles.detailHeading}>
          <IconBubble icon="paw" />
          <View style={styles.detailHeadingCopy}>
            <Text style={styles.detailTitle}>Morning dog walk</Text>
            <Text style={styles.detailSubtitle}>Walk & socialize shelter dogs</Text>
          </View>
        </View>

        <View style={styles.shelterRow}>
          <Text style={styles.shelterName}>PAWS Manila</Text>
          <View style={styles.verifiedBadge}><Text style={styles.verifiedText}>✓</Text></View>
        </View>
        <Text style={styles.cityText}>Marikina City</Text>

        <View style={styles.infoPanel}>
          <InfoRow icon="calendar" text="Sat, Jul 12 · 8:00–10:00 AM" />
          <InfoRow icon="pin" text="12 Aurora Blvd, Marikina" />
          <InfoRow icon="person" text="4 of 6 slots left" />
        </View>

        <Text style={styles.sectionTitle}>What you'll do</Text>
        {["Walk assigned dogs on a set route", "Basic socializing — no experience needed", "Check-in and check-out at the shelter"].map((item) => (
          <View key={item} style={styles.taskRow}>
            <Image source={paw} resizeMode="contain" style={styles.taskPaw} />
            <Text style={styles.taskText}>{item}</Text>
          </View>
        ))}

        <Agreement checked={waiver} text="I agree to the volunteer waiver & guidelines." onPress={() => setWaiver((value) => !value)} />
        <Agreement checked={contact} text="I agree to share my contact details (phone, email, address) with the shelter to coordinate." onPress={() => setContact((value) => !value)} />
        <Text style={styles.privacyNote}>You can see who gets it in Privacy settings.</Text>

        <TouchableOpacity activeOpacity={0.85} style={styles.primaryButton} onPress={onRequestSent}>
          <Text style={styles.primaryText}>Sign up</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

export function VolunteerRequestedScreen({ onBack, onShowSchedule, onOpenDetail }: VolunteerScreenProps) {
  return (
    <View style={styles.screen}>
      <Header title="Volunteer" onBack={onBack} />
      <ScrollView contentContainerStyle={styles.requestedContent} showsVerticalScrollIndicator={false}>
        <View style={styles.clockBig}>
          <View style={styles.clockFace}>
            <View style={styles.clockHandTall} />
            <View style={styles.clockHandWide} />
          </View>
        </View>
        <Text style={styles.requestTitle}>Request sent!</Text>
        <Text style={styles.requestText}>PAWS Manila will confirm your shift shortly.</Text>

        <TouchableOpacity activeOpacity={0.82} style={styles.requestCard} onPress={onOpenDetail}>
          <IconBubble icon="paw" />
          <View style={styles.requestCopy}>
            <Text style={styles.requestCardTitle}>Morning dog walk</Text>
            <Text style={styles.requestCardMeta}>PAWS Manila</Text>
            <Text style={styles.requestCardDate}>Sat, Jul 12 · 8–10 AM</Text>
          </View>
          <View style={styles.pendingBadge}><Text style={styles.pendingText}>Pending</Text></View>
        </TouchableOpacity>

        <Text style={styles.requestFootnote}>Once confirmed, it's added to your schedule and phone calendar.</Text>

        <TouchableOpacity activeOpacity={0.85} style={styles.requestPrimaryButton} onPress={onShowSchedule}>
          <Text style={styles.primaryText}>View my schedule</Text>
        </TouchableOpacity>
        <TouchableOpacity activeOpacity={0.75} onPress={onBack}>
          <Text style={styles.secondaryLink}>Browse more opportunities</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

export function VolunteerScheduleScreen({ onBack, onCancelShift }: VolunteerScreenProps) {
  return (
    <View style={styles.screen}>
      <Header title="Kawang-Gawa" onBack={onBack} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <SegmentedControl left="Browse" right="My shifts" active="right" onLeft={onBack} onRight={() => undefined} />
        <ScheduleContent onCancelShift={onCancelShift} />
      </ScrollView>
    </View>
  );
}

export function VolunteerCancelScreen({ onBack }: VolunteerScreenProps) {
  const [reason, setReason] = useState("");

  return (
    <View style={styles.screen}>
      <Header title="Cancel shift" onBack={onBack} />
      <ScrollView contentContainerStyle={styles.cancelContent} showsVerticalScrollIndicator={false}>
        <ShiftSummary status="Confirmed" />
        <Text style={styles.cancelTitle}>Cancel this shift?</Text>
        <Text style={styles.cancelText}>Your slot reopens for another volunteer and PAWS Manila is notified.</Text>
        <View style={styles.noticeCard}>
          <View style={styles.smallClock}>
            <View style={styles.smallClockHandTall} />
            <View style={styles.smallClockHandWide} />
          </View>
          <View style={styles.noticeCopy}>
            <Text style={styles.noticeTitle}>Free to cancel until Fri, Jul 11 · 8 PM</Text>
            <Text style={styles.noticeText}>Later cancels are noted on your record.</Text>
          </View>
        </View>
        <Text style={styles.inputLabel}>Reason (optional)</Text>
        <TextInput value={reason} onChangeText={setReason} multiline textAlignVertical="top" placeholder="e.g. Something came up — sorry!" placeholderTextColor="#AAA69D" style={styles.reasonInput} />
        <Text style={styles.helperText}>The shelter sees this so it can plan.</Text>
        <TouchableOpacity activeOpacity={0.85} style={styles.dangerButton}>
          <Text style={styles.primaryText}>Cancel my shift</Text>
        </TouchableOpacity>
        <TouchableOpacity activeOpacity={0.75} onPress={onBack}>
          <Text style={styles.keepShift}>Keep my shift</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function Header({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <View style={styles.header}>
      <TopStatus />
      <TouchableOpacity activeOpacity={0.75} onPress={onBack} style={styles.backButton} hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}>
        <Text style={styles.backText}>‹</Text>
      </TouchableOpacity>
      <Text style={styles.headerTitle}>{title}</Text>
    </View>
  );
}

function SegmentedControl({ left, right, active, onLeft, onRight }: { left: string; right: string; active: "left" | "right"; onLeft?: () => void; onRight?: () => void }) {
  return (
    <View style={styles.segmented}>
      <TouchableOpacity activeOpacity={0.8} onPress={onLeft} style={[styles.segment, active === "left" && styles.activeSegment]}>
        <Text style={[styles.segmentText, active === "left" && styles.activeSegmentText]}>{left}</Text>
      </TouchableOpacity>
      <TouchableOpacity activeOpacity={0.8} onPress={onRight} style={[styles.segment, active === "right" && styles.activeSegment]}>
        <Text style={[styles.segmentText, active === "right" && styles.activeSegmentText]}>{right}</Text>
      </TouchableOpacity>
    </View>
  );
}

function OpportunityCard({ item, onPress }: { item: Opportunity; onPress?: () => void }) {
  return (
    <TouchableOpacity activeOpacity={0.82} onPress={onPress} style={styles.opportunityCard}>
      <IconBubble icon={item.icon} />
      <View style={styles.opportunityCopy}>
        <Text style={styles.opportunityTitle}>{item.title}</Text>
        <Text style={styles.opportunityMeta}>{item.shelter}</Text>
        <Text style={styles.opportunityDate}>{item.date}</Text>
      </View>
      <View style={styles.slotsBadge}><Text style={styles.slotsText}>{item.slots}</Text></View>
    </TouchableOpacity>
  );
}

function ScheduleContent({ onCancelShift }: { onCancelShift?: () => void }) {
  return (
    <>
      <Text style={styles.monthTitle}>July 2026</Text>
      <CalendarGrid />
      <View style={styles.legendRow}>
        <View style={[styles.legendDot, { backgroundColor: "#2F681D" }]} /><Text style={styles.legendText}>Confirmed</Text>
        <View style={[styles.legendDot, { backgroundColor: "#9A650E" }]} /><Text style={styles.legendText}>Pending</Text>
      </View>
      <Text style={styles.largeTitle}>Upcoming shifts</Text>
      <TouchableOpacity activeOpacity={0.82} onPress={onCancelShift}>
        <ShiftSummary status="Confirmed" />
      </TouchableOpacity>
      <View style={styles.shiftCard}>
        <IconBubble icon="bowl" />
        <View style={styles.shiftCopy}>
          <Text style={styles.shiftTitle}>Feed the rescue pack</Text>
          <Text style={styles.shiftMeta}>Marikina AWG · Sun, Jul 13 · 7–9 AM</Text>
        </View>
        <View style={styles.pendingBadge}><Text style={styles.pendingText}>Pending</Text></View>
      </View>
    </>
  );
}

function CalendarGrid() {
  const rows = [
    ["", "", "1", "2", "3", "4"],
    ["5", "6", "7", "8", "9", "10", "11"],
    ["12", "13", "14", "15", "16", "17", "18"],
    ["19", "20", "21", "22", "23", "24", "25"],
    ["26", "27", "28", "29", "30", "31", ""]
  ];
  return (
    <View style={styles.calendar}>
      <View style={styles.weekRow}>{["S", "M", "T", "W", "T", "F", "S"].map((day, index) => <Text key={`${day}-${index}`} style={styles.weekDay}>{day}</Text>)}</View>
      {rows.map((row, index) => (
        <View key={index} style={styles.dateRow}>{row.map((day, dayIndex) => (
          <View key={`${index}-${dayIndex}`} style={styles.dateCell}>
            {day === "9" ? <View style={styles.selectedDate}><Text style={styles.selectedDateText}>9</Text></View> : <Text style={styles.dateText}>{day}</Text>}
            {day === "12" && <View style={[styles.dateDot, { backgroundColor: "#2F681D" }]} />}
            {day === "13" && <View style={[styles.dateDot, { backgroundColor: "#9A650E" }]} />}
          </View>
        ))}</View>
      ))}
    </View>
  );
}

function ShiftSummary({ status }: { status: "Confirmed" | "Pending" }) {
  return (
    <View style={styles.shiftCard}>
      <IconBubble icon="paw" />
      <View style={styles.shiftCopy}>
        <Text style={styles.shiftTitle}>Morning dog walk</Text>
        <Text style={styles.shiftMeta}>PAWS Manila · Sat, Jul 12 · 8–10 AM</Text>
        {status === "Confirmed" && <Text style={styles.addedText}>✓ Added to your calendar</Text>}
      </View>
      <View style={status === "Confirmed" ? styles.confirmedBadge : styles.pendingBadge}><Text style={status === "Confirmed" ? styles.confirmedText : styles.pendingText}>{status}</Text></View>
    </View>
  );
}

function IconBubble({ icon }: { icon: Opportunity["icon"] }) {
  return (
    <View style={styles.iconBubble}>
      {icon === "paw" && <Image source={paw} resizeMode="contain" style={styles.bubblePaw} />}
      {icon === "bowl" && <View style={styles.bowlIcon}><View style={styles.bowlFood} /></View>}
      {icon === "calendar" && <View style={styles.calendarMini}><View style={styles.calendarMiniTop} /></View>}
      {icon === "brush" && <View style={styles.brushIcon} />}
    </View>
  );
}

function InfoRow({ icon, text }: { icon: "calendar" | "pin" | "person"; text: string }) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIconSlot}>{icon === "calendar" ? <View style={styles.calendarMini}><View style={styles.calendarMiniTop} /></View> : icon === "pin" ? <View style={styles.pinIcon} /> : <View style={styles.personMini} />}</View>
      <Text style={styles.infoText}>{text}</Text>
    </View>
  );
}

function Agreement({ checked, text, onPress }: { checked: boolean; text: string; onPress: () => void }) {
  return (
    <TouchableOpacity activeOpacity={0.8} onPress={onPress} style={styles.agreementRow}>
      <View style={[styles.checkbox, checked && styles.checkboxActive]}><Text style={styles.checkboxText}>✓</Text></View>
      <Text style={styles.agreementText}>{text}</Text>
    </TouchableOpacity>
  );
}

const colors = {
  ink: "#1F3A5F",
  teal: "#1C7876",
  page: "#F7F7F4",
  border: "#E3E1D9",
  muted: "#62615C",
  paleTeal: "#E5F0EE"
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.page },
  header: { height: 108 },
  backButton: { position: "absolute", left: 25, top: 45, width: 42, height: 42, zIndex: 10, justifyContent: "center" },
  backText: { color: colors.ink, fontSize: 34, fontWeight: "700", lineHeight: 34 },
  headerTitle: { marginTop: -3, color: colors.ink, fontSize: 16, fontWeight: "800", textAlign: "center" },
  content: { paddingHorizontal: 26, paddingBottom: 38 },
  detailContent: { paddingHorizontal: 26, paddingTop: 44, paddingBottom: 38 },
  segmented: { height: 35, borderRadius: 18, flexDirection: "row", padding: 2, backgroundColor: "#EAEAE4" },
  segment: { flex: 1, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  activeSegment: { backgroundColor: "#FFFFFF" },
  segmentText: { color: colors.muted, fontSize: 12, fontWeight: "800" },
  activeSegmentText: { color: colors.teal },
  largeTitle: { marginTop: 22, color: colors.ink, fontSize: 18, fontWeight: "800" },
  chipRow: { marginTop: 21, flexDirection: "row", gap: 10 },
  filterChip: { height: 40, minWidth: 54, borderWidth: 1, borderColor: colors.border, borderRadius: 20, alignItems: "center", justifyContent: "center", paddingHorizontal: 17, backgroundColor: "#FFFFFF" },
  activeFilterChip: { borderColor: colors.teal, backgroundColor: colors.teal },
  filterText: { color: colors.ink, fontSize: 13, fontWeight: "800" },
  activeFilterText: { color: "#FFFFFF" },
  opportunityCard: { height: 83, marginTop: 10, borderWidth: 1, borderColor: colors.border, borderRadius: 13, alignItems: "center", flexDirection: "row", paddingHorizontal: 14, backgroundColor: "#FFFFFF" },
  iconBubble: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center", backgroundColor: colors.paleTeal },
  bubblePaw: { width: 24, height: 24, tintColor: colors.teal, transform: [{ translateY: -2 }] },
  opportunityCopy: { flex: 1, marginLeft: 14 },
  opportunityTitle: { color: colors.ink, fontSize: 16, fontWeight: "800" },
  opportunityMeta: { marginTop: 6, color: colors.muted, fontSize: 11 },
  opportunityDate: { marginTop: 6, color: colors.teal, fontSize: 11, fontWeight: "800" },
  slotsBadge: { minWidth: 68, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: "#E5F4F1" },
  slotsText: { color: colors.teal, fontSize: 11, fontWeight: "800" },
  bowlIcon: { width: 28, height: 14, borderBottomLeftRadius: 14, borderBottomRightRadius: 14, backgroundColor: colors.teal },
  bowlFood: { width: 16, height: 8, borderRadius: 8, alignSelf: "center", marginTop: -4, backgroundColor: colors.teal },
  calendarMini: { width: 24, height: 24, borderWidth: 2, borderColor: colors.teal, borderRadius: 3 },
  calendarMiniTop: { height: 6, borderBottomWidth: 2, borderBottomColor: colors.teal },
  brushIcon: { width: 10, height: 32, borderRadius: 5, backgroundColor: colors.teal, transform: [{ rotate: "45deg" }] },
  detailHeading: { flexDirection: "row", alignItems: "center" },
  detailHeadingCopy: { marginLeft: 18 },
  detailTitle: { color: colors.ink, fontSize: 20, fontWeight: "800" },
  detailSubtitle: { marginTop: 8, color: colors.muted, fontSize: 12 },
  shelterRow: { marginTop: 25, flexDirection: "row", alignItems: "center" },
  shelterName: { color: colors.ink, fontSize: 15, fontWeight: "800" },
  verifiedBadge: { width: 18, height: 18, marginLeft: 10, borderRadius: 9, alignItems: "center", justifyContent: "center", backgroundColor: colors.teal },
  verifiedText: { color: "#FFFFFF", fontSize: 12, fontWeight: "900" },
  cityText: { marginTop: 10, color: colors.muted, fontSize: 11 },
  infoPanel: { marginTop: 22, borderWidth: 1, borderColor: colors.border, borderRadius: 13, paddingVertical: 13, backgroundColor: "#FFFFFF" },
  infoRow: { minHeight: 34, flexDirection: "row", alignItems: "center", paddingHorizontal: 17 },
  infoIconSlot: { width: 28, alignItems: "center" },
  infoText: { marginLeft: 14, color: colors.ink, fontSize: 12 },
  pinIcon: { width: 12, height: 12, borderRadius: 6, borderWidth: 4, borderColor: colors.teal },
  personMini: { width: 20, height: 20, borderRadius: 10, backgroundColor: colors.teal },
  sectionTitle: { marginTop: 22, color: colors.ink, fontSize: 15, fontWeight: "800" },
  taskRow: { marginTop: 16, flexDirection: "row", alignItems: "center" },
  taskPaw: { width: 18, height: 18, tintColor: colors.teal, transform: [{ translateY: -2 }] },
  taskText: { marginLeft: 18, color: colors.ink, fontSize: 12 },
  agreementRow: { marginTop: 18, flexDirection: "row", alignItems: "flex-start" },
  checkbox: { width: 22, height: 22, borderRadius: 5, alignItems: "center", justifyContent: "center", backgroundColor: "#CBD4D1" },
  checkboxActive: { backgroundColor: colors.teal },
  checkboxText: { color: "#FFFFFF", fontSize: 15, fontWeight: "900" },
  agreementText: { flex: 1, marginLeft: 14, color: colors.ink, fontSize: 12, lineHeight: 20 },
  privacyNote: { marginTop: 8, marginLeft: 36, color: colors.muted, fontSize: 9 },
  primaryButton: { height: 51, marginTop: 32, borderRadius: 26, alignSelf: "stretch", alignItems: "center", justifyContent: "center", backgroundColor: colors.teal },
  requestPrimaryButton: { width: "100%", height: 51, marginTop: 32, borderRadius: 26, alignItems: "center", justifyContent: "center", backgroundColor: colors.teal },
  primaryText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
  requestedContent: { flexGrow: 1, paddingHorizontal: 26, alignItems: "stretch", paddingTop: 76, paddingBottom: 44 },
  clockBig: { width: 100, height: 100, borderRadius: 50, alignItems: "center", justifyContent: "center", alignSelf: "center", backgroundColor: colors.paleTeal },
  clockFace: { width: 60, height: 60, borderWidth: 3, borderColor: colors.teal, borderRadius: 30, alignItems: "center", justifyContent: "center" },
  clockHandTall: { width: 3, height: 20, backgroundColor: colors.teal, transform: [{ translateY: -7 }] },
  clockHandWide: { width: 16, height: 3, marginTop: -5, marginLeft: 13, backgroundColor: colors.teal },
  requestTitle: { marginTop: 23, color: colors.ink, fontSize: 22, fontWeight: "800", textAlign: "center" },
  requestText: { width: 210, marginTop: 13, alignSelf: "center", color: colors.muted, fontSize: 13, lineHeight: 20, textAlign: "center" },
  requestCard: { width: "100%", height: 88, marginTop: 39, borderWidth: 1, borderColor: colors.border, borderRadius: 13, alignItems: "center", flexDirection: "row", paddingHorizontal: 15, backgroundColor: "#FFFFFF" },
  requestCopy: { flex: 1, marginLeft: 14 },
  requestCardTitle: { color: colors.ink, fontSize: 15, fontWeight: "800" },
  requestCardMeta: { marginTop: 7, color: colors.muted, fontSize: 11 },
  requestCardDate: { marginTop: 7, color: colors.teal, fontSize: 11, fontWeight: "800" },
  requestFootnote: { width: 240, marginTop: 36, alignSelf: "center", color: colors.muted, fontSize: 11, lineHeight: 18, textAlign: "center" },
  secondaryLink: { marginTop: 13, color: colors.teal, fontSize: 12, fontWeight: "800", textAlign: "center" },
  monthTitle: { marginTop: 10, color: colors.ink, fontSize: 14, fontWeight: "800" },
  calendar: { marginTop: 13 },
  weekRow: { flexDirection: "row", justifyContent: "space-around" },
  weekDay: { width: 36, color: colors.muted, fontSize: 11, textAlign: "center", fontWeight: "800" },
  dateRow: { marginTop: 9, flexDirection: "row", justifyContent: "space-around" },
  dateCell: { width: 36, height: 24, alignItems: "center" },
  dateText: { color: colors.ink, fontSize: 12 },
  selectedDate: { width: 28, height: 28, marginTop: -6, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: colors.teal },
  selectedDateText: { color: "#FFFFFF", fontSize: 12, fontWeight: "800" },
  dateDot: { width: 6, height: 6, marginTop: 3, borderRadius: 3 },
  legendRow: { marginTop: 12, flexDirection: "row", justifyContent: "flex-end", alignItems: "center", gap: 8 },
  legendDot: { width: 7, height: 7, borderRadius: 4 },
  legendText: { marginRight: 13, color: colors.muted, fontSize: 10 },
  shiftCard: { minHeight: 76, marginTop: 12, borderWidth: 1, borderColor: colors.border, borderRadius: 13, alignItems: "center", flexDirection: "row", paddingHorizontal: 14, paddingVertical: 12, backgroundColor: "#FFFFFF" },
  shiftCopy: { flex: 1, marginLeft: 14 },
  shiftTitle: { color: colors.ink, fontSize: 16, fontWeight: "800" },
  shiftMeta: { marginTop: 8, color: colors.muted, fontSize: 11 },
  addedText: { marginTop: 9, color: "#2F681D", fontSize: 10, fontWeight: "800" },
  confirmedBadge: { minWidth: 92, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: "#E1F2D3" },
  confirmedText: { color: "#356A24", fontSize: 12, fontWeight: "800" },
  pendingBadge: { minWidth: 76, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: "#FDE9C8" },
  pendingText: { color: "#74440D", fontSize: 12, fontWeight: "800" },
  cancelContent: { paddingHorizontal: 26, paddingTop: 54, paddingBottom: 38 },
  cancelTitle: { marginTop: 31, color: colors.ink, fontSize: 22, fontWeight: "800" },
  cancelText: { width: 260, marginTop: 13, color: colors.muted, fontSize: 13, lineHeight: 20 },
  noticeCard: { height: 68, marginTop: 30, borderRadius: 10, flexDirection: "row", alignItems: "center", paddingHorizontal: 15, backgroundColor: colors.paleTeal },
  smallClock: { width: 34, height: 34, borderWidth: 3, borderColor: colors.teal, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  smallClockHandTall: { width: 3, height: 12, backgroundColor: colors.teal, transform: [{ translateY: -4 }] },
  smallClockHandWide: { width: 9, height: 3, marginTop: -5, marginLeft: 7, backgroundColor: colors.teal },
  noticeCopy: { flex: 1, marginLeft: 16 },
  noticeTitle: { color: colors.ink, fontSize: 12, fontWeight: "800" },
  noticeText: { marginTop: 8, color: colors.muted, fontSize: 10 },
  inputLabel: { marginTop: 22, marginBottom: 9, color: colors.ink, fontSize: 12, fontWeight: "800" },
  reasonInput: { height: 66, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 17, paddingTop: 14, color: colors.ink, fontSize: 13, backgroundColor: "#FFFFFF" },
  helperText: { marginTop: 8, color: colors.muted, fontSize: 10 },
  dangerButton: { height: 51, marginTop: 43, borderRadius: 26, alignItems: "center", justifyContent: "center", backgroundColor: "#BE3B3D" },
  keepShift: { marginTop: 26, color: colors.teal, fontSize: 13, fontWeight: "800", textAlign: "center" }
});
