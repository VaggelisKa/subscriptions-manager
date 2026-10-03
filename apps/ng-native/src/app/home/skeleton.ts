import { Component } from "@angular/core";
import { View } from "@ng-native/components";

/** Loading placeholder mirroring the home layout: summary, day strip and a group of rows. */
@Component({
  selector: "app-skeleton",
  imports: [View],
  template: `
    <view [accessible]="true" accessibilityRole="progressbar" accessibilityLabel="Loading subscriptions">
      <view class="summary">
        <view class="block amount"></view>
        <view class="block line"></view>
      </view>
      <view class="strip">
        @for (cell of cells; track $index) {
          <view class="block cell"></view>
        }
      </view>
      <view class="header">
        <view class="block" [style.width.px]="110" [style.height.px]="18"></view>
        <view class="block" [style.width.px]="48" [style.height.px]="13"></view>
      </view>
      <view class="rows">
        @for (width of rows; track $index) {
          @if (!$first) {
            <view class="row-separator"></view>
          }
          <view class="row">
            <view class="block tile"></view>
            <view class="row-main">
              <view class="block" [style.width.px]="width" [style.height.px]="15"></view>
              <view class="block" [style.width.px]="64" [style.height.px]="12"></view>
            </view>
            <view class="block" [style.width.px]="64" [style.height.px]="15"></view>
          </view>
        }
      </view>
    </view>
  `,
  styles: `
    .block {
      border-radius: 6px;
      background-color: var(--fill);
    }
    .summary {
      padding: 4px 4px 0;
      gap: 12px;
    }
    .amount {
      width: 210px;
      height: 46px;
      border-radius: 12px;
    }
    .line {
      width: 230px;
      height: 14px;
    }
    .strip {
      flex-direction: row;
      gap: 6px;
      margin: 18px -16px 0;
      padding: 0 16px;
      overflow: hidden;
    }
    .cell {
      width: 40px;
      height: 58px;
      border-radius: 14px;
    }
    .header {
      flex-direction: row;
      justify-content: space-between;
      align-items: center;
      padding: 24px 6px 8px;
    }
    .row {
      flex-direction: row;
      align-items: center;
      gap: 12px;
      padding: 11px 14px;
      min-height: 62px;
    }
    .row-main {
      flex: 1;
      gap: 6px;
    }
    .tile {
      width: 40px;
      height: 40px;
      border-radius: 12px;
    }
  `,
})
export class Skeleton {
  protected readonly cells = Array.from({ length: 9 });
  protected readonly rows = [150, 110, 130, 90];
}
