import { withComponentInputBinding, withRouterConfig } from "@angular/router";
import { provideNativeRouter, withHeaderDefaults } from "@ng-native/router";
import { routes } from "./app.routes.ts";
import { palette as paletteFor } from "./lib/palette.ts";

export const appConfig = {
  providers: [
    provideNativeRouter(
      routes,
      // Route and query params arrive as component inputs: the detail and form screens' `id`, and
      // the quick-add `name`. Sheet pages sit under a `SheetStack` route that owns the `:id`, so
      // they inherit it only with the "always" strategy.
      withComponentInputBinding(),
      withRouterConfig({ paramsInheritanceStrategy: "always" }),
      // Every header matches the page under it and uses the Nunito faces registered from theme.css.
      withHeaderDefaults((scheme) => {
        const palette = paletteFor(scheme);
        return {
          backgroundColor: palette.background,
          titleColor: palette.foreground,
          largeTitleColor: palette.foreground,
          titleFontFamily: "Nunito-800",
          largeTitleFontFamily: "Nunito-900",
          // Bar buttons and the back chevron, as apps/native's `headerTintColor`.
          color: palette.foreground,
          userInterfaceStyle: scheme,
          hideShadow: true,
          largeTitleHideShadow: true,
          backButtonDisplayMode: "minimal",
        };
      }),
    ),
  ],
};
