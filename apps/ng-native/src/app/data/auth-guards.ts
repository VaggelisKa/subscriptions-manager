import { inject } from "@angular/core";
import { Router, type CanActivateFn } from "@angular/router";
import { Auth } from "./auth.ts";

/** Waits for the stored session, then lets a signed-in user through or sends them to login. */
export const signedIn: CanActivateFn = async () => {
  const auth = inject(Auth);
  const router = inject(Router);
  await auth.whenReady();
  return auth.user() ? true : router.parseUrl("/login");
};

/** The login screen is for signed-out users; a signed-in one goes straight home. */
export const signedOut: CanActivateFn = async () => {
  const auth = inject(Auth);
  const router = inject(Router);
  await auth.whenReady();
  return auth.user() ? router.parseUrl("/") : true;
};
