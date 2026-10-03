import { signal } from "@angular/core";
import { cleanup, injectService } from "@ng-native/testing";
import { afterEach, expect, test, vi } from "vitest";
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
          if (table === "categories") {
            return { abortSignal: () => Promise.resolve({ data: [], error: null }) };
          }
          const result = new Promise((resolve) => {
            fetches.push({ resolve: (rows) => resolve({ data: rows, error: null }) });
          });
          return { order: () => ({ abortSignal: () => result }) };
        },
      }),
    },
  };
});

afterEach(cleanup);

/** Lets effects and the fetch promises run. `settle()` waits only for renders, and there is none. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 20));

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
  void store.reload();
  await settle();
  const late = fetches[1];

  user.set(null);
  await settle();
  late.resolve([{ id: "1", name: "A's" }]);
  await settle();

  expect(names(store)).toEqual([]);
  expect(store.loaded()).toBe(false);
});

test("a refetch asked for during a fetch runs after it, not instead of it", async () => {
  const { store } = setup();
  await settle();
  fetches[0].resolve([{ id: "1", name: "first" }]);
  await settle();

  void store.reload();
  await settle();
  void store.reload(); // A realtime change lands while that fetch is in flight.
  await settle();
  expect(fetches).toHaveLength(2);

  fetches[1].resolve([{ id: "1", name: "before the change" }]);
  await settle();
  expect(fetches).toHaveLength(3);
  fetches[2].resolve([{ id: "1", name: "after the change" }]);
  await settle();

  expect(names(store)).toEqual(["after the change"]);
});

test("reload resolves once the fetch it asked for has finished", async () => {
  const { store } = setup();
  await settle();
  fetches[0].resolve([{ id: "1", name: "first" }]);
  await settle();

  let done = false;
  void store.reload().then(() => (done = true));
  await settle();
  expect(done).toBe(false);
  fetches[1].resolve([{ id: "1", name: "second" }]);
  await settle();

  expect(done).toBe(true);
  expect(names(store)).toEqual(["second"]);
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
