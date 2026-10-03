import { Service, inject } from "@angular/core";
import { NativeNavigation, type NavigationCommands } from "@ng-native/router";

/**
 * The app's sheets, presented the way apps/native's `_layout.tsx` declares them. A sheet opened
 * from another sheet stacks over it, as editing does over the detail sheet.
 */
@Service()
export class Sheets {
  private readonly navigation = inject(NativeNavigation);

  detail(id: string): void {
    this.present(["/subscription", id], [0.8, 1]);
  }

  /** The add form, optionally with the name filled in (the empty state's quick add). */
  add(name?: string): void {
    this.present("/subscription/new", [0.75, 1], name ? { name } : undefined);
  }

  edit(id: string): void {
    this.present(["/subscription", id, "edit"], [0.75, 1]);
  }

  insights(): void {
    this.present("/insights", [0.8, 1]);
  }

  private present(
    commands: NavigationCommands,
    detents: number[],
    queryParams?: Record<string, string>,
  ): void {
    void this.navigation.present(commands, {
      as: "formSheet",
      queryParams,
      presentation: { sheetAllowedDetents: detents, sheetGrabberVisible: true },
    });
  }
}
