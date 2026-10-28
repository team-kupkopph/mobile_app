// Plan Task 14b · the Settings switch's view of the app lock: is it offered on this device, and is it on.
import { useCallback, useEffect, useState } from "react";

import {
  authenticate, biometricsAvailable, loadAppLockPreference, saveAppLockPreference, subscribeAppLock,
} from "./appLockStore";

export function useAppLock(): {
  /** null until the device has been asked; the switch is hidden unless this is true. */
  available: boolean | null;
  enabled: boolean;
  /** Turning ON asks for one successful scan first; turning OFF just turns it off. Resolves whether it changed. */
  setEnabled: (on: boolean) => Promise<boolean>;
} {
  const [available, setAvailable] = useState<boolean | null>(null);
  const [enabled, setEnabledState] = useState(false);

  useEffect(() => {
    let alive = true;
    biometricsAvailable().then((a) => { if (alive) setAvailable(a); });
    loadAppLockPreference().then((e) => { if (alive) setEnabledState(e); });
    const off = subscribeAppLock((e) => { if (alive) setEnabledState(e); });
    return () => { alive = false; off(); };
  }, []);

  const setEnabled = useCallback(async (on: boolean) => {
    if (on && !(await authenticate("Confirm it's you to turn on App lock"))) return false;
    await saveAppLockPreference(on);
    return true;
  }, []);

  return { available, enabled, setEnabled };
}
