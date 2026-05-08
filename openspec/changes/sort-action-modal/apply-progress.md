# Apply Progress: sort-action-modal

**Status**: done  
**Mode**: Strict TDD (RED → GREEN for each phase)  
**Final test count**: 222 tests, 18 test files — all passing

---

## Completed Tasks

- [x] T-01 · Add i18n keys to en.ts (`sort.title`, `sort.selectField`)
- [x] T-02 · Add i18n keys to es.ts (`sort.title`, `sort.selectField`)
- [x] T-03 · Create `src/components/fv-sort-button.ts` (copy of old fv-sort-action, renamed)
- [x] T-04 · Update `src/components/fv-header-menu.ts` (replace fv-sort-action import/tags with fv-sort-button)
- [x] T-05 · fv-sort-action — properties, state, _connect, persistence helpers (full rewrite)
- [x] T-06 · fv-sort-action — render template (chip + inline modal)
- [x] T-07 · fv-sort-action — event handlers (_openModal, _closeModal, _selectField, _onApply, _onClear, _emit)
- [x] T-08 · Create `src/__tests__/components/fv-sort-button.test.ts` (21 tests)
- [x] T-09 · Rewrite `src/__tests__/components/fv-sort-action.test.ts` (40 tests, new behavior)
- [x] T-10 · Spot-check `src/__tests__/components/fv-header-menu.test.ts` — 9 tests pass unchanged

---

## Files Changed

| File | Action | Notes |
|---|---|---|
| `src/i18n/en.ts` | Modified | Added `sort.title` and `sort.selectField` |
| `src/i18n/es.ts` | Modified | Added `sort.title` and `sort.selectField` |
| `src/components/fv-sort-button.ts` | Created | Copy of old fv-sort-action chip behavior |
| `src/components/fv-header-menu.ts` | Modified | Import + tags swapped to fv-sort-button |
| `src/components/fv-sort-action.ts` | Rewritten | Single-button + inline modal trigger |
| `src/__tests__/components/fv-sort-button.test.ts` | Created | 21 tests for chip behavior |
| `src/__tests__/components/fv-sort-action.test.ts` | Rewritten | 40 tests for new modal behavior |

---

## TDD Cycle Evidence

| Task | RED | GREEN | REFACTOR |
|---|---|---|---|
| T-01/T-02 i18n | Existing tests pass — no RED needed for pure data | Added keys, verified compile-time type safety | — |
| T-03 fv-sort-button | T-08 tests written | T-03 created matching behavior | — |
| T-04 fv-header-menu | T-10 ran, 9 tests pass | Import/tag swap done | — |
| T-05/T-06/T-07 fv-sort-action rewrite | T-09 tests written (old tests failed as expected RED) | Component rewritten, all new tests GREEN | Fixed `_openModal` guard test (modal preselects _selectedField) |

---

## Deviations from Design

- `_readSortFromUrl()` implemented inline in the component (not importing `readSortFromUrl` from persistence.ts) to match the implementation provided in the instructions. The design mentions using the persistence util, but the provided code uses a private method. This is consistent with the ADR-4 decision to use a dedicated sub-key.

---

## Issues Found

- Test for "_onApply closes modal after applying": `_openModal()` resets `_selectedField = _activeSort?.field ?? null`, so calling `_openModal()` then testing `_onApply` required directly setting `_modalOpen = true` and `_selectedField` to avoid the guard overwriting the test state. This is an expected unit-test pattern for JSDOM environments without full Lit lifecycle.
