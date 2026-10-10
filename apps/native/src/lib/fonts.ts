import { useFonts } from "expo-font";

/** Loads Nunito, the families `fonts` in theme.ts names. True once the app can render. */
export function useAppFonts() {
  const [loaded, error] = useFonts({
    "Nunito-Regular": require("../../assets/fonts/Nunito-Regular.ttf"),
    "Nunito-Medium": require("../../assets/fonts/Nunito-Medium.ttf"),
    "Nunito-SemiBold": require("../../assets/fonts/Nunito-SemiBold.ttf"),
    "Nunito-Bold": require("../../assets/fonts/Nunito-Bold.ttf"),
    "Nunito-ExtraBold": require("../../assets/fonts/Nunito-ExtraBold.ttf"),
    "Nunito-Black": require("../../assets/fonts/Nunito-Black.ttf"),
  });
  return loaded || !!error;
}
