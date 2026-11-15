# Dashboard patterns

How a dashboard screen behaves. Each section names the rule, why it exists, and the file to copy
from. A new list, toggle or form follows these; a review checks against them. Copied from GiftNest
(where each rule was learned) and trimmed to what Kheengz has; where the example screen is not
built here yet, the GiftNest file is named.

## 1. Every action asks, then waits

A change that is hard to undo (delete, deactivate, send, pay out) opens `confirmAction()`
([components/dashboard/ConfirmAction.tsx](../components/dashboard/ConfirmAction.tsx)). Pass the
mutation's promise: the dialog keeps its spinner until the request settles, closes on success, and
stays open on failure so it can be retried.

```tsx
confirmAction({ header: `Delete ${u.name}?`, message: "This cannot be undone. ...", danger: true,
  acceptLabel: "Delete", accept: () => remove.mutateAsync([u]) });
```

- **Can never succeed?** Then don't call the API. Pass `blocked: true` with the reason (a product
  that already has orders).
- **Per-row loading.** One mutation serves every row, so compare `mutation.variables?.id === row.id`.
  Show `loading` on that row's button and `disabled` on its siblings.
- **Toast after the refresh.** In `onSuccess`, await the invalidations first, then `toast.success(...)`.
  Invalidate every query that shows the record.

Example: [UsersList.tsx](../app/dashboard/users/UsersList.tsx) (delete one, delete selected).

## 2. One Export per list, walking every page

Exports never stop at the page on screen. They walk the API 100 rows at a time with the list's
current filters, then write typed cells (numbers stay numbers, dates stay dates) to Excel or CSV
([lib/exportRows.ts](../lib/exportRows.ts), [ExportDialog.tsx](../components/dashboard/export/ExportDialog.tsx)).
SheetJS comes from its own CDN at an exact version (`xlsx-0.20.3`): the npm copy stopped at 0.18.5,
which has known security flaws.

| The list is | Use |
| --- | --- |
| a `PrimeReactDataTable` | `exportAll={{ fetchPage, columns }}` on the table (its Export button opens the dialog) |
| cards, a grid, or anything else | `<ExportButton fileName fetchPage columns filtersSummary disabled />` ([ExportButton.tsx](../components/dashboard/export/ExportButton.tsx)) |

- `fetchPage` is the list's own service call with the same `filters` object the query uses. Build
  `filters` once and spread it into both, so the export can never disagree with the screen.
- `columns` are `ExportColumn<T>[]`: headers in the screen's words, money as `(UGX)` numbers, dates
  through `asDate()`. End with `...auditExportColumns<T>()` from [audit.tsx](../components/dashboard/audit.tsx);
  pass `{ people: false }` for records buyers wrote (an order), which have no creator account.
- `filtersSummary` says in words what the export covers ("Status: Active · Search: Aisha").
- File names start with the installation's name (`APP_NAME`, [lib/brand.ts](../lib/brand.ts)).

## 3. Rows that cannot be ticked say why

A row that must not be selected keeps a **locked** checkbox, not a hidden one: a hidden checkbox makes
the row look broken. Give the table both callbacks:

```tsx
selection={{ selected, onChange: setSelected, isSelectable: (u) => u.id !== me?.id,
  lockedReason: "You cannot delete your own account." }}
```

`PrimeReactDataTable` marks locked rows with a per-table class and puts a PrimeReact `Tooltip` on
their checkbox cell.

## 4. Unsaved changes are never lost silently

Forms that hold edits until Save follow Alpha's wizard. Closing a dirty dialog (X, Escape, Cancel)
asks **Discard your changes?** with **Keep editing** / **Discard**; a tab with a form reports
`onDirtyChange(dirty)` and leaving it asks first; a `beforeunload` listener covers reload. Show
"Unsaved changes" and a Discard button next to Save, and disable Save while nothing has changed.
The first big Kheengz form (a product) copies GiftNest's `GiftFormDialog.tsx`.

