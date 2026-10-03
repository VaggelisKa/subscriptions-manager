import { Component } from "@angular/core";
import { NativeStackOutlet } from "@ng-native/router";

/**
 * A presented sheet that is a stack of its own. A presented screen has no native header, but the
 * pages pushed inside this outlet do, so each sheet page declares a `<native-header>` and gets
 * the platform's bar (Liquid Glass on iOS 26) and a real back button when it pushes a child.
 */
@Component({
  selector: "app-sheet-stack",
  imports: [NativeStackOutlet],
  template: `<native-stack-outlet />`,
  styles: `
    :host {
      flex: 1;
    }
  `,
})
export class SheetStack {}
