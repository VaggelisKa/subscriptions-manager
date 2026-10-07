"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  useTransition,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from "react";
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
import { Kbd } from "@/components/ui/kbd";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Segmented } from "@/components/ui/segmented";
import { SubscriptionTile } from "@/components/ui/subscription-tile";
import { ToolbarButton } from "@/components/ui/toolbar-button";
import { DeleteConfirm } from "@/components/detail/delete-confirm";
import { addNewSubscription, updateSubscription } from "@/lib/actions";
import { monthlyEquivalent, nextChargeDate, today, yearlyEquivalent } from "@/lib/billing";
import { formatNumber, formatWholeKr, intervalName, intervalSuffix } from "@/lib/format";
import { parsePrice, priceInputValue } from "@/lib/price";
import { useHotkeys } from "@/lib/use-hotkeys";
import { cn } from "@/lib/utils";

const INTERVALS = ["week", "month", "year"] as const satisfies IntervalEnum[];
type IntervalEnum = SubscriptionWithCategory["interval"];
const HEX = /^#[0-9a-f]{6}$/i;

/** The pieces the surrounding sheet or panel lays out. */
export type SubscriptionFormParts = {
  title: string;
  /** Header buttons: delete (edits) and, in the sheet, the Save check. */
  actions: ReactNode;
  content: ReactNode;
};

