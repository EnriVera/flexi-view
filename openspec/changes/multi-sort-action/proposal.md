# Proposal: multi-sort-action

## 1. Intent

### Problem
`fv-sort-action` currently supports sorting by a SINGLE field at a time. Selecting a new field+direction replaces any previous sort. The user request is direct: *"Me gustaría que pueda hacer un orden en varias columnas no en una sola"* — they need to sort by `role ASC` AND `name DESC` as a tiebreaker, simultaneously.

This is a real need for tabular data where a single sort key rarely produces the desired ordering (e.g., listing users grouped by role, then alphabetical inside each role).

### Why now
The component surface is still pre-1.0 and is the right moment to extend the public contract before consumers depend on the single-sort shape. Delaying means a harder breaking change later.

### Success looks like
- A user can pick multiple fields in `fv-sort-action`'s modal, each with its own direction, and see sorts applied in a deterministic priority order.
- The modal communicates priority visually (e.g., "1", "2", "3" badges on selected fields).
- Persistence (localStorage + URL hash) round-trips multi-sort state losslessly.
- `fv-sort-button` (used inside `fv-header-menu` for per-column header sorting) remains single-field — multi-sort is exclusive to `fv-sort-action`.
- Consumers migrate with a clear, documented breaking-change path.

## 2. Scope

### In scope
- `fv-sort-action` component: internal state, modal UI, priority indication, toggle-off behavior, clear-all behavior.
- `SortChangeDetail` public type — contract redesign.
- `applySort` utility in `utils/sort-filter.ts` — multi-criterion stable sort.
- `fv-view._onSortChange` — accept the new event shape, store multi-sort, propagate to `_processedData`.
- Persistence: localStorage and URL hash encoding for an ordered list of sorts.
- Hydration order (URL > localStorage > target.currentSort) stays the same, only payload changes.

### Out of scope
- `fv-sort-button` and `fv-header-menu` per-column sort: stay strictly single-field. Clicking a column header replaces the global multi-sort with a single sort (documented behavior, not new logic).
- Drag-to-reorder priority inside the modal: deferred. Priority is implicit by click order in v1.
- Server-side sort hooks / async sort adapters: out of scope.
- Multi-sort UI inside `fv-header-menu`: out of scope.
- Tri-state direction (asc/desc/none) toggle on a single button: out of scope; we keep two explicit Asc/Desc buttons.

## 3. Approach

### 3.1 Event shape — single event, array payload (BREAKING)

`sort-change` will carry the full ordered list of sorts. **Decision: clean break, not additive.**

```ts
export interface SortCriterion {
  field: string;
  direction: 'asc' | 'desc';
}
export type SortChangeDetail = { sorts: SortCriterion[] };
```

**Rationale**:
- A `null` direction was the old "clear" sentinel. With an array, `{ sorts: [] }` IS clear — cleaner semantics.
- Adding a second `multi-sort-change` event means consumers handle two events for the same domain concept. Worse DX.
- Optional `sorts?: []` extension creates a tri-state (legacy field+direction OR sorts) that nobody can reason about.
- `fv-sort-button` emits the SAME event name but with an array of length 0 or 1 — uniform contract, no special case in `fv-view`.

**Migration**: provide a transitional `SortCriterion` named export and a one-paragraph CHANGELOG note. Single-sort consumers read `detail.sorts[0] ?? null`. Library version bump to reflect the breaking change.

### 3.2 `fv-sort-action` internal state and UI

```ts
@state() private _activeSorts: SortCriterion[] = [];
```

The order of the array IS the priority (index 0 = highest priority).

**Modal UI changes**:
- Left panel field items render a small badge `[1]`, `[2]`, ... when active, indicating priority. No badge = not in active sort.
- Selecting a field in the left panel still drives which field the right-panel Asc/Desc buttons act on.
- Right panel Asc/Desc buttons show pressed state if THAT field+direction exists anywhere in `_activeSorts`.
- Clicking Asc on a not-yet-active field APPENDS to the list (priority = next index).
- Clicking Asc on a field already active with Asc TOGGLES IT OFF (removes from list, remaining items keep relative order, indices recompute).
- Clicking Asc on a field already active with Desc REPLACES that entry's direction (keeps its position).
- Modal stays OPEN after a click (multi-sort is iterative). Closing happens via Escape, backdrop, or close button. This is a behavior change from single-sort (which closed on apply) and is justified: the user is composing a list.

