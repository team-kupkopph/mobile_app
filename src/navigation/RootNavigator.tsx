import { NativeStackScreenProps, createNativeStackNavigator } from "@react-navigation/native-stack";
import { StyleSheet, Text, View } from "react-native";

import { useAuth } from "../auth/AuthContext";
import { AccountTypeScreen } from "../screens/AccountTypeScreen";
import { AdoptScreen } from "../screens/AdoptScreen";
import { ForgotPasswordScreen } from "../screens/ForgotPasswordScreen";
import { HomeGuestScreen } from "../screens/HomeGuestScreen";
import { HomeScreen } from "../screens/HomeScreen";
import { LocationPickerScreen } from "../screens/LocationPickerScreen";
import { MemberSubmittedScreen } from "../screens/MemberSubmittedScreen";
import { MemberUpgradeScreen } from "../screens/MemberUpgradeScreen";
import { MemberVerifyScreen } from "../screens/MemberVerifyScreen";
import { OtpLockedScreen } from "../screens/OtpLockedScreen";
import { OtpScreen } from "../screens/OtpScreen";
import { PasswordChangedScreen } from "../screens/PasswordChangedScreen";
import { ProfileScreen } from "../screens/ProfileScreen";
import { ResetOtpScreen } from "../screens/ResetOtpScreen";
import { ResetPasswordScreen } from "../screens/ResetPasswordScreen";
import { SigninScreen } from "../screens/SigninScreen";
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
      <Stack.Screen name="otpLocked" component={OtpLockedScreen} />
      <Stack.Screen name="signupSuccess" component={SignupSuccessScreen} />
      <Stack.Screen name="signin" component={SigninScreen} />
      <Stack.Screen name="forgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen name="resetOtp" component={ResetOtpScreen} />
      <Stack.Screen name="resetPassword" component={ResetPasswordScreen} />
      <Stack.Screen name="passwordChanged" component={PasswordChangedScreen} />
      <Stack.Screen name="support" component={PlaceholderSupport} />
      <Stack.Screen name="home" component={HomeScreen} />
      <Stack.Screen name="homeGuest" component={HomeGuestScreen} />
      <Stack.Screen name="adopt" component={AdoptScreen} />
      <Stack.Screen name="volunteer" component={VolunteerScreen} />
      <Stack.Screen name="profile" component={ProfileScreen} />
      <Stack.Screen name="locationPicker" component={LocationPickerScreen} />
      <Stack.Screen name="memberUpgrade" component={MemberUpgradeScreen} />
      <Stack.Screen name="memberVerify" component={MemberVerifyScreen} />
      <Stack.Screen name="memberSubmitted" component={MemberSubmittedScreen} />
    </Stack.Navigator>
  );
}

function WelcomeRoute({ navigation }: NativeStackScreenProps<RootStackParamList, "welcome">) {
  return (
    <WelcomeScreen
      onGetStarted={() => navigation.navigate("accountType")}
      onLogin={() => navigation.navigate("signin")}
      onBrowseGuest={() => navigation.navigate("homeGuest")}
    />
  );
}

// Minimal stand-in so passwordChanged's "Need help?" link has somewhere to go and typechecks
// end-to-end. A real contact-support flow (ticket form, FAQ, etc.) is out of scope for M6.
function PlaceholderSupport() {
  return (
    <View style={styles.lockedScreen}>
      <Text style={styles.lockedTitle}>Contact support</Text>
      <Text style={styles.lockedBody}>Support is coming soon. Email hello@kupkop.ph for now.</Text>
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
