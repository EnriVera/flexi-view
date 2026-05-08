# Tasks — multi-sort-action

**Change**: multi-sort-action
**Delivery strategy**: single-pr
**TDD mode**: strict (RED → GREEN required for every production change)
**Test command**: `pnpm test`

---

## Dependency Graph

```
T-01 types.ts ──────────────────────────────────────────→ all tasks ✅
T-02 sort-filter.test.ts ──────────────────────────────✅─→ T-03 ✅
T-03 sort-filter.ts ──────────────────────────────────✅──(after T-02) ✅
T-04 persistence.test.ts ──────────────────────────────✅─→ T-05 ✅
T-05 persistence.ts ──────────────────────────────────✅──(after T-04) ✅
T-06 i18n en.ts + es.ts ────────────────────────────✅─→ T-07 ✅
T-07 fv-sort-action.test.ts ────────────────────────✅→ T-08 ✅
T-08 fv-sort-action.ts ────────────────────────────✅──(after T-07) ✅
T-09 fv-sort-button.test.ts ──────────────────────✅→ T-10 ✅
T-10 fv-sort-button.ts ──────────────────────────✅──(after T-09) ✅
T-11 fv-view.test.ts ──────────────────────────✅→ T-12 ✅
T-12 fv-view.ts ──────────────────────────────────✅──(after T-11) ✅
```
T-01 types.ts ──────────────────────────────────────────→ all tasks
T-02 sort-filter.test.ts ──────────────────────────────→ T-03
T-03 sort-filter.ts ────────────────────────────────────(after T-02)
T-04 persistence.test.ts ──────────────────────────────→ T-05
T-05 persistence.ts ────────────────────────────────────(after T-04)
T-06 i18n en.ts + es.ts ────────────────────────────────→ T-07
T-07 fv-sort-action.test.ts ───────────────────────────→ T-08
T-08 fv-sort-action.ts ─────────────────────────────────(after T-07)
T-09 fv-sort-button.test.ts ───────────────────────────[x]→ T-10
T-10 fv-sort-button.ts ───────────────────────────────[x]──(after T-09)
T-11 fv-view.test.ts ─────────────────────────────────[x]→ T-12
T-12 fv-view.ts ──────────────────────────────────────[x]──(after T-11)
```

Parallel windows:
- T-03 and T-05 can execute in parallel (after their respective test tasks and after T-01).
- T-08, T-10, T-12 can execute in parallel once their respective test tasks are done and T-01 is done.

---

## Tasks

---

### T-01 — Update `src/types.ts` [BREAKING, no test file] ✅

**Spec**: §1
**Prereqs**: none
**Parallel after**: —
**Sequential before**: all other tasks

**What to change**:

1. Add new interface:
   ```ts
   export interface SortCriterion { field: string; direction: 'asc' | 'desc'; }
   export type FvSortCriterion = SortCriterion;
   ```
2. Replace `SortChangeDetail`:
   ```ts
   // OLD: export type SortChangeDetail = { field: string; direction: 'asc' | 'desc' | null };
   export type SortChangeDetail = { sorts: SortCriterion[] };
   export type FvSortChangeDetail = SortChangeDetail;
   ```
3. Replace `HeaderMenuElement.currentSort: SortChangeDetail | null` with `currentSorts: SortCriterion[]` (ADR-3 — no alias, pre-1.0 full break).

**ADR ref**: ADR-3 (no backward-compat alias — pre-1.0).

**Note**: No dedicated test file for types.ts. Downstream tests will catch type errors. TypeScript compilation is the gate here.

---

### T-02 — Write RED tests: `src/__tests__/unit/sort-filter.test.ts` ✅

**Spec**: §2
**Prereqs**: T-01
**Parallel after**: T-01
**Sequential before**: T-03

**What to add / change**:

Remove existing single-criterion call tests that use the old signature `applySort(items, { field, direction })` — they will be replaced.

Add the following RED `it()` blocks (they must FAIL on the current `sort-filter.ts`):

1. `'empty sorts array returns same data reference (no-op)'`
   - `applySort(items, [])` → `toBe(items)` (same reference, not a copy)
2. `'single criterion sort asc by name'`
   - `applySort(items, [{ field: 'name', direction: 'asc' }])` → `['Alice', 'Bob', 'Charlie']`
3. `'single criterion sort desc by name'`
   - `applySort(items, [{ field: 'name', direction: 'desc' }])` → `['Charlie', 'Bob', 'Alice']`
4. `'does not mutate original array (multi-sig)'`
   - Original array unchanged after `applySort(items, [{ field: 'name', direction: 'asc' }])`
5. `'two-criterion tiebreak: role asc then name desc'`
   - Data with duplicate roles → tied rows ordered by name desc
6. `'null field value sorts first in asc'`
   - Row with `null` field → appears before defined-value rows when `direction: 'asc'`
7. `'null field value sorts first in desc'`
   - Row with `null` field → still appears first when `direction: 'desc'` (null-first invariant per ADR-7)
8. `'three-criterion cascade'`
   - Three-level stable sort applies criteria in order (index 0 = primary)

Remove (or replace) old tests that call old `null`-config signature.

---

### T-03 — Implement `src/utils/sort-filter.ts` ✅

**Spec**: §2
**Prereqs**: T-02
**Parallel after**: T-04/T-05 (can run in parallel with persistence pair)
**Sequential before**: T-08, T-10, T-12

**What to change**:

1. Remove old import `import type { SortChangeDetail } from '../types.js'` and related re-export.
2. Add import: `import type { SortCriterion } from '../types.js'`.
3. Replace `applySort` signature and body:

```ts
export function applySort<T>(data: T[], sorts: SortCriterion[]): T[] {
  if (sorts.length === 0) return data;   // same reference, no copy
  return [...data].sort((a, b) => {
    for (const { field, direction } of sorts) {
      const aVal = (a as Record<string, unknown>)[field];
      const bVal = (b as Record<string, unknown>)[field];
      if (aVal == null && bVal == null) continue;
      if (aVal == null) return -1;       // null-first, always
      if (bVal == null) return 1;        // null-first, always
      let cmp = 0;
      if (aVal < bVal) cmp = -1;
      else if (aVal > bVal) cmp = 1;
      if (cmp !== 0) return direction === 'asc' ? cmp : -cmp;
    }
    return 0;
  });
}
```

**ADR ref**: ADR-7 (null-first short-circuits BEFORE direction flip; cascading comparator; stable sort).

4. Keep `applyFilters` unchanged.
5. Remove the re-export `export type { SortChangeDetail }` if present.

---

### T-04 — Write RED tests: `src/__tests__/unit/persistence.test.ts` [x]

**Spec**: §7 (URL and localStorage multi-sort requirements)
**Prereqs**: T-01
**Parallel after**: T-01 (can run in parallel with T-02)
**Sequential before**: T-05

**What to add**:

Add a new `describe('Sort persistence — multi-sort')` block with RED `it()` blocks:

**URL tests** (update existing `URL sort sync` describe or add sub-describe):
1. `'writeSortToUrl with multi-sort encodes comma-separated field:direction pairs'`
   - `writeSortToUrl([{ field: 'role', direction: 'asc' }, { field: 'name', direction: 'desc' }])` → hash contains `fv-sort=role:asc,name:desc`
2. `'writeSortToUrl with empty array clears fv-sort param'`
   - `writeSortToUrl([])` → `fv-sort` param absent from hash
3. `'readSortFromUrl parses multi-sort comma-separated string'`
   - hash `#fv-sort=role:asc,name:desc` → `[{ field: 'role', direction: 'asc' }, { field: 'name', direction: 'desc' }]`
