export const numberFormatOptions = {
  currency: "DKK",
  style: "currency",
  compactDisplay: "short",
  notation: "compact",
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
} as const satisfies Intl.NumberFormatOptions;
