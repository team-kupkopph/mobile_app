import { useWindowDimensions } from "react-native";

/**
 * True at Dynamic Type AX3 and up (`fontScale > 1.5`), the app's one threshold for switching a
 * row of icon | text | action to a stack so the text gets the full width. Everything below it is
 * untouched. Screens that need it once still inline the same two lines (see ProfileScreen); the
 * shared Home components read it in several places, hence the hook.
 */
export function useLargeText(): boolean {
  const { fontScale } = useWindowDimensions();
  return fontScale > 1.5;
}
