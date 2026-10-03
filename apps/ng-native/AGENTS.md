# AGENTS.md

This is an Angular app rendering real native iOS and Android views with
[Angular Native](https://ng-native.com): Angular components on React Native's Fabric renderer,
inside an Expo app. It is not a web app and not React: there is no DOM and no JSX. It is a sibling
of `apps/native` (Expo Router + React) and shares its Supabase backend and `packages/shared`.

The whole documentation, for reading before a change: https://ng-native.com/llms-full.txt.

## Commands

```sh
pnpm ng-native start       # Metro; press i or a for a simulator
pnpm ng-native ios         # a development build on the iOS simulator
pnpm ng-native test        # Vitest, in Node against a fake native layer
pnpm ng-native typecheck   # ngc, which checks templates too
```

## Rules that are easy to get wrong

- **Element names are lowercase:** `<view>`, `<text>`, `<pressable>`, `<scroll-view>`,
  `<text-input>`, `<switch>`, `<safe-area-view>`. Each is imported from `@ng-native/components`
  into the component's `imports`. `<View>` compiles to an empty template.
- **There is no DOM.** No `document`, `window`, `<button>`, `<input>`, `@angular/platform-browser`
  or `@angular/animations`.
- **A component's host is a flex item** with no `flex` of its own: a screen sets `:host { flex: 1 }`.
- **Events are native:** `(press)` on `<pressable>`, `[(value)]` or `(changeText)` on `<text-input>`.
- **Signals, zoneless, AOT.** State is signals and `computed()`; nothing updates from a plain
  field changing outside a signal or an event.
- **No backticks inside an inline template**, and no template arrow that reads its own parameter.
- **Styles are CSS**, compiled at build time. Colours come from the tokens in `src/app/theme.css`
  (`var(--foreground)` and friends); they switch with the scheme through `light-dark()`. Shared
  classes (`.rows`, `.row-separator`, `.group`, `.chip`, `.field`) live there too, as the global
  sheet. Where CSS cannot reach (bar buttons, header props, SwiftUI modifiers), use
  `src/app/lib/palette.ts`, which holds the same values.
- **Header buttons are native bar button items.** Put `[leftItems]`/`[rightItems]` on
  `<native-header>` (the `BarItems` directive in `src/app/ui/bar-items.ts`): SF Symbol or title
  buttons, `prominent` buttons and `UIMenu`s, as Expo Router's `Stack.Toolbar` draws them. Don't use
  `<native-header-item>` with custom views for buttons: they never line up with system items.
- **Headers match apps/native:** no bar background (`[translucent]="true"
  backgroundColor="transparent"`) and no large title. Home renders its own title in the content and
  hides iOS 26's scroll edge effect by setting `topScrollEdgeEffect` on its host, which is its
  `RNSScreen`. Put `<native-header>` after the page's scroll view.
- **Presented sheets are stacks of their own.** A presented screen has no native header, so the
  detail, form and insights routes use `SheetStack` (`src/app/ui/sheet-stack.ts`, a bare
  `<native-stack-outlet>`) as their component and the page is its `''` child. Open them through the
  `Sheets` service (`src/app/ui/sheets.ts`). Editing is its own top-level route
  (`subscription/:id/edit`) presented over the detail sheet, as in apps/native; a page that reacts
  to data while covered checks `SCREEN_IN_FRONT` from `@ng-native/device` first.
- **Native controls come from `@expo/ui`:** `<ui-form>`, `<ui-section>`, `<ui-text-field>`,
  `<ui-picker pickerStyle="segmented|menu">` and `<ui-date-picker>`, inside a `<ui-host>`, with
  modifiers from `@expo/ui/swift-ui/modifiers`. Prefer them to hand-drawn chips and fields.
  `<ui-rn-host>` (`src/app/ui/rn-host.ts`) puts ordinary views inside a SwiftUI tree.
- **Brand logos** are the SVGs in `apps/native/assets/brands`, matched by `src/app/lib/brands.ts`
  (a copy of apps/native's) and drawn by `<expo-image>` in `Tile`.
- **A page sets `:host { flex: 1 }`.** Without it the content still draws, but UIKit never sees a
  full-height scroll view and a large title never renders large.
- **Demo mode.** `EXPO_PUBLIC_DEMO=1` swaps `Auth` and `Subscriptions` for the in-memory services
  in `src/app/data/demo.ts`, so every screen can be tried without an account or a backend.
- **The login form is a Signal Form** (`@angular/forms/signals`), with `[formField]` on
  `<text-input>`. The subscription form is SwiftUI's, so it keeps plain signals fed by
  `(textChange)`, and validates on save as apps/native does.
- **Data is services:** `Auth` and `Subscriptions` in `src/app/data` hold the Supabase state as
  signals; screens inject them rather than fetching.
