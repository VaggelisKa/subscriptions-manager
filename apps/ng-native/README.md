# Subscriptions manager, in Angular Native

An experiment: the native app rebuilt with [Angular Native](https://ng-native.com), so Angular
components render straight onto React Native's Fabric renderer with no React in the render path.
It talks to the same Supabase project as `apps/native` and `apps/web`, and reuses
`@subscriptions-manager/shared` plus the billing and formatting logic from `apps/native`.

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

Note that `apps/native` gained a `@babel/core ^7` devDependency: Angular's compiler brings Babel 8
into the workspace, and without the pin pnpm resolves React Native's Babel peer to it and Metro
fails for the React app.

`src/main.ts` mounts `src/app/app.ts`; `src/app/app.routes.ts` lists the screens. See
`AGENTS.md` for how this framework differs from the web Angular you know.
