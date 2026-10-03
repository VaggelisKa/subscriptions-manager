import { Component, computed, input } from "@angular/core";
import { Text, View } from "@ng-native/components";
import { differenceInCalendarDays } from "date-fns";
import { today } from "../lib/billing.ts";
import { formatDayDate, formatDueLabel, formatKr, isDueSoon } from "../lib/format.ts";

/** Next charges as a vertical timeline: a dot and a connecting line per row. */
@Component({
  selector: "app-charge-timeline",
  imports: [Text, View],
  template: `
    <view class="timeline">
      @for (row of rows(); track row.key; let last = $last) {
        <view class="row">
          @if (!last) {
            <view class="line"></view>
          }
          <view class="dot" [class.first]="row.first"></view>
          <text class="date" [numberOfLines]="1">{{ row.date }}</text>
          <text class="trailing" [class.soon]="row.soon">{{ row.trailing }}</text>
        </view>
      }
    </view>
  `,
  styles: `
    .timeline {
      padding: 4px 0;
      border-radius: 22px;
      background-color: var(--surface);
    }
    .row {
      flex-direction: row;
      align-items: center;
      gap: 12px;
      padding: 10px 16px;
    }
    .line {
      position: absolute;
      left: 20px;
      width: 2px;
      top: 50%;
      bottom: -50%;
      background-color: var(--separator);
    }
    .dot {
      width: 10px;
      height: 10px;
      border-radius: 5px;
      border-width: 2.5px;
      border-color: var(--primary);
      background-color: var(--surface);
    }
    .dot.first {
      background-color: var(--primary);
    }
    .date {
      flex: 1;
      font-weight: 500;
      font-size: 15px;
      line-height: 20px;
    }
    .trailing {
      font-weight: 700;
      font-size: 15px;
      line-height: 20px;
      color: var(--muted);
    }
    .trailing.soon {
      color: var(--primary-text);
    }
  `,
})
export class ChargeTimeline {
  readonly dates = input.required<Date[]>();
  readonly price = input.required<number>();

  protected readonly rows = computed(() =>
    this.dates().map((date, i) => {
      const first = i === 0;
      // "in 3 days" only while it's close; a far-off date would just repeat the left column.
      const showDue = first && differenceInCalendarDays(date, today()) <= 7;
      return {
        key: date.getTime(),
        first,
        date: formatDayDate(date),
        soon: first && isDueSoon(date),
        trailing: showDue ? formatDueLabel(date) : formatKr(this.price()),
      };
    }),
  );
}