type Props = {
  /**
   * `sheet`: the mobile form sheet (section titles, category dropdown with a
   * default, Save in the header, no autofocus). `panel`: the desktop
   * inspector (field labels, category chips with no default, inline actions
   * that stick to the bottom when the form overflows, Name focused on add).
   */
  variant: "sheet" | "panel";
  /** The subscription being edited; a new one when absent. */
  subscription?: SubscriptionWithCategory;
  /** Prefilled name for a new subscription (quick add). */
  initialName?: string;
  categories: Category[];
  /** Called after a save, with the new row's id after an add. */
  onSaved: (id?: string) => void;
  onCancel?: () => void;
  onDeleted: () => void;
  /** The Name field, so the panel can be refocused from outside. */
  nameRef?: RefObject<HTMLInputElement | null>;
  children: (parts: SubscriptionFormParts) => ReactNode;
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

/** A visible field label in the desktop panel. */
function FieldLabel({ id, htmlFor, children }: { id?: string; htmlFor?: string; children: ReactNode }) {
  return (
    <label id={id} htmlFor={htmlFor} className="block px-4 pb-1.5 pt-[18px] text-[15px] font-bold text-muted-foreground">
      {children}
    </label>
  );
}

/** Category as a row of radio chips: none chosen by default, and clicking the chosen one clears it. */
function CategoryChips({
  labelId,
  categories,
  value,
  onChange,
}: {
  labelId: string;
  categories: Category[];
  value: string;
  onChange: (id: string) => void;
}) {
  const name = useId();
  return (
    <div role="radiogroup" aria-labelledby={labelId} className="flex flex-wrap gap-1.5 rounded-xl bg-surface p-3">
      {categories.map((c) => {
        const checked = c.id === value;
        return (
          <label
            key={c.id}
            className={cn(
              "inline-flex h-8 cursor-pointer select-none items-center gap-[7px] rounded-full px-3 text-[14px] font-bold transition-colors",
              "has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-primary",
              checked ? "bg-surface ring-2 ring-inset ring-primary" : "bg-fill hover:bg-fill/70",
            )}
          >
            <input
              type="radio"
              className="sr-only"
              name={name}
              value={c.id}
              checked={checked}
              onChange={() => onChange(c.id)}
              // A radio can't be unchecked natively; clicking (or Space on) the chosen chip clears it.
              onClick={() => checked && onChange("")}
            />
            <span
              aria-hidden
              className="size-2 rounded-full bg-faint"
              style={HEX.test(c.color_hex) ? { backgroundColor: c.color_hex } : undefined}
            />
            {c.name}
          </label>
        );
      })}
    </div>
  );
}

/** Whether the sticky action bar is pinned over the content (the form overflows the panel). */
function useStuck() {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    // The sentinel sits right after the bar: while it's scrolled out of
    // view, the bar is pinned to the bottom of the panel.
    const observer = new IntersectionObserver(([entry]) => setStuck(!entry.isIntersecting));
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  return { sentinelRef, stuck };
}

/**
 * Add / edit, like the native SwiftUI form: a live preview, then name,
 * category, price and billing (interval, next charge). Holds the form state,
 * validation and submit; `children` lays out the title, header actions and
 * content (a sheet on mobile, the inspector on desktop).
 */
export function SubscriptionForm({
  variant,
  subscription,
  initialName,
  categories,
  onSaved,
  onCancel,
  onDeleted,
  nameRef: nameRefProp,
  children,
}: Props) {
  const formId = useId();
  const panel = variant === "panel";
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
  // New subscriptions default to the first category on mobile (none on
  // desktop, where every category is visible); edits keep "none" as none.
  const [categoryId, setCategoryId] = useState(
    subscription ? (subscription.categories?.id ?? "") : panel ? "" : (categories[0]?.id ?? ""),
  );
  const [error, setError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [saving, startSave] = useTransition();

  const formRef = useRef<HTMLFormElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const localNameRef = useRef<HTMLInputElement>(null);
  const nameRef = nameRefProp ?? localNameRef;
  const { sentinelRef, stuck } = useStuck();

  const parsedPrice = parsePrice(price);
  const category = categories.find((c) => c.id === categoryId);
  const categoryColor = category?.color_hex;

  // Desktop has no on-screen keyboard to pop up: adding starts in Name, an
  // edit focuses the panel. Mobile sheets focus themselves (see `Sheet`).
  useEffect(() => {
    if (!panel) return;
    (isEdit ? panelRef : nameRef).current?.focus({ preventScroll: true });
    // Only when the form opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useHotkeys(
    {
      "Mod+Enter": () => {
        if (saving) return false;
        formRef.current?.requestSubmit();
      },
    },
    panel,
  );

  function submit(formData: FormData) {
    setError(null);
    if (!name.trim()) return setError("Give the subscription a name.");
    if (parsedPrice === null) return setError("Enter a price, like 79 or 79,50.");

    startSave(async () => {
      const result = await (isEdit ? updateSubscription(formData) : addNewSubscription(formData));
      if (result?.success) onSaved("id" in result && typeof result.id === "string" ? result.id : undefined);
      else setError(result?.message ?? "Couldn't save the subscription. Try again.");
    });
  }

  const deleteButton =
    isEdit && !saving ? (
      <ToolbarButton
        aria-label="Delete subscription"
        onClick={() => setConfirmingDelete(true)}
        className={cn("text-destructive", panel && "h-9 min-w-9 [&_svg]:size-[18px]")}
      >
        <Trash2 strokeWidth={2.25} />
      </ToolbarButton>
    ) : null;

  const actions = panel ? (
    deleteButton
  ) : (
    <>
      {deleteButton}
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
  );

  const deleteConfirm =
    isEdit && confirmingDelete ? (
      <DeleteConfirm
        id={subscription.id}
        name={subscription.name}
        onCancel={() => setConfirmingDelete(false)}
        onDeleted={onDeleted}
        cancelOnEscape={panel}
        className="mb-3 mt-1"
      />
    ) : null;

  const hiddenFields = (
    <>
      {isEdit ? <input type="hidden" name="id" value={subscription.id} /> : null}
      <input type="hidden" name="interval" value={interval} />
      <input type="hidden" name="category" value={categoryId} />
      {!isEdit || dateChanged ? (
        <input type="hidden" name="billed_at" value={format(date, "yyyy-MM-dd")} />
      ) : null}
    </>
  );

  const errorMessage = error ? (
    <p role="alert" className="px-4 pt-3 text-[14px] font-semibold leading-[19px] text-destructive">
      {error}
    </p>
  ) : null;

  const intervalControl = (
    <Segmented
      label="Interval"
      options={INTERVALS.map((value) => ({ value, label: intervalName[value] }))}
      value={interval}
      onChange={(next) => {
        setInterval(next);
        // Keep the shown next charge in step with the schedule the
        // server will compute from the unchanged anchor.
        if (subscription && !dateChanged) setDate(nextChargeDate(subscription.billed_at, next));
      }}
    />
  );

  const dateRow = (
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
  );

  if (!panel) {
    return children({
      title: isEdit ? "Edit subscription" : "New subscription",
      actions,
      content: (
        <>
          {deleteConfirm}

          <form id={formId} action={submit} noValidate className="pt-2">
            {hiddenFields}

            <Preview name={name} price={parsedPrice} interval={interval} color={categoryColor} />

            {errorMessage}

            <section aria-labelledby={`${formId}-details`}>
              <SectionTitle id={`${formId}-details`}>Details</SectionTitle>
              <div className="overflow-hidden rounded-xl bg-surface">
                <input
                  ref={nameRef}
                  name="name"
                  aria-label="Name"
                  placeholder="Name"
                  autoComplete="off"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
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
                <div className="p-4 pb-3">{intervalControl}</div>
                <div aria-hidden className="ml-4 h-px bg-separator" />
                {dateRow}
              </div>
            </section>
          </form>
        </>
      ),
    });
  }

  const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);

  return children({
    title: isEdit ? "Edit subscription" : "New subscription",
    actions,
    content: (
      <div ref={panelRef} tabIndex={-1} className="outline-none focus-visible:ring-0 focus-visible:ring-offset-0">
        {deleteConfirm}

        <form ref={formRef} id={formId} action={submit} noValidate>
          {hiddenFields}

          <Preview name={name} price={parsedPrice} interval={interval} color={categoryColor} />

          {errorMessage}

          <FieldLabel htmlFor={`${formId}-name`}>Name</FieldLabel>
          <input
            ref={nameRef}
            id={`${formId}-name`}
            name="name"
            placeholder="e.g. Netflix"
            autoComplete="off"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-[50px] w-full rounded-xl bg-surface px-4 text-[17px] outline-none placeholder:text-faint focus-visible:ring-inset focus-visible:ring-offset-0"
          />

          {categories.length > 0 ? (
            <>
              <FieldLabel id={`${formId}-category`}>
                Category <span className="font-semibold">(optional)</span>
              </FieldLabel>
              <CategoryChips
                labelId={`${formId}-category`}
                categories={categories}
                value={categoryId}
                onChange={setCategoryId}
              />
            </>
          ) : null}

          <FieldLabel htmlFor={`${formId}-price`}>Price</FieldLabel>
          <label className="flex h-[50px] items-center gap-2 rounded-xl bg-surface px-4 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-inset has-[:focus-visible]:ring-primary">
            <input
              id={`${formId}-price`}
              name="price"
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

          <section aria-labelledby={`${formId}-billed`}>
            <h3 id={`${formId}-billed`} className="px-4 pb-1.5 pt-[18px] text-[15px] font-bold text-muted-foreground">
              Billed
            </h3>
            <div className="rounded-xl bg-surface">
              <div className="p-4 pb-3">{intervalControl}</div>
              <div aria-hidden className="ml-4 h-px bg-separator" />
              {dateRow}
            </div>
          </section>

          <div
            className={cn(
              "sticky bottom-0 z-10 -mr-6 flex items-center justify-end gap-2.5 border-t border-transparent bg-background pb-6 pr-6 pt-[18px]",
              stuck && "border-separator pt-3.5",
            )}
          >
            <button
              type="button"
              onClick={onCancel}
              className="h-[38px] rounded-full px-4 text-[15px] font-bold transition-colors hover:bg-fill"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              aria-keyshortcuts={isMac ? "Meta+Enter" : "Control+Enter"}
              className="inline-flex h-[38px] items-center gap-2 rounded-full bg-primary-button pl-3.5 pr-2 text-[15px] font-extrabold text-primary-foreground shadow-float transition-colors hover:bg-primary-button-hover active:bg-primary-button-active disabled:opacity-70"
            >
              {saving ? <Loader2 aria-hidden className="size-[18px] animate-spin" /> : null}
              {isEdit ? "Save changes" : "Add subscription"}
              <Kbd className="bg-primary-foreground/[0.14] text-primary-foreground">{isMac ? "⌘↵" : "Ctrl+↵"}</Kbd>
            </button>
          </div>
          <div ref={sentinelRef} aria-hidden className="h-px" />
        </form>
      </div>
    ),
  });
}
