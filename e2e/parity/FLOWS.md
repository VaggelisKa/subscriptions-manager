# Functional flows (spec §12A.4b)

Every flow must pass on `PARITY_TARGET=next` (proving the assertions aren't vacuous) and on
`PARITY_TARGET=expo` before the Phase 6 gate, with the same assertions. Specs live in
`tests/flows/`. Users and data come from `seed.sql`. "Today" is Wed 14 Oct 2026, Europe/Copenhagen.

| # | Flow | Spec | Fixture user | Next |
|---|---|---|---|---|
| 1 | Sign in → home, sign out | `sign-in.spec.ts` | `signout` (+ a throwaway address) | ✅ |
| 2 | Add (mobile sheet; desktop via button and `N`; save via button and ⌘/Ctrl+↵), validation, price parser | `add.spec.ts` | `writerAdd` | ✅ |
| 3 | Edit (button and `E`); `billed_at` untouched unless the date changed | `edit.spec.ts` | `writerEdit` | ✅ |
| 4 | Delete with confirmation (button, `Backspace`, `Delete`); cancel via `Esc` | `delete.spec.ts` | `writerDelete` | ✅ |
| 5 | Detail: upcoming charges, charge timeline, month-end anchor | `detail.spec.ts` | `populated` | ✅ |
| 6 | Insights: period switch, expand/collapse, detail from insights and back | `insights.spec.ts` | `populated` | ✅ |
| 7 | Desktop ledger: sort, month-calendar day filter, `↑`/`↓` | `ledger.spec.ts` | `populated` | ✅ |
| 8 | Deep link `/?s=<id>` | `deep-link.spec.ts` | `populated` | ✅ |
| 9 | Theme system/light/dark, persisted | `theme.spec.ts` | `populated` | ✅ |
| 10 | Resizing across 1024/1440 keeps the open item | `responsive.spec.ts` | `populated` | ✅ |
| 11 | Empty account, loading skeleton, load error + retry | `states.spec.ts` | `empty`, per-worker copies of `populated` | ✅ |
| 12 | Realtime: a change in a second context appears without reload | `realtime.spec.ts` | `realtime` | ⏭ skipped (no Realtime in the Next app) |

Write flows (2, 3, 4, 12) reseed their own user before and after each test (`seed(user)`), so
they never touch the `populated`/`empty` users the visual shots read, whatever order things run in.

## 1. Sign in → home, sign out
Today's login is a magic link, so the flow is split. The link request goes through the real UI.
The session is created programmatically (password sign-in, written to the `@supabase/ssr` cookies by `loginAs`).
- `/login` (title "Sign in"). Submitting an address → `/login/confirmation`, "Check your email" (title "Check your email"), and the email arrives in the local Mailpit inbox. "Use a different email" → `/login`.
- `someone@localhost` → "Invalid email address", field `aria-invalid`, stays on `/login`.
- Signed out, `/` → `/login`.
- Signed in, `/` shows "Your subscriptions". `/login` → `/`.
- Sign out from the mobile toolbar menu (shows the email) → `/login`, `sb-*` cookies gone, `/` → `/login`.
- Sign out from the desktop account menu → `/login`, `/` → `/login`.
- Expo deviation (§12A.5 #1, #2): password + "Email me a code" and "Sign out of all devices". Re-baseline those steps from the approved designs.

## 2. Add
- Mobile sheet: Save with nothing → "Give the subscription a name."; price `79 kroner` → "Enter a price, like 79 or 79,50."; a request without a date → "Pick the date of the next charge.". The UI always sends a date, so the test blanks `billed_at` in the outgoing server-action request. No row is written by any of these.
- `79` (mobile, Save ✓) → row "Parity price 79, Today, 79 kr every month"; DB `price = 79.00`, `interval = month`, `billed_at = 2026-10-14 12:00 Copenhagen`, first category preselected.
- `79,50` (desktop, top-bar button, form button) → selected in the ledger and shown in the inspector, `?s=<new id>`, `price = 79.50`, no category.
- `1.250` (desktop, `N`, Transport chip, ⌘/Ctrl+↵ from the price field) → `price = 1250.00`, Transport.
- `1.250,50` (desktop, button, Yearly, date 20 Oct from the popover, ⌘/Ctrl+↵) → `1250.50`, `year`, `billed_at = 2026-10-20 12:00 Copenhagen`.
- `N` is ignored while typing in a field (typing `nnn` into Name).

## 3. Edit
- Desktop Edit button: the form shows name, `129`, "Next charge 14 Oct 2026". Changing name, price `149,50` and Yearly → back to the detail; DB updated and `billed_at` still the seeded anchor (`2025-12-14`).
- Desktop `↓` then `E`; picking 20 Oct and ⌘/Ctrl+↵ → `billed_at = 2026-10-20 12:00 Copenhagen`, price unchanged.
- `Esc` from the edit → back to the detail, nothing saved.
- Mobile: detail sheet → Edit → price `500` → Save → back to the detail ("every month · 6.000 kr a year"); `billed_at` unchanged.

## 4. Delete
- Desktop: "Delete subscription" → confirm group "Delete “Netflix”?" with Cancel focused. `Esc` cancels (row kept). Delete → row gone from ledger and DB, "11 tracked", and the next row (Fitness World) is selected.
- `Backspace` and `Delete` each open the confirm for the selected row; Delete removes it.
- Mobile: detail sheet → Delete subscription → Delete → sheet closes, row gone. Edit sheet → trash → Cancel keeps it.

## 5. Detail
- Desktop, DSB Commuter Pass (anchor 31 Jan 2026, monthly): "next 6" = Sat 31 Oct, Mon 30 Nov, Thu 31 Dec, Sun 31 Jan 2027, **Sun 28 Feb 2027, Wed 31 Mar 2027** (1.250 kr each); "every month · 15.000 kr a year"; Tracking since "Jan 2026"; Paid so far "≈ 11.250 kr".
- Netflix's first charge reads "Today", Fitness World's (weekly) "Tomorrow" then every Thursday.
- Mobile sheet: three upcoming charges; Adobe (yearly) "every year · 358 kr a month", next "Mon 25 Jan 2027".

## 6. Insights
- Desktop: the Insights button is pressed. Spend per month "5.469 kr", Week "1.262 kr", Year "65.627 kr". Entertainment expands (3 rows) and collapses. Opening Netflix shows an "Insights" back button. `Esc` → Insights with the same period and expansion. The Insights button closes it.
- Mobile: toolbar Insights → sheet; Week; Health and Fitness → Fitness World → its detail ("every week · 3.588 kr a year"). Close → back to Insights, still Week.

## 7. Desktop ledger
- Next charge: buckets "Next 7 days" / "Later this month" / "Later", rows in date order (ties by name).
- Price: flat, by monthly equivalent, high → low (Accountant Retainer … Podcast Supporter Club).
- Name: flat, A → Z ("Ørsted" sorts with O).
- Calendar "Thu 15 Oct" (2 charges) filters to Fitness World + Photon Cloud Backup, chip "Thu 15 Oct · 2 charges", day `aria-pressed`. The chip clears it, and so does `Esc`. A 1-charge day (Tue 20 Oct) opens that subscription.
- `↓` from nothing selects the first row and mirrors `?s=`. `↓↓` / `↑` move in ledger order, `↑` at the top stays, and the inspector's Next button steps too.
- Hotkeys are ignored while a menu is open.

## 8. Deep link
- `/?s=<DSB id>` opens DSB in the inspector, selected. Selecting another row, or editing it, keeps `?s=` in step. Close drops it. Reloading with `?s=` reopens.
- An unknown id, or another user's id, opens nothing and is dropped from the URL.
- Expo: keep accepting `?s=<id>` (spec §12A.4b item 8).

## 9. Theme
- Desktop account menu: System is checked by default. Dark → `html.dark`, `localStorage.theme = "dark"`, survives a reload. Light → `html.light`. System follows `prefers-color-scheme` both ways.
- Mobile toolbar menu: no "Match system" while on system. "Dark mode" → dark, survives a reload. Then "Light mode" and "Match system" are offered, and Match system → `theme = "system"`.

## 10. Responsiveness
- 1440 with DSB open: inspector + overview rail. At 1200 the rail hides. At 1024 the inspector stays. At 1023 the detail becomes a sheet ("DSB Commuter Pass" dialog). Back at 1440: inspector + rail again, no sheet.
- 1024: the rail shows when nothing is open, hides with the inspector, and returns on `Esc`.

## 11. Empty, loading, error
- Empty (desktop): "Track your first subscription" with the add form open. Cancel → form closed. Quick add "Spotify" prefills the name.
- Empty (mobile): no sheet. Quick add "TV 2 Play" opens a prefilled form.
- Loading: while the data request is held, the "Loading subscriptions" status skeleton shows and no ledger. On release the ledger replaces it.
- Error: with the data request failing, "Couldn't load your subscriptions" (not the empty state). "Try again" once it works → ledger, "12 tracked".

## 12. Realtime (Expo only)
A second browser context, signed in as the same user, renames Claude Pro → "Claude Max". The first context shows it within 10 s without a reload. Skipped for `next`: apps/web has no Realtime subscription today (spec §12A.5 deviation 4).

## Hotkeys (spec §12A.3)
Each hotkey has a screenshot plus an assertion in `tests/visual/desktop.spec.ts` ("desktop hotkeys"), and is exercised again in the flows above:
`N` (add, Name focused), `↓`/`↑` (selection), `E` (edit), `Backspace`/`Delete` (delete confirm), `Esc` (confirm → detail → closed, edit → detail, detail-from-insights → insights, day filter off), ⌘/Ctrl+↵ (submit; the screenshot shows the empty-name error, the flows save).
