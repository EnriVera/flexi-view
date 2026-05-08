# Technical Design — multi-sort-action

> Phase: SDD design
> Project: flexi-view
> Status: ready for tasks
> Reads: [proposal](./proposal.md), [spec](./spec.md)

---

## 1. Architecture Overview

### 1.1 Data flow (end-to-end)

```
              ┌──────────────────────────────┐
 user click ──▶  fv-sort-action (modal)      │
              │  _activeSorts: SortCriterion[]│ ─── apply Asc/Desc
              └──────────────┬───────────────┘
                             │
                             │ CustomEvent('sort-change',
                             │   detail: { sorts: SortCriterion[] })
                             ▼
              ┌──────────────────────────────┐
              │  fv-view._onSortChange       │
              │  _sortCriteria = detail.sorts│
              └──────────────┬───────────────┘
                             │
                             ▼
              ┌──────────────────────────────┐
              │  _processedData =            │
              │   applySort(filtered,        │
              │             _sortCriteria)   │
              └──────────────┬───────────────┘
                             │ Lit @state change → re-render
                             ▼
                       rendered rows
```

Parallel reverse path (state notification):
- `fv-view` re-emits `fv-sort-change` with `{ sorts: SortCriterion[] }` so peer chips (a second `fv-sort-action`, `fv-sort-button` instances, header menus) stay in sync.

### 1.2 Architectural pattern

This is a **state-down / events-up** Web Component composition. There is exactly one source of truth for "active sort criteria":

- The user-facing source is `fv-sort-action._activeSorts`.
- The data-side source is `fv-view._sortCriteria`.
- They are kept in sync by the `sort-change` (inbound to view) and `fv-sort-change` (outbound from view) event pair.

Column-header sort (`fv-sort-button` via `fv-header-menu`) is a **destructive** producer: it always emits a length-0 or length-1 array, replacing the multi-sort. This matches spreadsheet UX and was decided in proposal §key-decisions.

### 1.3 Component boundaries

| Component | Concern |
|-----------|---------|
| `fv-sort-action` | Multi-sort UI: chip + modal, owns priority order, owns persistence |
| `fv-sort-button` | Single-field column-header sort (chip in header menu); emits uniform shape |
| `fv-view` | Data pipeline: filter → sort → render; re-broadcasts state |
| `applySort` | Pure function: `(data, sorts) → sortedData` |
| `persistence.ts` | URL hash + localStorage encode/decode for `SortCriterion[]` |

---

## 2. Type Changes (`src/types.ts`)

### 2.1 New / modified types

```ts
// NEW
export interface SortCriterion {
  field: string;
  direction: 'asc' | 'desc';
}

// PUBLIC ALIAS
export type FvSortCriterion = SortCriterion;

// BREAKING — replaces { field, direction | null }
export interface SortChangeDetail {
  sorts: SortCriterion[];
}

// PUBLIC ALIAS — points to new shape
export type FvSortChangeDetail = SortChangeDetail;
```

### 2.2 Knock-on type changes

`HeaderMenuElement.currentSort` was typed `SortChangeDetail | null` under the old shape (the field-level form). Under the new shape it must become:

```ts
export interface HeaderMenuElement<T = ...> {
  // ...
  currentSorts: SortCriterion[];   // RENAMED from currentSort
  // ...
}
```

Migration is straightforward because `fv-header-menu` only reads, it does not consume nullable semantics — `[]` already encodes "no sort".

---

## 3. Architectural Decisions

### ADR-1 — `_activeSorts` immutability contract (always reassign)

**Decision**: Every mutation to `_activeSorts` MUST produce a new array reference. Never `.push`, `.splice`, or otherwise mutate in place.

**Rationale**:
- Lit's `@state()` triggers re-render via shallow change detection on the property value. Mutating in place keeps the same reference and Lit will NOT re-render unless we also call `requestUpdate()`. Mixing both styles is error-prone.
- Always reassigning matches React/Redux mental model and is easier to test (`expect(prev).not.toBe(next)`).
- Cost is negligible (arrays are tiny — typically ≤ 5 entries).

