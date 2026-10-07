"use client";

import { useId, useState, useTransition, type CSSProperties } from "react";
import { format } from "date-fns";
import { Check, ChevronsUpDown, Loader2, Trash2 } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Segmented } from "@/components/ui/segmented";
import { Sheet } from "@/components/ui/sheet";
import { SubscriptionTile } from "@/components/ui/subscription-tile";
import { ToolbarButton } from "@/components/ui/toolbar-button";
import { DeleteConfirm } from "@/components/detail/delete-confirm";
import { addNewSubscription, updateSubscription } from "@/lib/actions";
import { monthlyEquivalent, nextChargeDate, today, yearlyEquivalent } from "@/lib/billing";
import { formatNumber, formatWholeKr, intervalName, intervalSuffix } from "@/lib/format";
import { parsePrice, priceInputValue } from "@/lib/price";
import { cn } from "@/lib/utils";

const INTERVALS = ["week", "month", "year"] as const satisfies IntervalEnum[];
type IntervalEnum = SubscriptionWithCategory["interval"];
const HEX = /^#[0-9a-f]{6}$/i;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The subscription being edited; a new one when absent. */
  subscription?: SubscriptionWithCategory;
  /** Prefilled name for a new subscription (quick add). */
  initialName?: string;
  categories: Category[];
  onSaved: () => void;
  onDeleted: () => void;
};

/** What the subscription will look like in the list, updated as the form is filled in. */
function Preview({
  name,
  price,
  interval,
  color,
}: {
  name: string;
  price: number | null;
  interval: IntervalEnum;
  color: string | null | undefined;
}) {
  const trimmed = name.trim();
  const perMonth = `≈ ${formatWholeKr(monthlyEquivalent(price ?? 0, interval))} a month`;
  const perYear = `${formatWholeKr(yearlyEquivalent(price ?? 0, interval))} a year`;
  const meta =
    price === null
      ? "Add a price to see the yearly cost"
      : interval === "month"
        ? perYear
        : interval === "year"
          ? perMonth
          : `${perMonth} · ${perYear}`;

  return (
    <div aria-hidden className="flex items-center gap-3 rounded-xl bg-surface px-4 py-3.5">
      <SubscriptionTile name={trimmed} color={color} size={44} />
      <div className="flex min-w-0 flex-1 flex-col gap-px">
        <span className={cn("truncate text-[17px] font-bold leading-[22px]", !trimmed && "text-faint")}>
          {trimmed || "New subscription"}
        </span>
        <span className="truncate text-footnote text-muted-foreground">{meta}</span>
      </div>
      <span className="shrink-0 text-[18px] font-extrabold tabular-nums">
        <span className={cn(price === null && "text-faint")}>{formatNumber(price ?? 0)} kr</span>
        <span className="text-footnote text-muted-foreground">{intervalSuffix[interval]}</span>
      </span>
    </div>
  );
}

function SectionTitle({ id, children }: { id: string; children: string }) {
  return (
    <h3 id={id} className="px-4 pb-1.5 pt-5 text-[15px] font-bold text-muted-foreground">
      {children}
    </h3>
  );
}

/**
 * Add / edit as a form sheet, like the native SwiftUI form: a live preview,
 * then Details (name, category), Price and Billed (interval, next charge).
 * Save is the orange check in the header.
 */
