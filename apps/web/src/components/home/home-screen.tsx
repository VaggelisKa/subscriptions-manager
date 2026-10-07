"use client";

import { useEffect, useRef, useState } from "react";
import { Sheet } from "@/components/ui/sheet";
import { ToolbarButton } from "@/components/ui/toolbar-button";
import { SubscriptionDetail } from "@/components/detail/subscription-detail";
import { SubscriptionFormSheet } from "@/components/form/subscription-form-sheet";
import { Insights, initialInsightsView, type InsightsView } from "@/components/insights/insights";
import { DayStrip } from "@/components/home/day-strip";
import { EmptyState } from "@/components/home/empty-state";
import { MonthlySummary } from "@/components/home/monthly-summary";
import { TimelineList } from "@/components/home/timeline-list";
import { Toolbar } from "@/components/home/toolbar";
import { DesktopEmpty } from "@/components/desktop/desktop-empty";
import { Inspector, type InspectorMode } from "@/components/desktop/inspector";
import { Ledger, ledgerGroups, type LedgerSort } from "@/components/desktop/ledger";
import { OverviewRail } from "@/components/desktop/overview-rail";
import { TopBar } from "@/components/desktop/top-bar";
import { useHotkeys } from "@/lib/use-hotkeys";
import { useMediaQuery } from "@/lib/use-media-query";
import { cn } from "@/lib/utils";

type Props = {
  subscriptions: SubscriptionWithCategory[];
  categories: Category[];
  email: string | undefined;
};

type Detail = { id: string; from?: "insights" };

/**
 * Which sheet is open. Like the native sheet stack, closing the edit form
 * goes back to the detail sheet it came from, and closing that detail goes
 * back to Insights when it was opened from there. On desktop the same state
 * drives the docked inspector instead (see `InspectorMode`).
 */
type Open = { sheet: "none" } | { sheet: "insights" } | ({ sheet: "detail" } & Detail) | { sheet: "form" };

/** What the form sheet shows; kept after it closes so it can animate out with its content. */
type Form = { id?: string; name?: string; /** The detail sheet to go back to. */ back?: Detail };

/** How long a newly added row's tint flashes. */
const FLASH_MS = 1200;

/**
 * The timeline home screen from the native redesign, with its sheets. From
 * 1024px wide it's a desktop workspace instead: top bar, overview rail,
 * ledger and a docked inspector. Both trees are rendered and toggled with
 * CSS so there's no flash on load; open state only renders in one of them.
 */
