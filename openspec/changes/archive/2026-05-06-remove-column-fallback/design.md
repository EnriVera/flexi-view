# Design: remove-column-fallback

## Overview

This design documents the implementation approach for removing cascading fallback logic in `fv-view.ts`. The goal is to ensure each view type (grid, list, cards) uses only its configured field property, eliminating implicit fallback behavior that creates confusing API semantics.

## Current State (Baseline)

### Source File
- `src/components/fv-view.ts` (506 lines)

### Fallback Locations to Remove

| # | Location | Current Code | Purpose |
|---|----------|---------------|---------|
| 1 | Line 44 | `columnDefs` getter | Cascading fallback to `_fieldGrids` → `_fieldRows` → `_fieldCards` |
| 2 | Line 137 | `columns` getter | Identical to `columnDefs` |
| 3 | Line 209 | `_onSearch()` | Uses fallback to determine search fields |
| 4 | Lines 489-491 | `_renderView()` | Fallback for `fieldRows` and `fieldCards` to `fieldGrids` |
| 5 | Lines 112-135 | `columns` setter | Populates empty fieldXxx props — behavior needs reconsideration |

---

## Implementation Plan

### Task 1: Update `columnDefs` getter (Line 44)

**Current:**
```typescript
get columnDefs(): ColumnConfig<T>[] { 
  return this._fieldGrids.length > 0 ? this._fieldGrids : this._fieldRows.length > 0 ? this._fieldRows : this._fieldCards; 
}
```

**After:**
```typescript
get columnDefs(): ColumnConfig<T>[] { 
  return this._fieldGrids; 
}
```

**Rationale:** `columnDefs` is used externally by `header-menu` for grid column configuration. Should return grid-specific columns only. If consumers need other view types, they can access `fieldRows` or `fieldCards` directly.

---

### Task 2: Update `columns` getter (Line 137)

**Current:**
```typescript
get columns(): ColumnConfig<T>[] {
  return this._fieldGrids.length > 0 ? this._fieldGrids : this._fieldRows.length > 0 ? this._fieldRows : this._fieldCards;
}
```

**After:**
```typescript
get columns(): ColumnConfig<T>[] {
  return this._fieldGrids;
}
```

**Rationale:** Consistency with `columnDefs`. Return grid columns only.

---

### Task 3: Update `_onSearch()` method (Line 209)

**Current:**
```typescript
private _onSearch = (e: Event) => {
  const { value } = (e as CustomEvent<{ value: string }>).detail;
  const activeColumns = this.fieldGrids.length > 0 ? this.fieldGrids : this.fieldRows.length > 0 ? this.fieldRows : this.fieldCards;
  const searchFields = activeColumns
    .filter(col => col.field != null)
    .map(col => String(col.field));
  // ... rest of method
};
```

**After:**
```typescript
private _onSearch = (e: Event) => {
  const { value } = (e as CustomEvent<{ value: string }>).detail;
  const searchFields = this.fieldGrids
    .filter(col => col.field != null)
    .map(col => String(col.field));
  // ... rest of method
};
```

**Rationale:** Search should only use grid columns per the spec. This aligns with requirement that search operations use `fieldGrids`.

---

### Task 4: Update `_renderView()` method (Lines 489-491)

**Current:**
```typescript
private _renderView(data: T[]) {
  const fieldGrids = this._fieldGrids;
  const fieldRows = this._fieldRows.length > 0 ? this._fieldRows : fieldGrids;
  const fieldCards = this._fieldCards.length > 0 ? this._fieldCards : fieldGrids;
  switch (this._activeView) {
    case 'list':
      return html`<fv-list .registers=${data} .fieldRows=${fieldRows}></fv-list>`;
    case 'cards':
      return html`<fv-cards .registers=${data} .fieldCards=${fieldCards}></fv-cards>`;
    default:
      return html`<fv-grid .registers=${data} .fieldGrids=${fieldGrids} ... ></fv-grid>`;
  }
}
```

