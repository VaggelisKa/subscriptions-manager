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
      // As apps/native: no bar background (the glass buttons float over the page) and the Nunito
      // faces registered from theme.css.
      withHeaderDefaults((scheme) => {
        const palette = paletteFor(scheme);
        return {
          translucent: true,
          backgroundColor: "transparent",
          titleColor: palette.foreground,
          titleFontFamily: "Nunito-800",
          // Bar buttons and the back chevron, as apps/native's `headerTintColor`.
          color: palette.foreground,
          userInterfaceStyle: scheme,
          hideShadow: true,
          backButtonDisplayMode: "minimal",
        };
      }),
    ),
  ],
};
