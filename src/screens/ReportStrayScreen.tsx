// US-S1 · report a stray. Reference: screens/user/screen-report-stray.png.
// POST /reports { species, condition, notes?, is_anonymous, lat, lng, location_text?, city?, photos } -> 201.
// Location = the app's ONE precise-GPS surface (decision 11): expo-location gives the coords, and
// the disclosure below is NOT optional copy — everywhere else a person's location is city-level.
// The precise-pin refinement (US-S2 "Adjust") opens AdjustPinScreen (react-native-maps, dev build).
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as Location from "expo-location";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from "react-native";
import { Button, Field, ScreenHeader, SegmentedControl } from "../components/ui";

import { useApi } from "../api/useApi";
import { useAuth } from "../auth/AuthContext";
import { centroidFor } from "../cityCentroids";
import { useOutbox } from "../outbox/OutboxProvider";
import { ContactShareRow } from "../components/sagip/ContactShareRow";
import { LoadStateView } from "../components/LoadStateView";
import { loadState } from "../net";
import { randomKey } from "../outbox/key";
import { shouldQueue } from "../outbox";
import { pickAndUpload } from "../media/pickAndUpload";
import { RootStackParamList } from "../navigation/types";
import { GPS_TIMEOUT_MS, ReportMode, reportBody, reportTitle, withTimeout } from "../sagip";
import { uploadErrorMessage } from "../upload";
import { MyPet } from "../api/types";
import { TAP_SLOP } from "../touch";
import { colors, elevation, radii, spacing, typography } from "../theme";

const SPECIES = ["dog", "cat", "other"] as const;
const CONDITIONS = ["injured", "sick", "healthy", "pregnant"] as const;
// S12 / D6 · "What happened?" — the one form files all three kinds of report.
const MODES: ReportMode[] = ["stray", "lost", "found"];
const MODE_LABELS = ["Stray", "Lost my pet", "Found a pet"];

type Props = NativeStackScreenProps<RootStackParamList, "reportStray">;