export function SubscriptionFormSheet({
  open,
  onOpenChange,
  subscription,
  initialName,
  categories,
  onSaved,
  onDeleted,
}: Props) {
  const formId = useId();
  const isEdit = !!subscription;
  const [name, setName] = useState(subscription?.name ?? initialName ?? "");
  const [price, setPrice] = useState(priceInputValue(subscription?.price));
  const [interval, setInterval] = useState<IntervalEnum>(subscription?.interval ?? "month");
  // An edit shows the next charge, but the stored anchor is only replaced
  // when the date is actually changed (see `updateSubscription`).
  const [date, setDate] = useState<Date>(() =>
    subscription ? nextChargeDate(subscription.billed_at, subscription.interval) : today(),
  );
  const [dateChanged, setDateChanged] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);
  // New subscriptions default to the first category; edits keep "none" as none.
  const [categoryId, setCategoryId] = useState(
    subscription ? (subscription.categories?.id ?? "") : (categories[0]?.id ?? ""),
  );
  const [error, setError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [saving, startSave] = useTransition();

  const parsedPrice = parsePrice(price);
  const category = categories.find((c) => c.id === categoryId);
  const categoryColor = category?.color_hex;

  function submit(formData: FormData) {
    setError(null);
    if (!name.trim()) return setError("Give the subscription a name.");
    if (parsedPrice === null) return setError("Enter a price, like 79 or 79,50.");

    startSave(async () => {
      const result = await (isEdit ? updateSubscription(formData) : addNewSubscription(formData));
      if (result?.success) onSaved();
      else setError(result?.message ?? "Couldn't save the subscription. Try again.");
    });
  }

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? "Edit subscription" : "New subscription"}
      actions={
        <>
          {isEdit && !saving ? (
            <ToolbarButton
              aria-label="Delete subscription"
              onClick={() => setConfirmingDelete(true)}
              className="text-destructive"
            >
              <Trash2 strokeWidth={2.25} />
            </ToolbarButton>
          ) : null}
          <ToolbarButton
            type="submit"
            form={formId}
            variant="prominent"
            aria-label={saving ? "Saving" : "Save"}
            disabled={saving}
          >
            {saving ? <Loader2 className="animate-spin" /> : <Check strokeWidth={2.75} />}
          </ToolbarButton>
        </>
      }
    >
      {isEdit && confirmingDelete ? (
        <DeleteConfirm
          id={subscription.id}
          name={subscription.name}
          onCancel={() => setConfirmingDelete(false)}
          onDeleted={onDeleted}
          className="mb-3 mt-1"
        />
      ) : null}

      <form id={formId} action={submit} noValidate className="pt-2">
        {isEdit ? <input type="hidden" name="id" value={subscription.id} /> : null}
        <input type="hidden" name="interval" value={interval} />
        <input type="hidden" name="category" value={categoryId} />
        {!isEdit || dateChanged ? (
          <input type="hidden" name="billed_at" value={format(date, "yyyy-MM-dd")} />
        ) : null}

        <Preview name={name} price={parsedPrice} interval={interval} color={categoryColor} />

        {error ? (
          <p role="alert" className="px-4 pt-3 text-[14px] font-semibold leading-[19px] text-destructive">
            {error}
          </p>
        ) : null}

        <section aria-labelledby={`${formId}-details`}>
          <SectionTitle id={`${formId}-details`}>Details</SectionTitle>
          <div className="overflow-hidden rounded-xl bg-surface">
            <input
              name="name"
              aria-label="Name"
              placeholder="Name"
              autoComplete="off"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus={!isEdit && !initialName}
              className="h-[52px] w-full bg-transparent px-4 text-[17px] outline-none placeholder:text-faint focus-visible:ring-0 focus-visible:ring-offset-0"
            />
            {categories.length > 0 ? (
              <>
                <div aria-hidden className="ml-4 h-px bg-separator" />
                <DropdownMenu>
                  <DropdownMenuTrigger className="flex h-[52px] w-full items-center gap-2.5 px-4 text-left text-[17px] outline-none focus-visible:bg-fill focus-visible:ring-0 focus-visible:ring-offset-0">
                    <span
                      aria-hidden
                      className="size-2.5 rounded-full bg-faint"
                      style={categoryColor && HEX.test(categoryColor) ? { backgroundColor: categoryColor } : undefined}
                    />
                    <span className="flex-1">Category</span>
                    <span className="flex items-center gap-1 text-muted-foreground">
                      {category?.name ?? "None"}
                      <ChevronsUpDown aria-hidden className="size-4" />
                    </span>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="max-h-[50vh] overflow-y-auto">
                    <DropdownMenuRadioGroup value={categoryId} onValueChange={setCategoryId}>
                      {/* Only edits can be uncategorised; offer "None" just to show that. */}
                      {!category ? <DropdownMenuRadioItem value="">None</DropdownMenuRadioItem> : null}
                      {categories.map((c) => (
                        <DropdownMenuRadioItem key={c.id} value={c.id}>
                          <span
                            aria-hidden
                            className="size-2.5 rounded-full bg-faint"
                            style={HEX.test(c.color_hex) ? ({ backgroundColor: c.color_hex } as CSSProperties) : undefined}
                          />
                          {c.name}
                        </DropdownMenuRadioItem>
                      ))}
                    </DropdownMenuRadioGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : null}
          </div>
        </section>

        <section aria-labelledby={`${formId}-price`}>
          <SectionTitle id={`${formId}-price`}>Price</SectionTitle>
          <label className="flex h-[52px] items-center gap-2 rounded-xl bg-surface px-4 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary">
            <input
              name="price"
              aria-label="Price in kroner"
              inputMode="decimal"
              placeholder="0"
              autoComplete="off"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="min-w-0 flex-1 bg-transparent text-[17px] tabular-nums outline-none placeholder:text-faint focus-visible:ring-0 focus-visible:ring-offset-0"
            />
            <span aria-hidden className="text-[17px] text-muted-foreground">
              kr
            </span>
          </label>
        </section>

        <section aria-labelledby={`${formId}-billed`}>
          <SectionTitle id={`${formId}-billed`}>Billed</SectionTitle>
          <div className="rounded-xl bg-surface">
            <div className="p-4 pb-3">
              <Segmented
                label="Interval"
                options={INTERVALS.map((value) => ({ value, label: intervalName[value] }))}
                value={interval}
                onChange={setInterval}
              />
            </div>
            <div aria-hidden className="ml-4 h-px bg-separator" />
            <div className="flex min-h-[56px] items-center justify-between gap-3 px-4 py-2">
              <span id={`${formId}-date`} className="text-[17px]">
                Next charge
              </span>
              <Popover open={dateOpen} onOpenChange={setDateOpen}>
                <PopoverTrigger
                  aria-labelledby={`${formId}-date ${formId}-date-value`}
                  className="rounded-sm bg-fill px-3 py-1.5 text-[17px] tabular-nums transition-opacity hover:opacity-80"
                >
                  <span id={`${formId}-date-value`}>{format(date, "d MMM yyyy")}</span>
                </PopoverTrigger>
                <PopoverContent align="end">
                  <Calendar
                    mode="single"
                    selected={date}
                    defaultMonth={date}
                    onSelect={(next) => {
                      if (!next) return;
                      setDate(next);
                      setDateChanged(true);
                      setDateOpen(false);
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </section>
      </form>
    </Sheet>
  );
}
