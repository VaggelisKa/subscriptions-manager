// @vitest-environment happy-dom
import { afterEach, expect, test, vi } from "vitest";
import { confirm } from "./confirm.web";
import { notify } from "./notify.web";

function dialog() {
  return document.querySelector<HTMLElement>('[role="alertdialog"]');
}

function button(name: string) {
  const found = [...(dialog()?.querySelectorAll("button") ?? [])].find(
    (b) => b.textContent === name,
  );
  if (!found) throw new Error(`no "${name}" button`);
  return found;
}

function press(key: string, init: KeyboardEventInit = {}) {
  (document.activeElement ?? document.body).dispatchEvent(
    new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true, ...init }),
  );
}

afterEach(() => {
  document.body.innerHTML = "";
});

const prompt = {
  title: "Delete “Netflix”?",
  message: "It's removed from your list and totals. This can't be undone.",
  confirmLabel: "Delete",
  destructive: true,
};

test("opens a modal alert dialog named by its title and described by its message", () => {
  void confirm(prompt);

  const el = dialog()!;
  expect(el).not.toBeNull();
  expect(el.getAttribute("aria-modal")).toBe("true");
  const title = document.getElementById(el.getAttribute("aria-labelledby")!);
  const message = document.getElementById(el.getAttribute("aria-describedby")!);
  expect(title?.textContent).toBe(prompt.title);
  expect(message?.textContent).toBe(prompt.message);
  // Cancel first and focused, so a stray Enter doesn't delete anything.
  expect([...el.querySelectorAll("button")].map((b) => b.textContent)).toEqual(["Cancel", "Delete"]);
  expect(document.activeElement).toBe(button("Cancel"));
});

test("resolves true on confirm, then closes and gives focus back to the opener", async () => {
  const opener = document.createElement("button");
  document.body.append(opener);
  opener.focus();

  const result = confirm(prompt);
  button("Delete").click();

  await expect(result).resolves.toBe(true);
  expect(dialog()).toBeNull();
  expect(document.activeElement).toBe(opener);
});

test("resolves false on Cancel, Esc or a click outside the card", async () => {
  let result = confirm(prompt);
  button("Cancel").click();
  await expect(result).resolves.toBe(false);

  result = confirm(prompt);
  press("Escape");
  await expect(result).resolves.toBe(false);
  expect(dialog()).toBeNull();

  result = confirm(prompt);
  dialog()!.parentElement!.click();
  await expect(result).resolves.toBe(false);

  // A click on the card itself isn't outside.
  result = confirm(prompt);
  dialog()!.click();
  expect(dialog()).not.toBeNull();
  button("Cancel").click();
  await expect(result).resolves.toBe(false);
});

test("keeps Tab inside the dialog and its keys away from the page's hotkeys", () => {
  const pageKeys = vi.fn();
  document.addEventListener("keydown", pageKeys);
  void confirm(prompt);

  press("Tab");
  expect(document.activeElement).toBe(button("Delete"));
  press("Tab");
  expect(document.activeElement).toBe(button("Cancel"));
  press("Tab", { shiftKey: true });
  expect(document.activeElement).toBe(button("Delete"));
  press("Backspace");
  expect(pageKeys).not.toHaveBeenCalled();

  document.removeEventListener("keydown", pageKeys);
});

test("labels default to OK and Cancel, and a message is optional", () => {
  void confirm({ title: "Sign out?" });

  const el = dialog()!;
  expect(el.hasAttribute("aria-describedby")).toBe(false);
  expect([...el.querySelectorAll("button")].map((b) => b.textContent)).toEqual(["Cancel", "OK"]);
});

test("notify shows the message with a focused OK that dismisses it", async () => {
  const result = notify("Error", "Network request failed");

  const el = dialog()!;
  expect(document.getElementById(el.getAttribute("aria-labelledby")!)?.textContent).toBe("Error");
  expect(document.activeElement).toBe(button("OK"));
  button("OK").click();
  await expect(result).resolves.toBeUndefined();
  expect(dialog()).toBeNull();
});