**Never re-seed a form on every refetch.** A list refetches whenever a signal arrives
(`records.changed`, [lib/liveRecords.ts](../lib/liveRecords.ts)). Seed when the form opens or switches
record (`useResetOnOpen(visible, record?.id ?? "new", ...)`), not on the object's identity; take a
newer copy only while the form is clean, and re-seed from the save response.

## 5. Forms: react-hook-form + zod, valid before confirmed

Every form is **react-hook-form + zod**, as in Alpha. Never hand-rolled `useState` checks: those are
how forms ended up confirming, or sending, input that could not succeed. Copy
[UserFormDialog.tsx](../components/dashboard/admin/UserFormDialog.tsx) (simple) or
[EditProfileDialog.tsx](../app/dashboard/profile/EditProfileDialog.tsx) (photo, password, cross-field).

- **Rules from [lib/validation.ts](../lib/validation.ts)**: `requiredText`, `optionalText`, `email`,
  `phone` (any country), `ugMobile` / `isUgMobileDigits` (Mobile Money: MTN or Airtel Uganda only).
  Messages say what to do: "Enter the name.", "Choose the shop."
- **Cross-field checks go in `.superRefine(fn, ALWAYS)`.** Without `ALWAYS`, zod skips the refinement
  while any field fails, so the first Save shows one problem and hides the next.
- **Valid, then confirmed.** `handleSubmit(onValid)`, and only `onValid` calls `confirmAction`.
- **Server errors land on their fields**: `applyServerErrors(error, setError, fields)` maps Laravel's
  422 onto the form and returns the message to show above the buttons when nothing matched.
  Mutations set `meta: { skipGlobalError: true }` so the toast does not say it twice. Errors are
  typed `AxiosError<ApiErrorBody>`, never `any`.
- **Red borders**: wrap each control in `Field` with `error={errors.x?.message}`; `Field` marks itself
  `data-invalid` and app/globals.css turns any control inside red.
- **Numbers**: an empty `InputNumber` is `NaN` in the form; the schema's `z.number({ error: "Enter the amount." })` refuses it.
- **Pickers** are `InfiniteSelect` holding the whole `Option`, typed `z.custom<Option | null>()`.

## 6. Filters live in one dialog

A list's toolbar is the search box, one **Filters** button and Export. Everything else (status, role,
account, date range) is in the Filters dialog
([FiltersButton.tsx](../components/dashboard/filters/FiltersButton.tsx), Alpha's and SDS's funnel). The
button shows how many are in use; each one shows as a chip beside it that removes it; the dialog edits
a draft and changes the list only on Apply.

```tsx
const filterGroups: FilterGroup[] = [
  { title: "Account", fields: [{ type: "select", key: "role", label: "Role", options: ROLES }] },
  { title: "When", fields: [dateRange()] },
];
<FiltersButton groups={filterGroups} values={filterValuesFrom(filterGroups, getParam)} onApply={setFilters} />
```

Values live in the URL (`useListParams`), so a reload or a shared link keeps them; a picker writes the
id and its label (`account` / `accountName`). Shared pickers: [pickers.ts](../components/dashboard/filters/pickers.ts).
A picker's `mapOption` is typed by the caller for its own rows (`(u: UserRow) => ...`).

## 7. No list without paging, and loading you can see

Every list the server can grow is paged (5 rows a page by default, CLAUDE.md): tables with the
paginator, card lists with `useInfiniteQuery` + **Load more** + "Showing x of y", and long option lists
with `InfiniteSelect` (search + pages). Never fetch "all" for a dropdown: a vendor with a thousand
products should cost the server one page.

**Loading.** Lists keep `placeholderData: (previous) => previous` (the page does not jump) and say they
are loading with `loading={query.isPending || query.isPlaceholderData}`: true while a new key (filter,
search, page, sort) is on its way, false for a background refetch, so those never flash.

## 8. Sidebar badges

