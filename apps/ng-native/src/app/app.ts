import { Component, effect, inject, untracked } from "@angular/core";
import { SafeAreaProvider } from "@ng-native/components";
import { NativeNavigation, NativeStackOutlet } from "@ng-native/router";
import { Auth } from "./data/auth.ts";

/** The shell: one native stack. Every screen is a route in `app.routes.ts`. */
@Component({
  selector: "app-root",
  imports: [NativeStackOutlet, SafeAreaProvider],
  template: `
    <safe-area-provider>
      <native-stack-outlet />
    </safe-area-provider>
  `,
  styles: `
    :host {
      flex: 1;
    }
  `,
})
export class App {
  constructor() {
    const auth = inject(Auth);
    const navigation = inject(NativeNavigation);

    // Guards only run on navigation. When a session ends some other way (sign-out, account
    // deletion, a refresh token the server rejects), every protected screen and sheet goes, as
    // apps/native's `Stack.Protected` does, rather than staying up with the data it showed.
    let signedIn = false;
    effect(() => {
      if (!auth.ready()) return;
      const user = auth.user();
      if (user) {
        signedIn = true;
      } else if (signedIn) {
        signedIn = false;
        untracked(() => void navigation.reset("/login"));
      }
    });
  }
}
