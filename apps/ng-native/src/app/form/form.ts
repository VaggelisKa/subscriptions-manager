import { Component, computed, effect, inject, input, linkedSignal, signal, untracked } from "@angular/core";
import { PlatformColor } from "react-native";
import type { IntervalEnum } from "@subscriptions-manager/shared";
import { ColorScheme, Dialogs } from "@ng-native/device";
import {
  UiCircle,
  UiDatePicker,
  UiForm,
  UiHStack,
  UiHost,
  UiPicker,
  UiSection,
  UiSlot,
  UiSpacer,
  UiText,
  UiTextField,
  UiVStack,
  type UiTextFieldChangeEvent,
} from "@ng-native/expo/expo-ui-components";
import { Haptics } from "@ng-native/expo/haptics";
import { nativeState } from "@ng-native/expo";
import { NativeHeader, NativeNavigation } from "@ng-native/router";
import {
  background,
  datePickerStyle,
  font,
  foregroundStyle,
  frame,
  keyboardType,
  labelsHidden,
  layoutPriority,
  lineLimit,
  listRowBackground,
  scrollDismissesKeyboard,
  shapes,
  tint,
} from "@expo/ui/swift-ui/modifiers";
import { setHours, setMinutes } from "date-fns";
import { utcToZonedTime } from "date-fns-tz";
import { Subscriptions } from "../data/subscriptions.ts";
import { monthlyEquivalent, nextChargeDate, yearlyEquivalent } from "../lib/billing.ts";
import { findBrand } from "../lib/brands.ts";
import { isHexColor, withAlpha } from "../lib/colors.ts";
import { formatNumber, formatWholeKr, intervalName, intervalSuffix } from "../lib/format.ts";
import { palette } from "../lib/palette.ts";
import { parsePrice, priceToInput, toBilledAt } from "../lib/price.ts";
import { BarItems, type BarItem } from "../ui/bar-items.ts";
import { RnHost } from "../ui/rn-host.ts";
import { Tile } from "../ui/tile.ts";

const INTERVALS: readonly IntervalEnum[] = ["week", "month", "year"];
const TILE = 44;

// Below full height iOS gives form rows a translucent fill meant for the sheet's glass; pin them
// to the solid colour they have at full height.
const ROW_MODIFIERS = [listRowBackground(PlatformColor("secondarySystemGroupedBackground"))];

/**
 * Adding or editing a subscription, presented as a sheet: SwiftUI's `Form` through `@expo/ui`, as
 * in apps/native. `id` is set when editing; `name` arrives from the empty state's quick add.
 */
