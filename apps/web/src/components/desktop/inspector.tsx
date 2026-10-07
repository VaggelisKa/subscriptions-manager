"use client";

import type { ComponentProps, ReactNode, RefObject } from "react";
import { ChevronDown, ChevronLeft, ChevronUp, Pencil, X } from "lucide-react";
import { ToolbarButton } from "@/components/ui/toolbar-button";
import { SubscriptionDetail } from "@/components/detail/subscription-detail";
import { SubscriptionForm } from "@/components/form/subscription-form";
import { Insights, type InsightsView } from "@/components/insights/insights";
import { cn } from "@/lib/utils";

/** What the docked inspector shows. */
export type InspectorMode =
  | { kind: "detail"; id: string; back?: "insights" }
  | { kind: "edit"; id: string }
  | { kind: "add"; name?: string }
  | { kind: "insights" };

/** The inspector's 36px glass header buttons. */
function PanelButton({ className, ...props }: ComponentProps<typeof ToolbarButton>) {
  return (
    <ToolbarButton
      className={cn("h-9 min-w-9 gap-[7px] px-2.5 text-[15px] font-bold [&_svg]:size-[18px]", className)}
      {...props}
    />
  );
}

/** Close on the left, an optional centred title, actions on the right. */
function Header({ start, title, actions }: { start: ReactNode; title?: string; actions?: ReactNode }) {
  return (
    <div className="grid shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-2 pb-2.5 pr-6 pt-4">
      <div className="justify-self-start">{start}</div>
      {title ? (
        <h2 className="truncate text-center text-[17px] font-extrabold leading-[22px]">{title}</h2>
      ) : (
        <span aria-hidden />
      )}
      <div className="flex items-center gap-2 justify-self-end">{actions}</div>
    </div>
  );
}

function Body({ children, form = false }: { children: ReactNode; form?: boolean }) {
  return (
    // Forms pad their own bottom so their sticky actions sit flush with the panel's edge.
    <div className={cn("min-h-0 flex-1 overflow-y-auto overscroll-contain pr-6", !form && "pb-6")}>{children}</div>
  );
}

const close = (onClose: () => void) => (
  <PanelButton aria-label="Close" onClick={onClose}>
    <X strokeWidth={2.4} />
  </PanelButton>
);

type Props = {
  mode: InspectorMode;
  subscriptions: SubscriptionWithCategory[];
  categories: Category[];
  /** Remounts the form for each new add or edit. */
  formKey: number;
  nameRef: RefObject<HTMLInputElement | null>;
  onClose: () => void;
  /** Detail opened from Insights: back to it. */
  onBack: () => void;
  onEdit: () => void;
  /** Previous / next row in ledger order; absent at the ends. */
  onPrevious?: () => void;
  onNext?: () => void;
  confirmingDelete: boolean;
  onConfirmingDeleteChange: (confirming: boolean) => void;
  onDeleted: () => void;
  onSaved: (id?: string) => void;
  onCancelForm: () => void;
  insightsView: InsightsView;
  onInsightsViewChange: (view: InsightsView) => void;
  onSelectFromInsights: (id: string) => void;
  className?: string;
};

/**
 * The docked panel beside the ledger: a subscription's detail, the add or
 * edit form, or Insights. Not a dialog: the ledger stays usable next to it.
 */
export function Inspector({
  mode,
  subscriptions,
  categories,
  formKey,
  nameRef,
  onClose,
  onBack,
  onEdit,
  onPrevious,
  onNext,
  confirmingDelete,
  onConfirmingDeleteChange,
  onDeleted,
  onSaved,
  onCancelForm,
  insightsView,
  onInsightsViewChange,
  onSelectFromInsights,
  className,
}: Props) {
  const subscription =
    mode.kind === "detail" || mode.kind === "edit" ? subscriptions.find((s) => s.id === mode.id) : undefined;

  const shell = (label: string, children: ReactNode) => (
    <aside aria-label={label} className={cn("flex min-h-0 flex-col border-l border-separator pl-6", className)}>
      {children}
    </aside>
  );

  if (mode.kind === "insights") {
    return shell(
      "Insights",
      <>
        <Header start={close(onClose)} title="Insights" />
        <Body>
          <Insights
            subscriptions={subscriptions}
            onSelect={onSelectFromInsights}
            view={insightsView}
            onViewChange={onInsightsViewChange}
          />
        </Body>
      </>,
    );
  }

  if (mode.kind === "detail") {
    return shell(
      subscription?.name ?? "Subscription",
      <>
        <Header
          start={
            mode.back === "insights" ? (
              <PanelButton onClick={onBack} className="pl-1.5">
                <ChevronLeft strokeWidth={2.5} />
                Insights
              </PanelButton>
            ) : (
              close(onClose)
            )
          }
          actions={
            subscription ? (
              <>
                <PanelButton aria-label="Previous subscription" title="Previous (↑)" disabled={!onPrevious} onClick={onPrevious}>
                  <ChevronUp strokeWidth={2.5} />
                </PanelButton>
                <PanelButton aria-label="Next subscription" title="Next (↓)" disabled={!onNext} onClick={onNext}>
                  <ChevronDown strokeWidth={2.5} />
                </PanelButton>
                <PanelButton onClick={onEdit} title="Edit (E)" aria-keyshortcuts="E" className="px-3">
                  <Pencil strokeWidth={2.2} />
                  Edit
                </PanelButton>
              </>
            ) : null
          }
        />
        <Body>
          {subscription ? (
            <SubscriptionDetail
              key={subscription.id}
              subscription={subscription}
              onDeleted={onDeleted}
              upcomingCount={6}
              showKeyHints
              dueEmphasis="foreground"
              confirming={confirmingDelete}
              onConfirmingChange={onConfirmingDeleteChange}
            />
          ) : null}
        </Body>
      </>,
    );
  }

  // The subscription was deleted elsewhere.
  if (mode.kind === "edit" && !subscription) {
    return shell("Edit subscription", <Header start={close(onCancelForm)} title="Edit subscription" />);
  }

  return (
    <SubscriptionForm
      key={formKey}
      variant="panel"
      subscription={subscription}
      initialName={mode.kind === "add" ? mode.name : undefined}
      categories={categories}
      onSaved={onSaved}
      onCancel={onCancelForm}
      onDeleted={onDeleted}
      nameRef={nameRef}
    >
      {({ title, actions, content }) =>
        shell(
          title,
          <>
            <Header start={close(onCancelForm)} title={title} actions={actions} />
            <Body form>{content}</Body>
          </>,
        )
      }
    </SubscriptionForm>
  );
}
