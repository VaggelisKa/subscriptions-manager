import { provideNativeRouter } from "@ng-native/router";
import { render, screen, userEvent } from "@ng-native/testing";
import { expect, test } from "vitest";
import { Auth } from "../data/auth.ts";
import { Login } from "./login.ts";

/** The slice of `Auth` the screen reaches, recording what it was asked to do. */
function fakeAuth(result: { error?: string } = {}) {
  const calls: { kind: "signIn" | "signUp"; email: string; password: string }[] = [];
  const auth = {
    configured: true,
    signIn: async (email: string, password: string) => {
      calls.push({ kind: "signIn", email, password });
      return result;
    },
    signUp: async (email: string, password: string) => {
      calls.push({ kind: "signUp", email, password });
      return result;
    },
  };
  return { auth, calls };
}

async function open(result?: { error?: string }) {
  const fake = fakeAuth(result);
  await render(Login, {
    providers: [provideNativeRouter([]), { provide: Auth, useValue: fake.auth }],
  });
  return fake;
}

/** A committed node is never edited, only replaced, so the button is queried again after each step. */
function signInDisabled(): boolean | undefined {
  const button = screen.getByRole("button", { name: "Sign in" });
  return (button.props["accessibilityState"] as { disabled?: boolean }).disabled;
}

test("the sign-in button is disabled until both fields are valid", async () => {
  await open();
  expect(signInDisabled()).toBe(true);

  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Email"), "ada@example.com");
  expect(signInDisabled()).toBe(true);

  await user.type(screen.getByLabelText("Password"), "hunter22");
  expect(signInDisabled()).toBe(false);
});

test("signing in hands the email and password to Auth, which trims", async () => {
  const { calls } = await open();
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Email"), "  ada@example.com ");
  await user.type(screen.getByLabelText("Password"), "hunter22");
  await user.press(screen.getByRole("button", { name: "Sign in" }));

  expect(calls).toEqual([{ kind: "signIn", email: "  ada@example.com ", password: "hunter22" }]);
});

test("a failed sign-in shows the message Supabase gave", async () => {
  await open({ error: "Invalid login credentials" });
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Email"), "ada@example.com");
  await user.type(screen.getByLabelText("Password"), "hunter22");
  await user.press(screen.getByRole("button", { name: "Sign in" }));

  expect(await screen.findByText("Invalid login credentials")).toBeTruthy();
});
