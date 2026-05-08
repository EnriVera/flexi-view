# Tasks: inline-actions

artifact_store.mode: hybrid
project: flexi-view
delivery_strategy: single-pr
strict_tdd: true
test_command: pnpm test

---

## Phase 1: fv-grid sort icon fix (foundation)

### 1. Change fv-grid currentSorts property type

**File**: `src/components/fv-grid.ts`

**Task**: Change `currentSort` property from `SortChangeDetail | null` to `currentSorts: SortCriterion[]`

**Changes**:
- Rename property `currentSort` → `currentSorts`
- Change type from `SortChangeDetail | null` to `SortCriterion[]`
- Initialize as empty array `[]`

**Acceptance Criteria**:
- [x] Property `currentSorts` exists on `fv-grid` as `SortCriterion[]`
- [x] No TypeScript errors on property type change

---

### 2. Fix fv-grid header sort icon visibility

**File**: `src/components/fv-grid.ts`

**Task**: Update `_renderHeader()` to use `.find()` to check if column is in sorts array, show correct direction

**Changes**:
- Line ~67: Find sort entry for column using `this.currentSorts.find(s => s.field === field)`
- Show sort icon (↑ or ↓) if sort entry exists for ANY column in sorts array
- Display correct direction per column from sorts array

**Reference** (design.md lines 68-74):
```typescript
const sortEntry = this.currentSorts.find(s => s.field === field);
const isSorted = !!sortEntry;
const sortIndicator = isSorted ? (sortEntry.direction === 'asc' ? '↑' : '↓') : '';
```

**Acceptance Criteria**:
- [x] Sort icon shows on ANY column in sorts array (not just primary)
- [x] Sort icon shows correct direction (↑ for asc, ↓ for desc) per column
- [x] Multiple sorted columns all show their respective icons

---

### 3. Update fv-view to pass currentSorts correctly to fv-grid

**File**: `src/components/fv-view.ts`

**Task**: Update fv-grid element in fv-view render to use `currentSorts` prop

**Changes**:
- Update `<fv-grid>` element to pass `currentSorts=${this._sortCriteria}` instead of old `currentSort` property

**Acceptance Criteria**:
- [x] fv-view passes `currentSorts` (not `currentSort`) to fv-grid
- [x] Grid correctly receives sort array from fv-view

---

## Phase 2: fv-sort-action chip redesign

### 2.1 Add internalMode property to fv-sort-action

**File**: `src/components/fv-sort-action.ts`

**Task**: Add `internalMode` boolean property for internal rendering mode

**Changes**:
- Add `@property({ type: Boolean }) internalMode = false`
- Skip `_connect()` in `connectedCallback` when `internalMode` is true
- When `internalMode` is true, skip `for` attribute handling entirely

**Acceptance Criteria**:
- [x] `internalMode` property exists and defaults to false
- [x] When `internalMode=true`, component skips `_connect()` and `for` attribute
- [x] Standalone sort behavior works without target view element

---

### 2.2 Add currentSorts property binding for internal mode

**File**: `src/components/fv-sort-action.ts`

**Task**: Accept sorts via property binding when in internal mode

**Changes**:
- Add `currentSorts` property binding
- When `internalMode=true`, use `currentSorts` property instead of querying view
- Sort cycling/activation updates local state and emits `sort-change` event

**Acceptance Criteria**:
- [ ] `currentSorts` property accepted when `internalMode=true`
- [ ] Component correctly reflects sort state from bound `currentSorts`
- [ ] `sort-change` event updates fv-view state when used internally

---

### 2.3 Redesign fv-sort-action CSS to minimalist chip

**File**: `src/components/fv-sort-action.ts`

**Task**: Apply chip styling per design.md CSS strategy

**Changes**:
- Apply `display: inline-flex` chip layout
- Main button: `padding: 4px 10px`, `font-weight: 500`, gap 6px between icon/label
- Clear button: `border-left: 1px solid var(--fv-border)`, `padding: 4px 8px`
- Subtle background on hover instead of heavy borders
- Border radius `4px` with unified boundary
- Use `part` attribute for external styling hooks

**Reference** (design.md lines 40-44):
```css
.chip { display: inline-flex; align-items: stretch; border: 1px solid var(--fv-border); border-radius: 4px; overflow: hidden; }
button.main { display: flex; align-items: center; gap: 6px; padding: 4px 10px; font-weight: 500; }
button.clear { border-left: 1px solid var(--fv-border); padding: 4px 8px; }
```

