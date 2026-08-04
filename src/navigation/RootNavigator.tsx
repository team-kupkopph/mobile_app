import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { useAuth } from "../auth/AuthContext";
import { RootStackParamList } from "./types";
import { WelcomeScreen } from "../WelcomeScreen";
// screen imports are added as tasks land; start with the ones that exist.

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { tokens } = useAuth();
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {tokens ? (
        <Stack.Screen name="home" component={PlaceholderHome} />
      ) : (
        <Stack.Screen name="welcome" component={WelcomeScreen} />
      )}
    </Stack.Navigator>
  );
}

function PlaceholderHome() { return null; } // replaced in Task 4
