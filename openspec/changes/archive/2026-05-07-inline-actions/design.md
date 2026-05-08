# Design: inline-actions

## Technical Approach

Redesign `fv-sort-action`, `fv-filter-action`, `fv-export-action` as minimalist chips and add internal rendering support in `fv-view`. Internal actions are property-bound directly to `fv-view` state — no event bus, no `for` attribute needed. Grid sort header and modal direction button labels are also fixed.

## Architecture Decisions

### Decision: Internal Mode Detection

**Choice**: `internalMode` boolean property on action components
**Alternatives considered**:
- Option A (`internal` prop): Duplicates intent but adds redundant naming
- Option B (detect via `for` absence): Magic behavior, harder to debug
- Option C (`placement: 'internal' | 'external'`): More verbose, same effect

**Rationale**: Explicit `internalMode` prop is self-documenting. When set, the component skips `for` attribute connection and operates in standalone mode bound directly to fv-view via properties.

### Decision: Internal Integration Pattern

**Choice**: Property binding from fv-view → action components, events flow back
**Data flow**:
```
fv-view (_sortCriteria, _filters)
  ├── currentSorts=${this._sortCriteria} ──→ fv-sort-action (internalMode)
  ├── currentFilters=${this._filters} ──────→ fv-filter-action (internalMode)
  └── filteredData ─────────────────────────→ fv-export-action (internalMode)
       │
       ← sort-change/filter-change events update fv-view state
```

**Rationale**: Internal actions are tightly coupled to fv-view — direct binding is simpler and faster than event-bus coordination. Events from internal actions update fv-view's state, which propagates back via new property bindings. No external broadcast.

### Decision: CSS Strategy for Chip Redesign

**Choice**: CSS containment with `display: inline-flex` chip, `part` attributes for styling hooks
**Reference**: `fv-switcher.ts` lines 13-43 — uses `inline-flex`, `padding: 8px`, `border-radius: 6px`, hover transitions

**Chip anatomy**:
```css
.chip { display: inline-flex; align-items: stretch; border: 1px solid var(--fv-border); border-radius: 4px; overflow: hidden; }
button.main { display: flex; align-items: center; gap: 6px; padding: 4px 10px; font-weight: 500; }
button.clear { border-left: 1px solid var(--fv-border); padding: 4px 8px; }
```

**Rationale**: Shared CSS containment ensures main/clear buttons share a unified boundary. `part` attributes allow external styling without CSS specificity wars.

### Decision: fv-grid currentSorts Type Fix

**Choice**: `fv-grid` receives `SortCriterion[]` (array), header uses `.some()` to check sort presence

**Current broken code** (line 67, 93):
```typescript
// Line 67 — wrong type
currentSort: SortChangeDetail | null = null;
// Line 93 — assumes single sort object
const isSorted = this.currentSort?.field === field && ...
```

**Fix**:
```typescript
// types.ts — current type alias is misleading, keep but note array nature
export type SortChangeDetail = { sorts: SortCriterion[] };

// fv-grid.ts — updated
@property({ attribute: false }) currentSorts: SortCriterion[] = [];

private _renderHeader(col: ColumnConfig<T>) {
  const field = col.field != null ? String(col.field) : col.title;
  const sortEntry = this.currentSorts.find(s => s.field === field);
  const isSorted = !!sortEntry;
  const sortIndicator = isSorted ? (sortEntry.direction === 'asc' ? '↑' : '↓') : '';
  ...
}
```

**Rationale**: fv-view already passes `currentSorts` as array (line 556 of fv-view.ts). fv-grid must match that contract.

### Decision: Direction Button Label Format

**Choice**: "↑ Asc" / "↓ Desc" — icon + short label, no field name
**Current** (fv-sort-action.ts line 263, 271):
```typescript
// Current — uses i18n full labels "Ascending" / "Descendente"
${unsafeHTML(icons.sortAsc || '↑')} ${i18n.sort.asc}
```