4. `'readSortFromUrl returns empty array when no param'`
   - hash `#` → `[]`
5. `'readSortFromUrl legacy single-criterion format parses as length-1 array'`
   - hash `#fv-sort=name:asc` → `[{ field: 'name', direction: 'asc' }]`
6. `'readSortFromUrl silently drops invalid tokens'`
   - hash `#fv-sort=role:asc,badtoken,name:desc` → `[{ field: 'role', direction: 'asc' }, { field: 'name', direction: 'desc' }]`
7. `'readSortFromUrl handles percent-encoded field with comma'`
   - hash with `fv-sort=first%2Clast:asc` → field is `first,last`, direction `asc`

**localStorage tests** (update `_readStorage` / `_writeStorage` in `fv-sort-action.test.ts` — see T-07; these tests belong in persistence.test.ts only if `_parseSortState` is exported from persistence.ts):
- If `_parseSortState` is kept private to `fv-sort-action.ts`, those localStorage migration tests live in T-07 instead.

**Update** existing `writeSortToUrl` and `readSortFromUrl` tests to match new multi-sort array signatures — the old `writeSortToUrl('name', 'asc')` two-arg call no longer exists.

Remove old single-sort `URL sort sync` tests that use the removed two-arg signature.

---

### T-05 — Implement `src/utils/persistence.ts` [x]

