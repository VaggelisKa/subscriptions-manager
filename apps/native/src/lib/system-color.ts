import type { ColorValue } from "react-native";

/**
 * An iOS system colour (`PlatformColor`) on iOS, where it matches SwiftUI's
 * own surfaces; the given theme token everywhere else (react-native-web has
 * no `PlatformColor`).
 */
export function systemColor(_name: string, fallback: string): ColorValue {
  return fallback;
}
