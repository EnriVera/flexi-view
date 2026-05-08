# Tasks: rename-data-to-registers

## Phase: Implementation

### 1.1 fv-view component — rename data→registers, add fieldGrids/fieldRows/fieldCards
**Files**: `src/components/fv-view.ts`

- Rename `_data` to `_registers`
- Rename `data(val)` setter to `registers(val)` 
- Rename `get data()` to `get registers()`
- Remove `columns` setter, add `fieldGrids`, `fieldRow`, `fieldCards` setters
- Rename `_columns` to `_fieldGrids`, `_fieldRows`, `_fieldCards`
- Update `_renderView()` to pass correct fieldXxx prop to child components

### 1.2 fv-grid component — rename data→registers, columns→fieldGrids
**Files**: `src/components/fv-grid.ts`

- Rename `@property({ attribute: false }) data` to `registers`
- Rename `@property({ attribute: false }) columns` to `fieldGrids`

### 1.3 fv-list component — rename data→registers, columns→fieldRows
**Files**: `src/components/fv-list.ts`

- Rename `@property({ attribute: false }) data` to `registers`
- Rename `@property({ attribute: false }) columns` to `fieldRows`

### 1.4 fv-cards component — rename data→registers, columns→fieldCards
**Files**: `src/components/fv-cards.ts`

- Rename `@property({ attribute: false }) data` to `registers`
- Rename `@property({ attribute: false }) columns` to `fieldCards`

### 1.5 fv-header-menu component — rename data→registers, columns→fieldGrids
**Files**: `src/components/fv-header-menu.ts`

- Rename `@property({ attribute: false }) data` to `registers`
- Rename `@property({ attribute: false }) columns` to `fieldGrids`

### 1.6 fv-export-action component — rename data→registers, columns→fieldGrids
**Files**: `src/components/fv-export-action.ts`

- Rename `.data` to `.registers`
- Rename `.columns` to `.fieldGrids`

### 1.7 types.ts — update DataViewOptions and HeaderMenuElement
**Files**: `src/types.ts`

- Update `DataViewOptions.data` → `registers`
- Add `DataViewOptions.fieldGrids`, `DataViewOptions.fieldRows`, `DataViewOptions.fieldCards`
- Update `HeaderMenuElement.data` → `registers`

### 1.8 index.d.ts — update JSX types
**Files**: `src/index.d.ts`

- Update all component JSX intrinsicElement definitions: `data`→`registers`, `columns`→`fieldGrids/fieldRows/fieldCards`

---

## Phase: Testing

### 2.1 fv-view tests — update property references
**Files**: `src/__tests__/components/fv-view.test.ts`

- Update `data` → `registers` in test assertions
- Add test for fieldGrids/fieldRows/fieldCards fallback logic
- Add test for JSON string parsing in registers

### 2.2 fv-grid tests — update property references
**Files**: `src/__tests__/components/fv-grid.test.ts`

- Update `data` → `registers`
- Update `columns` → `fieldGrids`

### 2.3 fv-list tests — update property references
**Files**: `src/__tests__/components/fv-list.test.ts`

- Update `data` → `registers`
- Update `columns` → `fieldRows`

### 2.4 fv-cards tests — update property references
**Files**: `src/__tests__/components/fv-cards.test.ts`

- Update `data` → `registers`
- Update `columns` → `fieldCards`

### 2.5 fv-header-menu tests — update property references
**Files**: `src/__tests__/components/fv-header-menu.test.ts`

- Update `data` → `registers`
- Update `columns` → `fieldGrids`

### 2.6 fv-export-action tests — update property references
**Files**: `src/__tests__/components/fv-export-action.test.ts`

- Update `.data` → `.registers`
- Update `.columns` → `.fieldGrids`

---

## Summary

| Phase | Tasks |
|-------|-------|
| Implementation | 8 |
| Testing | 6 |
| **Total** | **14** |

### Dependencies
- Implementation tasks 1.1-1.6 depend on types.ts (1.7) being updated first
- index.d.ts (1.8) updated after all components

### Execution Order
1. types.ts (1.7) — foundational type definitions
2. Components (1.1-1.6) — implementation changes
3. index.d.ts (1.8) — type declarations
4. Tests (2.1-2.6) — update after components