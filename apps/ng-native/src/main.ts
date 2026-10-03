// Expo's runtime: its fetch (whose response streams a body), URL, TextDecoderStream and
// structuredClone. Metro runs it before this file only when something imports it.
import "expo";
import "react-native-url-polyfill/auto";
import { AppRegistry, Image, Platform, processColor } from "react-native";
import { mount } from "@ng-native/platform";
import { currentConditions, deviceTokens, watchConditions } from "@ng-native/device";
import { registerExpoUiViews, registerExpoViews } from "@ng-native/expo";
import { loadFonts } from "@ng-native/expo/fonts";
import { splashScreen } from "@ng-native/expo/splash-screen";
import { getFabricUIManager, registerPlatformComponents, styleSheetOf } from "@ng-native/fabric";
import { App } from "./app/app.ts";
import { registerRnHost } from "./app/ui/rn-host.ts";
import { appConfig } from "./app/app.config.ts";
import { demoProviders } from "./app/data/demo.ts";
import { demoMode } from "./app/data/supabase.ts";
import { GlobalStyles } from "./app/global-styles.ts";

// Held until the fonts are registered, so the first frame is never in the fallback face.
splashScreen.hold();
registerPlatformComponents(Platform.OS);
// The SwiftUI / Compose views behind the `<ui-*>` elements: the form, pickers and symbols.
registerExpoUiViews(Platform.OS);
// expo-image draws the brand logos, which are SVGs.
registerExpoViews("expo-image");
// Ordinary views inside SwiftUI: the brand logo in the form's preview row.
registerRnHost();

AppRegistry.registerRunnable("main", ({ rootTag }) => {
  // The app-wide sheet: the colour tokens, the Nunito faces and the grouped-list classes.
  const globalStyles = styleSheetOf(GlobalStyles);
  const fonts = loadFonts(globalStyles);

  const app = mount(Number(rootTag), App, getFabricUIManager(), {
    processColor,
    globalStyles,
    conditions: currentConditions(),
    tokens: deviceTokens(),
    resolveAssetSource: (value) => Image.resolveAssetSource(value as never),
    providers: [
      ...appConfig.providers,
      // `EXPO_PUBLIC_DEMO=1` swaps the Supabase services for in-memory ones with seed data.
      ...(demoMode ? demoProviders : []),
    ],
  });

  // Re-resolves `light-dark()` and `@media` when the theme or orientation changes.
  watchConditions(app.engine);
  void splashScreen.hideWhenReady(fonts);
});
