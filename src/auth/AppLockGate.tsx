// Plan Task 14b · the biometric app lock. Wraps the navigator (App.tsx), so it sits above every screen.
//
// While locked, or while the app is not in the foreground with the lock on, an OPAQUE cover hides the app, so
// the app-switcher snapshot shows nothing. The cover is not the lock: coming back within the grace period just
// removes it. A guest (`tokens === null`) and a person who never turned the lock on are never interrupted.
import { ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { AppState, StyleSheet, Text, View } from "react-native";

import { Button } from "../components/ui";
import { colors, maxFontScale, spacing, typography } from "../theme";
import { useAuth } from "./AuthContext";
import { lockScreenOptions, shouldLock } from "./appLock";
import { authenticate, loadAppLockPreference, subscribeAppLock } from "./appLockStore";

export function AppLockGate({ children }: { children: ReactNode }) {
  const { tokens, isReady, signOut } = useAuth();
  const hasTokens = !!tokens;
  const [enabled, setEnabled] = useState<boolean | null>(null);     // null = the preference is still loading
  const [locked, setLocked] = useState(false);
  const [covered, setCovered] = useState(false);                    // out of the foreground, lock on
  const [failures, setFailures] = useState(0);
  const backgroundedAt = useRef<number | null>(null);
  const started = useRef(false);
  const prompting = useRef(false);

  useEffect(() => {
    let alive = true;
    loadAppLockPreference().then((e) => { if (alive) setEnabled(e); });
    const off = subscribeAppLock((e) => { if (alive) setEnabled(e); });
    return () => { alive = false; off(); };
  }, []);

  const unlock = useCallback(async () => {
    if (prompting.current) return;
    prompting.current = true;
    try {
      const ok = await authenticate("Unlock Kupkop PH");
      if (ok) { setLocked(false); setFailures(0); }
      else setFailures((f) => f + 1);
    } finally {
      prompting.current = false;
    }
  }, []);

  // Cold start: once we know who is signed in and what they chose.
  useEffect(() => {
    if (!isReady || enabled === null || started.current) return;
    started.current = true;
    if (shouldLock({ hasTokens, enabled, event: "start", backgroundedAt: null, now: Date.now() })) {
      setLocked(true);
      void unlock();
    }
  }, [isReady, enabled, hasTokens, unlock]);

  // Back from the background: lock only after more than the grace period. Cover as soon as we leave.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (next) => {
      if (next !== "active") {
        if (backgroundedAt.current === null) backgroundedAt.current = Date.now();
        if (hasTokens && enabled) setCovered(true);
        return;
      }
      const lock = shouldLock({ hasTokens, enabled: !!enabled, event: "resume", backgroundedAt: backgroundedAt.current, now: Date.now() });
      backgroundedAt.current = null;
      setCovered(false);
      if (lock) { setLocked(true); void unlock(); }
    });
    return () => sub.remove();
  }, [hasTokens, enabled, unlock]);

  // Signing out (or never having been signed in) ends any lock: there is nothing left to protect.
  useEffect(() => { if (!hasTokens) { setLocked(false); setFailures(0); } }, [hasTokens]);

  const showCover = covered || locked || (hasTokens && enabled === null);
  const options = lockScreenOptions(failures);

  return (
    <View style={styles.fill}>
      {children}
      {showCover ? (
        <View style={styles.cover} testID={locked ? "overlay.appLock" : "overlay.appCover"} accessibilityViewIsModal>
          {locked ? (
            <>
              <Text style={styles.title} accessibilityRole="header" maxFontSizeMultiplier={maxFontScale.title}>
                Kupkop PH is locked
              </Text>
              <Text style={styles.body}>Use Face ID, your fingerprint or your passcode to continue.</Text>
              <Button testID="btn.appLock.unlock" label="Unlock" onPress={unlock} style={styles.action} />
              {options.canSignOut ? (
                <Button testID="btn.appLock.signOut" label="Sign out" variant="secondary" onPress={() => { void signOut(); }}
                        style={styles.action} />
              ) : null}
            </>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  // Opaque on purpose: this is what the app switcher snapshots.
  cover: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.teal, alignItems: "center", justifyContent: "center", padding: spacing.lg },
  title: { color: colors.white, ...typography.title, textAlign: "center" },
  body: { color: colors.white, ...typography.body, textAlign: "center", marginTop: 8 },
  action: { alignSelf: "stretch", marginTop: spacing.lg },
});
