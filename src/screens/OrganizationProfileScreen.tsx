// Plan Task 9 (AS7) · the shelter's own profile: what donors see, and the contacts only it sees.
//   GET /shelter/profile -> the form    PATCH /shelter/profile { …only what changed }
//
// After onboarding a shelter could edit only its drop-off note and its vet. This is the rest: name,
// logo, description, hours, and the private contact person / phone / email (backend#113).
//
// Two rules that shape it:
//   · It is a PREFILLED EDIT FORM, so a failed load warns above the fields and the save refuses
//     (PrefillWarning rule 3): a blank form over a real profile is how a description gets wiped.
//   · It saves only what CHANGED (organizationPatch), so an untouched field can never be clobbered.
//
// The name is what the reviewers verified: once verified it cannot change here, and the server says
// so (409 org_name_locked) under the name field. Tier and organisation type are not editable at all —
// a tier change is an upgrade and re-runs verification.
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect, useState } from "react";
import { Image, ScrollView, StyleSheet, Text, View } from "react-native";

import { useApi } from "../api/useApi";
import { PrefillWarning } from "../components/PrefillWarning";
import { ScreenBackdrop } from "../components/ScreenBackground";
import { Button, Card, Field, ScreenHeader } from "../components/ui";
import { pickAndUpload } from "../media/pickAndUpload";
import { RootStackParamList } from "../navigation/types";
import {
  DESCRIPTION_MAX,
  HOURS_MAX,
  LogoChange,
  OrganizationFieldKey,
  OrganizationForm,
  OrganizationProfile,
  organizationErrorFrom,
  organizationFieldErrors,
  organizationFormFrom,
  organizationPatch,
} from "../organizationProfile";
import { colors, maxFontScale, radii, spacing, squircle, typography } from "../theme";
import { uploadErrorMessage } from "../upload";
import { authColors } from "./AuthFormKit";

type Props = NativeStackScreenProps<RootStackParamList, "organizationProfile">;

/** One wording for the banner and for a blocked save (PrefillWarning rule 3). */
const PREFILL_FAILED = "We couldn't load your profile, so this can't be saved yet. "
  + "Check your connection and reopen it.";

const BLANK: OrganizationForm = {
  orgName: "", description: "", hours: "", website: "",
  contactName: "", contactRole: "", phone: "", email: "",
};