**After:**
```typescript
private _renderView(data: T[]) {
  switch (this._activeView) {
    case 'list':
      return html`<fv-list .registers=${data} .fieldRows=${this._fieldRows}></fv-list>`;
    case 'cards':
      return html`<fv-cards .registers=${data} .fieldCards=${this._fieldCards}></fv-cards>`;
    default:
      return html`<fv-grid .registers=${data} .fieldGrids=${this._fieldGrids} ... ></fv-grid>`;
  }
}
```

**Rationale:** Each view type now receives only its configured columns. Empty arrays render empty views as specified.

---

### Task 5: Reconsider `columns` setter (Lines 112-135)

**Current behavior:**
```typescript
set columns(val: ColumnConfig<T>[] | string) {
  // ... parse val into cols
  if (this._fieldGrids.length === 0) {
    this._fieldGrids = cols;
  }
  if (this._fieldRows.length === 0) {
    this._fieldRows = cols;
  }
  if (this._fieldCards.length === 0) {
    this._fieldCards = cols;
  }
  this.requestUpdate();
}
```

**Option A — Remove entirely:**
- Delete the setter completely
- Consumers must set each `fieldXxx` property explicitly
- **Pros:** Cleaner API, explicit is better than implicit
- **Cons:** Breaking change for any consumer using `columns` setter

**Option B — Populate ALL three (not just empty ones):**
```typescript
set columns(val: ColumnConfig<T>[] | string) {
  let cols: ColumnConfig<T>[];
  // ... parse val
  this._fieldGrids = cols;
  this._fieldRows = cols;
  this._fieldCards = cols;
  this.requestUpdate();
}
```
- Sets ALL three to the same value
- **Pros:** Backward compatible for consumers using the setter
- **Cons:** Doesn't add new functionality; still results in all three having identical columns

### Decision: Option A — Remove entirely

The `columns` setter's current behavior of populating only empty slots was itself a form of implicit fallback. With independence established, the setter becomes redundant—the consumer should explicitly set each `fieldXxx` property.

**Risk mitigation:** Document this as a breaking change in the spec update.

---

## Testing Considerations

### Existing Tests
- Verify test expectations that relied on fallback behavior
- Specific scenarios to check:
  - `<fv-view view="list">` with only `fieldGrids` set → expects `[]` for list columns (may have been expecting `fieldGrids`)
  - `<fv-view view="cards">` with only `fieldGrids` set → expects `[]` for cards columns

### Test Updates Required (if any)
- Update assertion values to expect empty arrays where fallback was previously assumed
- No new test files needed

---

## File Changes Summary

| File | Change Type | Lines |
|------|-------------|-------|
| `src/components/fv-view.ts` | Modify | 44, 137, 209, 489-491, 112-135 |
| `openspec/specs/fv-view/spec.md` | Update | Already updated in spec phase |

---

## Verification Checklist

- [ ] `columnDefs` getter returns only `_fieldGrids`
- [ ] `columns` getter returns only `_fieldGrids`
- [ ] `_onSearch()` uses only `fieldGrids` for search fields
- [ ] `_renderView()` passes each fieldXxx prop directly without fallback
- [ ] `columns` setter removed or updated
- [ ] All existing tests pass
- [ ] Grid view renders with `_fieldGrids` columns
- [ ] List view renders with `_fieldRows` columns (empty if not set)
- [ ] Cards view renders with `_fieldCards` columns (empty if not set)

---

## Dependencies

- No external dependencies
- No changes to `fv-grid.ts`, `fv-list.ts`, `fv-cards.ts`
- Spec already updated in previous phase

---

## Rollback Plan

If issues arise in production:
1. Revert all changes to `fv-view.ts`
2. Restore the five fallback ternary chains
3. No data migration needed—change is purely local to the component

---

## Timeline Estimate

- Tasks 1-4: Simple one-liner replacements (10 min)
- Task 5: Remove setter block (~25 lines) (5 min)
- Testing: Run existing tests, fix if needed (15 min)

**Total:** ~30 minutes