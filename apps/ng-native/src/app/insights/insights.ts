import { Component, computed, inject, signal } from "@angular/core";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "@ng-native/components";
import { ColorScheme } from "@ng-native/device";
import { UiHost, UiPicker } from "@ng-native/expo/expo-ui-components";
import { Haptics } from "@ng-native/expo/haptics";
import { labelsHidden } from "@expo/ui/swift-ui/modifiers";
import { NativeHeader, NativeNavigation } from "@ng-native/router";
import { Subscriptions } from "../data/subscriptions.ts";
import { nextChargeDate, totalPerMonth } from "../lib/billing.ts";
import { withAlpha } from "../lib/colors.ts";
import { formatWholeKr, formatWholeNumber, intervalSuffix } from "../lib/format.ts";
import { palette } from "../lib/palette.ts";
import { periodFactor, spendByCategory, type CategorySpend, type Period } from "../lib/spend-by-category.ts";
import { SubscriptionRow } from "../home/subscription-row.ts";
import { Amount } from "../ui/amount.ts";
import { BarItems, type BarItem } from "../ui/bar-items.ts";
import { Sheets } from "../ui/sheets.ts";
import { Symbol } from "../ui/symbol.ts";

const PERIODS = [
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "year", label: "Year" },
] as const;

/** Where the money goes: spend per period, a bar by category, and each category's rows. */
@Component({
  selector: "app-insights",
  imports: [
    ActivityIndicator,
    Amount,
    BarItems,
    NativeHeader,
    Pressable,
    ScrollView,
    SubscriptionRow,
    Symbol,
    Text,
    UiHost,
    UiPicker,
    View,
  ],
  template: `
    <scroll-view class="screen" contentInsetAdjustmentBehavior="automatic">
      <view class="content">
        @if (!loaded() && subscriptions().length === 0) {
          <activity-indicator class="loading" />
        } @else if (subscriptions().length === 0) {
          <text class="muted-line centered">Add a subscription to see where your money goes.</text>
        } @else {
          <ui-host class="periods">
            <ui-picker
              label="Period"
              pickerStyle="segmented"
              [modifiers]="hiddenLabel"
              [options]="periods"
              [value]="period()"
              (valueChange)="choose($event)"
            />
          </ui-host>

          <view class="total">
            <text class="muted-line strong">Spend per {{ period() }}</text>
            <app-amount [value]="total()" [size]="42" [whole]="true" />
            @if (period() !== "year") {
              <text class="muted-line next">{{ yearly() }} over the next 12 months</text>
            }
          </view>

          <view class="bar" accessibilityRole="image" accessibilityLabel="Spend by category">
            @for (c of visible(); track c.key) {
              <view class="segment" [style.flex-grow]="c.share" [style.background-color]="c.color ?? 'var(--faint)'"></view>
            }
          </view>

          <view class="list">
            @for (c of categories(); track c.key; let first = $first) {
              <view>
                @if (!first) {
                  <view class="separator category-inset"></view>
                }
                <pressable
                  class="category"
                  accessibilityRole="button"
                  [accessibilityState]="{ expanded: isExpanded(c.key) }"
                  [accessibilityLabel]="categoryLabel(c)"
                  (press)="toggle(c.key)"
                >
                  <view class="swatch-tile" [style.background-color]="swatchTile(c)">
                    <view class="swatch" [style.background-color]="c.color ?? 'var(--faint)'"></view>
                  </view>
                  <view class="main">
                    <text class="name" [numberOfLines]="1">{{ c.name }}</text>
                    <text class="meta">{{ share(c) }}% of spend</text>
                  </view>
                  <text class="amount">{{ amount(c) }} kr<text class="suffix">{{ suffix() }}</text></text>
                  <app-symbol
                    class="chevron"
                    [class.open]="isExpanded(c.key)"
                    name="chevron.down"
                    [size]="11"
                    [color]="faint()"
                  />
                </pressable>
                @if (isExpanded(c.key)) {
                  @for (s of c.subscriptions; track s.id) {
                    <view class="separator row-inset"></view>
                    <app-subscription-row
                      [subscription]="s"
                      [nextCharge]="next(s)"
                      (open)="sheets.detail(s.id)"
                    />
                  }
                }
              </view>
            }
          </view>
        }
      </view>
    </scroll-view>

    <native-header
      title="Insights"
      [translucent]="true"
      backgroundColor="transparent"
      [leftItems]="leftItems"
    />
  `,
  styles: `
    :host {
      flex: 1;
    }
    .loading {
      margin-top: 48px;
    }
    .muted-line {
      font-weight: 600;
      font-size: 14px;
      line-height: 19px;
      color: var(--muted);
    }
    .centered {
      text-align: center;
      margin-top: 48px;
    }
    /* A segmented control's own height; the host has none until SwiftUI has laid out. */
    .periods {
      height: 32px;
      margin: 6px 0 18px;
    }
    .total {
      padding: 0 4px;
    }
    .strong {
      font-weight: 700;
    }
    .next {
      margin-top: 4px;
    }
    .bar {
      flex-direction: row;
      gap: 3px;
      height: 14px;
      margin: 18px 4px;
    }
    .segment {
      flex-basis: 0;
      min-width: 4px;
      border-radius: 6px;
    }
    .list {
      border-radius: 22px;
      overflow: hidden;
      background-color: var(--surface);
    }
    /* Inset to line up with the text of the row below. */
    .separator {
      height: var(--hairline);
      background-color: var(--separator);
    }
    .category-inset {
      margin-left: 54px;
    }
    .row-inset {
      margin-left: 66px;
    }
    .category {
      flex-direction: row;
      align-items: center;
      gap: 12px;
      padding: 11px 14px;
      min-height: 58px;
    }
    .category:active {
      background-color: var(--fill);
    }
    .swatch-tile {
      width: 28px;
      height: 28px;
      border-radius: 8px;
      align-items: center;
      justify-content: center;
    }
    .swatch {
      width: 10px;
      height: 10px;
      border-radius: 3px;
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
    .amount {
      font-weight: 800;
      font-size: 16px;
    }
    .suffix {
      font-weight: 600;
      font-size: 12px;
      color: var(--muted);
    }
    .chevron {
      margin-left: -2px;
      transition: transform 240ms;
    }
    .chevron.open {
      transform: rotate(180deg);
    }
  `,
})
export class Insights {
  private readonly haptics = inject(Haptics);
  private readonly navigation = inject(NativeNavigation);
  private readonly scheme = inject(ColorScheme);
  private readonly store = inject(Subscriptions);
  protected readonly sheets = inject(Sheets);