**Acceptance Criteria**:
- [ ] Chip renders as single unified button with icon + label
- [ ] Clear (×) button appears only when active, shares chip boundary
- [ ] Hover uses subtle background (not heavy borders)
- [ ] Chip height approximately 32px

---

### 2.4 Fix modal direction button labels to "Asc"/"Desc"

**File**: `src/components/fv-sort-action.ts`

**Task**: Fix direction buttons in sort modal to show only "Asc" / "Desc"

**Changes**:
- Update modal direction button labels (lines ~263, ~271) to show short labels only
- Format: `↑ Asc` and `↓ Desc` — no field name
- Add visual highlight/active state to currently selected direction button

**Acceptance Criteria**:
- [ ] Direction buttons show "Asc" and "Desc" only (no "field - Asc")
- [ ] Active direction button has distinct visual feedback (highlighted/filled)
- [ ] Inactive direction button appears in default state

---

## Phase 3: fv-filter-action chip redesign

### 3.1 Add internalMode property to fv-filter-action

**File**: `src/components/fv-filter-action.ts`

**Task**: Add `internalMode` boolean property

**Changes**:
- Add `@property({ type: Boolean }) internalMode = false`
- Skip `_connect()` when `internalMode` is true
- Skip `for` attribute handling in internal mode

**Acceptance Criteria**:
- [ ] `internalMode` property exists and defaults to false
- [ ] When `internalMode=true`, component operates without target view element

---

### 3.2 Add currentFilters and options property binding for internal mode

**File**: `src/components/fv-filter-action.ts`

**Task**: Accept filters and options via property when in internal mode

**Changes**:
- Add `currentFilters` property binding
- Add `options` property binding (for field metadata)
- When `internalMode=true`, use properties instead of view query

**Acceptance Criteria**:
- [ ] `currentFilters` and `options` properties work in internal mode
- [ ] `filter-change` event updates fv-view state correctly

---

### 3.3 Redesign fv-filter-action CSS to minimalist chip

**File**: `src/components/fv-filter-action.ts`

**Task**: Apply same chip styling strategy as fv-sort-action

**Changes**:
- Apply `display: inline-flex` chip layout
- Main button with filter icon + "Filter" label
- Clear button shares unified chip boundary
- Subtle background on hover, minimal borders

**Acceptance Criteria**:
- [ ] Chip renders with icon + label, compact ~32px height
- [ ] Clear button appears only when active with shared boundary
- [ ] Hover uses subtle background

---

## Phase 4: fv-export-action chip redesign

### 4.1 Add internalMode property to fv-export-action

**File**: `src/components/fv-export-action.ts`

**Task**: Add `internalMode` boolean property

**Changes**:
- Add `@property({ type: Boolean }) internalMode = false`
- Skip `_connect()` when `internalMode` is true

**Acceptance Criteria**:
- [ ] `internalMode` property exists and defaults to false
- [ ] Component works without target view element in internal mode

---

### 4.2 Add registers and fieldGrids property binding for internal mode

**File**: `src/components/fv-export-action.ts`

**Task**: Accept data via property binding in internal mode

**Changes**:
- Add `registers` property binding
- Add `fieldGrids` property binding
- When `internalMode=true`, use properties instead of view query

**Acceptance Criteria**:
- [ ] `registers` and `fieldGrids` properties work in internal mode
- [ ] Export functionality operates with bound data

---

### 4.3 Redesign fv-export-action CSS to minimalist chip

**File**: `src/components/fv-export-action.ts`

**Task**: Apply chip styling strategy

**Changes**:
- Apply `display: inline-flex` chip layout
- Export icon + "Export" label
- Compact ~32px height
- Subtle hover states

**Acceptance Criteria**:
- [ ] Chip renders with icon + label
- [ ] Height approximately 32px
- [ ] Hover uses subtle background

---

### 4.4 Add dropdown menu for format selection

**File**: `src/components/fv-export-action.ts`

**Task**: Add dropdown menu with format options (csv, json, xlsx)

**Changes**:
- Add custom popover/dropdown on chip click
- Options: CSV, JSON, XLSX
- Selecting format triggers export
- Consistent with fv-filter-action modal pattern

