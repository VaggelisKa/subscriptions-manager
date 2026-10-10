// The web has no haptics; same interface as haptics.ts, every call a no-op.
const noop = () => false;

export const haptics = {
  light: noop,
  medium: noop,
  selection: noop,
  success: noop,
  warning: noop,
  error: noop,
};