Items that need attention carry a red count (Alpha's sidebar badges): from the orders module on,
"orders waiting" and "payouts failed". One counts-only call (`GET /sidebar-badges`), read by a
`useSidebarBadges` hook and mapped by menu item id in `AppSidebar`; it refreshes when a notification
arrives, after the actions that change a count, on window focus and every minute. GiftNest's
`hooks/useSidebarBadges.ts` is the one to copy; it was left out until there is something to count.

## 9. Phone numbers

- **Contacts** (users, buyers): any country, `PhoneField`, digits with the country code and no "+",
  `phone()` rule.
- **Mobile Money** (a vendor's payout number, a buyer's prompt number): `PhoneField ugandaOnly` and
  `isUgMobileDigits`. The network is filled in from the prefix (`guessNetwork`: 076-079 MTN,
  070/074/075 Airtel) and the API refuses a number on the other network.
- Show a stored Ugandan number the way people read it: `ugandanLocal()` (0772 123 456).

## 10. State that follows something else, without an effect

ESLint's React rules are on in full here (no rule switched off, no `eslint-disable`), and
`react-hooks/set-state-in-effect` is the one copied code trips most. The fixes:

| The state must | Use |
| --- | --- |
| follow a value (a search box following the URL) | `useResetWhen(value, () => setTerm(value))` ([hooks/useResetOnOpen.ts](../hooks/useResetOnOpen.ts)): set during render, before the paint |
| start fresh when a dialog opens | `useResetOnOpen(visible, record?.id ?? "new", reset)` |
| come from the browser (a cookie, localStorage, the clock) | `useSyncExternalStore` with a server snapshot ([lib/rememberedAccount.ts](../lib/rememberedAccount.ts), [hooks/useTimeGreeting.ts](../hooks/useTimeGreeting.ts), [hooks/useHydrated.ts](../hooks/useHydrated.ts)) |
| be worked out from other state | compute it in render (`const isHovering = sidebarState === "hover" && hoverState`) |
| react to a request's answer | handle it where the answer arrives (the profile's 401 in [AuthContext.tsx](../contexts/AuthContext.tsx)) |
| read the latest props inside an effect | `useEffectEvent` ([ExportDialog.tsx](../components/dashboard/export/ExportDialog.tsx)) |

## 11. Dialogs that load first, then mount the form

A dialog whose form starts from fetched data shows a skeleton until that data is in, then mounts the
form **once** with it as `defaultValues` (an inner form component keyed on what it started from).
Never `reset()` to blank in one effect and `setValue()` the fetched parts in others: which runs last
depends on the cache. GiftNest's `WithdrawalRequestDialog` is the example.

## 12. After a create that opens the new record

Go there first, then let the list catch up: `invalidateQueries({ refetchType: "none" })` marks the
list stale and `router.push()` runs while the dialog stays up with its button spinning.

## 13. A decision someone else already made

A 422 with `errors.status` ("already Paid out") means another screen decided first: refetch the
record and its lists, return to the view and warn with the message, instead of leaving a form for a
decision that can no longer be made. Other screens follow through `records.changed`.

## 14. Multipart payloads

A request with a file is built with `toFormData()` ([lib/formData.ts](../lib/formData.ts)): booleans
as "1"/"0", each array item as its own `key[]` entry, null and "" left out.

## 15. Words on screen

- **Buyers** order, pay and track; they never "register". **Vendors** run **shops**. "Pay on
  delivery", never "COD" on screen. Money is "UGX 45,000".
- The platform's name is `APP_NAME` ([lib/brand.ts](../lib/brand.ts)), never written in a component:
  a buyer of the software sees their own name.
- Placeholders say what the search matches ("Name, email, phone or username").
- Copy rules: GiftNest's `ui-copy-standard.md` (`D:\coding\new wave\giftnest\giftnest-workspace`). No em dashes.

## Checking it

The foundation's screens have browser checks in `e2e/`: [e2e-testing.md](e2e-testing.md).
