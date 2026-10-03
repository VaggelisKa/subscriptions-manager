import { Component, computed, inject, input } from "@angular/core";
import { ColorScheme } from "@ng-native/device";
import { UiHost, UiImage } from "@ng-native/expo/expo-ui-components";

/** An SF Symbol, drawn by SwiftUI through @expo/ui: `<app-symbol name="xmark" />`. */
@Component({
  selector: "app-symbol",
  imports: [UiHost, UiImage],
  template: `
    <ui-host class="host" [matchContents]="true">
      <ui-image [systemName]="name()" [size]="size()" [color]="tint()" />
    </ui-host>
  `,
  styles: `
    :host {
      align-items: center;
      justify-content: center;
    }
    .host {
      min-width: 20px;
      min-height: 20px;
    }
  `,
})
export class Symbol {
  private readonly scheme = inject(ColorScheme);

  readonly name = input.required<string>();
  readonly size = input(17);
  /** Defaults to the primary text colour of the current scheme. */
  readonly color = input<string>();

  protected readonly tint = computed(
    () =>
      this.color() ?? (this.scheme.current() === "dark" ? "hsl(27, 96%, 61%)" : "hsl(17.5, 88.3%, 40.4%)"),
  );
}