export function OrganizationProfileScreen({ navigation }: Props) {
  const api = useApi();
  const [profile, setProfile] = useState<(OrganizationProfile & { tier?: string }) | null>(null);
  const [prefillFailed, setPrefillFailed] = useState(false);
  const [form, setForm] = useState<OrganizationForm>(BLANK);
  const [logo, setLogo] = useState<LogoChange>({ logo: "keep" });
  const [logoBroken, setLogoBroken] = useState(false);
  const [logoBusy, setLogoBusy] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<OrganizationFieldKey, string>>>({});
  const [formError, setFormError] = useState<string | undefined>(undefined);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    api.get("/shelter/profile").then((r) => {
      if (!alive) return;
      if (!r.ok) { setPrefillFailed(true); return; }
      setProfile(r.data);
      setForm(organizationFormFrom(r.data));
    });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once on open
  }, []);

  // Until the current values have arrived the fields are read-only (typing would be overwritten) and Save waits.
  const loading = !profile && !prefillFailed;

  function set<K extends keyof OrganizationForm>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  }

  async function chooseLogo() {
    if (logoBusy || loading) return;
    setLogoBusy(true);
    setErrors((e) => ({ ...e, logo: undefined }));
    try {
      const res = await pickAndUpload(api, "shelter_logo");
      if (res === null) return;                       // cancelled or declined: an ordinary outcome, no message
      if (res.ok) { setLogo({ logo: "new", fileUrl: res.fileUrl }); return; }
      setErrors((e) => ({ ...e, logo: uploadErrorMessage(res.reason) }));
    } finally {
      setLogoBusy(false);
    }
  }

  async function submit() {
    if (busy) return;
    if (prefillFailed) { setFormError(PREFILL_FAILED); return; }
    if (!profile) return;
    setFormError(undefined);
    const found = organizationFieldErrors(form);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    const patch = organizationPatch(profile, form, logo);
    if (Object.keys(patch).length === 0) { navigation.goBack(); return; }   // nothing changed: nothing to send

    setBusy(true);
    try {
      const res = await api.patch("/shelter/profile", patch);
      if (res.ok) { navigation.goBack(); return; }     // the You tab refetches on focus
      const err = organizationErrorFrom(res);
      if (err.field) setErrors({ [err.field]: err.message });
      else setFormError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const showCurrentLogo = logo.logo === "keep" && !!profile?.logo_url && !logoBroken;

  return (
    <View style={styles.screen} testID="screen.organizationProfile">
      <ScreenBackdrop />
      <ScreenHeader title="Organization profile" onBack={() => navigation.goBack()} align="center" />

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        showsVerticalScrollIndicator={false}
      >
        {prefillFailed ? <PrefillWarning message={PREFILL_FAILED} /> : null}

        <Card style={styles.logoCard}>
          {showCurrentLogo ? (
            <Image source={{ uri: profile!.logo_url! }} style={styles.logo}
                   accessibilityLabel="Your organization's logo" onError={() => setLogoBroken(true)} />
          ) : (
            <View style={[styles.logo, styles.logoBlank]}>
              <Text style={styles.logoGlyph} allowFontScaling={false} maxFontSizeMultiplier={maxFontScale.title}>{profile?.tier === "registered_ngo" ? "▦" : "♥"}</Text>
            </View>
          )}
          <View style={styles.logoCopy}>
            <Text style={styles.logoTitle}>Logo</Text>
            <Text style={styles.logoNote}>
              {logo.logo === "new" ? "New logo ready. Save to apply it."
                : logo.logo === "remove" ? "Your logo will be removed when you save."
                : "Donors see it with your name on your wishlist."}
            </Text>
          </View>
          <View style={styles.logoActions}>
            <Button testID="btn.organizationProfile.logo" label="Change logo" size="small" variant="secondary"
                    onPress={chooseLogo} loading={logoBusy} />
            {(profile?.logo_url || logo.logo === "new") && logo.logo !== "remove" ? (
              <Button testID="btn.organizationProfile.removeLogo" label="Remove" size="small" variant="secondary"
                      onPress={() => setLogo({ logo: "remove" })} />
            ) : null}
          </View>
        </Card>
        {errors.logo ? <Text style={styles.fieldNote} accessibilityRole="alert">{errors.logo}</Text> : null}

        <Text style={styles.groupTitle} maxFontSizeMultiplier={maxFontScale.title}>What donors see</Text>
        <Field testID="field.organizationProfile.name" label="Organization name" value={form.orgName}
               onChangeText={(v) => set("orgName", v)} error={errors.orgName} readOnly={loading}
               autoCapitalize="words" />
        <Text style={styles.hint}>Once your organization is verified, the name can't be changed here.</Text>
        <Field testID="field.organizationProfile.description" label="About your organization" value={form.description}
               onChangeText={(v) => set("description", v)} error={errors.description} readOnly={loading}
               multiline numberOfLines={4} maxLength={DESCRIPTION_MAX}
               placeholder="Who you are and who you help." />
        <Field testID="field.organizationProfile.hours" label="Hours" value={form.hours}
               onChangeText={(v) => set("hours", v)} error={errors.hours} readOnly={loading}
               maxLength={HOURS_MAX} placeholder="e.g. Mon–Sat, 9am–5pm" />
        <Field testID="field.organizationProfile.website" label="Website or page" value={form.website}
               onChangeText={(v) => set("website", v)} error={errors.website} readOnly={loading}
               autoCapitalize="none" autoCorrect={false} keyboardType="url" />

        <Text style={styles.groupTitle} maxFontSizeMultiplier={maxFontScale.title}>Private contacts</Text>
        <Text style={styles.hint}>Only you and Kupkop's reviewers see these. Donors and adopters never do.</Text>
        <Field testID="field.organizationProfile.contactName" label="Contact person" value={form.contactName}
               onChangeText={(v) => set("contactName", v)} error={errors.contactName} readOnly={loading}
               autoCapitalize="words" />
        <Field testID="field.organizationProfile.contactRole" label="Their role" value={form.contactRole}
               onChangeText={(v) => set("contactRole", v)} error={errors.contactRole} readOnly={loading}
               autoCapitalize="words" />
        <Field testID="field.organizationProfile.phone" label="Official phone" value={form.phone}
               onChangeText={(v) => set("phone", v)} error={errors.phone} readOnly={loading}
               keyboardType="phone-pad" autoComplete="tel" />
        <Field testID="field.organizationProfile.email" label="Official email" value={form.email}
               onChangeText={(v) => set("email", v)} error={errors.email} readOnly={loading}
               keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" />

        {!!formError && <Text style={styles.formError} accessibilityRole="alert">{formError}</Text>}

        <Button testID="btn.organizationProfile.save" label="Save" onPress={submit} loading={busy || loading}
                style={styles.save} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "transparent" },
  content: { paddingHorizontal: spacing.lg, paddingTop: 12, paddingBottom: 60 },
  logoCard: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 12 },
  logo: { width: 64, height: 64, borderRadius: squircle(64) },
  logoBlank: { alignItems: "center", justifyContent: "center", backgroundColor: colors.teal },
  logoGlyph: { color: colors.white, ...typography.hero, fontWeight: "900" },
  logoCopy: { flex: 1, minWidth: 140 },
  logoTitle: { color: authColors.ink, ...typography.subtitle, fontWeight: "700" },
  logoNote: { color: authColors.muted, ...typography.meta, marginTop: 2 },
  logoActions: { flexDirection: "row", gap: 8, flexBasis: "100%" },
  fieldNote: { marginTop: 8, marginLeft: 6, color: authColors.danger, ...typography.meta, fontWeight: "700" },
  groupTitle: { ...typography.meta, fontWeight: "700", color: colors.muted, letterSpacing: 1.4, marginTop: 24, marginBottom: 8 },
  hint: { color: authColors.muted, ...typography.meta, marginTop: 6, marginLeft: 6, marginBottom: 8 },
  formError: {
    alignSelf: "stretch",
    marginTop: 12,
    // On a tint, not the raw backdrop: the same contrast reason as Log in's error line.
    backgroundColor: colors.dangerBg,
    borderRadius: radii.chip,
    paddingHorizontal: 12,
    paddingVertical: 8,
    overflow: "hidden",
    color: authColors.danger,
    ...typography.meta,
    fontWeight: "700",
  },
  save: { alignSelf: "stretch", marginTop: 24 },
});
