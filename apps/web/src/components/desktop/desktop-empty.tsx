import { Plus } from "lucide-react";
import { GhostRow, QUICK_ADD } from "@/components/home/empty-state";

type Props = {
  /** The add form is open beside it. */
  formOpen: boolean;
  onAdd: (name?: string) => void;
};

/** No subscriptions yet: ghost rows, quick add, and an Add button once the form is closed. */
export function DesktopEmpty({ formOpen, onAdd }: Props) {
  return (
    <section aria-labelledby="desktop-empty-title" className="mx-auto w-full max-w-[560px] pt-10">
      <div aria-hidden className="mb-[22px] flex flex-col gap-2">
        <GhostRow plus />
        <GhostRow className="opacity-60" />
        <GhostRow className="opacity-30" />
      </div>

      <div className="flex flex-col gap-1.5">
        <h2 id="desktop-empty-title" className="text-[24px] font-black leading-7 tracking-[-0.5px]">
          Track your first subscription
        </h2>
        <p className="max-w-[46ch] text-[15px] font-semibold leading-[22px] text-muted-foreground">
          {formOpen
            ? "Fill in the form on the right, or start from one of these. You'll see what's due next and what it adds up to each month."
            : "Add what you pay for and see what's due next, and what it adds up to each month."}
        </p>
      </div>

      {!formOpen ? (
        <button
          type="button"
          onClick={() => onAdd()}
          className="mt-[22px] inline-flex h-11 items-center gap-2 rounded-full bg-primary-button px-5 text-[16px] font-extrabold text-primary-foreground shadow-float transition-[transform,background-color] duration-150 hover:bg-primary-button-hover active:bg-primary-button-active active:scale-95"
        >
          <Plus aria-hidden className="size-[18px]" strokeWidth={2.75} />
          Add subscription
        </button>
      ) : null}

      <h3 className="pb-2 pt-5 text-footnote font-bold text-muted-foreground">Quick add</h3>
      <ul className="flex flex-wrap gap-2">
        {QUICK_ADD.map((name) => (
          <li key={name}>
            <button
              type="button"
              aria-label={`Add ${name}`}
              onClick={() => onAdd(name)}
              className="rounded-full bg-fill px-3.5 py-2 text-[14px] font-bold transition-opacity hover:opacity-70 active:opacity-60"
            >
              {name}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
