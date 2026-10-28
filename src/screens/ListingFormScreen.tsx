// US-A2 · create (no listingId) or edit (listingId) a listing. One screen for both —
// they share the same fields; edit just pre-fills from GET /listings/{id} and PATCHes
// instead of POSTs. Reference: screens/user/screen-shelter-list-animal-rescue.png.
//
// AD12 · every listing is born a DRAFT. "Save draft" creates it and opens Your listing (the
// preview), whose Publish button puts it on the Adopt feed; an unverified poster is refused there
// (403 verification_required) instead of going "live" to nobody. This screen doesn't re-check
// verification itself; it just says so plainly when the listing can't be published yet.
// AD9/AD11 · up to six photos (the first is the main one) and the fields the detail shows:
// size, vaccinated, spayed/neutered, walkable, temperament, requirements.
// AQ8 · opened with a `petId` it prefills from that pet and links the listing to it.
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect, useState } from "react";
import {
  ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View
} from "react-native";

import { useApi } from "../api/useApi";
import { PrefillWarning } from "../components/PrefillWarning";
import { ScreenBackdrop } from "../components/ScreenBackground";
import { pickAndUpload } from "../media/pickAndUpload";
import { useAuth } from "../auth/AuthContext";
import {
  MAX_PHOTOS, SIZES, TRI_LABELS, FormState, Tri, addPhoto, createBody, makeMain, patchBody,
  removePhoto, triAt, triFromBool, triIndex
} from "../listingForm";
import { TAP_SLOP } from "../touch";
import { RootStackParamList } from "../navigation/types";
import { Me } from "../api/types";
import { colors, radii, spacing, typography } from "../theme";
import { Button, Field, ScreenHeader, SegmentedControl } from "../components/ui";

const SPECIES = ["dog", "cat", "other"] as const;
const SEX = ["male", "female", "unknown"] as const;

type Props = NativeStackScreenProps<RootStackParamList, "listingForm">;

