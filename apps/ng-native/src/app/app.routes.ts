import type { Routes } from "@angular/router";
import { signedIn, signedOut } from "./data/auth-guards.ts";
import { SheetStack } from "./ui/sheet-stack.ts";

/**
 * Every screen loads when first opened. The detail, form and insights routes are presented as
 * sheets by the caller (`NativeNavigation.present`); each is a stack of its own (`SheetStack`) so
 * the page inside gets a native header. Editing is a sheet of its own over the detail sheet, as in
 * apps/native, so it is a top-level route rather than a child of `subscription/:id`.
 */
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
  {
    path: "insights",
    canActivate: [signedIn],
    component: SheetStack,
    children: [
      { path: "", loadComponent: () => import("./insights/insights.ts").then((m) => m.Insights) },
    ],
  },
  {
    // Matched before the plain `:id` route, or `new` would be read as an id.
    path: "subscription/new",
    canActivate: [signedIn],
    component: SheetStack,
    children: [
      { path: "", loadComponent: () => import("./form/form.ts").then((m) => m.SubscriptionForm) },
    ],
  },
  {
    path: "subscription/:id/edit",
    canActivate: [signedIn],
    component: SheetStack,
    children: [
      { path: "", loadComponent: () => import("./form/form.ts").then((m) => m.SubscriptionForm) },
    ],
  },
  {
    path: "subscription/:id",
    canActivate: [signedIn],
    component: SheetStack,
    children: [
      { path: "", loadComponent: () => import("./detail/detail.ts").then((m) => m.SubscriptionDetail) },
    ],
  },
];