**Implementation pattern**:
```ts
// Append
this._activeSorts = [...this._activeSorts, { field, direction }];
// Remove (toggle off)
this._activeSorts = this._activeSorts.filter(s => s.field !== field);
// Replace direction at same index
this._activeSorts = this._activeSorts.map(s =>
  s.field === field ? { field, direction: newDir } : s
);
// Clear
this._activeSorts = [];
```

**Rejected alternative**: in-place mutate + `requestUpdate('_activeSorts', oldVal)`. Rejected because it leaks the mutation pattern and complicates equality checks downstream.

---

### ADR-2 — i18n interpolation for `sort.nSorts`

**Decision**: Use a function-valued translation key.

```ts
// en.ts
sort: {
  // ... existing
  nSorts: (n: number) => `${n} sorts`,
}
// es.ts
sort: {
  // ... existing
  nSorts: (n: number) => `${n} ordenamientos`,
}
```

`Translations` type (derived from `typeof en`) automatically picks up the `(n: number) => string` signature, giving callsites full type safety:

```ts
const label = t().sort.nSorts(this._activeSorts.length);
```

**Rejected alternatives**:
- *Template + `.replace('{n}', …)`*: stringly-typed, no compile-time guarantee that the placeholder matches at all callsites. The only callsite for now is the chip label — but adding a runtime micro-format-engine for one key is overkill, and adding `.replace` ceremony at every callsite is verbose.
- *`moreSorts: '+{n} more'`*: hard-codes English word order; bad for future locales.

This is the cleanest option that keeps the existing static-object i18n pattern and adds zero runtime machinery.

---

### ADR-3 — fv-view: drop `currentSort`, add `currentSorts`

**Decision**: Remove `currentSort` getter outright. Add `currentSorts: SortCriterion[]` getter returning `[..._sortCriteria]` (defensive copy).

**Rationale**:
- The library is pre-1.0 (current branch: `development`, no published major). The proposal already labels this a major breaking change because `SortChangeDetail` shape changes. Keeping a backcompat alias for `currentSort` would only soften ONE of several breaking surfaces, giving a false sense of safety.
- `fv-sort-button._connect()` and `fv-sort-action._connect()` both read `target.currentSort`. They are internal callers updated in the same change. No external consumer is documented to depend on `currentSort`.
- Dual API (`currentSort` AND `currentSorts`) doubles the surface to test and document.

**Migration**: callers must change `target.currentSort?.field` → `target.currentSorts[0]?.field`.

**Rejected alternative**: keep `currentSort` as alias `() => this._sortCriteria[0] ?? null`. Rejected because (a) the spec already mandates the wider breaking change, and (b) `fv-header-menu` accesses `currentSort` via `HeaderMenuElement.currentSort` typing — which we are renaming on the interface anyway.

---

### ADR-4 — Persistence signature changes

**Decision**: Change `persistence.ts` exports to operate on `SortCriterion[]`. Both producers and consumers migrate together.

**New signatures**:

```ts
// PERSISTENCE.TS — new
export function writeSortToUrl(sorts: SortCriterion[]): void;
export function clearSortFromUrl(): void;
export function readSortFromUrl(): SortCriterion[];   // [] if absent/invalid

// SortState (used by readState/writeState for localStorage of full view state)
export type SortState = SortCriterion[];   // re-typed from {field, direction}
```

**URL encode algorithm** (`writeSortToUrl`):
1. If `sorts.length === 0` → call `clearSortFromUrl()` and return.
2. Build string: `sorts.map(s => `${s.field}:${s.direction}`).join(',')`.
3. Set `params.set('fv-sort', value)`.
4. Edge case: if any `field` contains `,` or `:`, percent-encode at write time using `encodeURIComponent(field)`. The decode step does `decodeURIComponent` per token. Keeps the format simple while staying safe for arbitrary field names.

