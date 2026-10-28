// Plan Task 14b · the app-lock preference and the OS biometric calls, kept apart from the pure policy
// (appLock.ts) so that file stays testable without native modules.
//
// The preference lives in SecureStore ON THIS PHONE, per signed-in account: signing out (any tokens -> null
// transition, see AuthContext) forgets it, like the cached city, so the next person on a shared phone does not
// inherit someone else's setting. A tiny listener list keeps the gate and the Settings switch in step.
import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";

const KEY = "kupkop.appLock";
const listeners = new Set<(enabled: boolean) => void>();
let cached: boolean | null = null;

export async function loadAppLockPreference(): Promise<boolean> {
  if (cached !== null) return cached;
  try {
    cached = (await SecureStore.getItemAsync(KEY)) === "1";
  } catch {
    cached = false;                       // an unreadable store means "off", never "locked out"
  }
  return cached;
}

export async function saveAppLockPreference(enabled: boolean): Promise<void> {
  cached = enabled;
  try {
    if (enabled) await SecureStore.setItemAsync(KEY, "1");
    else await SecureStore.deleteItemAsync(KEY);
  } catch { /* the in-memory value still holds for this launch */ }
  listeners.forEach((l) => l(enabled));
}

export async function clearAppLockPreference(): Promise<void> {
  await saveAppLockPreference(false);
}

export function subscribeAppLock(listener: (enabled: boolean) => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

/** True only when the device has biometrics AND at least one is enrolled: never offer a switch that does nothing. */
export async function biometricsAvailable(): Promise<boolean> {
  try {
    return (await LocalAuthentication.hasHardwareAsync()) && (await LocalAuthentication.isEnrolledAsync());
  } catch {
    return false;
  }
}

/** One scan (the OS falls back to the device passcode itself). Never throws: a failure is just `false`. */
export async function authenticate(promptMessage: string): Promise<boolean> {
  try {
    const result = await LocalAuthentication.authenticateAsync({ promptMessage, cancelLabel: "Cancel" });
    return result.success;
  } catch {
    return false;
  }
}
