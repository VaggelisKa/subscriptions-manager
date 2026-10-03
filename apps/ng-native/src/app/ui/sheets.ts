import { Service, inject } from "@angular/core";
import { NativeNavigation } from "@ng-native/router";

/**
 * The app's sheets, presented the way apps/native's `_layout.tsx` declares them. A sheet opened
 * from another sheet stacks over it, as editing does over the detail sheet.
 */
@Service()
export class Sheets {
  private readonly navigation = inject(NativeNavigation);

  detail(id: string): void {
    void this.navigation.present(["/subscription", id], {
      as: "formSheet",
      presentation: { sheetAllowedDetents: [0.8, 1], sheetGrabberVisible: true },
    });
  }

  /** The add form, optionally with the name filled in (the empty state's quick add). */
  add(name?: string): void {
    void this.navigation.present("/subscription/new", {
      as: "formSheet",
      queryParams: name ? { name } : undefined,
      presentation: { sheetAllowedDetents: [0.75, 1], sheetGrabberVisible: true },
    });
  }

  edit(id: string): void {
    void this.navigation.present(["/subscription", id, "edit"], {
      as: "formSheet",
      presentation: { sheetAllowedDetents: [0.75, 1], sheetGrabberVisible: true },
    });
  }

  insights(): void {
    void this.navigation.present("/insights", {
      as: "formSheet",
      presentation: { sheetAllowedDetents: [0.8, 1], sheetGrabberVisible: true },
    });
  }
}
