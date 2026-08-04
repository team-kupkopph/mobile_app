import { NativeStackScreenProps, createNativeStackNavigator } from "@react-navigation/native-stack";
import { StyleSheet, Text, View } from "react-native";

import { useAuth } from "../auth/AuthContext";
import { AccountTypeScreen } from "../screens/AccountTypeScreen";
import { AdoptScreen } from "../screens/AdoptScreen";
import { HomeScreen } from "../screens/HomeScreen";
import { LocationPickerScreen } from "../screens/LocationPickerScreen";
import { OtpScreen } from "../screens/OtpScreen";
import { ProfileScreen } from "../screens/ProfileScreen";
import { SignupScreen } from "../screens/SignupScreen";
import { SignupSuccessScreen } from "../screens/SignupSuccessScreen";
import { VolunteerScreen } from "../screens/VolunteerScreen";
import { RootStackParamList } from "./types";
import { WelcomeScreen } from "../WelcomeScreen";
// screen imports are added as tasks land; start with the ones that exist.

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { tokens, isReady } = useAuth();
  if (!isReady) return null; // hold render until secure-store hydration completes

  // Single stack (not two conditional stacks): the US-A1 flow crosses what used to be the
  // auth/app boundary — otp calls setTokens() mid-flow, then still needs to navigate on to
  // signupSuccess before landing on home. A token-gated two-stack navigator would yank the
  // user straight to the app stack the instant setTokens() resolves, stranding signupSuccess.
  // `initialRouteName` still respects a returning, already-authenticated user.
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName={tokens ? "home" : "welcome"}>
      <Stack.Screen name="welcome" component={WelcomeRoute} />
      <Stack.Screen name="accountType" component={AccountTypeScreen} />
      <Stack.Screen name="signup" component={SignupScreen} />
      <Stack.Screen name="otp" component={OtpScreen} />
      <Stack.Screen name="otpLocked" component={PlaceholderOtpLocked} />
      <Stack.Screen name="signupSuccess" component={SignupSuccessScreen} />
      <Stack.Screen name="home" component={HomeScreen} />
      <Stack.Screen name="adopt" component={AdoptScreen} />
      <Stack.Screen name="volunteer" component={VolunteerScreen} />
      <Stack.Screen name="profile" component={ProfileScreen} />
      <Stack.Screen name="locationPicker" component={LocationPickerScreen} />
      <Stack.Screen name="memberUpgrade" component={PlaceholderMemberUpgrade} />
    </Stack.Navigator>
  );
}

function WelcomeRoute({ navigation }: NativeStackScreenProps<RootStackParamList, "welcome">) {
  return <WelcomeScreen onGetStarted={() => navigation.navigate("accountType")} />;
}

// Minimal stand-in so Profile's "Get Verified" row has somewhere to navigate to and typechecks
// end-to-end. Full Verified Member submission flow (documents, review state) lands in M7.
function PlaceholderMemberUpgrade() {
  return (
    <View style={styles.lockedScreen}>
      <Text style={styles.lockedTitle}>Get Verified</Text>
      <Text style={styles.lockedBody}>Verified Member submission is coming soon.</Text>
    </View>
  );
}

// Minimal stand-in so otp's 423 (code_locked) branch has somewhere to `replace()` into and
// typechecks end-to-end. Full lockout UI (countdown, support link, etc.) lands in M6.
function PlaceholderOtpLocked({ route }: NativeStackScreenProps<RootStackParamList, "otpLocked">) {
  return (
    <View style={styles.lockedScreen}>
      <Text style={styles.lockedTitle}>Too many attempts</Text>
      <Text style={styles.lockedBody}>
        This code is locked for {route.params.email}. Please try again later.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  lockedScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    backgroundColor: "#F7F7F4"
  },
  lockedTitle: {
    color: "#1F3A5F",
    fontSize: 20,
    fontWeight: "800"
  },
  lockedBody: {
    marginTop: 10,
    color: "#62615C",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20
  }
});