**URL decode algorithm** (`readSortFromUrl`):
```ts
const raw = params.get('fv-sort');
if (!raw) return [];
const tokens = raw.split(',');
const result: SortCriterion[] = [];
for (const token of tokens) {
  const [encField, dir] = token.split(':');
  if (!encField || (dir !== 'asc' && dir !== 'desc')) continue;  // drop invalid
  result.push({ field: decodeURIComponent(encField), direction: dir });
}
return result;
```

Edge cases:
- Empty value → `[]`.
- Token with no colon → dropped.
- Token with bad direction → dropped.
- Legacy single-sort `name:asc` → naturally produces `[{field:'name',direction:'asc'}]` (no comma, one valid token).

**localStorage encode**: `JSON.stringify(_activeSorts)` when non-empty, `localStorage.removeItem(key)` when empty.

**localStorage decode** (with legacy support):
```ts
const raw = localStorage.getItem(`${storageKey}-sort`);
if (!raw) return [];
const parsed = JSON.parse(raw) as unknown;

// Legacy: single object → wrap in array
if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
  const obj = parsed as Record<string, unknown>;
  if (typeof obj.field === 'string' &&
      (obj.direction === 'asc' || obj.direction === 'desc')) {
    return [{ field: obj.field, direction: obj.direction }];
  }
  return [];
}
// New: array → validate each entry
if (Array.isArray(parsed)) {
  return parsed.filter((e): e is SortCriterion =>
    e && typeof e === 'object' &&
    typeof (e as any).field === 'string' &&
    ((e as any).direction === 'asc' || (e as any).direction === 'desc')
  );
}
return [];
```

**Rejected alternative**: keep old per-field URL writer and add a separate `writeMultiSortToUrl`. Rejected because two coexisting URL formats invite ambiguity ("which one wins on read?") and complicate `clearSortFromUrl`.

---

### ADR-5 — `fv-sort-button._emit` reshape

**Decision**: Change emit shape only. Keep internal `direction: 'asc' | 'desc'` and `active: boolean` props as-is.

```ts
private _emit(active: boolean, direction: 'asc' | 'desc') {
  const detail: SortChangeDetail = active
    ? { sorts: [{ field: this.field, direction }] }
    : { sorts: [] };
  this.dispatchEvent(new CustomEvent<SortChangeDetail>('sort-change', {
    detail, bubbles: true, composed: true,
  }));
  if (this._target) {
    this._target.dispatchEvent(new CustomEvent<SortChangeDetail>('sort-change', {
      detail, bubbles: false, composed: false,
    }));
  }
}
```

Callsites:
- `_onActivateOrCycle` → `this._emit(true, nextDirection)`
- `_onClear` → `this._emit(false, this.direction)` (direction is irrelevant for `[]` but the call site stays simple)

`_onSortChangeFromView` adapts to read `detail.sorts`:
```ts
const sorts = (e as CustomEvent<SortChangeDetail>).detail.sorts;
const mine = sorts.find(s => s.field === this.field);
this.active = !!mine;
if (mine) this.direction = mine.direction;
```

This means: even though button is single-field, it correctly reflects whether ITS field is somewhere in the multi-sort list (matching whichever entry has its field). UX rationale: users keep visual feedback if a multi-sort happens to include the column the button represents.

---

### ADR-6 — Modal stays open while composing

**Decision**: `_onApply(direction)` no longer calls `_closeModal()`. Modal closes only on Escape, backdrop click, close button.

**Rationale**: composing a multi-sort is an iterative task. Closing on each Asc/Desc click would force the user to re-open for each criterion — terrible UX. Already locked in proposal §key-decisions #3.

**Side effect**: the chip behind the modal is always live-updating as the user clicks — visible via `aria-pressed` and the chip's text. Good feedback loop.

---

### ADR-7 — `applySort` algorithm (multi-criterion stable sort)

**Decision**: Single pass with cascading comparator.

