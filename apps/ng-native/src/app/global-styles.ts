import { Component, ViewEncapsulation } from "@angular/core";

/**
 * Never rendered: its compiled sheet is what `main.ts` passes to `mount()` as `globalStyles`,
 * so the tokens and the grouped-list classes in `theme.css` match every node in the app.
 */
@Component({
  selector: "app-global-styles",
  template: "",
  styleUrl: "./theme.css",
  encapsulation: ViewEncapsulation.None,
})
export class GlobalStyles {}