**Acceptance Criteria**:
- [ ] Click opens dropdown with format options
- [ ] Selecting CSV exports CSV format
- [ ] Selecting JSON exports JSON format
- [ ] Selecting XLSX exports XLSX format
- [ ] Dropdown closes on selection or outside click

---

## Phase 5: fv-view internal action rendering

### 5.1 Add showSort, showFilter, showExport boolean props to fv-view

**File**: `src/components/fv-view.ts`

**Task**: Add three boolean properties for internal action control

**Changes**:
- Add `@property({ type: Boolean }) showSort = false`
- Add `@property({ type: Boolean }) showFilter = false`
- Add `@property({ type: Boolean }) showExport = false`

**Reference**: spec.md fv-view/spec.md for exact prop names and defaults

**Acceptance Criteria**:
- [ ] `showSort` defaults to false
- [ ] `showFilter` defaults to false
- [ ] `showExport` defaults to false

---

### 5.2 Add _shouldShowInternalActions() helper

**File**: `src/components/fv-view.ts`

**Task**: Add helper method to check if internal actions should render

**Changes**:
- Add `private _shouldShowInternalActions(): boolean` method
- Returns `true` when `this._activeView !== 'grid'` AND any internal prop is set

**Reference**: design.md line 157 — check `this._activeView !== 'grid'`

**Acceptance Criteria**:
- [ ] Returns true when view !== 'grid' and showSort/showFilter/showExport is set
- [ ] Returns false when in grid view regardless of props
- [ ] Returns false when view !== 'grid' but no props are set

---

### 5.3 Update fv-view render() to include internal actions in controls bar

**File**: `src/components/fv-view.ts`

**Task**: Render internal action chips in controls div when conditions met

**Changes**:
- In render(), check `_shouldShowInternalActions()` before rendering internal actions
- Render `<fv-sort-action internalMode .currentSorts=${this._sortCriteria}>` when `showSort=true`
- Render `<fv-filter-action internalMode .currentFilters=${this._filters}>` when `showFilter=true`
- Render `<fv-export-action internalMode .registers=${this._filteredData}>` when `showExport=true`
- Place in controls div alongside search and switcher

**Reference**: design.md lines 112-118 for property binding syntax

**Acceptance Criteria**:
- [ ] Internal actions render only when view !== 'grid'
- [ ] Each internal action receives correct property bindings
- [ ] Internal actions render in controls div (not elsewhere)
- [ ] `showSort=true` renders fv-sort-action chip in controls

---

### 5.4 Ensure internal actions receive _sortCriteria and _filters via property binding

**File**: `src/components/fv-view.ts`

**Task**: Verify all property bindings are correct

**Changes**:
- Bind `currentSorts=${this._sortCriteria}` to fv-sort-action
- Bind `currentFilters=${this._filters}` to fv-filter-action
- Bind `registers=${this._filteredData}` to fv-export-action

**Acceptance Criteria**:
- [ ] fv-sort-action receives `_sortCriteria` as `currentSorts`
- [ ] fv-filter-action receives `_filters` as `currentFilters`
- [ ] fv-export-action receives `_filteredData` as `registers`
- [ ] Property updates propagate correctly to internal actions

---

## Phase 6: Internal mode integration

### 6.1 Verify fv-sort-action internal mode integration

**File**: `src/components/fv-sort-action.ts`

**Task**: Ensure fv-sort-action works correctly when bound to fv-view

**Changes**:
- When `internalMode=true`, component accepts `currentSorts` via property
- On sort change, emits `sort-change` event that fv-view receives
- fv-view updates `_sortCriteria`, which propagates back via property

**Acceptance Criteria**:
- [ ] Sort action chip appears in fv-view controls when showSort=true
- [ ] Clicking sort chip toggles direction and emits event
- [ ] fv-view state updates, new sort reflects in chip
- [ ] External standalone fv-sort-action still works with `for` attribute

---

### 6.2 Verify fv-filter-action internal mode integration

**File**: `src/components/fv-filter-action.ts`

**Task**: Ensure fv-filter-action works correctly when bound to fv-view

**Changes**:
- When `internalMode=true`, accepts `currentFilters` via property
- Opens filter modal on click (same as external mode)
- Emits `filter-change` events that fv-view receives

**Acceptance Criteria**:
- [ ] Filter action chip appears in fv-view controls when showFilter=true
- [ ] Clicking chip opens filter modal
- [ ] fv-view state updates after filter applied
- [ ] External standalone fv-filter-action still works

---