**Spec**: §7
**Prereqs**: T-04
**Parallel after**: T-03 (can run in parallel)
**Sequential before**: T-08, T-12

**What to change**:

1. Replace `SortState` with `SortCriterion[]`-compatible type. `SortState` interface is now obsolete; `PersistedState.sort` remains as `{ field: string; direction: 'asc' | 'desc' } | null` (used by `fv-view` writeState/readState which still writes a single-sort snapshot — fv-view migration handles this in T-12).

2. Replace `writeSortToUrl(field, direction)` two-arg signature:
   ```ts
   export function writeSortToUrl(sorts: SortCriterion[]): void {
     const params = _getHashParams();
     if (sorts.length === 0) {
       params.delete('fv-sort');
     } else {
       params.set('fv-sort', sorts.map(s => encodeURIComponent(s.field) + ':' + s.direction).join(','));
     }
     _setHashParams(params);
   }
   ```
3. Remove `clearSortFromUrl()` — callers now pass `[]` to `writeSortToUrl`.
   - If removing causes import errors in `fv-view.ts` or `fv-sort-action.ts`, keep a deprecated shim or update callers in T-08/T-12.
4. Replace `readSortFromUrl(): SortState | null` with:
   ```ts
   export function readSortFromUrl(): SortCriterion[] {
     const params = _getHashParams();
     const raw = params.get('fv-sort');
     if (!raw) return [];
     return raw.split(',').reduce<SortCriterion[]>((acc, token) => {
       const colonIdx = token.lastIndexOf(':');
       if (colonIdx <= 0) return acc;
       const field = decodeURIComponent(token.slice(0, colonIdx));
       const direction = token.slice(colonIdx + 1);
       if (direction === 'asc' || direction === 'desc') acc.push({ field, direction });
       return acc;
     }, []);
   }
   ```
   - Legacy single-criterion `name:asc` (no comma) parses naturally through the `split(',')` path as a 1-element array.
5. Rename `_parseSortField` → `_parseSortState` (internal, returns `SortCriterion[] | null` or keep as single-sort for `readState` — see note below). `readState` is used by `fv-view` for its own `_sortConfig`; fv-view T-12 migrates to `_sortCriteria` which reads via `readSortFromUrl()` directly instead. Leave `readState` sort field as-is for now unless fv-view.ts calls are also updated in T-12.

**ADR ref**: ADR-4.

---

### T-06 — Update `src/i18n/en.ts` and `src/i18n/es.ts` ✅

**Spec**: §3
**Prereqs**: T-01
**Parallel after**: T-01 (can run in parallel with T-02/T-04)
**Sequential before**: T-07

**What to change**:

`src/i18n/en.ts` — add to `sort` object:
```ts
nSorts: (n: number) => `${n} sorts`,
```

`src/i18n/es.ts` — add to `sort` object:
```ts
nSorts: (n: number) => `${n} ordenamientos`,
```

**Important (ADR-2)**: The key is a function, not a string. `Translations` type is derived from `typeof en`, so TypeScript picks up the `(n: number) => string` signature automatically. `es.ts` already imports `Translations` from `en.ts` — the compiler will enforce the same shape.

All existing keys (`title`, `selectField`, `asc`, `desc`, `clear`) must remain unchanged.

---

### T-07 — Write RED tests: `src/__tests__/components/fv-sort-action.test.ts` ✅

**Spec**: §4, §7 (fv-sort-action persistence)
**Prereqs**: T-01, T-06
**Parallel after**: T-03, T-05 done (so type and util contracts are stable)
**Sequential before**: T-08

**Strategy**: This is a REWRITE of the existing test file. The current tests use the old `_activeSort: { field, direction } | null` shape. All 16 spec scenarios must be covered 1:1 with `it()` blocks.

