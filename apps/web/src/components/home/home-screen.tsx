"use client";

import { useState } from "react";
import { Sheet } from "@/components/ui/sheet";
import { ToolbarButton } from "@/components/ui/toolbar-button";
import { SubscriptionDetail } from "@/components/detail/subscription-detail";
import { SubscriptionFormSheet } from "@/components/form/subscription-form-sheet";
import { Insights } from "@/components/insights/insights";
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

/**
 * Which sheet is open. The detail sheet sits under the edit form, so closing
 * the form goes back to it, like the native sheet stack.
 */
type Open =
  | { sheet: "none" }
  | { sheet: "insights" }
  | { sheet: "detail"; id: string; from?: "insights" }
  | { sheet: "form"; id?: string; name?: string; from?: "detail" };

/** The timeline home screen from the native redesign, with its sheets. */
export function HomeScreen({ subscriptions, categories, email }: Props) {
  const [open, setOpen] = useState<Open>({ sheet: "none" });
  // Bumped on every new form so a reopened sheet starts from a clean state.
  const [formKey, setFormKey] = useState(0);

  const detailId = open.sheet === "detail" || (open.sheet === "form" && open.from === "detail") ? open.id : undefined;
  const detail = subscriptions.find((s) => s.id === detailId);
  const editing = open.sheet === "form" && open.id ? subscriptions.find((s) => s.id === open.id) : undefined;

  function openForm(next: Omit<Extract<Open, { sheet: "form" }>, "sheet">) {
    setFormKey((k) => k + 1);
    setOpen({ sheet: "form", ...next });
  }

  function closeForm() {
    if (open.sheet === "form" && open.from === "detail" && open.id) {
      setOpen({ sheet: "detail", id: open.id });
    } else {
      setOpen({ sheet: "none" });
    }
  }

  return (
    <div className="mx-auto w-full max-w-[640px] px-4 pb-12 sm:px-6">
      <Toolbar
        email={email}
        onInsights={() => setOpen({ sheet: "insights" })}
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
              onClick={() => openForm({ id: detail.id, from: "detail" })}
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
            onDeleted={() => setOpen({ sheet: "none" })}
          />
        ) : null}
      </Sheet>

      {open.sheet === "form" ? (
        <SubscriptionFormSheet
          key={formKey}
          open
          onOpenChange={(next) => !next && closeForm()}
          subscription={editing}
          initialName={open.name}
          categories={categories}
          onSaved={closeForm}
          onDeleted={() => setOpen({ sheet: "none" })}
        />
      ) : null}
    </div>
  );
}