```ts
export function applySort<T>(data: T[], sorts: SortCriterion[]): T[] {
  if (sorts.length === 0) return data;             // no-op, same reference
  return [...data].sort((a, b) => {
    for (const { field, direction } of sorts) {
      const aVal = (a as Record<string, unknown>)[field];
      const bVal = (b as Record<string, unknown>)[field];
      let cmp = 0;
      if (aVal == null && bVal == null) cmp = 0;
      else if (aVal == null) cmp = -1;             // null first in BOTH directions
      else if (bVal == null) cmp = 1;
      else if (aVal < bVal) cmp = -1;
      else if (aVal > bVal) cmp = 1;
      if (cmp !== 0) return direction === 'asc' ? cmp : -cmp;
    }
    return 0;                                       // all criteria tied
  });
}
```

Notes:
- **Null handling**: spec §2 mandates "null/undefined sort first regardless of direction". The asymmetric branch (`-1` for `aVal == null`, `1` for `bVal == null`) is INTENTIONALLY before the direction flip and is NOT inverted on `desc`. We achieve "null first always" by short-circuiting return on the null-vs-defined cases — they bypass `direction === 'asc' ? cmp : -cmp`. **Implementation note**: the snippet above does NOT yet implement this correctly — it lets null cases be flipped. Correct version:
  ```ts
  const aNull = aVal == null;
  const bNull = bVal == null;
  if (aNull && bNull) continue;                     // tie on this field
  if (aNull) return -1;                             // null first, ignore direction
  if (bNull) return 1;
  let cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
  if (cmp !== 0) return direction === 'asc' ? cmp : -cmp;
  // tied — fall to next criterion
  ```
  Tasks phase MUST use the corrected version.
- **Stability**: relies on `Array.prototype.sort` stability (ES2019+). All target browsers comply.
- **Empty array**: returns the original reference, NOT a copy. Callers that compare `prev === next` to skip work benefit. Spec §2 explicitly requires this.

---

## 4. Component Changes — File by File

### 4.1 `src/types.ts`

- Replace `SortChangeDetail` union with new interface (see §2.1).
- Add `SortCriterion`, `FvSortCriterion`.
- Update `HeaderMenuElement.currentSort` → `currentSorts: SortCriterion[]`.

### 4.2 `src/utils/sort-filter.ts`

- Change `applySort` signature to `(data: T[], sorts: SortCriterion[]): T[]`.
- Implement per ADR-7 (corrected null handling).
- Re-export `SortCriterion` for convenience (current file re-exports `SortChangeDetail`).

### 4.3 `src/utils/persistence.ts`

- Change `SortState = SortCriterion[]`.
- Rewrite `writeSortToUrl(sorts)`, `readSortFromUrl(): SortCriterion[]`, `clearSortFromUrl()` per ADR-4.
- Update `_parseSortField` (used by `readState`) to handle both legacy single-object and new array. Rename internally to `_parseSortState` for clarity.
- `writeState`/`readState` carry the new `SortState` through transparently.

### 4.4 `src/i18n/en.ts` + `es.ts`

- Add `sort.nSorts: (n: number) => string` per ADR-2.
- Spanish: `(n) => \`${n} ordenamientos\``.
- All other keys preserved.

### 4.5 `src/components/fv-sort-action.ts`

State changes:
- Remove `_activeSort: { field, direction } | null`.
- Add `@state() private _activeSorts: SortCriterion[] = [];`
- `_selectedField: string | null` unchanged.

Method changes:
- `_readSortFromUrl()`: replace inline parse with call to `readSortFromUrl()` from persistence.ts (no longer duplicate logic locally) — this is a cleanup the proposal already implies.
- `_readStorage()`: returns `SortCriterion[]`, supports legacy single-object format (ADR-4).
- `_writeStorage()`: writes `JSON.stringify(this._activeSorts)` or removes when empty.
- `_writePersistence()`: calls `writeSortToUrl(this._activeSorts)` (new signature).
- `_onApply(direction)`: implement append/toggle/replace per spec §4 right-panel rules. Always reassign `_activeSorts` (ADR-1). Emit `{ sorts: [...this._activeSorts] }`. **Do NOT close modal**.
- `_onClear()`: `this._activeSorts = []; this._emit({ sorts: [] }); …focus`.
- `_emit(detail: SortChangeDetail)`: unchanged dispatch logic, just ensure detail shape is `{ sorts }`.
- `connectedCallback` / `_connect()`: hydrate `_activeSorts` from URL > storage > `target.currentSorts`. Same priority order.
- Subscribe handler `_onSortChangeFromView`: read `e.detail.sorts`, replace `_activeSorts` (clone defensively: `_activeSorts = [...detail.sorts]`).