**Remove**:
- All tests that reference `_activeSort` as a single object (not array).
- Tests asserting `detail.field` / `detail.direction` on emitted events directly (now `detail.sorts`).
- Tests asserting `_onApply` closes the modal (modal now stays open per ADR-6).
- Tests asserting `_onClear` emits `{ field: '', direction: null }`.
- Hydration tests that read `currentSort` (now `currentSorts`).
- `_readStorage`/`_writeStorage` tests that use single-object shape.

**Add (RED, must fail before T-08)**:

Group 1 — State and chip label:
1. `'chip label is t().sort.title when _activeSorts is []'`
2. `'aria-pressed is false when _activeSorts is []'`
3. `'no clear button when _activeSorts is []'`
4. `'chip label is "Name - Ascending" when _activeSorts has one entry'`
5. `'aria-pressed is true when _activeSorts has one entry'`
6. `'chip label is "Name +1" when _activeSorts has two entries'`
7. `'chip label is "firstField +2" when _activeSorts has three entries'`

Group 2 — Modal stays open (ADR-6):
8. `'_onApply keeps modal open after applying a direction'`
   - `_modalOpen` remains `true` after `_onApply('asc')`

Group 3 — Right panel apply logic:
9. `'_onApply appends new sort when field not in _activeSorts'`
   - `_activeSorts = [{role,asc}]`, apply `name:asc` → `[{role,asc},{name,asc}]`
10. `'_onApply toggles off when same field+direction'`
    - `_activeSorts = [{name,asc}]`, apply `name:asc` → `[]`; `sort-change` emits `{ sorts: [] }`
11. `'_onApply replaces direction, preserves position'`
    - `_activeSorts = [{role,asc},{name,asc}]`, apply `name:desc` → `[{role,asc},{name,desc}]`; name stays at index 1

Group 4 — Left panel badges:
12. `'unactive field has no badge and aria-pressed false on field item'`
13. `'active field shows 1-based position badge'`
    - `_activeSorts = [{role,asc},{name,asc}]` → role shows `[1]`, name shows `[2]`

Group 5 — Clear:
14. `'_onClear sets _activeSorts=[] and emits { sorts: [] }'`
15. `'_onClear focuses main chip button'`

Group 6 — Event shape:
16. `'sort-change event detail has { sorts: SortCriterion[] } shape'`

Group 7 — Persistence (localStorage multi-sort):
17. `'_readStorage returns [] when key absent'`
18. `'_readStorage parses SortCriterion[] from JSON array'`
19. `'_readStorage migrates legacy single-object to length-1 array'`
    - `localStorage` has `{ field: 'name', direction: 'asc' }` (not array) → result is `[{ field: 'name', direction: 'asc' }]`
20. `'_readStorage drops invalid entries'`
21. `'_writeStorage writes JSON array when _activeSorts is non-empty'`
22. `'_writeStorage removes key when _activeSorts is []'`

Group 8 — Hydration:
23. `'_connect hydrates _activeSorts from URL (multi-sort)'`
    - hash `#fv-sort=role:asc,name:desc` → `_activeSorts` has two entries
24. `'_connect URL takes priority over localStorage'`
25. `'_connect hydrates from localStorage when no URL sort'`
26. `'_connect reads currentSorts (not currentSort) from target'`
    - `target.currentSorts = [{ field: 'name', direction: 'asc' }]` → used as fallback
27. `'_connect emits sort-change with { sorts } on hydration'`

Group 9 — Inbound sync:
28. `'fv-sort-change event from target updates _activeSorts (defensive copy)'`
    - Event carries `{ sorts: [{field,direction}] }` → `_activeSorts` is a new array reference

Group 10 — Keyboard:
29. `'Escape closes modal, does not emit sort-change'`
30. `'ArrowDown cycles focus through field items, wraps at end'`
    - Mock `renderRoot.querySelectorAll` to return 3 button stubs with `focus` spies

Keep existing tests that remain valid:
- `registerOrder` property tests (array and JSON string parsing)
- `_openModal` guard (double-call no-op)
- `warns when target not found`
- `subscribeConfig` wiring

---

### T-08 — Implement `src/components/fv-sort-action.ts` ✅

**Spec**: §4, §7
**Prereqs**: T-07, T-01, T-03, T-05, T-06
**Parallel after**: T-10, T-12
**Sequential before**: —

**What to change** (make T-07 tests GREEN):