@Component({
  selector: "app-subscription-form",
  imports: [
    BarItems,
    NativeHeader,
    RnHost,
    Tile,
    UiCircle,
    UiDatePicker,
    UiForm,
    UiHStack,
    UiHost,
    UiPicker,
    UiSection,
    UiSlot,
    UiSpacer,
    UiText,
    UiTextField,
    UiVStack,
  ],
  template: `
    <ui-host class="form">
      <ui-form [modifiers]="formModifiers">
        <ui-section [modifiers]="rowModifiers">
          <ui-hstack [spacing]="12">
            @if (brand()) {
              <ui-rn-host>
                <app-tile [name]="trimmedName()" [color]="selectedColor()" [size]="tile" />
              </ui-rn-host>
            } @else {
              <ui-text [text]="monogram()" [modifiers]="monogramModifiers()" />
            }
            <ui-vstack alignment="leading" [spacing]="1">
              <ui-text [text]="trimmedName() || 'New subscription'" [modifiers]="nameModifiers()" />
              <ui-text [text]="previewMeta()" [modifiers]="metaModifiers()" />
            </ui-vstack>
            <ui-spacer />
            <ui-hstack [spacing]="0" alignment="firstTextBaseline" [modifiers]="priceStackModifiers">
              <ui-text [text]="previewPrice()" [modifiers]="priceModifiers()" />
              <ui-text [text]="suffix()" [modifiers]="metaModifiers()" />
            </ui-hstack>
          </ui-hstack>
        </ui-section>

        <ui-section title="Details" [modifiers]="rowModifiers">
          <ui-text-field [text]="nameText" placeholder="Name" (textChange)="typedName($event)" />
          @if (categories().length > 0) {
            <ui-picker
              pickerStyle="menu"
              [options]="categoryOptions()"
              [value]="categoryId()"
              (valueChange)="chooseCategory($event)"
              [modifiers]="categoryModifiers"
            >
              <ui-slot name="label">
                <ui-hstack [spacing]="10">
                  <ui-circle [modifiers]="dotModifiers()" />
                  <ui-text text="Category" />
                </ui-hstack>
              </ui-slot>
            </ui-picker>
          }
        </ui-section>

        <ui-section title="Price" [modifiers]="rowModifiers">
          <ui-hstack>
            <ui-text-field
              [text]="priceText"
              placeholder="0"
              [modifiers]="priceFieldModifiers"
              (textChange)="typedPrice($event)"
            />
            <ui-text text="kr" [modifiers]="secondary" />
          </ui-hstack>
        </ui-section>

        <ui-section title="Billed" [modifiers]="rowModifiers">
          <ui-picker
            label="Interval"
            pickerStyle="segmented"
            [options]="intervalOptions"
            [value]="interval()"
            (valueChange)="chooseInterval($event)"
            [modifiers]="hiddenLabel"
          />
          <ui-date-picker
            title="Next charge"
            [displayedComponents]="['date']"
            [modifiers]="compactDate"
            [(value)]="billedAt"
          />
        </ui-section>
      </ui-form>
    </ui-host>

    <native-header
      [title]="title()"
      [translucent]="true"
      backgroundColor="transparent"
      [leftItems]="leftItems"
      [rightItems]="rightItems()"
    />
  `,
  styles: `
    :host {
      flex: 1;
      /* systemGroupedBackground, solid from the first detent. */
      background-color: light-dark(#f2f2f7, #000000);
    }
    .form {
      flex: 1;
    }
  `,
})
export class SubscriptionForm {
  private readonly dialogs = inject(Dialogs);
  private readonly haptics = inject(Haptics);
  private readonly navigation = inject(NativeNavigation);
  private readonly scheme = inject(ColorScheme);
  private readonly store = inject(Subscriptions);

  /** Set only when editing; its absence is what makes this the "new subscription" form. */
  readonly id = input<string>();
  /** A name to start from, from the empty state's quick add (`?name=`). */
  readonly presetName = input<string>(undefined, { alias: "name" });

  protected readonly tile = TILE;
  protected readonly categories = this.store.categories;
  protected readonly saving = signal(false);

  protected readonly editing = computed(() => this.store.find(this.id() ?? ""));
  protected readonly title = computed(() => (this.editing() ? "Edit subscription" : "New subscription"));

  // What the SwiftUI fields hold. They write these on the UI thread; `textChange` mirrors each
  // edit into the signals below, which are what the preview and save read.
  protected readonly nameText = nativeState("");
  protected readonly priceText = nativeState("");
  protected readonly name = signal("");
  protected readonly price = signal("");

  protected readonly interval = linkedSignal<IntervalEnum>(() => this.editing()?.interval ?? "month");
  // New subscriptions default to the first category; edits keep "none" as none.
  protected readonly categoryId = linkedSignal(() => {
    const sub = this.editing();
    if (sub) return sub.categories?.id ?? "";
    return this.categories()[0]?.id ?? "";
  });
  /**
   * A stale `billed_at` is shown as its next charge (keeping the stored time of day), but only
   * written back if the user picks a date: the web app's cron advances `billed_at` itself.
   */
  private readonly initialBilledAt = computed(() => {
    const sub = this.editing();
    if (!sub) return new Date();
    const stored = utcToZonedTime(sub.billed_at, "Europe/Copenhagen");
    const next = nextChargeDate(sub.billed_at, sub.interval);
    return setMinutes(setHours(next, stored.getHours()), stored.getMinutes());
  });
  protected readonly billedAt = linkedSignal<Date | null>(() => this.initialBilledAt());

