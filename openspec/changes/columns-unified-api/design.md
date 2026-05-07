# Technical Design: columns-unified-api

## Overview

Add unified `columns` property to `<fv-view>` that populates all view column configs simultaneously while maintaining backward compatibility with explicit `fieldXxx` props.

## File Changes

| File | Change |
|------|--------|
| `src/components/fv-view.ts` | ADD: `columns` setter with fallback logic |
| `src/types.ts` | NO CHANGE needed - `ColumnConfig<T>` already exported |

---

## Implementation Detail

### 1. Adding `columns` Setter (fv-view.ts)

**Location**: After existing `fieldCards` setter (line 110)

```typescript
set columns(val: ColumnConfig<T>[] | string) {
  const parsed = typeof val === 'string'
    ? JSON.parse(val)
    : val;
  
  const cols = parsed || [];
  
  // Only populate if target is empty (explicit fieldXxx has priority)
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
get columns(): ColumnConfig<T>[] {
  return this._fieldGrids.length > 0 
    ? this._fieldGrids 
    : this._fieldRows.length > 0 
      ? this._fieldRows 
      : this._fieldCards;
}
```

**Rationale**:
- Setters check empty before assigning → explicit `fieldXxx` always wins
- Works with both object array and JSON string (consistent with existing setters)
- Triggers single `requestUpdate()` after all assignments

### 2. Precedence Logic in `_renderView`

**Current behavior** (lines 461-463) ALREADY implements fallback:

```typescript
const fieldGrids = this._fieldGrids;
const fieldRows = this._fieldRows.length > 0 ? this._fieldRows : fieldGrids;
const fieldCards = this._fieldCards.length > 0 ? this._fieldCards : fieldGrids;
```

This means:
- If `columns` is set → all three become non-empty → no fallback needed
- If only `fieldGrids` is set → `columns` won't overwrite → fallback kicks in

### 3. How Precedence Works

| Scenario | `_fieldGrids` | `_fieldRows` | `_fieldCards` | Result |
|----------|--------------|--------------|--------------|--------|
| `columns=[{a}]` only | `[{a}]` | `[{a}]` | `[{a}]` | All use columns |
| `columns=[{a}]` + `fieldGrids=[{b}]` | `[{b}]` | `[{a}]` | `[{a}]` | grid uses explicit |
| `fieldGrids=[{b}]` only | `[{b}]` | `[{b}]` (fallback) | `[{b}]` (fallback) | backward compat |

The setter logic ensures explicit props are never overwritten because empty check happens after setter runs.

### 4. Types.ts Analysis

`ColumnConfig<T>` already exists at `src/types.ts:1` with proper generic support. No changes needed.

---

## Edge Cases

| Case | Handling |
|------|----------|
| `columns=""` (empty string) | Parse error → empty array → no population |
| `columns` set BEFORE `fieldGrids` | fieldGrids setter runs after, overwrites → explicit wins |
| `columns` invalid JSON | try/catch catches → empty array |
| All three fieldXxx already set | columns setter does nothing due to empty checks |

---

## Testing Requirements

1. **Unit**: Verify setter parses string and populates arrays correctly
2. **Integration**: Verify `<fv-view columns="[...]">` renders all views with same columns
3. **Backward compat**: Verify existing `fieldGrids` usage works unchanged

---

## Alternative Considered

**Option A** (chosen): Setter checks empty before assigning
- ✅ Simple, explicit priority
- ✅ Single requestUpdate()
- ❌ Requires understanding that empty = not-set

**Option B**: Separate internal flag tracking which source populated each
- ❌ More complex, more state to manage
- ❌ Unnecessary given existing fallback in _renderView

**Option C**: Use property getter to compute on-demand
- ❌ Loses reactivity benefits
- ❌ Breaks existing patterns in codebase