1. **State**:
   - Remove `@state() private _activeSort: { field: string; direction: 'asc' | 'desc' } | null = null`
   - Add `@state() private _activeSorts: SortCriterion[] = []`

2. **Import updates**:
   - Import `SortCriterion` instead of `SortChangeDetail` from `../types.js`
   - Import `writeSortToUrl` new signature (array-based); remove `clearSortFromUrl` import

3. **Chip label logic** (in `render()`):
   ```ts
   const hasSort = this._activeSorts.length > 0;
   let mainLabel: string;
   if (!hasSort) {
     mainLabel = i18n.sort.title ?? 'Sort';
   } else if (this._activeSorts.length === 1) {
     const s = this._activeSorts[0];
     const fieldTitle = this._registerOrder.find(f => f.field === s.field)?.title ?? s.field;
     const dirLabel = s.direction === 'asc' ? i18n.sort.asc : i18n.sort.desc;
     mainLabel = `${fieldTitle} - ${dirLabel}`;
   } else {
     const firstTitle = this._registerOrder.find(f => f.field === this._activeSorts[0].field)?.title ?? this._activeSorts[0].field;
     mainLabel = `${firstTitle} +${this._activeSorts.length - 1}`;
   }
   ```

4. **Field item badge** in left panel:
   ```ts
   const sortIndex = this._activeSorts.findIndex(s => s.field === f.field);
   const badge = sortIndex >= 0 ? ` [${sortIndex + 1}]` : '';
   // aria-pressed = sortIndex >= 0
   ```

5. **Dir button aria-pressed** in right panel:
   ```ts
   const existing = this._activeSorts.find(s => s.field === this._selectedField);
   // asc button: aria-pressed = existing?.direction === 'asc'
   // desc button: aria-pressed = existing?.direction === 'desc'
   ```

6. **`_onApply(direction)`** — modal stays open (ADR-6), append/toggle/replace logic:
   ```ts
   private _onApply(direction: 'asc' | 'desc') {
     if (!this._selectedField) return;
     const idx = this._activeSorts.findIndex(s => s.field === this._selectedField);
     if (idx === -1) {
       this._activeSorts = [...this._activeSorts, { field: this._selectedField!, direction }];
     } else if (this._activeSorts[idx].direction === direction) {
       this._activeSorts = this._activeSorts.filter((_, i) => i !== idx);
     } else {
       this._activeSorts = this._activeSorts.map((s, i) =>
         i === idx ? { ...s, direction } : s
       );
     }
     this._emit({ sorts: [...this._activeSorts] });
     this._writePersistence();
     // Do NOT call _closeModal — modal stays open
   }
   ```

7. **`_onClear`**:
   ```ts
   private _onClear = () => {
     this._activeSorts = [];
     this._emit({ sorts: [] });
     this._writePersistence();
     this.updateComplete.then(() => {
       this.renderRoot.querySelector<HTMLButtonElement>('button.main')?.focus();
     });
   };
   ```

8. **`_emit(detail)`** — signature changes to `SortChangeDetail`:
   ```ts
   private _emit(detail: SortChangeDetail) { // { sorts: SortCriterion[] }
     this.dispatchEvent(new CustomEvent<SortChangeDetail>('sort-change', { detail, bubbles: true, composed: true }));
     if (this._target) {
       this._target.dispatchEvent(new CustomEvent<SortChangeDetail>('sort-change', { detail, bubbles: false, composed: false }));
     }
   }
   ```

9. **`_openModal`** — pre-select first active sort's field (or null):
   ```ts
   this._selectedField = this._activeSorts[0]?.field ?? null;
   ```

10. **`_connect()`** hydration priority (URL > localStorage > `target.currentSorts`):
    ```ts
    const urlSorts = this._readSortFromUrl();    // returns SortCriterion[]
    const stored = this.storageKey ? this._readStorage() : null; // returns SortCriterion[] | null
    const viewSorts = (target as any).currentSorts as SortCriterion[] | undefined;

    if (urlSorts.length > 0) {
      this._activeSorts = urlSorts;
    } else if (stored && stored.length > 0) {
      this._activeSorts = stored;
    } else if (viewSorts && viewSorts.length > 0) {
      this._activeSorts = [...viewSorts];
    }
    if (this._activeSorts.length > 0) {
      this._emit({ sorts: [...this._activeSorts] });
    }
    ```

