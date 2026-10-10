import { useEffect, useState } from "react";
import { FontDisplay, useFonts } from "expo-font";

/**
 * How long the first render waits for Nunito. Normally the files arrive well within it and the
 * page never shows another font, so nothing shifts. On a slow connection the app renders with
 * the fallback stack in `fonts` (theme.ts) instead, and `font-display: swap` puts Nunito in
 * when it arrives, as `next/font` does for apps/web. The browsers' own block period is 3 s.
 */
const FONT_WAIT_MS = 3000;

function face(uri: number) {
  return { uri, display: FontDisplay.SWAP };
}

/** Loads Nunito 400–900, the families `fonts` in theme.ts names. True once the app can render. */
export function useAppFonts() {
  const [loaded, error] = useFonts({
    "Nunito-Regular": face(require("../../assets/fonts/Nunito-Regular.ttf")),
    "Nunito-Medium": face(require("../../assets/fonts/Nunito-Medium.ttf")),
    "Nunito-SemiBold": face(require("../../assets/fonts/Nunito-SemiBold.ttf")),
    "Nunito-Bold": face(require("../../assets/fonts/Nunito-Bold.ttf")),
    "Nunito-ExtraBold": face(require("../../assets/fonts/Nunito-ExtraBold.ttf")),
    "Nunito-Black": face(require("../../assets/fonts/Nunito-Black.ttf")),
  });
  const [waitedEnough, setWaitedEnough] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setWaitedEnough(true), FONT_WAIT_MS);
    return () => clearTimeout(timer);
  }, []);

  return loaded || !!error || waitedEnough;
}
