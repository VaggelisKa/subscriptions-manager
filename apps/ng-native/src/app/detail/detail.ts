import { Component, computed, effect, inject, input, signal } from "@angular/core";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "@ng-native/components";
import { ColorScheme, Dialogs, SCREEN_IN_FRONT } from "@ng-native/device";
import { Haptics } from "@ng-native/expo/haptics";
import { NativeHeader, NativeNavigation } from "@ng-native/router";
import { format, subDays } from "date-fns";
import { Subscriptions } from "../data/subscriptions.ts";
import { Today } from "../data/today.ts";
import {
  countChargesBetween,
  monthlyEquivalent,
  toLocalDay,
  upcomingChargeDates,
  yearlyEquivalent,
} from "../lib/billing.ts";
import { withAlpha } from "../lib/colors.ts";
import { formatWholeKr, intervalLabel } from "../lib/format.ts";
import { Amount } from "../ui/amount.ts";
import { BarItems, closeItem, type BarItem } from "../ui/bar-items.ts";
import { SectionHeader } from "../ui/section-header.ts";
import { Sheets } from "../ui/sheets.ts";
import { Tile } from "../ui/tile.ts";
import { ChargeTimeline } from "./charge-timeline.ts";

/**
 * One subscription in full, presented as a sheet: price, the next three charges, what has been
 * paid so far, and edit/delete. Edit opens the form as a second sheet over this one.
 */
@Component({
  selector: "app-subscription-detail",
  imports: [
    ActivityIndicator,
    Amount,
    BarItems,
    ChargeTimeline,
    NativeHeader,
    Pressable,
    ScrollView,
    SectionHeader,
    Text,
    Tile,
    View,
  ],
  template: `
    <scroll-view class="screen" contentInsetAdjustmentBehavior="automatic">
      @if (subscription(); as sub) {
        <view class="content">
          <view class="header">
            <app-tile [name]="sub.name" [color]="sub.categories?.color_hex" [size]="60" />
            <view class="header-text">
              <text class="name" [selectable]="true" [numberOfLines]="2">{{ sub.name }}</text>
              @if (sub.categories?.name; as category) {
                <view class="category" [style.background-color]="chipBackground()">
                  <view class="dot" [style.background-color]="chipDot()"></view>
                  <text class="category-label">{{ category }}</text>
                </view>
              }
            </view>
          </view>

          <view class="price">
            <app-amount [value]="sub.price" [size]="44" />
            <text class="price-meta">{{ intervalLabel[sub.interval] }} · {{ equivalent() }}</text>
          </view>

          <app-section-header title="Upcoming charges" />
          <app-charge-timeline [dates]="upcoming()" [price]="sub.price" />

          <view class="group info">
            <view class="info-row">
              <text class="info-label">Tracking since</text>
              <text class="info-value" [selectable]="true">{{ since() }}</text>
            </view>
            @if (paidSoFar(); as paid) {
              <view class="info-row">
                <text class="info-label">Paid so far</text>
                <text class="info-value" [selectable]="true">≈ {{ paid }}</text>
              </view>
            }
          </view>

          <pressable
            class="delete"
            accessibilityRole="button"
            [class.busy]="deleting()"
            [disabled]="deleting()"
            (press)="remove()"
          >
            @if (deleting()) {
              <activity-indicator />
            } @else {
              <text class="delete-label">Delete subscription</text>
            }
          </pressable>
        </view>
      } @else {
        <view class="missing">
          @if (error()) {
            <text class="error-text">Couldn't load this subscription. {{ error() }}</text>
            <pressable accessibilityRole="button" (press)="retry()">
              <text class="retry">Try again</text>
            </pressable>
          } @else {
            <activity-indicator />
          }
        </view>
      }
    </scroll-view>

    <native-header
      title=""
      [leftItems]="leftItems"
      [rightItems]="rightItems()"
    />
  `,
  styles: `
    :host {
      flex: 1;
    }
    .header {
      flex-direction: row;
      align-items: center;
      gap: 14px;
      padding: 8px 4px 0;
    }
    .header-text {
      flex: 1;
      gap: 6px;
      align-items: flex-start;
    }
    .name {
      font-weight: 900;
      font-size: 26px;
      line-height: 31px;
      letter-spacing: -0.5px;
    }
    .category {
      flex-direction: row;
      align-items: center;
      gap: 6px;
      padding: 5px 11px;
      border-radius: 999px;
    }
    .dot {
      width: 8px;
      height: 8px;
      border-radius: 4px;
    }
    .category-label {
      font-weight: 700;
      font-size: 13px;
      line-height: 16px;
    }
    .price {
      padding: 22px 4px 4px;
    }
    .price-meta {
      font-weight: 600;
      font-size: 15px;
      line-height: 20px;
      margin-top: 6px;
      color: var(--muted);
    }
    .info {
      margin-top: 14px;
    }
    .info-row {
      flex-direction: row;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 12px 16px;
    }
    .info-label {
      font-weight: 500;
      font-size: 15.5px;
      line-height: 21px;
    }
    .info-value {
      font-weight: 600;
      font-size: 15.5px;
      line-height: 21px;
      color: var(--muted);
    }
    .delete {
      align-items: center;
      justify-content: center;
      padding: 20px;
      margin-top: 8px;
      min-height: 60px;
    }
    .delete:active,
    .delete.busy {
      opacity: 0.5;
    }
    .delete-label {
      color: var(--destructive);
      font-weight: 700;
      font-size: 16px;
      line-height: 21px;
    }
    .missing {
      align-items: center;
      justify-content: center;
      gap: 12px;
      padding: 96px 24px 24px;
    }
    .error-text {
      font-weight: 600;
      font-size: 15px;
      line-height: 20px;
      text-align: center;
      color: var(--muted);
    }
  `,
})
export class SubscriptionDetail {
  private readonly dialogs = inject(Dialogs);
  private readonly haptics = inject(Haptics);
  private readonly inFront = inject(SCREEN_IN_FRONT);
  private readonly navigation = inject(NativeNavigation);
  private readonly scheme = inject(ColorScheme);
  private readonly sheets = inject(Sheets);
  private readonly store = inject(Subscriptions);
  private readonly today = inject(Today);