export function HomeScreen({ subscriptions, categories, email }: Props) {
  const [open, setOpen] = useState<Open>({ sheet: "none" });
  const [form, setForm] = useState<Form>({});
  // Bumped on every new form so a reopened sheet starts from a clean state.
  const [formKey, setFormKey] = useState(0);
  // Kept here so returning from a subscription's detail restores the same Insights view.
  const [insightsView, setInsightsView] = useState<InsightsView>(initialInsightsView);

  const isDesktop = useMediaQuery("(min-width: 1024px)");
  // Wide enough to keep the rail beside an open inspector.
  const wide = useMediaQuery("(min-width: 1440px)");
  const [sort, setSort] = useState<LedgerSort>("next");
  const [filterDay, setFilterDay] = useState<Date | null>(null);
  // The detail whose inline delete confirmation is showing (desktop, so ⌫ can open it).
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [flashId, setFlashId] = useState<string | null>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  // An empty account starts with the add form open; closing it shows the empty state's button.
  const [emptyFormClosed, setEmptyFormClosed] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const urlRead = useRef(false);

  const detailId = open.sheet === "detail" ? open.id : open.sheet === "form" ? form.back?.id : undefined;
  const detail = subscriptions.find((s) => s.id === detailId);
  const editing = form.id ? subscriptions.find((s) => s.id === form.id) : undefined;

  const hasSubscriptions = subscriptions.length > 0;
  const mode: InspectorMode | null = !isDesktop
    ? null
    : open.sheet === "insights"
      ? { kind: "insights" }
      : open.sheet === "detail"
        ? { kind: "detail", id: open.id, back: open.from }
        : open.sheet === "form"
          ? form.id
            ? { kind: "edit", id: form.id }
            : { kind: "add", name: form.name }
          : !hasSubscriptions && !emptyFormClosed
            ? { kind: "add" }
            : null;
  const selectedId = mode?.kind === "detail" || mode?.kind === "edit" ? mode.id : undefined;
  const showRail = hasSubscriptions && (!mode || wide);

  const groups = ledgerGroups(subscriptions, sort, filterDay);
  const order = groups.flatMap((g) => g.items.map((i) => i.subscription.id));
  const index = mode?.kind === "detail" ? order.indexOf(mode.id) : -1;

  function openForm(next: Form) {
    setFormKey((k) => k + 1);
    setForm(next);
    setOpen({ sheet: "form" });
  }

  function closeForm() {
    setOpen(form.back ? { sheet: "detail", ...form.back } : { sheet: "none" });
  }

  /** After a delete the detail is gone: back to Insights if that's where it was opened. */
  function afterDelete(from: Detail["from"]) {
    setOpen(from === "insights" ? { sheet: "insights" } : { sheet: "none" });
  }

  function openInsights() {
    setInsightsView(initialInsightsView);
    setOpen({ sheet: "insights" });
  }

  function showDetail(id: string, from?: Detail["from"]) {
    setConfirmDeleteId(null);
    setOpen({ sheet: "detail", id, from });
  }

  /** The top bar's Add (and `N`): opens add mode, or returns to Name if it's already open. */
  function addOrFocus() {
    if (mode?.kind === "add") nameRef.current?.focus();
    else openForm({});
  }

  function startEdit() {
    if (mode?.kind !== "detail" || !detail) return false;
    openForm({ id: mode.id, back: { id: mode.id, from: mode.back } });
  }

  function cancelForm() {
    if (mode?.kind !== "add") return closeForm();
    setEmptyFormClosed(true);
    setOpen({ sheet: "none" });
  }

  /** Moves the selection through the ledger (visible order); `↓` with nothing selected starts at the top. */
  function step(delta: 1 | -1) {
    if (mode && mode.kind !== "detail" && mode.kind !== "insights") return false;
    const next = index === -1 ? (delta === 1 ? order[0] : undefined) : order[index + delta];
    if (!next) return false;
    showDetail(next);
  }

  function afterPanelSave(id?: string) {
    if (mode?.kind === "edit") return closeForm();
    if (!id) return setOpen({ sheet: "none" });
    showDetail(id);
    clearTimeout(flashTimer.current);
    setFlashId(id);
    flashTimer.current = setTimeout(() => setFlashId(null), FLASH_MS);
  }

  /** After a delete on desktop, the next row (or the previous one if it was last) takes its place. */
  function afterPanelDelete() {
    const from = mode?.kind === "detail" ? mode.back : form.back?.from;
    setConfirmDeleteId(null);
    if (from === "insights") return setOpen({ sheet: "insights" });
    const i = selectedId ? order.indexOf(selectedId) : -1;
    const next = i === -1 ? undefined : (order[i + 1] ?? order[i - 1]);
    setOpen(next ? { sheet: "detail", id: next } : { sheet: "none" });
  }

  /** Esc closes the topmost layer (Radix menus and popovers handle their own). */
  function escape() {
    if (mode?.kind === "detail" && confirmDeleteId === mode.id) return setConfirmDeleteId(null);
    if (mode?.kind === "edit" || mode?.kind === "add") return cancelForm();
    if (mode?.kind === "detail" && mode.back === "insights") return setOpen({ sheet: "insights" });
    if (mode) return setOpen({ sheet: "none" });
    if (filterDay) return setFilterDay(null);
    return false;
  }

  function confirmDelete() {
    if (mode?.kind !== "detail" || !detail) return false;
    setConfirmDeleteId(mode.id);
  }

  useHotkeys(
    {
      n: addOrFocus,
      ArrowDown: () => step(1),
      ArrowUp: () => step(-1),
      e: startEdit,
      Backspace: confirmDelete,
      Delete: confirmDelete,
      Escape: escape,
    },
    isDesktop,
  );

  // Desktop mirrors the open detail or edit to `?s=<id>`, and reopens it on load.
  const urlId = selectedId ?? null;
  useEffect(() => {
    if (!isDesktop) return;
    if (!urlRead.current) {
      urlRead.current = true;
      const id = new URLSearchParams(window.location.search).get("s");
      if (id && subscriptions.some((s) => s.id === id)) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- the URL is only readable after hydration
        setOpen({ sheet: "detail", id });
        return;
      }
    }
    const url = new URL(window.location.href);
    if (urlId) url.searchParams.set("s", urlId);
    else url.searchParams.delete("s");
    if (url.href !== window.location.href) window.history.replaceState(null, "", url);
  }, [isDesktop, urlId, subscriptions]);

  useEffect(() => () => clearTimeout(flashTimer.current), []);

  return (
    <>
      <div className="mx-auto w-full max-w-[640px] px-4 pb-12 sm:px-6 lg:hidden">
        <Toolbar email={email} onInsights={openInsights} onAdd={() => openForm({})} />

        <h1 className="mb-3 px-1 text-large-title">Subscriptions</h1>

        {subscriptions.length === 0 ? (
          <EmptyState onAdd={(name) => openForm({ name })} />
        ) : (
          <>
            <MonthlySummary subscriptions={subscriptions} />
            <DayStrip subscriptions={subscriptions} />
            <TimelineList
              subscriptions={subscriptions}
              onSelect={(id) => setOpen({ sheet: "detail", id })}
            />
          </>
        )}

        <Sheet
          open={!isDesktop && open.sheet === "insights"}
          onOpenChange={(next) => !next && setOpen({ sheet: "none" })}
          title="Insights"
        >
          <Insights
            subscriptions={subscriptions}
            onSelect={(id) => setOpen({ sheet: "detail", id, from: "insights" })}
            view={insightsView}
            onViewChange={setInsightsView}
          />
        </Sheet>

        <Sheet
          open={!isDesktop && open.sheet === "detail" && !!detail}
          onOpenChange={(next) => {
            if (next) return;
            setOpen(open.sheet === "detail" && open.from === "insights" ? { sheet: "insights" } : { sheet: "none" });
          }}
          title={detail?.name ?? "Subscription"}
          hideTitle
          actions={
            detail ? (
              <ToolbarButton
                className="px-4"
                onClick={() =>
                  openForm({
                    id: detail.id,
                    back: { id: detail.id, from: open.sheet === "detail" ? open.from : undefined },
                  })
                }
              >
                Edit
              </ToolbarButton>
            ) : null
          }
        >
          {detail ? (
            <SubscriptionDetail
              key={detail.id}
              subscription={detail}
              onDeleted={() => afterDelete(open.sheet === "detail" ? open.from : undefined)}
            />
          ) : null}
        </Sheet>

        <SubscriptionFormSheet
          key={formKey}
          open={!isDesktop && open.sheet === "form"}
          onOpenChange={(next) => !next && closeForm()}
          subscription={editing}
          initialName={form.name}
          categories={categories}
          onSaved={closeForm}
          onDeleted={() => afterDelete(form.back?.from)}
        />
      </div>

      <div className="hidden lg:block">
        <TopBar
          email={email}
          insightsOpen={mode?.kind === "insights"}
          onInsights={() => (mode?.kind === "insights" ? setOpen({ sheet: "none" }) : openInsights())}
          onAdd={addOrFocus}
        />
        <div
          className={cn(
            "mx-auto grid h-[calc(100dvh-64px)] max-w-[1600px] grid-rows-[minmax(0,1fr)] gap-6 px-6 pt-2 xl:gap-7 xl:px-8",
            showRail && mode && "grid-cols-[300px_minmax(0,1fr)_400px]",
            showRail && !mode && "grid-cols-[272px_minmax(0,1fr)] xl:grid-cols-[300px_minmax(0,1fr)]",
            !showRail && mode && "grid-cols-[minmax(0,1fr)_400px]",
            !showRail && !mode && "grid-cols-1",
          )}
        >
          {showRail ? (
            <OverviewRail
              className="overflow-y-auto pb-8"
              subscriptions={subscriptions}
              selectedId={selectedId}
              filterDay={filterDay}
              onSelectSubscription={(id) => showDetail(id)}
              onFilterDay={setFilterDay}
            />
          ) : null}

          {hasSubscriptions ? (
            <Ledger
              className="overflow-y-auto pb-10"
              groups={groups}
              total={subscriptions.length}
              selectedId={selectedId}
              flashId={flashId}
              onSelect={(id) => showDetail(id)}
              sort={sort}
              onSortChange={setSort}
              filterDay={filterDay}
              onClearFilter={() => setFilterDay(null)}
            />
          ) : (
            <div className="min-h-0 overflow-y-auto pb-10">
              <DesktopEmpty
                formOpen={mode?.kind === "add"}
                onAdd={(name) => (name ? openForm({ name }) : addOrFocus())}
              />
            </div>
          )}

          {mode ? (
            <Inspector
              className="-mt-2"
              mode={mode}
              subscriptions={subscriptions}
              categories={categories}
              formKey={formKey}
              nameRef={nameRef}
              onClose={() => setOpen({ sheet: "none" })}
              onBack={() => setOpen({ sheet: "insights" })}
              onEdit={startEdit}
              onPrevious={index > 0 ? () => step(-1) : undefined}
              onNext={
                (index === -1 ? order.length > 0 : index < order.length - 1) ? () => step(1) : undefined
              }
              confirmingDelete={mode.kind === "detail" && confirmDeleteId === mode.id}
              onConfirmingDeleteChange={(confirming) => setConfirmDeleteId(confirming ? selectedId ?? null : null)}
              onDeleted={afterPanelDelete}
              onSaved={afterPanelSave}
              onCancelForm={cancelForm}
              insightsView={insightsView}
              onInsightsViewChange={setInsightsView}
              onSelectFromInsights={(id) => showDetail(id, "insights")}
            />
          ) : null}
        </div>
      </div>
    </>
  );
}
