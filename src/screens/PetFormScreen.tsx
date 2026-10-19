// AQ8 · add a pet you already have. Before this, the only way a Pet existed was by adopting one,
// so an owner had no pet to rehome and no place to keep its details. POST /me/pets.
// The vet contact and medical notes travel with the pet if it is later rehomed (the new owner
// keeps them), which is why they are asked here.
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useApi } from "../api/useApi";
import { ScreenBackdrop } from "../components/ScreenBackground";
import { Button, Field, ScreenHeader, SegmentedControl } from "../components/ui";
import { MAX_PHOTOS, TRI_LABELS, Tri, addPhoto, removePhoto, triAt, triIndex, triToBool } from "../listingForm";
import { pickAndUpload } from "../media/pickAndUpload";
import { RootStackParamList } from "../navigation/types";
import { PetFormState, petBody, petFormError } from "../petForm";
import { TAP_SLOP } from "../touch";
import { colors, radii, spacing, typography } from "../theme";

const SPECIES = ["dog", "cat", "other"] as const;
const SEX = ["male", "female", "unknown"] as const;

type Props = NativeStackScreenProps<RootStackParamList, "petForm">;

export function PetFormScreen({ navigation }: Props) {
  const api = useApi();
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

  async function pickPhoto() {
    if (uploading) return;
    setUploading(true);
    const res = await pickAndUpload(api, "listing_photo");
    setUploading(false);
    if (res?.ok) setPhotos((p) => addPhoto(p, res.fileUrl));
  }

  async function submit() {
    if (submitting) return;
    if (!name.trim()) { setError("Give your pet a name."); return; }
    setSubmitting(true);
    setError(undefined);
    const state: PetFormState = { name, species, breed, sex, birthdate, size: "", spayed: triToBool(spayed),
      temperament, medical, vet, photos };
    const res = await api.post("/me/pets", petBody(state));
    setSubmitting(false);
    if (res.ok) { navigation.goBack(); return; }
    setError(petFormError(res.data?.error?.code) ?? res.data?.error?.message ?? "Couldn't save. Try again.");
  }

  return (
    <View style={styles.screen} testID="screen.petForm">
      <ScreenBackdrop />
      <ScreenHeader title="Add a pet" onBack={() => navigation.goBack()} />
      <ScrollView keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets
        contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
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
