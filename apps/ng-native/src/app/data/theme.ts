import { Service, effect, inject } from "@angular/core";
import { ColorScheme } from "@ng-native/device";
import { Storage } from "@ng-native/expo/async-storage";

type ThemeOverride = "light" | "dark" | null;

/**
 * The in-app light/dark override, persisted in AsyncStorage. Setting the scheme on the window
 * (`ColorScheme.set`) retunes everything at once: `light-dark()` in the stylesheet, the native
 * header, the keyboard and the sheets.
 */
@Service()
export class Theme {
  private readonly scheme = inject(ColorScheme);
  private readonly store = inject(Storage);

  /** Bound both ways: reading it is the preference, setting it persists. */
  private readonly override = this.store.signal<ThemeOverride>("theme-override", null);
  /** The scheme in effect, override or system. */
  readonly current = this.scheme.current;

  constructor() {
    effect(() => this.scheme.set(this.override()));
  }

  toggle(): void {
    this.override.set(this.current() === "dark" ? "light" : "dark");
  }
}