11. **`_readStorage()`** — multi-sort with legacy migration:
    ```ts
    private _readStorage(): SortCriterion[] | null {
      if (!this.storageKey) return null;
      try {
        const raw = localStorage.getItem(`${this.storageKey}-sort`);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        // Legacy: single object { field, direction }
        const arr = Array.isArray(parsed) ? parsed : [parsed];
        const valid = arr.filter(
          (s: unknown): s is SortCriterion =>
            typeof (s as any)?.field === 'string' &&
            ((s as any)?.direction === 'asc' || (s as any)?.direction === 'desc')
        );
        return valid.length > 0 ? valid : null;
      } catch { return null; }
    }
    ```

12. **`_writeStorage()`**:
    ```ts
    private _writeStorage() {
      if (!this.storageKey) return;
      if (this._activeSorts.length > 0) {
        localStorage.setItem(`${this.storageKey}-sort`, JSON.stringify(this._activeSorts));
      } else {
        localStorage.removeItem(`${this.storageKey}-sort`);
      }
    }
    ```

13. **`_readSortFromUrl()`** — delegate to `readSortFromUrl()` from persistence.ts (returns `SortCriterion[]`).

14. **`_writePersistence()`**:
    ```ts
    private _writePersistence() {
      this._writeStorage();
      if (this.syncUrl && !this._targetOwnsUrl) {
        writeSortToUrl(this._activeSorts);   // new array signature
      }
    }
    ```

15. **Inbound sync listener** (`_onSortChangeFromView`):
    ```ts
    const detail = (e as CustomEvent<SortChangeDetail>).detail;
    this._activeSorts = detail?.sorts ? [...detail.sorts] : [];
    this.requestUpdate();
    this._writePersistence();
    ```

---

### T-09 — Write RED tests: `src/__tests__/components/fv-sort-button.test.ts` [x]

**Spec**: §5
**Prereqs**: T-01
**Parallel after**: T-01
**Sequential before**: T-10

**What to change**:

Update the following existing tests to assert the new `{ sorts: [...] }` event detail shape (they currently pass because the old shape has `field` and `direction` at top level — they will RED once T-10 changes `_emit`):

1. `'dispatches sort-change with asc direction when direction is asc'`
   - Now assert: `event.detail.sorts[0].field === 'name'` and `event.detail.sorts[0].direction === 'asc'`
2. `'dispatches sort-change with desc direction'`
   - Assert `event.detail.sorts[0].direction === 'desc'`
3. `'cycle asc → desc emits desc'`
   - Assert `event.detail.sorts[0].direction === 'desc'`
4. `'clear emits null direction and sets active=false'`
   - Now assert: `event.detail.sorts` is `[]` (empty array, not `direction: null`)
5. `'clear forwards null event to target in external mode'`
   - Assert target event detail: `{ sorts: [] }`
6. `'dispatches sort-change on self AND on target'`
   - Assert `selfEvent.detail.sorts[0].field === 'age'`

Add new tests:
7. `'event detail shape is { sorts: [{ field, direction }] } when active'`
8. `'event detail shape is { sorts: [] } when cleared'`
9. `'inbound fv-sort-change: button activates if its field is in detail.sorts'`
   - `detail = { sorts: [{ field: 'name', direction: 'asc' }] }` with `el.field = 'name'` → `el.active = true`, `el.direction = 'asc'`
10. `'inbound fv-sort-change: button deactivates if its field is not in detail.sorts'`
    - `detail = { sorts: [{ field: 'other', direction: 'asc' }] }` → `el.active = false`
11. `'inbound fv-sort-change: button deactivates when sorts is []'`
    - `detail = { sorts: [] }` → `el.active = false`
12. `'initial hydration reads from currentSorts (not currentSort)'`
    - `target.currentSorts = [{ field: 'name', direction: 'asc' }]` → `el.active = true`

---

### T-10 — Implement `src/components/fv-sort-button.ts` [x]

**Spec**: §5
**Prereqs**: T-09, T-01
**Parallel after**: T-08, T-12
**Sequential before**: —

**What to change** (ADR-5 — emit reshape only; internal `_activeSort` stays):

1. Update import: `SortChangeDetail` now has shape `{ sorts: SortCriterion[] }`.

