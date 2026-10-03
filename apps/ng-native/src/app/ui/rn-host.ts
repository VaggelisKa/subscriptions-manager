import { Component } from "@angular/core";
import { registerExpoView } from "@ng-native/expo";

/**
 * `@expo/ui`'s `RNHostView`: ordinary views inside a SwiftUI tree, sized to their content. Angular
 * Native registers the other `ExpoUI` views but not this one, so it is registered here. Call
 * `registerRnHost()` once at startup.
 */
@Component({
  selector: "ui-rn-host",
  template: `<ng-content />`,
  host: {
    "[matchContentsHorizontal]": "true",
    "[matchContentsVertical]": "true",
    "[expoInternalSizeFromChildren]": "true",
    "[layoutRoot]": "false",
  },
})
export class RnHost {}

export function registerRnHost(): void {
  registerExpoView("ui-rn-host", "ExpoUI", { viewName: "RNHostView" });
}