**Fix**:
```typescript
// Modal direction buttons — icon + short label only
<button class="dir-btn asc" ...>
  ${unsafeHTML(icons.sortAsc || '↑')} Asc
</button>
<button class="dir-btn desc" ...>
  ${unsafeHTML(icons.sortDesc || '↓')} Desc
</button>
```

**Rationale**: Spec explicitly requires "Asc" / "Desc" only. Keep i18n keys for future external use but hardcode short labels in modal for this release.

## Component Interaction Diagrams

### External Mode (existing behavior)
```
fv-sort-action ──for="view-id"──→ fv-view
     │                            │
     └──── sort-change events ────┘
```

### Internal Mode (new)
```
fv-view (controls div)
  ├── <fv-sort-action internalMode .currentSorts=${this._sortCriteria}>
  ├── <fv-filter-action internalMode .currentFilters=${this._filters}>
  └── <fv-export-action internalMode .registers=${this._filteredData}>
       │
       └──── sort-change/filter-change ──→ fv-view updates _sortCriteria/_filters
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/components/fv-view.ts` | Modify | Add `showSort`, `showFilter`, `showExport` boolean props; render internal actions in controls div when view !== 'grid' and corresponding prop is true |
| `src/components/fv-sort-action.ts` | Modify | Add `internalMode` property; skip `_connect()` when set; add direct property binding for `currentSorts`; fix modal direction button labels to "Asc"/"Desc" |
| `src/components/fv-filter-action.ts` | Modify | Add `internalMode` property; skip `_connect()` when set; add direct property binding for `currentFilters` and `options` |
| `src/components/fv-export-action.ts` | Modify | Add `internalMode` property; skip `_connect()` when set; add dropdown menu for format selection (csv/json/xlsx); bind directly to `registers` and `fieldGrids` |
| `src/components/fv-grid.ts` | Modify | Change `currentSort` property to `currentSorts: SortCriterion[]`; fix header sort icon visibility using `.some()` |
| `src/types.ts` | No change | SortChangeDetail already correctly typed as `{ sorts: SortCriterion[] }` |

## Implementation Approach

### Phase 1: fv-grid fix (low risk, isolated)
- Change `currentSort: SortChangeDetail | null` to `currentSorts: SortCriterion[]`
- Update header render logic to use `.find()` + `.some()`
- Update fv-view.ts passing `currentSorts=${this._sortCriteria}` instead of the old property

### Phase 2: fv-sort-action internal mode + modal labels
- Add `@property({ type: Boolean }) internalMode = false`
- In `connectedCallback`: skip `_connect()` if `internalMode` is true
- Add `currentSorts` property binding support (when internalMode, accept sorts via property instead of event)
- Fix direction button labels in modal to "Asc" / "Desc"

### Phase 3: fv-filter-action internal mode
- Add `internalMode` property
- Skip `_connect()` when set
- Add `currentFilters` and `options` property binding support

### Phase 4: fv-export-action internal mode + dropdown
- Add `internalMode` property
- Skip `_connect()` when set
- Add dropdown menu for format selection (csv, json, xlsx)
- Add `registers` and `fieldGrids` property binding support

### Phase 5: fv-view internal rendering
- Add `showSort`, `showFilter`, `showExport` boolean props (default: false)
- In render(), check `this._activeView !== 'grid'` before rendering internal actions
- Pass `internalMode` and relevant state properties to each action

## Open Questions

- [ ] fv-export-action dropdown: should dropdown appear on click (like fv-filter-action modal) or use native `<select>` or custom popover? Recommendation: custom popover for consistency with other actions.
- [ ] Should `showSort`/`showFilter`/`showExport` props also work in grid view for consistency, or is grid-exclusive behavior intentional? Spec says "render only when view !== 'grid'" — confirm this is intentional.

## Rollback Plan

Each component change is isolated:
1. Remove `showSort`/`showFilter`/`showExport` from fv-view → internal rendering gone
2. Revert chip CSS to previous state in each action component → visual design reverted
3. fv-grid fix is CSS + property rename → revert to `currentSort: SortChangeDetail | null` and `this.currentSort?.field` check

All changes are additive and isolated. No database migrations or config changes required.