2. **`_emit` method** — reshape output:
   ```ts
   private _emit(field: string, direction: 'asc' | 'desc' | null) {
     const detail: SortChangeDetail = direction
       ? { sorts: [{ field, direction }] }
       : { sorts: [] };
     this.dispatchEvent(new CustomEvent<SortChangeDetail>('sort-change', { detail, bubbles: true, composed: true }));
     if (this._target) {
       this._target.dispatchEvent(new CustomEvent<SortChangeDetail>('sort-change', { detail, bubbles: false, composed: false }));
     }
   }
   ```

3. Update `_onActivateOrCycle` to call `_emit(this.field, nextDirection)` and `_onClear` to call `_emit(this.field, null)`.

4. **`_onSortChangeFromView` subscriber** — reads `detail.sorts.find(s => s.field === this.field)`:
   ```ts
   this._onSortChangeFromView = (e: Event) => {
     const detail = (e as CustomEvent<SortChangeDetail>).detail;
     const match = detail?.sorts?.find(s => s.field === this.field);
     if (match) {
       this.active = true;
       this.direction = match.direction;
     } else {
       this.active = false;
       // preserve this.direction (per ADR-5 / existing behavior)
     }
     this.requestUpdate();
   };
   ```

5. **`_connect` hydration** — read from `currentSorts` (not `currentSort`):
   ```ts
   const currentSorts = (target as any).currentSorts as SortCriterion[] | undefined;
   const match = currentSorts?.find(s => s.field === this.field);
   if (match) {
     this.active = true;
     this.direction = match.direction;
   }
   ```

---

### T-11 — Write RED tests: `src/__tests__/components/fv-view.test.ts` ✅

**Spec**: §6
**Prereqs**: T-01, T-03
**Parallel after**: T-01, T-03
**Sequential before**: T-12

**What to change / add**:

Remove / update tests that use old shapes:

1. Update `'emits fv-sort-change when _onSortChange is called with a sort direction'`
   - Input event detail: `{ sorts: [{ field: 'name', direction: 'asc' }] }`
   - Assert `fv-sort-change` detail is `{ sorts: [{field:'name',direction:'asc'}] }`

2. Update `'emits fv-sort-change with null detail when sort is cleared'`
   - Input event detail: `{ sorts: [] }`
   - Assert `fv-sort-change` detail is `{ sorts: [] }` (not `null`)

3. Update `'_persistPayload generates correct payload'`
   - `_sortCriteria = [{ field: 'name', direction: 'asc' }]` → `payload.sort` is still `{ field: 'name', direction: 'asc' }` (single-sort snapshot for storage compat)

4. Update `'currentSort returns _sortConfig'` → rename to cover `currentSorts`:
   - Remove: `'currentSort returns _sortConfig'` test
   - Add: `'currentSorts returns _sortCriteria array'`
   - Add: `'currentSorts returns [] when no sort configured'`
   - Keep: `'currentSort returns first entry of _sortCriteria (backward-compat alias)'` — only if ADR-3 says NO alias; if no alias, remove the currentSort getter test entirely.
     - **Per ADR-3**: no alias. Remove `currentSort` getter tests. Add `currentSorts` tests.

Add new RED tests:

5. `'_processedData calls applySort with _sortCriteria array'`
   - `_sortCriteria = [{ field: 'role', direction: 'asc' }, { field: 'name', direction: 'desc' }]`
   - Two rows with same role → ordered by name desc for ties

6. `'_onSortChange stores detail.sorts as _sortCriteria'`
   - Input: `{ sorts: [{ field: 'name', direction: 'asc' }] }` → `_sortCriteria` equals that array

7. `'fv-sort-change emitted after _onSortChange with new sorts shape'`
   - Confirm outbound event carries `{ sorts: [...] }`

8. `'_checkStorageChange updates _sortCriteria from saved sort'`
   - Saved sort `{ field: 'name', direction: 'asc' }` in localStorage → `_sortCriteria` becomes `[{ field: 'name', direction: 'asc' }]`

9. `'_onHashChange reads multi-sort from URL'`
   - Hash `#fv-sort=role:asc,name:desc` → `_sortCriteria` has two entries; `fv-sort-change` emitted

10. `'header menu receives currentSorts (not currentSort)'`
    - When `_onHeaderMenuOpen` fires, `menu.currentSorts` is set; `menu.currentSort` is not set