Render changes:
- Chip label per spec §4 table:
  ```ts
  const n = this._activeSorts.length;
  let mainLabel: string;
  if (n === 0) mainLabel = i18n.sort.title ?? 'Sort';
  else if (n === 1) {
    const s = this._activeSorts[0];
    const title = this._registerOrder.find(f => f.field === s.field)?.title ?? s.field;
    const dir = s.direction === 'asc' ? i18n.sort.asc : i18n.sort.desc;
    mainLabel = `${title} - ${dir}`;
  } else {
    const first = this._activeSorts[0];
    const title = this._registerOrder.find(f => f.field === first.field)?.title ?? first.field;
    mainLabel = `${title} +${n - 1}`;
  }
  const hasSort = n > 0;
  ```
- Field item in left panel: render badge `[idx+1]` if field is in `_activeSorts`. `aria-pressed = activeSorts.some(s => s.field === f.field)`.
- Right panel: `_selectedField` drives Asc/Desc buttons. `aria-pressed` for each direction button: `activeSorts.some(s => s.field === _selectedField && s.direction === 'asc')` (resp. `'desc'`).

### 4.6 `src/components/fv-sort-button.ts`

- `_emit` reshape per ADR-5.
- `_onSortChangeFromView` reads `detail.sorts` and looks up own field.
- Initial hydration: read `(target as any).currentSorts as SortCriterion[]`, find own field, set `active`/`direction` accordingly.

### 4.7 `src/components/fv-view.ts`

- Replace `@state() private _sortConfig: SortChangeDetail | null = null;` with `@state() private _sortCriteria: SortCriterion[] = [];`.
- Replace `get currentSort()` with `get currentSorts(): SortCriterion[] { return [...this._sortCriteria]; }`.
- `_onSortChange = (e) => { this._sortCriteria = [...e.detail.sorts]; this._emitStateEvent('fv-sort-change', { sorts: this._sortCriteria }); }`.
- All sites that built `{ field, direction }` from `_sortConfig` and passed to header-menu hydration (lines ~132, ~273, ~427, ~437) must be reworked to pass arrays. Specifically `menu.currentSort = …` becomes `menu.currentSorts = this._sortCriteria`.
- Internal hash-listener and storage-poller paths (lines 317, 341, 374, 437) currently set `this._sortConfig = { field, direction }`. They become `this._sortCriteria = readSortFromUrl()` (already returns `SortCriterion[]`) — single source for parsing.
- `_processedData` getter: `applySort(applyFilters(this._registers, this._filters), this._sortCriteria)`.

---

## 5. Lit Rendering Strategy

Lit re-renders when a `@state()` or `@property()` value changes, using **strict identity** comparison by default. Therefore:

