// US-A2 · create (no listingId) or edit (listingId) a listing. One screen for both —
// they share the same fields; edit just pre-fills from GET /listings/{id} and PATCHes
// instead of POSTs. Reference: screens/user/screen-shelter-list-animal-rescue.png.
//
// Creation is gated on being signed in, NOT verification (decision 2 — draft-only,
// gated-public): an unverified poster's listing saves fine, it just won't appear in
// GET /listings until they're verified. This screen doesn't re-check verification
// itself; it just says so plainly when the listing isn't public yet.
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect, useState } from "react";
import {
  ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View
} from "react-native";

import { useApi } from "../api/useApi";
import { PrefillWarning } from "../components/PrefillWarning";
import { pickAndUpload } from "../media/pickAndUpload";
import { useAuth } from "../auth/AuthContext";
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
  const isEdit = !!listingId;

  const [name, setName] = useState("");
  const [species, setSpecies] = useState<string>("dog");
  const [breed, setBreed] = useState("");
  const [sex, setSex] = useState<string>("unknown");
  const [birthdate, setBirthdate] = useState(""); // YYYY-MM-DD, optional
  const [description, setDescription] = useState("");
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
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
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
  const prefillFailed = isEdit && res !== null && !res.ok;
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
        setFee(d.adoption_fee ?? "0");
        setCity(d.city ?? "");
        setWasPublic(d.status);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once, keyed by listingId
  }, [listingId]);

  async function addPhoto() {
    if (uploadingPhoto) return;
    setUploadingPhoto(true);
    const res = await pickAndUpload(api, "listing_photo");
    setUploadingPhoto(false);
    if (res?.ok) setPhotoUrl(res.fileUrl);
  }

  async function submit() {
    if (submitting) return;
    // Rule 3: the banner is information, not enforcement — a person can and will tap Save
    // anyway. This is the line that stops the blanks from reaching the server.
    if (prefillFailed) {
      setError("We couldn't load this listing, so saving now would overwrite it with blanks. "
        + "Check your connection and reopen this form.");
      return;
    }
    if (!name.trim()) { setError("Give the listing a name."); return; }
    setSubmitting(true);
    setError(undefined);

    const res = isEdit
      ? await api.patch(`/listings/${listingId}`, {
          name: name.trim(), species, breed: breed.trim(), sex,
          birthdate: birthdate.trim() || null,
          description: description.trim(), adoption_fee: fee || "0", city: city.trim()
        })
      : await api.post("/listings", {
          pet: { name: name.trim(), species, breed: breed.trim() || undefined,
                sex, birthdate: birthdate.trim() || undefined },
          description: description.trim(), adoption_fee: fee || "0", city: city.trim(),
          photos: photoUrl ? [{ file_url: photoUrl }] : []
        });

    setSubmitting(false);
    if (res.ok) {
      const id = isEdit ? listingId! : res.data.listing_id;
      navigation.replace("listingDetail", { listingId: id });
      return;
    }
    const code = res.data?.error?.code;
    if (code === "fee_over_cap") {
      setError(`The adoption fee can't exceed ₱${res.data.error.details?.cap ?? 500}.`);
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
        <ScreenHeader title="Edit listing" onBack={() => navigation.goBack()} />
        <ActivityIndicator style={{ marginTop: 60 }} color={colors.teal} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader title={isEdit ? "Edit listing" : "List an animal"} onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Rule 1: ABOVE the fields, on load. Learning the form can't save only after
            filling it in has already cost the person their time. */}
        {prefillFailed ? (
          <PrefillWarning message={"We couldn't load this listing. Saving now would overwrite "
            + "it with blanks, so this form can't be saved yet — check your connection and "
            + "reopen it."} />
        ) : null}
        {!isEdit && verifiedPoster === false ? (
          <View style={styles.visibilityNote} accessibilityRole="text">
            <Text style={styles.visibilityTitle}>
              {me?.shelter ? "It appears once your shelter is verified" : "It appears once you're a Verified Member"}
            </Text>
            <Text style={styles.visibilityBody}>
              You can list now. It stays a draft nobody else sees, and goes public on its own once you're approved.
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
              This listing is currently {wasPublic} — it won't show as available while you edit it.
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

        {!isEdit ? (
          <>
            <Text style={styles.label}>Photo (optional)</Text>
            <TouchableOpacity style={styles.photoBtn} onPress={addPhoto} activeOpacity={0.85}>
              {uploadingPhoto ? <ActivityIndicator color={colors.teal} />
                : <Text style={styles.photoText}>{photoUrl ? "✓ Photo added" : "Add a photo"}</Text>}
            </TouchableOpacity>
          </>
        ) : null}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Button
          label={isEdit ? "Save changes" : "Create listing"}
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
  photoBtn: { height: 90, borderRadius: radii.field, borderWidth: 2, borderColor: colors.border, borderStyle: "dashed", alignItems: "center", justifyContent: "center" },
  photoText: { color: colors.teal, ...typography.subtitle, fontWeight: "700" },
  error: { marginTop: 18, color: colors.danger, ...typography.strong, fontWeight: "700" },
  submit: { marginTop: 26 }
});
