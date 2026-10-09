import { render, screen, userEvent } from "@ng-native/testing";
import { expect, test } from "vitest";
import { PasswordPrompt } from "./password-prompt.ts";

const inputs = {
  title: "Confirm it's you",
  message: "Enter your password to permanently delete your account.",
  confirmLabel: "Delete account",
};

async function open(extra: Record<string, unknown> = {}) {
  const events: (["confirm", string] | ["cancel"])[] = [];
  const result = await render(PasswordPrompt, {
    inputs: { ...inputs, ...extra },
    on: {
      confirm: (password: string) => events.push(["confirm", password]),
      cancel: () => events.push(["cancel"]),
    },
  });
  return { events, result };
}

/** A committed node is never edited, only replaced, so the button is queried again after each step. */
function disabled(name: string): boolean | undefined {
  const button = screen.getByRole("button", { name });
  return (button.props["accessibilityState"] as { disabled?: boolean }).disabled;
}

test("confirm stays disabled until a password is typed, then hands it over", async () => {
  const { events } = await open();
  expect(screen.getByText("Confirm it's you")).toBeTruthy();
  expect(disabled("Delete account")).toBe(true);

  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Password"), "hunter22");
  expect(disabled("Delete account")).toBe(false);
  await user.press(screen.getByRole("button", { name: "Delete account" }));

  expect(events).toEqual([["confirm", "hunter22"]]);
});

test("an error from the parent is shown under the field", async () => {
  await open({ error: "Invalid login credentials" });
  expect(screen.getByText("Invalid login credentials")).toBeTruthy();
});

test("cancel emits, but not while busy", async () => {
  const { events, result } = await open();
  const user = userEvent.setup();
  await user.press(screen.getByRole("button", { name: "Cancel" }));
  expect(events).toEqual([["cancel"]]);

  await result.rerender({ inputs: { ...inputs, busy: true } });
  expect(disabled("Cancel")).toBe(true);
  expect(screen.getByText("Please wait…")).toBeTruthy();
});

test("a double tap confirms once, until the parent is done with the attempt", async () => {
  const { events, result } = await open();
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Password"), "hunter22");
  await user.press(screen.getByRole("button", { name: "Delete account" }));
  await user.press(screen.getByRole("button", { name: "Delete account" }));
  expect(events).toEqual([["confirm", "hunter22"]]);
  expect(disabled("Delete account")).toBe(true);

  await result.rerender({ inputs: { ...inputs, busy: true } });
  await result.rerender({ inputs: { ...inputs, busy: false } });
  expect(disabled("Delete account")).toBe(false);
  await user.press(screen.getByRole("button", { name: "Delete account" }));
  expect(events).toEqual([["confirm", "hunter22"], ["confirm", "hunter22"]]);
});

test("an error from the parent unlocks confirm", async () => {
  const { events, result } = await open();
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Password"), "hunter22");
  await user.press(screen.getByRole("button", { name: "Delete account" }));
  expect(disabled("Delete account")).toBe(true);

  await result.rerender({ inputs: { ...inputs, error: "Invalid login credentials" } });
  expect(disabled("Delete account")).toBe(false);
  await user.press(screen.getByRole("button", { name: "Delete account" }));
  expect(events).toEqual([["confirm", "hunter22"], ["confirm", "hunter22"]]);
});
