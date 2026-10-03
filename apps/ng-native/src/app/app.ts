import { Component } from "@angular/core";
import { SafeAreaProvider } from "@ng-native/components";
import { NativeStackOutlet } from "@ng-native/router";

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
export class App {}
