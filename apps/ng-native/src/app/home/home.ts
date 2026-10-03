import { Component, ElementRef, Renderer2, computed, inject, signal } from "@angular/core";
import { Pressable, RefreshControl, ScrollView, Text, View } from "@ng-native/components";
import { Dialogs } from "@ng-native/device";
import { Haptics } from "@ng-native/expo/haptics";
import { NativeHeader } from "@ng-native/router";
import { Auth } from "../data/auth.ts";
import { Subscriptions } from "../data/subscriptions.ts";
import { Theme } from "../data/theme.ts";
import { Today } from "../data/today.ts";
import { bucketByTime, scheduleSubscriptions } from "../lib/billing.ts";
import { formatWholeKr } from "../lib/format.ts";
import { BarItems, type BarItem } from "../ui/bar-items.ts";
import { SectionHeader } from "../ui/section-header.ts";
import { Sheets } from "../ui/sheets.ts";
import { DayStrip } from "./day-strip.ts";
import { EmptyState } from "./empty-state.ts";
import { MonthlySummary } from "./monthly-summary.ts";
import { Skeleton } from "./skeleton.ts";
import { SubscriptionRow } from "./subscription-row.ts";

/**
 * The home screen: the monthly total, a strip of upcoming days, then every subscription grouped by
 * when it is next charged. As in apps/native the bar has no title and no background: its glass
 * buttons float over the content, and the page's own title scrolls away under them.
 */
@Component({
  selector: "app-home",
  imports: [
    BarItems,
    DayStrip,
    EmptyState,
    MonthlySummary,
    NativeHeader,
    Pressable,
    RefreshControl,
    ScrollView,
    SectionHeader,
    Skeleton,
    SubscriptionRow,
    Text,
    View,
  ],
  template: `
    <scroll-view class="screen" contentInsetAdjustmentBehavior="automatic">
      <refresh-control [(refreshing)]="refreshing" (refresh)="refresh()" />
      <view class="content">
        <text class="title page-title" accessibilityRole="header">Subscriptions</text>
        @switch (status()) {
          @case ("loading") {
            <app-skeleton />
          }
          @case ("error") {
            <view class="failed">
              <text class="body muted">Couldn't load your subscriptions. {{ error() }}</text>
              <pressable accessibilityRole="button" (press)="retry()">
                <text class="retry">Try again</text>
              </pressable>
            </view>
          }
          @case ("empty") {
            <app-empty-state />
          }
          @case ("ready") {
          <app-monthly-summary [subscriptions]="subscriptions()" />
          <app-day-strip [subscriptions]="subscriptions()" />

          @if (error(); as error) {
            <text class="error refresh-error">Couldn't refresh. {{ error }}</text>
          }

          @for (bucket of buckets(); track bucket.key) {
            <app-section-header [title]="bucket.title" [trailing]="bucket.total" />
            <view class="rows">
              @for (item of bucket.items; track item.subscription.id) {
                @if (!$first) {
                  <view class="row-separator"></view>
                }
                <app-subscription-row
                  [subscription]="item.subscription"
                  [nextCharge]="item.nextCharge"
                  (open)="sheets.detail(item.subscription.id)"
                />
              }
            </view>
          }
          }
        }
      </view>
    </scroll-view>

    <native-header
      [leftItems]="leftItems"
      [rightItems]="rightItems()"
    />
  `,
  styles: `
    :host {
      flex: 1;
    }
    .page-title {
      padding: 0 4px;
      margin-bottom: 12px;
    }
    .refresh-error {
      padding: 12px 4px 0;
    }
    .failed {
      gap: 12px;
      padding: 32px 4px 0;
    }
  `,
})
export class Home {
  private readonly auth = inject(Auth);
  private readonly dialogs = inject(Dialogs);
  private readonly haptics = inject(Haptics);
  private readonly store = inject(Subscriptions);
  private readonly theme = inject(Theme);
  private readonly today = inject(Today);
  protected readonly sheets = inject(Sheets);

  protected readonly subscriptions = this.store.subscriptions;
  protected readonly error = this.store.error;
  protected readonly refreshing = signal(false);
  private readonly deleting = signal(false);

  protected readonly status = this.store.status;
  protected readonly buckets = computed(() => {
    const today = this.today.date();
    return bucketByTime(scheduleSubscriptions(this.subscriptions(), today), today).map((bucket) => ({
      ...bucket,
      total: formatWholeKr(bucket.items.reduce((acc, i) => acc + (i.subscription.price ?? 0), 0)),
    }));
  });

  protected readonly leftItems: BarItem[] = [
    { type: "button", icon: "chart.bar.fill", label: "Insights", press: () => this.sheets.insights() },
  ];
  protected readonly rightItems = computed<BarItem[]>(() => {
    const dark = this.theme.current() === "dark";
    return [
      { type: "button", icon: "plus", label: "Add subscription", press: () => this.add() },
      {
        type: "menu",
        icon: "ellipsis",
        label: "More options",
        items: [
          {
            type: "action",
            title: dark ? "Light mode" : "Dark mode",
            icon: dark ? "sun.max.fill" : "moon.fill",
            press: () => this.theme.toggle(),
          },
          {
            type: "section",
            items: [
              {
                type: "action",
                title: "Sign out",
                icon: "rectangle.portrait.and.arrow.right",
                destructive: true,
                // The shell (`app.ts`) takes every screen down once the session is gone.
                press: () => void this.auth.signOut(),
              },
              {
                type: "action",
                title: "Delete account",
                icon: "trash",
                destructive: true,
                disabled: this.deleting(),
                press: () => void this.deleteAccount(),
              },
            ],
          },
        ],
      },
    ];
  });

  constructor() {
    // The page's host element is its `RNSScreen`. Without a bar background, iOS 26's blur under
    // the bar would be the only thing there, so it goes too (apps/native's `scrollEdgeEffects`).
    inject(Renderer2).setProperty(inject(ElementRef).nativeElement, "topScrollEdgeEffect", "hidden");
  }

  protected async refresh(): Promise<void> {
    this.refreshing.set(true);
    try {
      await this.store.reload();
    } finally {
      this.refreshing.set(false);
    }
  }

  protected retry(): void {
    void this.store.reload();
  }

  private add(): void {
    this.haptics.impact("medium");
    this.sheets.add();
  }

  private async deleteAccount(): Promise<void> {
    this.haptics.notify("warning");
    const sure = await this.dialogs.confirm("Delete account", {
      message:
        "This will permanently delete your account and all your subscriptions. This action cannot be undone.",
      confirm: "Delete",
      destructive: true,
    });
    if (!sure) return;

    this.deleting.set(true);
    const result = await this.auth.deleteAccount();
    this.deleting.set(false);
    if (result.error) {
      this.haptics.notify("error");
      await this.dialogs.tell("Error", result.error);
      return;
    }
    this.haptics.notify("success");
  }
}
