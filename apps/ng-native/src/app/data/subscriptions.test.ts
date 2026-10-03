import { signal } from "@angular/core";
import { injectService, settle } from "@ng-native/testing";
import { expect, test, vi } from "vitest";
import { Auth } from "./auth.ts";
import { Subscriptions } from "./subscriptions.ts";

type Rows = { id: string; name: string }[];

/** Every fetch the store starts, resolved by the test in whatever order it likes. */
const fetches: { resolve: (rows: Rows) => void }[] = [];

vi.mock("./supabase.ts", () => {
  const chain = { on: () => chain, subscribe: () => chain };
  return {
    supabase: {
      channel: () => chain,
      removeChannel: async () => {},
      from: (table: string) => ({
        select: () => {
          if (table === "categories") return Promise.resolve({ data: [], error: null });
          const result = new Promise((resolve) => {
            fetches.push({ resolve: (rows) => resolve({ data: rows, error: null }) });
          });
          return { order: () => result };
        },
      }),
    },
  };
});

function setup() {
  fetches.length = 0;
  const user = signal<{ id: string } | null>({ id: "a" });
  const store = injectService(Subscriptions, { providers: [{ provide: Auth, useValue: { user } }] });
  return { user, store };
}

const names = (store: Subscriptions) => store.subscriptions().map((s) => s.name);

test("a response for the previous account is dropped", async () => {
  const { user, store } = setup();
  await settle();
  const forA = fetches[0];

  user.set({ id: "b" });
  await settle();
  fetches[1].resolve([{ id: "2", name: "B's" }]);
  await settle();
  forA.resolve([{ id: "1", name: "A's" }]);
  await settle();

  expect(names(store)).toEqual(["B's"]);
});

test("signing out clears the list, and a late response does not bring it back", async () => {
  const { user, store } = setup();
  await settle();
  fetches[0].resolve([{ id: "1", name: "A's" }]);
  await settle();
  void store.load();
  const late = fetches[1];

  user.set(null);
  await settle();
  late.resolve([{ id: "1", name: "A's" }]);
  await settle();

  expect(names(store)).toEqual([]);
  expect(store.loaded()).toBe(false);
});

test("an older fetch finishing last does not overwrite a newer one", async () => {
  const { store } = setup();
  await settle();
  void store.load();
  const [older, newer] = fetches.slice(-2);

  newer.resolve([{ id: "1", name: "renamed" }]);
  await settle();
  older.resolve([{ id: "1", name: "original" }]);
  await settle();

  expect(names(store)).toEqual(["renamed"]);
});

test("a new user object for the same account (a token refresh) keeps the list", async () => {
  const { user, store } = setup();
  await settle();
  fetches[0].resolve([{ id: "1", name: "A's" }]);
  await settle();

  user.set({ id: "a" });
  await settle();

  expect(names(store)).toEqual(["A's"]);
  expect(fetches).toHaveLength(1);
});