  protected readonly periods = PERIODS;
  protected readonly hiddenLabel = [labelsHidden()];
  protected readonly period = signal<Period>("month");
  protected readonly expanded = signal<readonly string[]>([]);

  protected readonly loaded = this.store.loaded;
  protected readonly subscriptions = this.store.subscriptions;
  protected readonly monthly = computed(() => totalPerMonth(this.subscriptions()));
  protected readonly total = computed(() => this.monthly() * periodFactor[this.period()]);
  protected readonly yearly = computed(() => formatWholeKr(this.monthly() * 12));
  protected readonly categories = computed(() => spendByCategory(this.subscriptions()));
  // Shares don't depend on the period, so the bar is static when the period changes.
  protected readonly visible = computed(() => this.categories().filter((c) => c.share > 0));
  protected readonly suffix = computed(() => intervalSuffix[this.period()]);
  protected readonly faint = computed(() => palette(this.scheme.current()).faint);

  protected readonly leftItems: BarItem[] = [
    { type: "button", icon: "xmark", label: "Close", press: () => this.navigation.back() },
  ];

  protected choose(value: string | number | null): void {
    if (value === this.period()) return;
    this.haptics.select();
    this.period.set(value as Period);
  }

  protected isExpanded(key: string): boolean {
    return this.expanded().includes(key);
  }

  protected toggle(key: string): void {
    this.haptics.impact("light");
    this.expanded.update((keys) =>
      keys.includes(key) ? keys.filter((k) => k !== key) : [...keys, key],
    );
  }

  protected amount(c: CategorySpend): string {
    return formatWholeNumber(c.monthly * periodFactor[this.period()]);
  }

  protected share(c: CategorySpend): number {
    return Math.round(c.share * 100);
  }

  protected categoryLabel(c: CategorySpend): string {
    return `${c.name}, ${this.share(c)}% of spend, ${this.amount(c)} kr per ${this.period()}`;
  }

  protected swatchTile(c: CategorySpend): string {
    return withAlpha(c.color, this.scheme.current() === "dark" ? 0.24 : 0.14, "var(--fill)");
  }

  protected next(s: CategorySpend["subscriptions"][number]): Date {
    return nextChargeDate(s.billed_at, s.interval);
  }
}
