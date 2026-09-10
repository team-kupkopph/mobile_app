import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";

/**
 * Is the system asking for less movement? iOS Settings › Accessibility › Motion › Reduce
 * Motion; the same preference the canvas reads as `prefers-reduced-motion`.
 *
 * ⚠️ Reads the CURRENT value and then subscribes, because either alone is a bug: the initial
 * read alone misses someone turning it on while the app is open, and the subscription alone
 * leaves the first paint animating for someone who has had it on for years.
 *
 * Defaults to `false` — motion on — for the moment before the async read lands. That is the
 * right default only because every consumer animates FROM the resting state, so the worst
 * case is one press that animates before the preference arrives, never a stuck transform.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (alive) setReduced(value);
    });
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduced);
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);

  return reduced;
}
