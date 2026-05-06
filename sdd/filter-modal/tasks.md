# Tasks: filter-modal

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~180-220 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Delivery strategy | single-pr |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: stacked-to-main
400-line budget risk: Low

## Phase 1: Create fv-filter-modal component

- [x] 1.1 Create `src/components/fv-filter-modal.ts` with modal overlay, checkbox list, header, and footer
- [x] 1.2 Add backdrop click and Escape key close handlers
- [x] 1.3 Implement `filter-change` event dispatch with `FilterChangeDetail`
- [x] 1.4 Add empty state and scrollable options styling

## Phase 2: Update fv-header-menu

- [x] 2.1 Add `@state() private _isFilterModalOpen = false` property
- [x] 2.2 Add "Ver todos" button in filter section
- [x] 2.3 Import and render `fv-filter-modal` when `column.filterable === true`
- [x] 2.4 Wire up `_openFilterModal` and `_closeFilterModal` methods
- [x] 2.5 Re-dispatch `filter-change` event from modal

## Phase 3: Export and verify

- [x] 3.1 Add `import './components/fv-filter-modal.js'` to `src/index.ts`
- [x] 3.2 Write unit tests for `fv-filter-modal` in `src/__tests__/components/fv-filter-modal.test.ts`

## Implementation Order

1. Create the modal component first (Phase 1)
2. Integrate into header-menu (Phase 2)
3. Export and test (Phase 3)