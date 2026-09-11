// US-T2 · compose a success story. Min 1 photo (server-enforced 422 photo_required, guarded
// client-side too). story_type auto-derives from the linked object; when opened from the
// adopted-inquiry CTA the listing link rides in via route params and pre-selects "Adoption".
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import {
  Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View
} from "react-native";

import { useApi } from "../api/useApi";
import { pickAndUpload } from "../media/pickAndUpload";
import { RootStackParamList } from "../navigation/types";
import { colors, elevation, radii, spacing, typography } from "../theme";
import { ScreenHeader } from "../components/ui";

const card = {
  backgroundColor: colors.white, ...elevation.soft
};

type Props = NativeStackScreenProps<RootStackParamList, "storyCompose">;

export function StoryComposeScreen({ navigation, route }: Props) {
  const api = useApi();
  const prefillListing = route.params?.adoptionListingId;
  const [caption, setCaption] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function addPhoto() {
    if (uploading) return;
    setUploading(true);
    const res = await pickAndUpload(api, "story_photo");
    setUploading(false);
    if (res?.ok) setPhotoUrl(res.fileUrl);
    else Alert.alert("Couldn't add photo", "Please try again.");
  }

  async function post() {
    if (busy) return;
    if (!photoUrl) { setError("A story needs at least one photo."); return; }
    setBusy(true);
    setError(null);
    const body: Record<string, any> = { caption: caption.trim(), photos: [{ file_url: photoUrl }] };
    if (prefillListing) body.adoption_listing_id = prefillListing;
    const res = await api.post("/stories", body);
    setBusy(false);
    if (res.ok) navigation.goBack();
    else if (res.status === 422) setError("A story needs at least one photo.");
    else setError("Couldn't post your story. Please try again.");
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Share a story" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.h1}>A photo makes the story</Text>
        <TouchableOpacity style={[styles.photoTile, photoUrl ? styles.photoTileSet : null]}
          onPress={addPhoto} activeOpacity={0.85}>
          <Text style={styles.photoLabel}>
            {uploading ? "Adding…" : photoUrl ? "Photo added · tap to replace" : "Add a photo · required"}
          </Text>
        </TouchableOpacity>
        {!photoUrl && error ? <Text style={styles.error}>{error}</Text> : null}

        {prefillListing ? (
          <View style={styles.linkedPill}>
            <Text style={styles.linkedText}>Tagged as an Adoption story</Text>
          </View>
        ) : null}

        <Text style={styles.label}>Caption</Text>
        <View style={styles.field}>
          <TextInput style={styles.input} value={caption} onChangeText={setCaption} multiline
            placeholder="Tell people what happened — how you met, how it's going now."
            placeholderTextColor="#9A988F" />
        </View>

        {error && photoUrl ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity style={styles.primaryBtn} onPress={post} disabled={busy}>
          <Text style={styles.primaryLabel}>{busy ? "Posting…" : "Post story"}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.page },
  content: { paddingHorizontal: spacing.lg, paddingTop: 12, paddingBottom: 60 },
  h1: { color: colors.ink, fontSize: 24, fontWeight: "800", marginBottom: 14 },
  photoTile: { height: 150, borderRadius: radii.field, borderWidth: 2, borderColor: colors.border, borderStyle: "dashed", alignItems: "center", justifyContent: "center", backgroundColor: colors.white },
  photoTileSet: { borderStyle: "solid", borderColor: colors.teal, backgroundColor: colors.soft },
  photoLabel: { color: colors.teal, ...typography.subtitle, fontWeight: "700" },
  linkedPill: { alignSelf: "flex-start", marginTop: 16, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 14, backgroundColor: "#EAF3DE" },
  linkedText: { color: "#27500A", ...typography.meta, fontWeight: "700" },
  label: { marginTop: 24, marginBottom: 10, color: colors.muted, ...typography.meta, fontWeight: "600", letterSpacing: 0.4 },
  field: { padding: 16, borderRadius: radii.field, ...card },
  input: { color: colors.ink, ...typography.subtitle, minHeight: 96, textAlignVertical: "top" },
  error: { marginTop: 10, color: colors.danger, ...typography.meta, fontWeight: "600" },
  primaryBtn: { marginTop: 28, height: 58, borderRadius: 29, backgroundColor: colors.teal, alignItems: "center", justifyContent: "center" },
  primaryLabel: { color: colors.white, fontSize: 18, fontWeight: "700" }
});