export function ListingFormScreen({ navigation, route }: Props) {
  const api = useApi();
  const { city: homeCity } = useAuth();
  const listingId = route.params?.listingId;
  const petId = route.params?.petId;   // AQ8
  const isEdit = !!listingId;

  const [name, setName] = useState("");
  const [species, setSpecies] = useState<string>("dog");
  const [breed, setBreed] = useState("");
  const [sex, setSex] = useState<string>("unknown");
  const [birthdate, setBirthdate] = useState(""); // YYYY-MM-DD, optional
  const [description, setDescription] = useState("");
  const [requirements, setRequirements] = useState("");
  const [size, setSize] = useState("");
  const [vaccinated, setVaccinated] = useState<Tri>("unknown");
  const [spayed, setSpayed] = useState<Tri>("unknown");
  const [walkable, setWalkable] = useState(false);
  const [temperament, setTemperament] = useState("");
  const [fee, setFee] = useState("0");
  const [city, setCity] = useState(homeCity ?? "");
  // Whether this listing will be SEEN. Decision 2: anyone signed in may draft one, and only a
  // Verified Member's or a verified shelter's appears in /listings (public_poster_q). The
  // form says so up front rather than letting someone list a pet into silence — and only to
  // the people it applies to. It used to say "until your account is verified" to everyone,
  // including a Verified Member reading it on a screen they had every right to use.
  // The gate is READ from /me, not re-derived here: `shelter.verification_status` is the
  // latest request, and a tier-1 shelter mid-upgrade is "pending" there while its listings
  // are public (decision 16). The client owns no copy of the predicate.
  const [me, setMe] = useState<Me | null>(null);
  useEffect(() => {
    let alive = true;
    api.get("/me").then((r) => { if (alive && r.ok) setMe(r.data); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once on mount
  }, []);
  const verifiedPoster = me
    ? me.is_verified_rescuer
    : null; // unknown until /me answers; no notice is shown while unknown
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [wasPublic, setWasPublic] = useState<string | null>(null); // listing.status, edit mode only

  /**
   * ⚠️ US-R5 · THE WORST BUG IN TRACK R, and it was invisible because nothing crashed.
   *
   * In edit mode every field above starts EMPTY and is filled in by the GET below. When that
   * GET failed, `loading` still went false and the form rendered its blanks over a real
   * listing — `name` "", `description` "", `fee` "0", `breed` "", and `city` silently reset
   * to the EDITOR'S home city rather than the pet's. `submit()` guarded only the name.
   *
   * So: open Edit on a bad connection, retype the name, tap Save, and the PATCH wipes the
   * description, clears the breed and birthdate, relocates the animal, and drops the
   * adoption fee to ₱0 — on a live adoption listing, with no error shown at any point.
   *
   * PrefillWarning's rule 4 exists for exactly this. Keeping the result is what makes it
   * detectable; the submit guard below is what makes it harmless.
   */
  const [res, setRes] = useState<{ ok: boolean; status: number } | null>(null);
  const loading = isEdit && res === null;
  // PP3 (review 2026-10-28) · "List one of my pets" prefills from the pet the same way, and a failed
  // load left the defaults (a dog, no breed) on a listing linked to the owner's cat.
  const [petRes, setPetRes] = useState<{ ok: boolean; status: number } | null>(null);
  const petPrefillFailed = !isEdit && !!petId && petRes !== null && !petRes.ok;
  const prefillFailed = (isEdit && res !== null && !res.ok) || petPrefillFailed;
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!isEdit) return;
    api.get(`/listings/${listingId}`).then((r) => {
      setRes({ ok: r.ok, status: r.status });
      if (r.ok) {
        const d = r.data;
        setName(d.pet.name);
        setSpecies(d.pet.species);
        setBreed(d.pet.breed ?? "");
        setSex(d.pet.sex ?? "unknown");
        setBirthdate(d.pet.birthdate ?? "");
        setDescription(d.description ?? "");
        setRequirements(d.requirements ?? "");
        setSize(d.pet.size_category ?? "");
        setVaccinated(triFromBool(d.pet.vaccinated));
        setSpayed(triFromBool(d.pet.spayed_neutered));
        setWalkable(!!d.pet.walkable);
        setTemperament(d.pet.temperament ?? "");
        setPhotos(d.photos ?? []);
        setFee(d.adoption_fee ?? "0");
        setCity(d.city ?? "");
        setWasPublic(d.status);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once, keyed by listingId
  }, [listingId]);

  // AQ8 · "List one of my pets": prefill from the pet (the server links it on create).
  useEffect(() => {
    if (isEdit || !petId) return;
    api.get(`/me/pets/${petId}`).then((r) => {
      setPetRes({ ok: r.ok, status: r.status });
      if (!r.ok) return;
      const d = r.data;
      setName(d.name); setSpecies(d.species); setBreed(d.breed ?? ""); setSex(d.sex ?? "unknown");
      setBirthdate(d.birthdate ?? ""); setSize(d.size_category ?? "");
      setSpayed(triFromBool(d.spayed_neutered)); setTemperament(d.temperament ?? "");
      setPhotos((d.photos ?? []).slice(0, MAX_PHOTOS));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once on mount
  }, [petId]);

  async function pickPhoto() {
    if (uploadingPhoto) return;
    setUploadingPhoto(true);
    const res = await pickAndUpload(api, "listing_photo");
    setUploadingPhoto(false);
    if (res?.ok) setPhotos((p) => addPhoto(p, res.fileUrl));
  }

  async function submit() {
    if (submitting) return;
    // Rule 3: the banner is information, not enforcement — a person can and will tap Save
    // anyway. This is the line that stops the blanks from reaching the server.
    if (prefillFailed) {
      setError(petPrefillFailed
        ? "We couldn't load your pet's details. Check your connection and reopen this form."
        : "We couldn't load this listing, so saving now would overwrite it with blanks. "
          + "Check your connection and reopen this form.");
      return;
    }
    if (!name.trim()) { setError("Give the listing a name."); return; }
    // Run 8 · the server answers a blank city with a bare "This field may not be blank." that names no field, and the
    // City field's grey placeholder ("Marikina") reads as a value when the person has no home city set.
    if (!city.trim()) { setError("Add the city where the animal is."); return; }
    setSubmitting(true);
    setError(undefined);

    const form: FormState = {
      name, species, breed, sex, birthdate, description, requirements, fee, city, size,
      vaccinated, spayed, walkable, temperament, photos, petId
    };
    const res = isEdit
      ? await api.patch(`/listings/${listingId}`, patchBody(form))
      : await api.post("/listings", createBody(form));

    setSubmitting(false);
    if (res.ok) {
      const id = isEdit ? listingId! : res.data.listing_id;
      // AD12 · Your listing is the preview: a draft's Publish button lives there.
      navigation.replace("posterListing", { listingId: id });
      return;
    }
    const code = res.data?.error?.code;
    if (code === "fee_over_cap") {
      setError(`The adoption fee can't exceed ₱${res.data.error.details?.cap ?? 500}.`);
      return;
    }
    if (code === "pet_already_listed") {
      setError("That pet already has a listing. Withdraw it first to list again.");
      return;
    }
    if (code === "pet_species_mismatch") {
      setError("The animal has to match your pet. Reopen this form from My pets.");
      return;
    }
    if (code === "listing_removed") {
      setError("Our moderators removed this listing, so it can't be edited.");
      return;
    }
    if (res.status === 403) {
      Alert.alert("Not your listing", "Only the poster can edit this listing.");
      return;
    }
    setError(res.data?.error?.message ?? "Couldn't save. Try again.");
  }

  if (loading) {
    return (
      <View style={styles.screen}>
        <ScreenBackdrop />
        <ScreenHeader title="Edit listing" onBack={() => navigation.goBack()} />
        <ActivityIndicator style={{ marginTop: 60 }} color={colors.teal} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScreenBackdrop />
      <ScreenHeader title={isEdit ? "Edit listing" : "List an animal"} onBack={() => navigation.goBack()} />

      <ScrollView keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Rule 1: ABOVE the fields, on load. Learning the form can't save only after
            filling it in has already cost the person their time. */}
        {prefillFailed ? (
          <PrefillWarning message={petPrefillFailed
            ? "We couldn't load your pet's details, so this form can't be saved yet — check your "
              + "connection and reopen it."
            : "We couldn't load this listing. Saving now would overwrite "
              + "it with blanks, so this form can't be saved yet — check your connection and "
              + "reopen it."} />
        ) : null}
        {!isEdit && verifiedPoster === false ? (
          <View style={styles.visibilityNote} accessibilityRole="text">
            <Text style={styles.visibilityTitle}>
              {me?.shelter ? "You can publish once your shelter is verified" : "You can publish once you're a Verified Member"}
            </Text>
            <Text style={styles.visibilityBody}>
              You can save it as a draft now. It stays private until you're approved and publish it.
            </Text>
            {!me?.shelter ? (
              <TouchableOpacity hitSlop={TAP_SLOP} activeOpacity={0.75} onPress={() => navigation.navigate("memberUpgrade")}>
                <Text style={styles.visibilityLink}>Get verified ›</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}
        {isEdit && wasPublic && wasPublic !== "available" ? (
          <View style={styles.statusNote}>
            <Text style={styles.statusNoteText}>
              {wasPublic === "draft"
                ? "This is a draft — only you can see it until you publish it."
                : `This listing is currently ${wasPublic} — it won't show as available while you edit it.`}
            </Text>
          </View>
        ) : null}
        <Field label="Name" value={name} onChangeText={setName} placeholder="Bantay" />

        <Text style={styles.label}>Animal</Text>
        <Segmented options={SPECIES} value={species} onChange={setSpecies} />

        <Field label="Breed (optional)" value={breed} onChangeText={setBreed} placeholder="Aspin" />

        <Text style={styles.label}>Sex</Text>
        <Segmented options={SEX} value={sex} onChange={setSex} />

        <Field
          label="Birthdate (optional)"
          value={birthdate}
          onChangeText={setBirthdate}
          placeholder="YYYY-MM-DD"
          keyboardType="numbers-and-punctuation"
        />

        <Field
          label="Description (optional)"
          value={description}
          onChangeText={setDescription}
          multiline
          placeholder="Friendly, house-trained, good with kids…"
        />

        <Field
          label="Adoption requirements (optional)"
          value={requirements}
          onChangeText={setRequirements}
          multiline
          testID="field.listingForm.requirements"
          placeholder="Fenced yard, no chaining, a vet visit within a month…"
        />

        <Text style={styles.label}>Size (optional)</Text>
        <View style={styles.chipRow}>
          {SIZES.map((opt) => {
            const on = size === opt;
            return (
              <TouchableOpacity key={opt} activeOpacity={0.85} accessibilityRole="button"
                accessibilityState={{ selected: on }} testID={`btn.listingForm.size.${opt}`}
                style={[styles.pill, on && styles.pillOn]} onPress={() => setSize(on ? "" : opt)}>
                <Text style={[styles.pillText, on && styles.pillTextOn]}>{opt.charAt(0).toUpperCase() + opt.slice(1)}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.label}>Vaccinated</Text>
        <SegmentedControl segments={[...TRI_LABELS]} index={triIndex(vaccinated)} onChange={(i) => setVaccinated(triAt(i))} />
        <Text style={styles.label}>Spayed / neutered</Text>
        <SegmentedControl segments={[...TRI_LABELS]} index={triIndex(spayed)} onChange={(i) => setSpayed(triAt(i))} />
        <Text style={styles.label}>Can be walked on a leash</Text>
        <SegmentedControl segments={["No", "Yes"]} index={walkable ? 1 : 0} onChange={(i) => setWalkable(i === 1)} />

        <Field label="Temperament (optional)" value={temperament} onChangeText={setTemperament}
          placeholder="Calm, good with kids" />

        <Field
          label="Adoption fee (₱)"
          value={fee}
          onChangeText={setFee}
          keyboardType="decimal-pad"
          placeholder="0"
        />
        <Text style={styles.fine}>
          Tier-1 rescues and individual Verified Members are capped at ₱500. Registered NGOs aren't capped.
        </Text>

        <Field label="City" value={city} onChangeText={setCity} placeholder="Marikina" />

        <Text style={styles.label}>Photos (optional)</Text>
        <Text style={styles.fine}>Up to {MAX_PHOTOS}. The first is the one adopters see on the deck.</Text>
        <View style={styles.photoGrid}>
          {photos.map((url, i) => (
            <View key={url} style={styles.photoCell} testID={`photo.listingForm.${i}`}>
              <Image source={{ uri: url }} style={styles.thumb} resizeMode="cover" />
              {i === 0 ? (
                <View style={styles.photoAct}>
                  <Text style={styles.mainTag}>Main photo</Text>
                </View>
              ) : (
                <TouchableOpacity hitSlop={TAP_SLOP} accessibilityRole="button" style={styles.photoAct}
                  onPress={() => setPhotos((p) => makeMain(p, i))}>
                  <Text style={styles.photoActText}>Make main</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity hitSlop={TAP_SLOP} accessibilityRole="button" style={styles.photoAct}
                testID={`btn.listingForm.removePhoto.${i}`} onPress={() => setPhotos((p) => removePhoto(p, i))}>
                <Text style={styles.photoRemove}>Remove</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
        {photos.length < MAX_PHOTOS ? (
          <TouchableOpacity style={styles.photoBtn} onPress={pickPhoto} activeOpacity={0.85}
            testID="btn.listingForm.addPhoto" accessibilityRole="button">
            {uploadingPhoto ? <ActivityIndicator color={colors.teal} />
              : <Text style={styles.photoText}>{photos.length ? "Add another photo" : "Add a photo"}</Text>}
          </TouchableOpacity>
        ) : null}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Button
          label={isEdit ? "Save changes" : "Save draft"}
          testID="btn.listingForm.submit"
          onPress={submit}
          loading={submitting}
          style={styles.submit}
        />
      </ScrollView>
    </View>
  );
}

function Segmented({ options, value, onChange }: {
  options: readonly string[]; value: string; onChange: (v: string) => void;
}) {
  // The primitive takes labels and an index; the screens keep their string enums.
  return (
    <SegmentedControl
      segments={options.map((opt) => opt.charAt(0).toUpperCase() + opt.slice(1))}
      index={Math.max(0, options.indexOf(value))}
      onChange={(i) => onChange(options[i])}
    />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.page },
  content: { paddingHorizontal: spacing.lg, paddingTop: 12, paddingBottom: 60 },
  statusNote: { marginTop: 4, marginBottom: 6, padding: 14, borderRadius: radii.notice, backgroundColor: colors.warningBg },
  statusNoteText: { color: colors.warningStrong, ...typography.meta, fontWeight: "600", lineHeight: 18 },
  label: { marginTop: 20, marginBottom: 10, color: colors.ink, ...typography.strong, fontWeight: "700" },
  fine: { marginTop: 8, color: colors.muted, ...typography.meta, lineHeight: 18 },
  visibilityNote: { marginBottom: 6, padding: 14, borderRadius: radii.notice, backgroundColor: colors.soft },
  visibilityTitle: { color: colors.ink, ...typography.strong, fontWeight: "700" },
  visibilityBody: { marginTop: 4, color: colors.muted, ...typography.meta, lineHeight: 19 },
  visibilityLink: { marginTop: 8, color: colors.tealDark, ...typography.meta, fontWeight: "800" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  pill: { minHeight: 44, paddingHorizontal: 18, borderRadius: 22, borderWidth: 1, borderColor: colors.border, justifyContent: "center" },
  pillOn: { backgroundColor: colors.soft, borderColor: colors.teal },
  pillText: { color: colors.ink, ...typography.strong, fontWeight: "600" },
  pillTextOn: { color: colors.tealDark, fontWeight: "800" },
  photoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 12 },
  photoCell: { width: "47%" },
  thumb: { width: "100%", height: 110, borderRadius: radii.field, backgroundColor: colors.border },
  mainTag: { color: colors.tealDark, ...typography.meta, fontWeight: "800" },
  photoAct: { minHeight: 44, justifyContent: "center" },
  photoActText: { color: colors.teal, ...typography.meta, fontWeight: "700" },
  photoRemove: { color: colors.danger, ...typography.meta, fontWeight: "700" },
  photoBtn: { marginTop: 12, minHeight: 90, paddingVertical: 12, paddingHorizontal: 12, borderRadius: radii.field, borderWidth: 2, borderColor: colors.border, borderStyle: "dashed", alignItems: "center", justifyContent: "center" },
  photoText: { color: colors.teal, ...typography.subtitle, fontWeight: "700" },
  error: { marginTop: 18, color: colors.danger, ...typography.strong, fontWeight: "700" },
  submit: { marginTop: 26 }
});