1. `_activeSorts` and `_sortCriteria` MUST always be reassigned (ADR-1). Mutation in place breaks rendering.
2. `requestUpdate()` is NOT needed when reassigning — Lit picks up the change automatically.
3. `requestUpdate()` IS still needed for the imperative setter on `registerOrder` (it's a property setter, not `@state`), as already in the current code.
4. Defensive copies on event detail boundaries: when reading `e.detail.sorts` from outside, do `[...detail.sorts]` so we don't pin a foreign array reference whose mutation would cause subtle state corruption.

**Memo not needed**: arrays are tiny (≤ ~5 entries typical, ≤ N columns max). No `lit/directives/repeat` keying concerns since the chip label/badges render directly from indexes.

---

## 6. Test Strategy

Strict TDD is active (`pnpm test`). New / modified tests:

| File | Action |
|------|--------|
| `src/utils/sort-filter.test.ts` | ADD multi-criterion tests: empty array no-op, single criterion, two-criterion tiebreak, null-first invariant in both directions, three-criterion cascade |
| `src/utils/persistence.test.ts` | UPDATE URL round-trip: multi-sort write+read, legacy `name:asc` read produces 1-item array, `field` with comma is round-tripped via percent-encoding, invalid token dropped |
| `src/components/fv-sort-action.test.ts` | REWRITE around the 16 spec scenarios. Each spec scenario maps 1:1 to a `it()` block. |
| `src/components/fv-sort-button.test.ts` | UPDATE emit assertions: expect `{ sorts: [{...}] }` and `{ sorts: [] }` instead of `{ field, direction }` and `{ field: '', direction: null }` |
| `src/components/fv-view.test.ts` | UPDATE `_onSortChange` tests to dispatch new event shape. ADD multi-sort applied to `_processedData`. ADD `currentSorts` getter test. |

Tests to REMOVE:
- Any test asserting `currentSort` returns `{ field, direction }` (replaced by `currentSorts: SortCriterion[]`).
- Any test asserting old `applySort(data, {field, direction})` signature.

Test scaffolding pattern (Lit):
```ts
const el = await fixture<FvSortAction>(html`
  <fv-sort-action .registerOrder=${[{field:'name',title:'Name'},{field:'role',title:'Role'}]}></fv-sort-action>
`);
// Open modal, click field, click Asc, assert _activeSorts and emitted event.
```

---

## 7. Migration Notes (consumer-facing)

A consumer upgrading from the current version to multi-sort-action MUST:

1. **Event listeners**: replace `e.detail.field` / `e.detail.direction` with `e.detail.sorts[0]?.field` / `e.detail.sorts[0]?.direction`. An empty array means "cleared".
2. **Property reads on `<fv-view>`**: rename `el.currentSort` to `el.currentSorts` (now `SortCriterion[]`).
3. **Direct `applySort` callers** (rare — internal helper): wrap the old config in an array: `applySort(data, [{field, direction}])` instead of `applySort(data, {field, direction})`.
4. **URL hash**: existing `#fv-sort=name:asc` URLs continue to work via the legacy parse path — no action needed.
5. **localStorage**: existing single-object entries auto-migrate on next read into `[obj]` — no action needed.

Major version bump required (proposal §key-decisions #1, spec §breaking-change-notice).

---

## 8. Risks and Open Questions

- **Risk — UX confusion when modal stays open**: users may not realize the chip is updating live. Mitigation: chip label is visible behind the backdrop blur but partially obscured by modal. If user testing flags this, add an explicit "Done" footer button. Out of scope for v1 (proposal §learned).
- **Risk — Sort badges in left panel competing visually with `aria-pressed` highlight**: the `[1]`, `[2]` badges and the dark-on-active state may stack awkwardly. Mitigation: render badge as a small numbered pill at the right edge of the field item; existing CSS doesn't reserve space — must be added in the implementation, but trivial.
- **Open question — `fv-sort-button` direction memory after multi-sort clears its field**: when a multi-sort removes the button's field, should the button keep its last `direction` for next click, or reset to default `'asc'`? Current single-sort code keeps it (the `direction` prop survives `clear`). Decision: PRESERVE existing behavior — `_onSortChangeFromView` only resets `active`, never touches `direction` on absence.
- **Assumption requiring validation in apply phase**: there is no test today exercising `_storagePoller` cross-tab sync for sort. The new array shape needs at least one cross-tab parity test. Listed as a task.

---

## 9. Out of Scope (deferred)

- Drag-to-reorder priority within the modal (proposal §key-decisions #2).
- "Done" footer button on modal (see §8).
- Per-field default direction memory in `fv-sort-action` (only `fv-sort-button` has `direction` prop today).
- Animated transition of the chip label between 0/1/N states.

---
