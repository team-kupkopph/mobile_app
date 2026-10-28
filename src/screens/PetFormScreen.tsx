// AQ8 · add a pet you already have. Before this, the only way a Pet existed was by adopting one,
// so an owner had no pet to rehome and no place to keep its details. POST /me/pets.
// PP12 · opened with a `petId` it edits that pet instead (GET, then PATCH /me/pets/{id}).
// The vet contact and medical notes travel with the pet if it is later rehomed (the new owner
// keeps them), which is why they are asked here.
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect, useState } from "react";
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { PetDetail } from "../api/types";
import { useApi } from "../api/useApi";
import { PrefillWarning } from "../components/PrefillWarning";
import { ScreenBackdrop } from "../components/ScreenBackground";
import { Button, Field, ScreenHeader, SegmentedControl } from "../components/ui";
import { MAX_PHOTOS, TRI_LABELS, Tri, addPhoto, removePhoto, triAt, triFromBool, triIndex, triToBool } from "../listingForm";
import { pickAndUpload } from "../media/pickAndUpload";
import { RootStackParamList } from "../navigation/types";
import { PetFormState, petBody, petFormError, petPatchBody } from "../petForm";
import { TAP_SLOP } from "../touch";
import { colors, radii, spacing, typography } from "../theme";

const SPECIES = ["dog", "cat", "other"] as const;
const SEX = ["male", "female", "unknown"] as const;

type Props = NativeStackScreenProps<RootStackParamList, "petForm">;

