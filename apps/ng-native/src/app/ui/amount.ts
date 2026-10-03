import { Component, computed, input } from "@angular/core";
import { Text } from "@ng-native/components";
import { formatNumber, formatWholeNumber } from "../lib/format.ts";

/** A display amount: heavy number, smaller muted currency after it. */
@Component({
  selector: "app-amount",
  imports: [Text],
  template: `
    <text
      class="amount"
      [selectable]="true"
      [numberOfLines]="1"
      [adjustsFontSizeToFit]="true"
      [maxFontSizeMultiplier]="1.2"
      [style.font-size.px]="size()"
      [style.line-height.px]="lineHeight()"
      [style.letter-spacing.px]="letterSpacing()"
      >{{ number() }}<text class="unit" [style.font-size.px]="unitSize()">{{ unit() }}</text></text
    >
  `,
  styles: `
    .amount {
      font-weight: 900;
    }
    .unit {
      font-weight: 800;
      letter-spacing: 0;
      color: var(--muted);
    }
  `,
})
export class Amount {
  readonly value = input.required<number>();
  /** Font size of the number; the "kr" suffix is set at about a third. */
  readonly size = input(46);
  /** Round to whole kroner (totals, normalised amounts). */
  readonly whole = input(false);
  /** Trailing muted text after "kr", e.g. "/ month". */
  readonly trailing = input<string>();

  protected readonly number = computed(() =>
    this.whole() ? formatWholeNumber(this.value()) : formatNumber(this.value()),
  );
  protected readonly unit = computed(() => ` kr${this.trailing() ? ` ${this.trailing()}` : ""}`);
  protected readonly lineHeight = computed(() => Math.round(this.size() * 1.1));
  protected readonly letterSpacing = computed(() => -this.size() * 0.035);
  protected readonly unitSize = computed(() => Math.max(13, Math.round(this.size() * 0.36)));
}