  // --- the preview row ---------------------------------------------------------------------
  protected readonly trimmedName = computed(() => this.name().trim());
  protected readonly parsedPrice = computed(() => parsePrice(this.price()));
  protected readonly selectedColor = computed(
    () => this.categories().find((c) => c.id === this.categoryId())?.color_hex ?? null,
  );
  protected readonly brand = computed(() => findBrand(this.trimmedName()));
  protected readonly monogram = computed(() => this.trimmedName().charAt(0).toUpperCase() || "?");
  protected readonly previewPrice = computed(() => `${formatNumber(this.parsedPrice() ?? 0)} kr`);
  protected readonly suffix = computed(() => intervalSuffix[this.interval()]);
  protected readonly previewMeta = computed(() => {
    const price = this.parsedPrice();
    const interval = this.interval();
    if (price === null) return "Add a price to see the yearly cost";
    const perMonth = `≈ ${formatWholeKr(monthlyEquivalent(price, interval))} a month`;
    const perYear = `${formatWholeKr(yearlyEquivalent(price, interval))} a year`;
    return interval === "month" ? perYear : interval === "year" ? perMonth : `${perMonth} · ${perYear}`;
  });

  private readonly colors = computed(() => palette(this.scheme.current()));
  // SwiftUI looks fonts up by PostScript name, not by the `Nunito-700` alias CSS registers.
  protected readonly monogramModifiers = computed(() => {
    const color = this.selectedColor();
    const dark = this.scheme.current() === "dark";
    return [
      font({ family: "Nunito-Black", size: Math.round(TILE * 0.44) }),
      foregroundStyle(isHexColor(color) ? color : this.colors().muted),
      frame({ width: TILE, height: TILE }),
      background(
        withAlpha(color, dark ? 0.24 : 0.14, this.colors().fill),
        shapes.roundedRectangle({ cornerRadius: TILE * 0.3 }),
      ),
    ];
  });
  protected readonly nameModifiers = computed(() => [
    font({ family: "Nunito-Bold", size: 17 }),
    lineLimit(1),
    foregroundStyle(this.trimmedName() ? this.colors().foreground : this.colors().faint),
  ]);
  protected readonly metaModifiers = computed(() => [
    font({ family: "Nunito-SemiBold", size: 13 }),
    lineLimit(1),
    foregroundStyle(this.colors().muted),
  ]);
  protected readonly priceModifiers = computed(() => [
    font({ family: "Nunito-ExtraBold", size: 18 }),
    lineLimit(1),
    foregroundStyle(this.parsedPrice() === null ? this.colors().faint : this.colors().foreground),
  ]);
  protected readonly dotModifiers = computed(() => {
    const color = this.selectedColor();
    return [frame({ width: 10, height: 10 }), foregroundStyle(isHexColor(color) ? color : "gray")];
  });

  // --- static modifiers and options ---------------------------------------------------------
  protected readonly formModifiers = [scrollDismissesKeyboard("immediately")];
  protected readonly rowModifiers = ROW_MODIFIERS;
  protected readonly priceStackModifiers = [layoutPriority(1)];
  protected readonly priceFieldModifiers = [keyboardType("decimal-pad")];
  protected readonly secondary = [foregroundStyle({ type: "hierarchical", style: "secondary" })];
  protected readonly hiddenLabel = [labelsHidden()];
  protected readonly compactDate = [datePickerStyle("compact")];
  // Without a tint the value is black at first and turns blue once picked.
  protected readonly categoryModifiers = [tint(PlatformColor("secondaryLabel"))];
  protected readonly intervalOptions = INTERVALS.map((value) => ({ value, label: intervalName[value] }));
  protected readonly categoryOptions = computed(() => [
    // Only edits can be uncategorised; offer "None" just to show that.
    ...(this.categories().some((c) => c.id === this.categoryId()) ? [] : [{ value: "", label: "None" }]),
    ...this.categories().map((c) => ({ value: c.id, label: c.name ?? "" })),
  ]);

