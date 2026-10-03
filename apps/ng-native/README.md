# Subscriptions manager, in Angular Native

An experiment: the native app rebuilt with [Angular Native](https://ng-native.com), so Angular
components render straight onto React Native's Fabric renderer with no React in the render path.
It talks to the same Supabase project as `apps/native` and `apps/web`, reuses
`@subscriptions-manager/shared`, and ports the billing and formatting logic from `apps/native`.

```sh
cp ../native/.env .env          # EXPO_PUBLIC_SUPABASE_URL and the anon key
pnpm ng-native start            # Metro; press i for the iOS simulator
EXPO_PUBLIC_DEMO=1 pnpm ng-native start   # seeded in-memory data, no account needed
pnpm ng-native ios              # a development build on the simulator
pnpm ng-native test             # Vitest, in Node against a fake Fabric: no simulator
pnpm ng-native typecheck        # ngc, which also checks the templates
```

The form, pickers and date picker are SwiftUI views through `@expo/ui`, header buttons are native
bar button items, and brand logos are drawn by `expo-image`, so the app needs a development build
rather than Expo Go. On iOS 26+ the headers and sheets get Liquid Glass chrome, as in apps/native.

## Deploying

It's a separate EAS project from `apps/native`
([`@vaggelis_ka/subscriptions-manager-ng`](https://expo.dev/accounts/vaggelis_ka/projects/subscriptions-manager-ng)),
with its own bundle id (`com.subscriptionsmanager.ng`), so both apps install side by side. Its
`preview` and `production` environments hold the same `EXPO_PUBLIC_*` variables as the React app's.
Run these from `apps/ng-native`:

```sh
eas build -p ios --profile preview      # an internal build, installed from the link EAS prints
eas update --channel preview --environment preview --message "…"   # JS changes over the air
```

`eas.json` pins Node 24, since Angular 22 refuses older Node. There's no `development` profile:
`expo-dev-client` is untested with Angular Native, so use `pnpm ng-native ios` for a dev build.

Note that `apps/native` gained a `@babel/core ^7` devDependency: Angular's compiler brings Babel 8
into the workspace, and without the pin pnpm resolves React Native's Babel peer to it and Metro
fails for the React app.

Known gaps, on purpose for now:

- iOS only. Header buttons and the SwiftUI form have no Android implementation yet.
- `@ng-native/expo` 0.3.0 declares Expo 57 peers; this app runs on Expo 58 to share one React
  Native with `apps/native`. It works on the iOS simulators tested, but upgrades need a smoke test.
- No password recovery or "retry" screen for a failed session restore, both of which apps/native has.
- Billing, formatting and brand matching are copies of apps/native's `src/lib`; a fix in one needs
  the other until they move to `packages/shared`.
- The session lives in AsyncStorage, as in apps/native.

`src/main.ts` mounts `src/app/app.ts`; `src/app/app.routes.ts` lists the screens. See
`AGENTS.md` for how this framework differs from the web Angular you know.
