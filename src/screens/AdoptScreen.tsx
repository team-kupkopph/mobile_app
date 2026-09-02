// Adopt tab placeholder — full listings/browse flow is a later sprint (M8). This just gives the
// owner shell a real destination so the tab bar has somewhere to land.
import { StyleSheet, Text, View } from "react-native";

import { OwnerTabs } from "../components/OwnerTabs";

export function AdoptScreen() {
  return (
    <View style={styles.screen}>
      <View style={styles.content}>
        <Text style={styles.title}>Adopt</Text>
        <Text style={styles.body}>Browsing and adoption inquiries are coming soon.</Text>
      </View>
      <OwnerTabs active="adopt" />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F4F5F2"
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32
  },
  title: {
    color: "#12213A",
    fontSize: 24,
    fontWeight: "800"
  },
  body: {
    marginTop: 10,
    color: "#5F5E5A",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20
  }
});
