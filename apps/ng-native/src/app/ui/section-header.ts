import { Component, input } from "@angular/core";
import { Text, View } from "@ng-native/components";

/** A grouped-list section title, with an optional muted total on the right. */
@Component({
  selector: "app-section-header",
  imports: [Text, View],
  template: `
    <view class="section-header">
      <text class="section-title">{{ title() }}</text>
      @if (trailing()) {
        <text class="section-trailing">{{ trailing() }}</text>
      }
    </view>
  `,
})
export class SectionHeader {
  readonly title = input.required<string>();
  readonly trailing = input<string>();
}
