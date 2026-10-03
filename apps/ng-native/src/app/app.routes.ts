import type { Route, Routes } from "@angular/router";
import { signedIn, signedOut } from "./data/auth-guards.ts";
import { SheetStack } from "./ui/sheet-stack.ts";

/**
 * Every screen loads when first opened. The detail, form and insights routes are presented as
 * sheets by the caller (`NativeNavigation.present`); each is a stack of its own (`SheetStack`) so
 * the page inside gets a native header. Editing is a sheet of its own over the detail sheet, as in
 * apps/native, so it is a top-level route rather than a child of `subscription/:id`.
 */
/** A route presented as a sheet: a `SheetStack` with the page as its only child. */
function sheet(path: string, loadComponent: Route["loadComponent"]): Route {
  return {
    path,
    canActivate: [signedIn],
    component: SheetStack,
    children: [{ path: "", loadComponent }],
  };
}

export const routes: Routes = [
  {
    path: "",
    pathMatch: "full",
    canActivate: [signedIn],
    loadComponent: () => import("./home/home.ts").then((m) => m.Home),
  },
  {
    path: "login",
    canActivate: [signedOut],
    loadComponent: () => import("./login/login.ts").then((m) => m.Login),
  },
  sheet("insights", () => import("./insights/insights.ts").then((m) => m.Insights)),
  // Matched before the plain `:id` route, or `new` would be read as an id.
  sheet("subscription/new", () => import("./form/form.ts").then((m) => m.SubscriptionForm)),
  sheet("subscription/:id/edit", () => import("./form/form.ts").then((m) => m.SubscriptionForm)),
  sheet("subscription/:id", () => import("./detail/detail.ts").then((m) => m.SubscriptionDetail)),
];