export function PetFormScreen({ navigation, route }: Props) {
  const api = useApi();
  const petId = route.params?.petId;
  const isEdit = !!petId;
  const [name, setName] = useState("");
  const [species, setSpecies] = useState<string>("dog");
  const [breed, setBreed] = useState("");
  const [sex, setSex] = useState<string>("unknown");
  const [birthdate, setBirthdate] = useState("");
  const [spayed, setSpayed] = useState<Tri>("unknown");
  const [temperament, setTemperament] = useState("");
  const [medical, setMedical] = useState("");
  const [vet, setVet] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  // Rule 3 (prefillGuards): an edit whose load failed would PATCH blanks over the pet's real
  // details, so keep the result and refuse to save on a failure.
  const [res, setRes] = useState<{ ok: boolean; status: number } | null>(null);
  const prefillFailed = isEdit && res !== null && !res.ok;

  useEffect(() => {
    if (!isEdit) return;
    api.get(`/me/pets/${petId}`).then((r) => {
      setRes({ ok: r.ok, status: r.status });
      if (!r.ok) return;
      const d: PetDetail = r.data;
      setName(d.name); setSpecies(d.species); setBreed(d.breed ?? ""); setSex(d.sex ?? "unknown");
      setBirthdate(d.birthdate ?? ""); setSpayed(triFromBool(d.spayed_neutered));
      setTemperament(d.temperament ?? ""); setMedical(d.medical_conditions ?? "");
      setVet(d.vet_contact ?? ""); setPhotos((d.photos ?? []).slice(0, MAX_PHOTOS));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, keyed by petId
  }, [petId]);

  async function pickPhoto() {
    if (uploading) return;
    setUploading(true);
    const res = await pickAndUpload(api, "listing_photo");
    setUploading(false);
    if (res?.ok) setPhotos((p) => addPhoto(p, res.fileUrl));
  }

  async function submit() {
    if (submitting) return;
    if (prefillFailed) {
      setError("We couldn't load this pet, so saving now would overwrite its details with blanks. "
        + "Check your connection and reopen this form.");
      return;
    }
    if (!name.trim()) { setError("Give your pet a name."); return; }
    setSubmitting(true);
    setError(undefined);
    const state: PetFormState = { name, species, breed, sex, birthdate, size: "", spayed: triToBool(spayed),
      temperament, medical, vet, photos };
    const saved = isEdit
      ? await api.patch(`/me/pets/${petId}`, petPatchBody(state))
      : await api.post("/me/pets", petBody(state));
    setSubmitting(false);
    if (saved.ok) { navigation.goBack(); return; }
    setError(petFormError(saved.data?.error?.code) ?? saved.data?.error?.message ?? "Couldn't save. Try again.");
  }

  return (
    <View style={styles.screen} testID="screen.petForm">
      <ScreenBackdrop />
      <ScreenHeader title={isEdit ? "Edit pet" : "Add a pet"} onBack={() => navigation.goBack()} />
      <ScrollView keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets
        contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {prefillFailed ? (
          <PrefillWarning message={"We couldn't load this pet, so this form can't be saved yet — check your "
            + "connection and reopen it."} />
        ) : null}
        <Field label="Name" value={name} onChangeText={setName} placeholder="Mochi" testID="field.petForm.name" />

        <Text style={styles.label}>Animal</Text>
        <Seg options={SPECIES} value={species} onChange={setSpecies} />

        <Field label="Breed (optional)" value={breed} onChangeText={setBreed} placeholder="Puspin" />

        <Text style={styles.label}>Sex</Text>
        <Seg options={SEX} value={sex} onChange={setSex} />

        <Field label="Birthdate (optional)" value={birthdate} onChangeText={setBirthdate}
          placeholder="YYYY-MM-DD" keyboardType="numbers-and-punctuation" />

        <Text style={styles.label}>Spayed / neutered</Text>
        <SegmentedControl segments={[...TRI_LABELS]} index={triIndex(spayed)} onChange={(i) => setSpayed(triAt(i))} />

        <Field label="Temperament (optional)" value={temperament} onChangeText={setTemperament} placeholder="Lap cat" />
        <Field label="Medical notes (optional)" value={medical} onChangeText={setMedical} multiline
          placeholder="Allergies, conditions, medication" />
        <Field label="Vet contact (optional)" value={vet} onChangeText={setVet} placeholder="Dr Reyes, 0917…" />
        <Text style={styles.fine}>If you rehome this pet, the next owner keeps these notes.</Text>

        <Text style={styles.label}>Photos (optional)</Text>
        <View style={styles.photoGrid}>
          {photos.map((url, i) => (
            <View key={url} style={styles.photoCell}>
              <Image source={{ uri: url }} style={styles.thumb} resizeMode="cover" />
              <TouchableOpacity hitSlop={TAP_SLOP} accessibilityRole="button" style={styles.photoAct}
                onPress={() => setPhotos((p) => removePhoto(p, i))}>
                <Text style={styles.photoRemove}>Remove</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
        {photos.length < MAX_PHOTOS ? (
          <TouchableOpacity style={styles.photoBtn} onPress={pickPhoto} activeOpacity={0.85} accessibilityRole="button">
            {uploading ? <ActivityIndicator color={colors.teal} />
              : <Text style={styles.photoText}>{photos.length ? "Add another photo" : "Add a photo"}</Text>}
          </TouchableOpacity>
        ) : null}

        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button label="Save pet" onPress={submit} loading={submitting} testID="btn.petForm.save" style={styles.submit} />
      </ScrollView>
    </View>
  );
}

function Seg({ options, value, onChange }: {
  options: readonly string[]; value: string; onChange: (v: string) => void;
}) {
  return (
    <SegmentedControl
      segments={options.map((o) => o.charAt(0).toUpperCase() + o.slice(1))}
      index={Math.max(0, options.indexOf(value))}
      onChange={(i) => onChange(options[i])}
    />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.page },
  content: { paddingHorizontal: spacing.lg, paddingTop: 12, paddingBottom: 60 },
  label: { marginTop: 20, marginBottom: 10, color: colors.ink, ...typography.strong, fontWeight: "700" },
  fine: { marginTop: 8, color: colors.muted, ...typography.meta, lineHeight: 18 },
  photoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 4 },
  photoCell: { width: "47%" },
  thumb: { width: "100%", height: 110, borderRadius: radii.field, backgroundColor: colors.border },
  photoAct: { minHeight: 44, justifyContent: "center" },
  photoRemove: { color: colors.danger, ...typography.meta, fontWeight: "700" },
  photoBtn: { marginTop: 12, minHeight: 90, paddingVertical: 12, paddingHorizontal: 12, borderRadius: radii.field, borderWidth: 2, borderColor: colors.border, borderStyle: "dashed", alignItems: "center", justifyContent: "center" },
  photoText: { color: colors.teal, ...typography.subtitle, fontWeight: "700" },
  error: { marginTop: 18, color: colors.danger, ...typography.strong, fontWeight: "700" },
  submit: { marginTop: 26 }
});
