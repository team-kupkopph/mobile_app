// US-A4 · the adopter's own inquiries, as a route.
//
// ⚠️ THE LIST ITSELF LIVES IN components/InquiryList.tsx, because Adopt's "Browse / My
// inquiries" segmented control (the V3 canvas) renders the same list in place. This route is
// NOT redundant: NotificationsScreen and ListingDetailScreen both navigate here, and neither
// has anything to do with the Adopt tab. Deleting it to "merge the screen into Adopt" would
// have broken two entry points.
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ScrollView, StyleSheet, View } from "react-native";

import { InquiryList } from "../components/InquiryList";
import { ScreenBackdrop } from "../components/ScreenBackground";
import { ScreenHeader } from "../components/ui";
import { RootStackParamList } from "../navigation/types";
import { spacing } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "myInquiries">;

export function MyInquiriesScreen({ navigation }: Props) {
  return (
    <View style={styles.screen} testID="screen.myInquiries">
      <ScreenBackdrop />
      <ScreenHeader title="My inquiries" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <InquiryList />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "transparent" },
  content: { paddingHorizontal: spacing.lg, paddingTop: 16, paddingBottom: 60 }
});