---

### T-12 — Implement `src/components/fv-view.ts` ✅

**Spec**: §6
**Prereqs**: T-11, T-01, T-03, T-05
**Parallel after**: T-08, T-10
**Sequential before**: —

**What to change** (make T-11 tests GREEN):

1. **State**:
   - Remove `@state() private _sortConfig: SortChangeDetail | null = null`
   - Add `@state() private _sortCriteria: SortCriterion[] = []`

2. **Import update**:
   - Add `SortCriterion` to types import
   - Remove `SortChangeDetail` from types import (or keep only if needed for event typing — it still exists, now means `{ sorts: SortCriterion[] }`)
   - Remove `clearSortFromUrl` import; `writeSortToUrl` now takes `SortCriterion[]`

3. **`currentSort` getter** — REMOVED per ADR-3. Delete the getter.

4. **`currentSorts` getter**:
   ```ts
   get currentSorts(): SortCriterion[] { return this._sortCriteria; }
   ```

5. **`_processedData`**:
   ```ts
   private get _processedData(): T[] {
     return applySort(applyFilters(this._registers, this._filters), this._sortCriteria);
   }
   ```

6. **`_onSortChange`**:
   ```ts
   private _onSortChange = (e: Event) => {
     const detail = (e as CustomEvent<SortChangeDetail>).detail;
     this._sortCriteria = detail?.sorts ? [...detail.sorts] : [];
     if (this.syncUrl) writeSortToUrl(this._sortCriteria);
     this._emitStateEvent('fv-sort-change', { sorts: this._sortCriteria });
     if (this.storageKey) {
       writeState(this.storageKey, this._persistPayload);
       this._lastStorageValue = localStorage.getItem(this.storageKey) || '';
     }
   };
   ```

7. **`_persistPayload`** — keep writing single-sort snapshot for storage backward compat:
   ```ts
   const sort = this._sortCriteria.length > 0
     ? { field: this._sortCriteria[0].field, direction: this._sortCriteria[0].direction }
     : null;
   ```

8. **`connectedCallback`** — replace `_sortConfig` hydration:
   - Read from `readSortFromUrl()` (array) for URL path; store first entry or full array in `_sortCriteria`
   - Read from `saved.sort` (single-sort legacy) → wrap as `[saved.sort]`
   - Replace all `this._sortConfig = ...` with `this._sortCriteria = ...`

9. **`_onHashChange`** — replace sort parsing:
   ```ts
   const urlSorts = readSortFromUrl(); // new array return
   if (urlSorts.length > 0) {
     this._sortCriteria = urlSorts;
     this._emitStateEvent('fv-sort-change', { sorts: this._sortCriteria });
   }
   ```
   Remove old manual `split(':')` inline parsing.

10. **`_checkStorageChange`** — replace sort parsing:
    ```ts
    if (saved.sort && typeof saved.sort === 'object') {
      const { field, direction } = saved.sort;
      if (field && (direction === 'asc' || direction === 'desc')) {
        this._sortCriteria = [{ field, direction }];
        this._emitStateEvent('fv-sort-change', { sorts: this._sortCriteria });
      }
    }
    ```

11. **`willUpdate`** — replace `_sortConfig` references with `_sortCriteria[0]` for single-sort storage compat or adapt `_persistPayload`.

12. **Header menu hydration** in `_onHeaderMenuOpen`:
    - Remove `menu.currentSort = this._sortConfig`
    - Add `menu.currentSorts = this._sortCriteria`
    - Update the local type annotation for `menu` to use `currentSorts: SortCriterion[]` instead of `currentSort: SortChangeDetail | null`

13. **`_renderView`** — pass `currentSorts` to `fv-grid` instead of `currentSort`:
    ```ts
    .currentSorts=${this._sortCriteria}
    ```

---

## Review Workload Forecast

| Metric | Estimate | Actual |
|--------|---------|--------|
| Estimated changed lines | ~420–480 | ~900+ |
| 400-line budget risk | **High** | High |
| Chained PRs recommended | No | No |
| Decision needed before apply | No | No |
| Delivery strategy | **single-pr** | single-pr |

**Actual lines changed** (git diff --stat):
- 11 files changed, ~1348 insertions(+), 354 deletions(-)
- Test suite: 248 tests passing (was 137)
