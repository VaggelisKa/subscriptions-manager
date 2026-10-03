import { Component, inject } from "@angular/core";
import { Pressable, Text, View } from "@ng-native/components";
import { Haptics } from "@ng-native/expo/haptics";
import { Sheets } from "../ui/sheets.ts";

const QUICK_ADD = ["Netflix", "Spotify", "Viaplay", "TV 2 Play"];

/** No subscriptions yet: placeholder rows, a call to action and a few names to start from. */
@Component({
  selector: "app-empty-state",
  imports: [Pressable, Text, View],
  template: `
    <view class="ghosts" [accessibilityElementsHidden]="true" importantForAccessibility="no-hide-descendants">
      @for (ghost of ghosts; track $index; let first = $first) {
        <view class="ghost" [style.opacity]="ghost">
          <view class="ghost-tile" [class.plus]="first">
            @if (first) {
              <text class="plus-glyph">+</text>
            }
          </view>
          <view class="ghost-lines">
            <view class="bar" [style.width]="first ? '60%' : '50%'" [style.height.px]="10"></view>
            <view class="bar short" [style.height.px]="8"></view>
          </view>
          <view class="bar amount" [style.height.px]="10"></view>
        </view>
      }
    </view>

    <view class="copy">
      <text class="heading" accessibilityRole="header">Track your first subscription</text>
      <text class="body muted">
        Add what you pay for and see what's due next, and what it adds up to each month.
      </text>
    </view>

    <pressable class="button add" accessibilityRole="button" (press)="sheets.add()">
      <text class="button-label">Add subscription</text>
    </pressable>

    <text class="quick-title">Quick add</text>
    <view class="quick">
      @for (name of quickAdd; track name) {
        <pressable
          class="chip"
          accessibilityRole="button"
          [accessibilityLabel]="'Add ' + name"
          (press)="quick(name)"
        >
          <text class="chip-label">+ {{ name }}</text>
        </pressable>
      }
    </view>
  `,
  styles: `
    :host {
      padding-top: 8px;
    }
    .ghosts {
      gap: 8px;
      margin-bottom: 22px;
    }
    .ghost {
      flex-direction: row;
      align-items: center;
      gap: 12px;
      padding: 11px 14px;
      border-radius: 20px;
      background-color: var(--surface);
    }
    .ghost-tile {
      width: 38px;
      height: 38px;
      border-radius: 11.4px;
      align-items: center;
      justify-content: center;
      background-color: var(--fill);
    }
    .ghost-tile.plus {
      background-color: var(--primary-soft);
    }
    .plus-glyph {
      font-weight: 900;
      font-size: 22px;
      line-height: 26px;
      color: var(--primary-text);
    }
    .ghost-lines {
      flex: 1;
      gap: 6px;
    }
    .bar {
      border-radius: 5px;
      background-color: var(--fill);
    }
    .bar.short {
      width: 30%;
      border-radius: 4px;
    }
    .bar.amount {
      width: 44px;
    }
    .copy {
      gap: 8px;
      padding: 0 4px;
    }
    .heading {
      font-weight: 900;
      font-size: 24px;
      line-height: 28px;
      letter-spacing: -0.5px;
    }
    .add {
      margin: 22px 0 18px;
    }
    .quick-title {
      font-weight: 700;
      font-size: 13px;
      line-height: 18px;
      color: var(--muted);
      padding: 0 4px 8px;
    }
    .quick {
      flex-direction: row;
      flex-wrap: wrap;
      gap: 8px;
    }
  `,
})
export class EmptyState {
  private readonly haptics = inject(Haptics);
  protected readonly sheets = inject(Sheets);

  protected readonly ghosts = [1, 0.6, 0.3];
  protected readonly quickAdd = QUICK_ADD;

  protected quick(name: string): void {
    this.haptics.select();
    this.sheets.add(name);
  }
}