**Chip label**:
- 0 sorts: `Sort` (default)
- 1 sort: `<title> - <dir>` (current behavior preserved)
- 2+ sorts: `<title-1> +N` or `<count> sorts` — exact label finalized in spec phase.

The `×` clear chip clears ALL sorts (`_activeSorts = []`).

### 3.3 `applySort` utility

```ts
export function applySort<T>(data: T[], sorts: SortCriterion[]): T[] {
  if (!sorts || sorts.length === 0) return data;
  return [...data].sort((a, b) => {
    for (const { field, direction } of sorts) {
      const aVal = (a as Record<string, unknown>)[field];
      const bVal = (b as Record<string, unknown>)[field];
      let cmp = 0;
      if (aVal == null && bVal == null) cmp = 0;
      else if (aVal == null) cmp = -1;
      else if (bVal == null) cmp = 1;
      else if (aVal < bVal) cmp = -1;
      else if (aVal > bVal) cmp = 1;
      if (cmp !== 0) return direction === 'asc' ? cmp : -cmp;
    }
    return 0;
  });
}
```

Signature change: from `SortChangeDetail | null` to `SortCriterion[]`. Empty array = no-op (returns input untouched, same as old `null`).

### 3.4 `fv-view._onSortChange`

`_sortConfig` becomes `_sortCriteria: SortCriterion[]`. The handler reads `detail.sorts` and stores it directly. `_processedData` calls `applySort(filtered, this._sortCriteria)`.

When `fv-sort-button` (column header) emits a single-sort event, it sends `{ sorts: [{field, direction}] }` — same handler, no special case. Clicking a column header thus REPLACES the multi-sort with a single sort, which is the existing intuitive behavior.

### 3.5 Persistence encoding

URL hash:
```
fv-sort=role:asc,name:desc
```
Comma-separated, order-preserving. Empty/missing = no sort. Reader splits on `,`, then on `:`, validates each pair, drops invalid pairs silently.

localStorage (`{storageKey}-sort`):
```json
[{"field":"role","direction":"asc"},{"field":"name","direction":"desc"}]
```
Array of objects. `null`/empty array means no sort (key removed).

`writeSortToUrl` / `readSortFromUrl` / `_writeStorage` / `_readStorage` all change signatures to operate on `SortCriterion[]`. Reading legacy formats (single `field:dir` string, single `{field,direction}` object) is supported as a one-time migration path — parsed into a length-1 array.

### 3.6 `fv-sort-button` (header-menu) — uniformity, not multi-sort

`fv-sort-button` keeps its UX (single field, asc/desc/clear). Internally it emits the new event shape with `sorts` of length 0 or 1. This means `fv-view` has ONE listener and ONE state shape. No backward-compat branches in the consumer.

## 4. Key Decisions

1. **Clean-break event shape** (`{ sorts: SortCriterion[] }`) over additive extension. Reason: simpler invariants, no tri-state, uniform contract for both `fv-sort-action` and `fv-sort-button`.
2. **Priority by click order**, not drag-to-reorder. Reason: ships v1 fast; reorder is a future enhancement with its own UX cost.
3. **Modal stays open** while composing multi-sort. Reason: matches the iterative nature of building a sort list. Escape/backdrop/× to close.
4. **Toggle-off and replace-direction semantics** are preserved per-field, only generalized across N fields.
5. **Column-header sort REPLACES multi-sort.** Reason: header click is a "reset to this one sort" gesture in every spreadsheet UI ever. Don't surprise users.
6. **Persistence: comma-separated for URL, JSON array for localStorage**, with legacy-format read fallback for one release cycle.

## 5. Risks and Open Questions

- **Breaking change blast radius**: any consumer reading `detail.field` / `detail.direction` directly from the event breaks. Mitigated by clear migration note and the fact the library is pre-1.0. To confirm in spec: do we ship under a major version bump or a feature flag?
- **Modal-stays-open** may surprise users used to the single-sort flow. Spec phase should validate with a simple usability heuristic; consider adding an explicit "Done" button if testing shows confusion.
- **Chip label for N sorts** needs UX finalization in spec phase. Tradeoff between informativeness and chip width.
- **URL hash length** with many sorts is bounded but worth noting (browsers cap ~2000 chars). Practical N is small (<10), so not a real risk.
- **Stability of `Array.prototype.sort`**: relied upon (ES2019+ guarantees stable). All target browsers comply — confirm in spec.
- **Hydration with mixed legacy + new** persistence data (e.g., URL has new format, localStorage has old): legacy-read fallback handles both, but precedence (URL > localStorage > target.currentSort) is unchanged.