  // --- the bar ------------------------------------------------------------------------------
  protected readonly leftItems: BarItem[] = [
    { type: "button", icon: "xmark", label: "Close", press: () => this.navigation.back() },
  ];
  protected readonly rightItems = computed<BarItem[]>(() => {
    const colors = this.colors();
    const items: BarItem[] = [];
    if (this.editing() && !this.saving()) {
      items.push({
        type: "button",
        icon: "trash",
        label: "Delete subscription",
        tint: colors.destructive,
        press: () => void this.remove(),
      });
    }
    items.push({
      type: "button",
      icon: "checkmark",
      label: "Save",
      variant: "prominent",
      tint: colors.primary,
      disabled: this.saving(),
      press: () => void this.save(),
    });
    return items;
  });

  constructor() {
    // Fill the fields once, as soon as there is something to fill them with: the row being
    // edited (which may still be loading), or the quick-add name.
    let filled = false;
    effect(() => {
      if (filled) return;
      const sub = this.editing();
      if (this.id() && !sub) return;
      filled = true;
      const name = sub?.name ?? this.presetName() ?? "";
      const price = sub ? priceToInput(sub.price) : "";
      untracked(() => {
        this.name.set(name);
        this.price.set(price);
        this.nameText?.set(name);
        this.priceText?.set(price);
      });
    });
  }

  protected typedName(event: UiTextFieldChangeEvent): void {
    this.name.set(event.nativeEvent.value);
  }

  protected typedPrice(event: UiTextFieldChangeEvent): void {
    this.price.set(event.nativeEvent.value);
  }

  protected chooseInterval(value: string | number | null): void {
    this.haptics.select();
    this.interval.set(value as IntervalEnum);
  }

  protected chooseCategory(value: string | number | null): void {
    this.haptics.select();
    this.categoryId.set(String(value ?? ""));
  }

  private async save(): Promise<void> {
    const name = this.trimmedName();
    const price = this.parsedPrice();
    if (!name) {
      await this.dialogs.tell("Error", "Name of subscription is required");
      return;
    }
    if (price === null) {
      await this.dialogs.tell("Error", "Price of subscription should be given");
      return;
    }

    const sub = this.editing();
    const picked = this.billedAt();
    const dateChanged =
      picked !== null && picked.toDateString() !== this.initialBilledAt().toDateString();
    const categoryId = this.categoryId();

    this.saving.set(true);
    const payload = {
      name,
      price,
      interval: this.interval(),
      billed_at: sub && !dateChanged ? sub.billed_at : toBilledAt(picked ?? new Date()),
      ...(categoryId ? { category_id: categoryId } : {}),
    };
    const result = sub ? await this.store.update(sub.id, payload) : await this.store.add(payload);
    this.saving.set(false);

    if (result.error) {
      await this.dialogs.tell("Error", result.error);
      return;
    }
    this.haptics.notify("success");
    this.navigation.back();
  }

  private async remove(): Promise<void> {
    const sub = this.editing();
    if (!sub) return;
    const sure = await this.dialogs.confirm("Delete subscription", {
      message: `Are you sure you want to delete "${sub.name}"?`,
      confirm: "Delete",
      destructive: true,
    });
    if (!sure) return;
    this.saving.set(true);
    const result = await this.store.remove(sub.id);
    this.saving.set(false);
    if (result.error) {
      await this.dialogs.tell("Error", result.error);
      return;
    }
    this.haptics.notify("success");
    // This sheet sits on top of the detail sheet; close both.
    void this.navigation.popTo("/");
  }
}
