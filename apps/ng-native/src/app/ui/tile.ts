import { Component, computed, inject, input } from "@angular/core";
import { Image } from "react-native";
import { Text, View } from "@ng-native/components";
import { ColorScheme } from "@ng-native/device";
import { ExpoImage } from "@ng-native/expo";
import { findBrand } from "../lib/brands.ts";
import { isHexColor, withAlpha } from "../lib/colors.ts";

/**
 * The logo for well-known subscriptions (see `findBrand`), otherwise a monogram tile: the first
 * letter of the name on a tint of the category colour.
 */
@Component({
  selector: "app-tile",
  imports: [ExpoImage, Text, View],
  template: `
    <view
      class="tile"
      [class.edged]="brand() && dark()"
      [style.width.px]="size()"
      [style.height.px]="size()"
      [style.border-radius.px]="size() * 0.3"
      [style.background-color]="background()"
    >
      @if (logo(); as source) {
        <expo-image
          contentFit="contain"
          [source]="source"
          [style.width.px]="size() * 0.55"
          [style.height.px]="size() * 0.55"
        />
      } @else {
        <text class="letter" [style.font-size.px]="fontSize()" [style.color]="letterColor()">{{
          letter()
        }}</text>
      }
    </view>
  `,
  styles: `
    .tile {
      align-items: center;
      justify-content: center;
    }
    /* Black logos would melt into dark surfaces without an edge. */
    .edged {
      border-width: var(--hairline);
      border-color: rgba(255, 255, 255, 0.18);
    }
    .letter {
      font-weight: 900;
    }
  `,
})
export class Tile {
  private readonly scheme = inject(ColorScheme);

  readonly name = input<string | null>();
  /** Category colour (`#RRGGBB`); falls back to a neutral tile. */
  readonly color = input<string | null>();
  readonly size = input(40);

  protected readonly dark = computed(() => this.scheme.current() === "dark");
  protected readonly brand = computed(() => findBrand(this.name()));
  // `ExpoImage` takes a list of sources, the shape expo-image's own component hands it.
  protected readonly logo = computed(() => {
    const brand = this.brand();
    const source = brand && Image.resolveAssetSource(brand.icon);
    return source ? [source] : null;
  });
  protected readonly letter = computed(() => this.name()?.trim().charAt(0).toUpperCase() || "?");
  protected readonly fontSize = computed(() => Math.round(this.size() * 0.44));
  protected readonly background = computed(
    () =>
      this.brand()?.color ??
      withAlpha(this.color(), this.dark() ? 0.24 : 0.14, "var(--fill)"),
  );
  protected readonly letterColor = computed(() =>
    isHexColor(this.color()) ? this.color()! : "var(--muted)",
  );
}
