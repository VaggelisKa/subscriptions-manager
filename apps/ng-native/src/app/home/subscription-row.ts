import { Component, computed, inject, input, output } from "@angular/core";
import type { SubscriptionWithCategory } from "@subscriptions-manager/shared";
import { Pressable, Text, View } from "@ng-native/components";
import { Haptics } from "@ng-native/expo/haptics";
import { formatDueLabel, formatNumber, intervalLabel, intervalSuffix, isDueSoon } from "../lib/format.ts";
import { Tile } from "../ui/tile.ts";

/** A subscription in a group: tile, name, when it is due, price per interval. */
@Component({
  selector: "app-subscription-row",
  imports: [Pressable, Text, Tile, View],
  template: `
    <pressable
      class="row"
      accessibilityRole="button"
      [accessibilityLabel]="label()"
      (press)="press()"
    >
      <app-tile [name]="subscription().name" [color]="subscription().categories?.color_hex" />
      <view class="main">
        <text class="name" [numberOfLines]="1">{{ subscription().name }}</text>
        <text class="meta" [numberOfLines]="1" [attr.data-soon]="soon() ? '' : null">{{
          meta()
        }}</text>
      </view>
      <text class="amount" [numberOfLines]="1" [maxFontSizeMultiplier]="1.4"
        >{{ price() }} kr<text class="suffix">{{ suffix() }}</text></text
      >
    </pressable>
  `,
  styles: `
    .row {
      flex-direction: row;
      align-items: center;
      gap: 12px;
      padding: 11px 14px;
      min-height: 62px;
    }
    .row:active {
      background-color: var(--fill);
    }
    .main {
      flex: 1;
      min-width: 0;
      gap: 1px;
    }
    .name {
      font-weight: 700;
      font-size: 16px;
      line-height: 21px;
    }
    .meta {
      font-weight: 600;
      font-size: 13px;
      line-height: 18px;
      color: var(--muted);
    }
    .meta[data-soon] {
      font-weight: 700;
      color: var(--primary-text);
    }
    .amount {
      flex-shrink: 1;
      font-weight: 800;
      font-size: 16px;
    }
    .suffix {
      font-weight: 600;
      font-size: 12px;
      color: var(--muted);
    }
  `,
})
export class SubscriptionRow {
  private readonly haptics = inject(Haptics);

  readonly subscription = input.required<SubscriptionWithCategory>();
  readonly nextCharge = input.required<Date>();
  /** Replaces the due label under the name (e.g. a category name). */
  readonly metaText = input<string>();
  readonly open = output<void>();

  protected readonly soon = computed(() => !this.metaText() && isDueSoon(this.nextCharge()));
  protected readonly meta = computed(() => this.metaText() ?? formatDueLabel(this.nextCharge()));
  protected readonly price = computed(() => formatNumber(this.subscription().price ?? 0));
  protected readonly suffix = computed(() => intervalSuffix[this.subscription().interval]);
  protected readonly label = computed(
    () =>
      `${this.subscription().name}, ${this.meta()}, ${this.price()} kr ${intervalLabel[this.subscription().interval]}`,
  );

  protected press(): void {
    this.haptics.impact("light");
    this.open.emit();
  }
}
