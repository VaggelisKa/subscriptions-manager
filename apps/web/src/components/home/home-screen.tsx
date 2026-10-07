"use client";

import { useState } from "react";
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

type Props = {
  subscriptions: SubscriptionWithCategory[];
  categories: Category[];
  email: string | undefined;
};

type Detail = { id: string; from?: "insights" };

/**
 * Which sheet is open. Like the native sheet stack, closing the edit form
 * goes back to the detail sheet it came from, and closing that detail goes
 * back to Insights when it was opened from there.
 */
type Open = { sheet: "none" } | { sheet: "insights" } | ({ sheet: "detail" } & Detail) | { sheet: "form" };

/** What the form sheet shows; kept after it closes so it can animate out with its content. */
type Form = { id?: string; name?: string; /** The detail sheet to go back to. */ back?: Detail };

/** The timeline home screen from the native redesign, with its sheets. */
export function HomeScreen({ subscriptions, categories, email }: Props) {
  const [open, setOpen] = useState<Open>({ sheet: "none" });
  const [form, setForm] = useState<Form>({});
  // Bumped on every new form so a reopened sheet starts from a clean state.
  const [formKey, setFormKey] = useState(0);
  // Kept here so returning from a subscription's detail restores the same Insights view.
  const [insightsView, setInsightsView] = useState<InsightsView>(initialInsightsView);

  const detailId = open.sheet === "detail" ? open.id : open.sheet === "form" ? form.back?.id : undefined;
  const detail = subscriptions.find((s) => s.id === detailId);
  const editing = form.id ? subscriptions.find((s) => s.id === form.id) : undefined;

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

  return (
    <div className="mx-auto w-full max-w-[640px] px-4 pb-12 sm:px-6">
      <Toolbar
        email={email}
        onInsights={() => {
          setInsightsView(initialInsightsView);
          setOpen({ sheet: "insights" });
        }}
        onAdd={() => openForm({})}
      />

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
        open={open.sheet === "insights"}
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
        open={open.sheet === "detail" && !!detail}
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
        open={open.sheet === "form"}
        onOpenChange={(next) => !next && closeForm()}
        subscription={editing}
        initialName={form.name}
        categories={categories}
        onSaved={closeForm}
        onDeleted={() => afterDelete(form.back?.from)}
      />
    </div>
  );
}