### 6.3 Verify fv-export-action internal mode integration

**File**: `src/components/fv-export-action.ts`

**Task**: Ensure fv-export-action works correctly when bound to fv-view

**Changes**:
- When `internalMode=true`, accepts `registers` via property
- Dropdown menu shows format options on click
- Export works with bound data

**Acceptance Criteria**:
- [ ] Export action chip appears in fv-view controls when showExport=true
- [ ] Click opens dropdown with CSV/JSON/XLSX options
- [ ] Selecting format triggers export with correct data
- [ ] External standalone fv-export-action still works

---

## Phase 7: Integration tests

### 7.1 Test fv-view with showSort in list/cards view

**Files**: `src/components/__tests__/fv-view.spec.ts` (or relevant test file)

**Task**: Add/verify tests for showSort functionality

**Changes**:
- Test: `showSort=true` renders internal sort chip in list view
- Test: `showSort=true` renders internal sort chip in cards view
- Test: `showSort=true` does NOT render in grid view (grid uses header sort)

**Acceptance Criteria**:
- [ ] Test passes: showSort renders chip in list view
- [ ] Test passes: showSort renders chip in cards view
- [ ] Test passes: showSort ignored in grid view

---

### 7.2 Test fv-view with showFilter and showExport in list/cards view

**Files**: `src/components/__tests__/fv-view.spec.ts` (or relevant test file)

**Task**: Add/verify tests for showFilter and showExport

**Changes**:
- Test: `showFilter=true` renders internal filter chip
- Test: `showExport=true` renders internal export chip
- Test: All three work together

**Acceptance Criteria**:
- [ ] Test passes: showFilter renders chip in list/cards view
- [ ] Test passes: showExport renders chip in list/cards view
- [ ] Test passes: All three render together when all props set

---

### 7.3 Test external standalone components still work

**Files**: `src/components/__tests__/fv-sort-action.spec.ts`, etc.

**Task**: Verify external mode unchanged

**Changes**:
- Test: fv-sort-action with `for` attribute works as before
- Test: fv-filter-action with `for` attribute works as before
- Test: fv-export-action with `for` attribute works as before

**Acceptance Criteria**:
- [ ] External sort action still connects to fv-view via `for` attribute
- [ ] External filter action still works with `for` attribute
- [ ] External export action still works with `for` attribute

---

### 7.4 Test grid header sort icons

**Files**: `src/components/__tests__/fv-grid.spec.ts`

**Task**: Add/verify tests for multi-column sort icon display

**Changes**:
- Test: Sort icon shows on primary sorted column
- Test: Sort icon shows on secondary sorted column
- Test: Sort icon shows correct direction (↑ or ↓) per column

**Acceptance Criteria**:
- [ ] Test passes: sort icon visible on any sorted column
- [ ] Test passes: icon shows correct direction per column
- [ ] Test passes: multiple sorted columns each show appropriate icon

---

### 7.5 Run full test suite

**Task**: Execute `pnpm test` and verify all tests pass

**Command**: `pnpm test`

**Acceptance Criteria**:
- [ ] All existing tests pass
- [ ] All new tests pass
- [ ] Total test count >= 248

---

## Summary

| Phase | Tasks | Files Modified |
|-------|-------|----------------|
| 1 | 1.1, 1.2, 1.3 | `fv-grid.ts`, `fv-view.ts` |
| 2 | 2.1, 2.2, 2.3, 2.4 | `fv-sort-action.ts` |
| 3 | 3.1, 3.2, 3.3 | `fv-filter-action.ts` |
| 4 | 4.1, 4.2, 4.3, 4.4 | `fv-export-action.ts` |
| 5 | 5.1, 5.2, 5.3, 5.4 | `fv-view.ts` |
| 6 | 6.1, 6.2, 6.3 | `fv-sort-action.ts`, `fv-filter-action.ts`, `fv-export-action.ts` |
| 7 | 7.1, 7.2, 7.3, 7.4, 7.5 | Test files + full suite |

**Total Tasks**: 21

**Dependency Order**:
1. Phase 1 (fv-grid fix) must complete before Phase 7 integration tests
2. Phase 2-4 (chip redesigns) can proceed in parallel after Phase 1
3. Phase 5 (fv-view rendering) requires Phase 2-4 complete
4. Phase 6 (internal mode integration) requires Phase 5
5. Phase 7 (tests) requires Phase 1-6 complete