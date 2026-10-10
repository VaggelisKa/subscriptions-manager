import { PlatformColor, type ColorValue } from "react-native";

/** An iOS system colour by name (`systemColor.ts` has the other platforms). */
export function systemColor(name: string, _fallback: string): ColorValue {
  return PlatformColor(name);
}
