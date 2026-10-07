const bars = [
  { width: 22, opacity: 1 },
  { width: 22, opacity: 0.75 },
  { width: 14, opacity: 0.5 },
];

/** App mark: an orange tile with three stacked bars, like a list of charges. */
export function AppMark() {
  return (
    <div
      aria-hidden
      className="flex h-[60px] w-[60px] items-center justify-center rounded-[18px] bg-primary shadow-mark"
    >
      <div className="flex w-[22px] flex-col gap-[2px]">
        {bars.map((bar, index) => (
          <span
            key={index}
            className="block h-[5.5px] rounded-full bg-white"
            style={{ width: bar.width, opacity: bar.opacity }}
          />
        ))}
      </div>
    </div>
  );
}

/** 60px soft-orange tile with a drawn checkmark, for success states. */
export function SuccessBadge() {
  return (
    <div
      aria-hidden
      className="flex h-[60px] w-[60px] items-center justify-center rounded-[18px] bg-primary-soft"
    >
      <span className="-mt-[5px] block h-6 w-[13px] rotate-45 rounded-br-[2px] border-b-4 border-r-4 border-primary-text" />
    </div>
  );
}
