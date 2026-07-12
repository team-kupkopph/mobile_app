import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { TabKey } from "./src/components/BottomTabs";
import { HomeScreen } from "./src/HomeScreen";
import { AddPetScreen, NotificationsScreen, SettingsScreen } from "./src/MoreScreens";
import { AccountTypeScreen, OtpScreen, SignupScreen } from "./src/OnboardingScreens";
import { PetDetailScreen } from "./src/PetDetailScreen";
import { ProfileScreen } from "./src/ProfileScreen";
import { RescuerUpgradeScreen, RescuerVerifyScreen } from "./src/RescuerScreens";
import { ShelterTabKey } from "./src/components/ShelterTabs";
import { ShelterDashboardScreen, ShelterDonationsScreen } from "./src/ShelterDashboardScreens";
import { ShelterListAnimalScreen, ShelterListingsScreen } from "./src/ShelterListingScreens";
import { ShelterPendingScreen, ShelterSetupScreen, ShelterVerifyDocsScreen } from "./src/ShelterScreens";
import {
  VolunteerCancelScreen,
  VolunteerDetailScreen,
  VolunteerRequestedScreen,
  VolunteerScheduleScreen,
  VolunteerScreen
} from "./src/VolunteerScreens";
import { WelcomeScreen } from "./src/WelcomeScreen";

type Route =
  | "welcome"
  | "signup"
  | "otp"
  | "accountType"
  | "home"
  | "profile"
  | "addPet"
  | "settings"
  | "notifications"
  | "petDetail"
  | "rescuerUpgrade"
  | "rescuerVerify"
  | "shelterSetup"
  | "shelterDocs"
  | "shelterPending"
  | "shelterDashboard"
  | "shelterDonations"
  | "shelterListings"
  | "shelterListAnimal"
  | "volunteer"
  | "volunteerDetail"
  | "volunteerRequested"
  | "volunteerSchedule"
  | "volunteerCancel";

export default function App() {
  const [routeStack, setRouteStack] = useState<Route[]>(["welcome"]);
  const route = routeStack[routeStack.length - 1];

  function navigate(nextRoute: Route) {
    setRouteStack((currentStack) => {
      const currentRoute = currentStack[currentStack.length - 1];
      if (currentRoute === nextRoute) return currentStack;
      return [...currentStack, nextRoute];
    });
  }

  function reset(nextRoute: Route) {
    setRouteStack([nextRoute]);
  }

  function goBack() {
    setRouteStack((currentStack) => (currentStack.length > 1 ? currentStack.slice(0, -1) : currentStack));
  }

  function handleShelterTabPress(tab: ShelterTabKey) {
    if (tab === "home") {
      navigate("shelterDashboard");
      return;
    }

    if (tab === "donate") {
      navigate("shelterDonations");
      return;
    }

    if (tab === "animals") {
      navigate("shelterListings");
    }
  }

  function handleTabPress(tab: TabKey) {
    if (tab === "home") {
      navigate("home");
      return;
    }

    if (tab === "profile") {
      navigate("profile");
      return;
    }

    if (tab === "volunteer") {
      navigate("volunteer");
    }
  }

  return (
    <View style={styles.root}>
      <StatusBar hidden />
      {route === "welcome" && <WelcomeScreen onGetStarted={() => navigate("signup")} />}
      {route === "signup" && <SignupScreen onBack={goBack} onNext={() => navigate("otp")} />}
      {route === "otp" && <OtpScreen onBack={goBack} onNext={() => navigate("accountType")} />}
      {route === "accountType" && <AccountTypeScreen onBack={goBack} onNext={() => reset("home")} onShelterNext={() => navigate("shelterSetup")} />}
      {route === "home" && <HomeScreen onNotifications={() => navigate("notifications")} onOpenPet={() => navigate("petDetail")} onTabPress={handleTabPress} />}
      {route === "profile" && (
        <ProfileScreen
          onAddPet={() => navigate("addPet")}
          onSettings={() => navigate("settings")}
          onStartRescuer={() => navigate("rescuerUpgrade")}
          onOpenPet={() => navigate("petDetail")}
          onTabPress={handleTabPress}
        />
      )}
      {route === "addPet" && <AddPetScreen onBack={goBack} />}
      {route === "settings" && <SettingsScreen onBack={goBack} />}
      {route === "notifications" && <NotificationsScreen onBack={goBack} />}
      {route === "petDetail" && <PetDetailScreen onBack={goBack} />}
      {route === "rescuerUpgrade" && <RescuerUpgradeScreen onBack={goBack} onNext={() => navigate("rescuerVerify")} />}
      {route === "rescuerVerify" && <RescuerVerifyScreen onBack={goBack} />}
      {route === "shelterSetup" && <ShelterSetupScreen onBack={goBack} onNext={() => navigate("shelterDocs")} />}
      {route === "shelterDocs" && <ShelterVerifyDocsScreen onBack={goBack} onNext={() => navigate("shelterPending")} />}
      {route === "shelterPending" && <ShelterPendingScreen onBack={goBack} onNext={() => reset("shelterDashboard")} />}
      {route === "shelterDashboard" && (
        <ShelterDashboardScreen
          onContinueVerification={() => navigate("shelterDocs")}
          onDonations={() => navigate("shelterDonations")}
          onListings={() => navigate("shelterListings")}
          onListAnimal={() => navigate("shelterListAnimal")}
          onTabPress={handleShelterTabPress}
        />
      )}
      {route === "shelterDonations" && <ShelterDonationsScreen onBack={goBack} onTabPress={handleShelterTabPress} />}
      {route === "shelterListings" && <ShelterListingsScreen onBack={goBack} onNew={() => navigate("shelterListAnimal")} onTabPress={handleShelterTabPress} />}
      {route === "shelterListAnimal" && <ShelterListAnimalScreen onBack={goBack} onPublish={() => navigate("shelterListings")} />}
      {route === "volunteer" && (
        <VolunteerScreen onBack={goBack} onCancelShift={() => navigate("volunteerCancel")} onOpenDetail={() => navigate("volunteerDetail")} />
      )}
      {route === "volunteerDetail" && <VolunteerDetailScreen onBack={goBack} onRequestSent={() => navigate("volunteerRequested")} />}
      {route === "volunteerRequested" && (
        <VolunteerRequestedScreen onBack={goBack} onOpenDetail={() => navigate("volunteerDetail")} onShowSchedule={() => navigate("volunteerSchedule")} />
      )}
      {route === "volunteerSchedule" && <VolunteerScheduleScreen onBack={goBack} onCancelShift={() => navigate("volunteerCancel")} />}
      {route === "volunteerCancel" && <VolunteerCancelScreen onBack={goBack} />}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#11241F"
  }
});