export function ReportStrayScreen({ navigation, route }: Props) {
  const api = useApi();
  const { city: savedCity } = useAuth();
  const { enqueue } = useOutbox();
  // D6 · "I've seen this pet" arrives with the lost report's id and species, and is always a
  // found report; otherwise the mode is chosen at the top (or preselected by the caller).
  const sightingOf = route.params?.sightingOf;
  const [mode, setMode] = useState<ReportMode>(sightingOf ? "found" : route.params?.mode ?? "stray");
  const [species, setSpecies] = useState<string>(route.params?.sightingSpecies ?? "dog");
  // S7 · no default. Defaulting to "injured" made every untouched report the most urgent kind —
  // since D2 that pages every verified rescuer and shelter in the city.
  const [condition, setCondition] = useState<string | null>(null);
  // D6 · a lost report names one of the owner's pets (its photo and details come with it).
  const [pets, setPets] = useState<MyPet[]>([]);
  // The pets list is optional (a pet can be described by hand), so its load state renders
  // INLINE in the pet area — never replacing the form, which would throw away what's typed.
  const [petsRes, setPetsRes] = useState<{ ok: boolean; status: number } | null>(null);
  const [petId, setPetId] = useState<string | null>(null);
  const [breed, setBreed] = useState("");
  const [colorMarkings, setColorMarkings] = useState("");
  const [notes, setNotes] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  // D1 · off unless the reporter turns it on. D8 · anonymous forbids it, so switching
  // anonymous on also switches this off.
  const [shareContact, setShareContact] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locationText, setLocationText] = useState<string>("");
  // Coarse city label from the same reverse-geocode; sent so the report stores its own city
  // (report-detail + the map show it) instead of the server needing a geocoder. Never precise.
  const [city, setCity] = useState<string>("");
  const [locState, setLocState] = useState<"loading" | "ready" | "denied">("loading");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") { setLocState("denied"); return; }
        // C24 · no GPS fix for 15s (indoors) falls back to the last known position; with
        // neither, the denied state is the one that offers the pin.
        const loc = (await withTimeout(Location.getCurrentPositionAsync({}), GPS_TIMEOUT_MS))
          ?? (await Location.getLastKnownPositionAsync());
        if (!loc) { setLocState("denied"); return; }
        setCoords({ lat: loc.coords.latitude, lng: loc.coords.longitude });
        try {
          const [place] = await Location.reverseGeocodeAsync(loc.coords);
          if (place) {
            const line = [place.name, place.street, place.city].filter(Boolean).join(", ");
            setLocationText(line || place.city || "");
            setCity(place.city ?? "");
          }
        } catch {
          // reverse-geocode is best-effort; the coords are what matter
        }
        setLocState("ready");
      } catch {
        setLocState("denied");
      }
    })();
  }, []);

  // US-S2 · the Adjust map pops back with refined coords — adopt them and refresh the address.
  const adjLat = route.params?.adjustedLat;
  const adjLng = route.params?.adjustedLng;
  useEffect(() => {
    if (adjLat == null || adjLng == null) return;
    setCoords({ lat: adjLat, lng: adjLng });
    setLocState("ready");
    (async () => {
      try {
        const [place] = await Location.reverseGeocodeAsync({ latitude: adjLat, longitude: adjLng });
        if (place) {
          const line = [place.name, place.street, place.city].filter(Boolean).join(", ");
          setLocationText(line || place.city || "");
          setCity(place.city ?? "");
        }
      } catch {
        // best-effort; the refined coords are what matter
      }
    })();
  }, [adjLat, adjLng]);

  async function addPhoto() {
    if (uploading) return;
    setUploading(true);
    const res = await pickAndUpload(api, "stray_photo");
    setUploading(false);
    // C24 · a failed upload says why; null means the person cancelled, which says nothing.
    if (res?.ok) setPhotoUrl(res.fileUrl);
    else if (res) setError(uploadErrorMessage(res.reason));
  }

  // S23 · with location off there was no way to say where the animal is, and Send silently
  // did nothing. The reporter can now place the pin by hand, starting from their own city.
  function dropPin() {
    const start = coords ?? centroidFor(savedCity);
    navigation.navigate("adjustPin", { lat: start.lat, lng: start.lng });
  }

  const loadPets = useCallback(() => {
    setPetsRes(null);
    api.get("/me/pets").then((r) => {
      setPetsRes({ ok: r.ok, status: r.status });
      if (r.ok) setPets(r.data?.results ?? []);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- stable api
  }, []);
  useEffect(() => { if (mode === "lost") loadPets(); }, [mode, loadPets]);

  function choosePet(pet: MyPet | null) {
    setPetId(pet ? pet.pet_id : null);
    if (pet) setSpecies(pet.species);
  }

  async function submit() {
    if (submitting) return;
    if (uploading) { setError("The photo is still uploading — one moment."); return; }
    if (mode !== "lost" && !condition) {
      setError("Choose the animal's condition first — it decides how fast help is asked for.");
      return;
    }
    if (!coords) {
      // Explains rather than blocks silently (same posture as RescueUpdate's submit).
      setError(locState === "loading"
        ? "Still finding your location — or drop a pin on the map instead."
        : "Add the location first — turn on location, or drop a pin on the map.");
      return;
    }
    setSubmitting(true);
    setError(undefined);

    // US-O3 · the key is generated HERE, at compose time, not at send time — every retry of
    // this report must carry the same value or the server cannot tell a replay from a second
    // animal, and one animal gets two rescuers.
    const idempotencyKey = randomKey();
    const body = reportBody({
      mode, species, condition: condition ?? "healthy", notes, anonymous, shareContact, coords,
      locationText, city, photoUrl, idempotencyKey, petId, breed, colorMarkings,
      sightingOf: sightingOf
    });
    const title = reportTitle({
      report_type: mode, species, condition: condition ?? "healthy",
      pet_name: pets.find((p) => p.pet_id === petId)?.name
    });

    const res = await api.post("/reports", body);
    setSubmitting(false);

    if (res.ok) {
      navigation.replace("reportSent", {
        reportId: res.data.report_id, title,
        city: locationText || null
      });
      return;
    }

    // §13.3 · "never silently lose a user's report". A connectivity failure is not a dead
    // end: the report is queued and sent when the network returns, and the person is told
    // so rather than being asked to remember and re-file it.
    if (shouldQueue(res.status)) {
      await enqueue(body, idempotencyKey);
      navigation.replace("reportSent", {
        reportId: null, title,
        city: locationText || null, queued: true
      });
      return;
    }
    setError(res.data?.error?.message ?? "Couldn't send the report. Try again.");
  }

  return (
    <View style={styles.screen} testID="screen.reportStray">
      <ScreenHeader
        title={sightingOf ? "Report a sighting" : mode === "lost" ? "Report a lost pet"
          : mode === "found" ? "Report a found animal" : "Report a stray"}
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {!sightingOf ? (
          <>
            <Text style={styles.label}>What happened?</Text>
            <SegmentedControl
              segments={MODE_LABELS}
              index={MODES.indexOf(mode)}
              onChange={(i) => { setMode(MODES[i]); setError(undefined); }}
              testID="seg.reportStray.mode"
            />
          </>
        ) : null}

        <Text style={styles.h1}>
          {sightingOf ? `Where did you see ${route.params?.sightingName ?? "them"}?`
            : mode === "lost" ? "Who's missing?"
            : mode === "found" ? "What did you find?" : "What did you see?"}
        </Text>
        <Text style={styles.sub}>
          {mode === "lost" ? "Their photo and details help people recognise them."
            : "A photo helps — but don't wait for one."}
        </Text>

        {/* D6 · the owner picks the missing pet; its photo and details travel with the report. */}
        {mode === "lost" && loadState(petsRes, pets.length).kind !== "ready" ? (
          <View style={styles.petState}>
            <LoadStateView
              state={loadState(petsRes, pets.length)}
              subject="your pets"
              emptyTitle="No pets on your profile yet."
              emptyBody="Describe them below instead."
              onRetry={loadPets}
            />
          </View>
        ) : null}
        {mode === "lost" && pets.length > 0 ? (
          <View style={styles.petRow}>
            {pets.map((p) => (
              <TouchableOpacity
                key={p.pet_id}
                style={[styles.petChip, petId === p.pet_id && styles.petChipOn]}
                accessibilityRole="button"
                accessibilityState={{ selected: petId === p.pet_id }}
                onPress={() => choosePet(petId === p.pet_id ? null : p)}
              >
                <Text style={[styles.petChipText, petId === p.pet_id && styles.petChipTextOn]}>{p.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}

        <TouchableOpacity
          style={styles.photoBtn}
          onPress={addPhoto}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={photoUrl ? "Photo added. Tap to replace it." : "Add a photo, optional"}
          accessibilityState={{ busy: uploading }}
        >
          {uploading ? <ActivityIndicator color={colors.teal} />
            : <Text style={styles.photoText}>{photoUrl ? "✓ Photo added" : "Add a photo · optional"}</Text>}
        </TouchableOpacity>

        {!sightingOf && !(mode === "lost" && petId) ? (
          <>
            <Text style={styles.label}>Animal</Text>
            <Segmented options={SPECIES} value={species} onChange={setSpecies} />
          </>
        ) : null}

        {mode !== "lost" ? (
          <>
            <Text style={styles.label}>Condition</Text>
            <Segmented options={CONDITIONS} value={condition} onChange={setCondition} />
          </>
        ) : null}

        {mode === "lost" && !petId ? (
          <Field label="Breed (optional)" value={breed} onChangeText={setBreed} placeholder="e.g. Aspin"
            testID="field.reportStray.breed" />
        ) : null}
        {mode !== "stray" ? (
          <Field label="Colour and markings (optional)" value={colorMarkings} onChangeText={setColorMarkings}
            placeholder="e.g. brown, white chest, red collar" testID="field.reportStray.colorMarkings" />
        ) : null}

        <Field
          label="Notes (optional)"
          testID="field.reportStray.notes"
          value={notes}
          onChangeText={setNotes}
          multiline
          placeholder="Limping, near the sari-sari store — wouldn't let me near."
        />

        <View style={styles.locCard}>
          {locState === "loading" ? (
            <View style={styles.locRow}><ActivityIndicator color={colors.teal} /><Text style={styles.locText}>Finding your location…</Text></View>
          ) : locState === "denied" ? (
            <>
              <Text style={styles.locDenied}>Location off — turn it on, or show a rescuer where the animal is on the map.</Text>
            </>
          ) : (
            <>
              {mode === "lost" ? <Text style={styles.locFrom}>Last seen here</Text> : null}
              <Text style={styles.locAddr}>{locationText || "Current location"}</Text>
              <View style={styles.locFooter}>
                <Text style={styles.locFrom}>From your GPS</Text>
                {coords ? (
                  <TouchableOpacity
                    onPress={() => navigation.navigate("adjustPin", { lat: coords.lat, lng: coords.lng })} hitSlop={TAP_SLOP}
                    accessibilityRole="button"
                    accessibilityLabel="Adjust the exact location of this report"
                  >
                    <Text style={styles.adjust}>Adjust exact location ›</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </>
          )}
          {/* C24 · the pin is offered while still locating too, not only once location is off. */}
          {locState !== "ready" ? (
            <TouchableOpacity
              style={styles.dropPin}
              onPress={dropPin}
              accessibilityRole="button"
              testID="btn.reportStray.dropPin"
            >
              <Text style={styles.adjust}>Drop a pin on the map instead ›</Text>
            </TouchableOpacity>
          ) : null}
        </View>
        <Text style={styles.fine}>Only this report uses your exact spot · your profile still shows just your city.</Text>

        {/* D6 · an owner looking for their pet must be findable, so a lost report isn't anonymous. */}
        {mode !== "lost" ? (
        <View style={styles.anonRow}>
          <Text style={styles.anonLabel}>Report anonymously</Text>
          <Switch
            value={anonymous}
            onValueChange={(v) => { setAnonymous(v); if (v) setShareContact(false); }}
            trackColor={{ true: colors.teal }}
            accessibilityLabel="Report anonymously"
            accessibilityHint="Hides your name from other users. The report is still linked to your account."
          />
        </View>
        ) : null}

        <ContactShareRow
          label={mode === "lost" ? "Let someone who's seen them contact me"
            : sightingOf ? "Let the owner contact me" : "Let the rescuer contact me"}
          hint={anonymous && mode !== "lost"
            ? "Anonymous reports don't share contact details."
            : mode === "lost"
              ? "Shares your phone and email with anyone whose sighting matches your pet."
              : sightingOf
                ? "Shares your phone and email with the owner, so you can reunite them."
                : "Shares your phone and email with whoever claims this, only after they claim it."}
          value={shareContact && (mode === "lost" || !anonymous)}
          onValueChange={setShareContact}
          disabled={anonymous && mode !== "lost"}
          testID="switch.reportStray.shareContact"
        />

        {error ? (
          <Text style={styles.error} accessibilityRole="alert" accessibilityLiveRegion="polite">
            {error}
          </Text>
        ) : null}

        <Button
          testID="btn.reportStray.submit"
          label={mode === "lost" ? "Post lost pet" : sightingOf ? "Send sighting" : "Send report"}
          onPress={submit}
          loading={submitting}
          accessibilityHint={coords ? undefined : "Waiting for your location"}
          style={styles.submit}
        />
      </ScrollView>
    </View>
  );
}

function Segmented({ options, value, onChange }: {
  options: readonly string[]; value: string | null; onChange: (v: string) => void;
}) {
  // The primitive takes labels and an index; the screens keep their string enums.
  return (
    <SegmentedControl
      segments={options.map((opt) => opt.charAt(0).toUpperCase() + opt.slice(1))}
      index={value === null ? -1 : options.indexOf(value)}   // S7 · -1 = nothing chosen yet
      onChange={(i) => onChange(options[i])}
    />
  );
}

const card = {
  backgroundColor: colors.white, ...elevation.soft
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.page },
  content: { paddingHorizontal: spacing.lg, paddingTop: 12, paddingBottom: 60 },
  h1: { color: colors.ink, ...typography.display },
  sub: { marginTop: 8, color: colors.muted, ...typography.subtitle },
  photoBtn: { marginTop: 18, height: 90, borderRadius: radii.field, borderWidth: 2, borderColor: colors.border, borderStyle: "dashed", alignItems: "center", justifyContent: "center" },
  photoText: { color: colors.teal, ...typography.subtitle, fontWeight: "700" },
  label: { marginTop: 24, marginBottom: 10, color: colors.ink, ...typography.strong, fontWeight: "700" },
  locCard: { marginTop: 24, padding: 18, borderRadius: radii.tile, ...card },
  locRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  locText: { color: colors.muted, ...typography.body },
  locAddr: { color: colors.ink, ...typography.subtitle, fontWeight: "700" },
  locFooter: { marginTop: 6, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  locFrom: { color: colors.muted, ...typography.meta, fontWeight: "600" },
  adjust: { color: colors.teal, ...typography.strong, fontWeight: "800" },
  locDenied: { color: colors.warningStrong, ...typography.strong, fontWeight: "700" },
  dropPin: { marginTop: 10, minHeight: 44, justifyContent: "center" },
  fine: { marginTop: 12, color: colors.muted, ...typography.meta, lineHeight: 19 },
  petState: { marginTop: 12 },
  petRow: { marginTop: 16, flexDirection: "row", flexWrap: "wrap", gap: 10 },
  petChip: { minHeight: 44, paddingHorizontal: 18, borderRadius: 22, borderWidth: 2, borderColor: colors.border, justifyContent: "center" },
  petChipOn: { borderColor: colors.teal, backgroundColor: colors.infoBg },
  petChipText: { color: colors.ink, ...typography.subtitle, fontWeight: "700" },
  petChipTextOn: { color: colors.tealDark },
  anonRow: { marginTop: 24, flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 18, borderRadius: radii.tile, ...card },
  anonLabel: { color: colors.ink, ...typography.subtitle, fontWeight: "700" },
  error: { marginTop: 16, color: colors.danger, ...typography.strong, fontWeight: "700" },
  submit: { marginTop: 26 }
});
