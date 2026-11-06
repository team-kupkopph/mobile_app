// Review step 7g · what a report ends on. The old form ended on a native Alert; every other submit here ends on its own
// screen, and this is where "what happens next" belongs. It says only what is true: the report is with our team. It does
// not promise to tell the person what was decided (that notice is not built), and it offers Block when the report was
// about a person, because a report and a block are two different things and the person may want only one.
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";

import { useApi } from "../api/useApi";
import { CheckIcon } from "../components/AppIcons";
import { blockConfirmCopy, blockExitDepth, blockPerson } from "../moderation";
import { RootStackParamList } from "../navigation/types";
import { colors, maxFontScale, spacing, squircle, typography } from "../theme";
import { Button } from "../components/ui";
import { ConfirmModal } from "../components/ConfirmModal";

type Props = NativeStackScreenProps<RootStackParamList, "reportContentSent">;

export function ReportContentSentScreen({ navigation, route }: Props) {
  const api = useApi();
  const { subject, person, leaveContent } = route.params;
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  async function block() {
    if (!person || busy) return;
    setBusy(true);
    const outcome = await blockPerson(api, person);
    setBusy(false);
    setConfirming(false);
    if (!outcome.ok) { Alert.alert("Could not block", outcome.message); return; }
    Alert.alert("Blocked", `${person.name} is blocked. You can undo this in Settings.`,
      [{ text: "OK", onPress: () => navigation.pop(blockExitDepth(leaveContent)) }]);
  }

  const copy = person ? blockConfirmCopy(person.name) : null;
  return (
    <View style={styles.screen} testID="screen.reportContentSent">
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.icon}><CheckIcon color={colors.white} size={30} /></View>
        <Text style={styles.title} maxFontSizeMultiplier={maxFontScale.title}>Thanks, we will take a look</Text>
        <Text style={styles.body}>
          Your report about {subject ?? "this"} is with our team. We review every report, and we act on the ones that
          break our rules.
        </Text>

        {person ? (
          <View style={styles.block}>
            <Text style={styles.blockBody}>
              Reporting does not stop {person.name} from seeing your posts. You can also block them.
            </Text>
            <Button label={`Block ${person.name}`} variant="secondary" onPress={() => setConfirming(true)}
              testID="btn.reportContentSent.block" />
          </View>
        ) : null}

        <Button label="Done" onPress={() => navigation.goBack()} style={styles.done} testID="btn.reportContentSent.done" />
      </ScrollView>
      {copy ? (
        <ConfirmModal visible={confirming} title={copy.title} body={copy.body}
          confirmLabel={busy ? "Blocking…" : copy.confirm} tone="danger"
          onConfirm={() => { void block(); }} onCancel={() => setConfirming(false)} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.page },
  content: { paddingHorizontal: spacing.lg, paddingTop: 96, paddingBottom: 60, alignItems: "center" },
  icon: {
    width: 72, height: 72, borderRadius: squircle(72), backgroundColor: colors.teal, alignItems: "center",
    justifyContent: "center"
  },
  title: { color: colors.ink, ...typography.title, textAlign: "center", marginTop: 24 },
  body: { color: colors.muted, ...typography.body, textAlign: "center", marginTop: 12 },
  block: { alignSelf: "stretch", marginTop: 36, gap: 14 },
  blockBody: { color: colors.muted, ...typography.meta, textAlign: "center" },
  done: { alignSelf: "stretch", marginTop: 28 }
});