  readonly id = input.required<string>();

  protected readonly deleting = signal(false);
  /** Set once we navigate away, so the gone-check below does not pop twice. */
  private leaving = false;

  private readonly loaded = this.store.loaded;
  private readonly loading = this.store.loading;
  protected readonly error = this.store.error;
  protected readonly subscription = computed(() => this.store.find(this.id()));

  protected readonly leftItems: BarItem[] = [
    closeItem(this.navigation),
  ];
  protected readonly rightItems = computed<BarItem[]>(() =>
    this.subscription()
      ? [{ type: "button", title: "Edit", disabled: this.deleting(), press: () => this.edit() }]
      : [],
  );

  constructor() {
    // Only a finished, successful fetch without this id means it is gone (deleted elsewhere):
    // close the sheet. Not while a fetch that may bring the row is still running, and not while
    // the edit sheet is in front, or the pop would close that instead.
    effect(() => {
      const settled = this.loaded() && !this.loading() && !this.error();
      if (this.inFront() && settled && !this.subscription() && !this.leaving) {
        this.leaving = true;
        this.navigation.back();
      }
    });
  }

  protected readonly intervalLabel = intervalLabel;
  protected readonly equivalent = computed(() => {
    const sub = this.subscription();
    if (!sub) return "";
    const price = sub.price ?? 0;
    return sub.interval === "year"
      ? `${formatWholeKr(monthlyEquivalent(price, sub.interval))} a month`
      : `${formatWholeKr(yearlyEquivalent(price, sub.interval))} a year`;
  });
  protected readonly upcoming = computed(() => {
    const sub = this.subscription();
    return sub ? upcomingChargeDates(sub.billed_at, sub.interval, 3, this.today.date()) : [];
  });
  protected readonly since = computed(() => {
    const sub = this.subscription();
    return sub ? format(toLocalDay(sub.created_at), "MMM yyyy") : "";
  });
  /** Charges on the schedule since tracking started, up to yesterday; today's still counts as "to pay". */
  protected readonly paidSoFar = computed(() => {
    const sub = this.subscription();
    if (!sub) return null;
    const count = countChargesBetween(
      sub.billed_at,
      sub.interval,
      toLocalDay(sub.created_at),
      subDays(this.today.date(), 1),
    );
    return count > 0 ? formatWholeKr(count * (sub.price ?? 0)) : null;
  });
  protected readonly chipBackground = computed(() =>
    withAlpha(
      this.subscription()?.categories?.color_hex,
      this.scheme.current() === "dark" ? 0.22 : 0.14,
      "var(--fill)",
    ),
  );
  protected readonly chipDot = computed(
    () => this.subscription()?.categories?.color_hex ?? "var(--faint)",
  );

  protected retry(): void {
    void this.store.reload();
  }

  private edit(): void {
    this.haptics.impact("light");
    this.sheets.edit(this.id());
  }

  protected async remove(): Promise<void> {
    const sub = this.subscription();
    if (!sub) return;
    this.haptics.notify("warning");
    const sure = await this.dialogs.confirm("Delete subscription", {
      message: `Are you sure you want to delete "${sub.name}"?`,
      confirm: "Delete",
      destructive: true,
    });
    if (!sure) return;

    this.deleting.set(true);
    this.leaving = true;
    const result = await this.store.remove(sub.id);
    if (result.error) {
      this.leaving = false;
      this.deleting.set(false);
      await this.dialogs.tell("Error", result.error);
      return;
    }
    this.navigation.back();
  }
}
