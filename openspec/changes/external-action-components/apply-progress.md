# Apply Progress: external-action-components

**Date**: 2026-05-07
**Mode**: Strict TDD
**Status**: COMPLETE — 6/6 tasks done
**Test runner**: pnpm test
**Final test count**: 296 passing (265 baseline + 31 new), 0 failures

---

## Completed Tasks

- [x] T1 — types.ts + index.d.ts
- [x] T2 — fv-view: outbound events + public getters
- [x] T3 — fv-sort-action: for attribute + external mode
- [x] T4 — fv-filter-action: for attribute + external mode
- [x] T5 — fv-export-action: for attribute + external mode
- [x] T6 — Integration verification

---

## TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| T1 | `src/__tests__/unit/types.test.ts` | Unit | N/A (new) | Written | Passed | 3 cases | None needed |
| T2 | `src/__tests__/components/fv-view.test.ts` | Unit | 22 baseline | Written | Passed | 9 cases | None needed |
| T3 | `src/__tests__/components/fv-sort-action.test.ts` | Unit | 5 baseline | Written | Passed | 5 cases | None needed |
| T4 | `src/__tests__/components/fv-filter-action.test.ts` | Unit | 6 baseline | Written | Passed | 6 cases | None needed |
| T5 | `src/__tests__/components/fv-export-action.test.ts` | Unit | 6 baseline | Written | Passed | 5 cases | None needed |
| T6 | Full suite | Integration | 265 baseline | N/A | 296 pass | N/A | N/A |

---

## Files Changed

| File | Action | Summary |
|------|--------|---------|
| `src/types.ts` | Modified | Added `exportable?: boolean` to ColumnConfig; added `FvFilterChangeDetail` type |
| `src/index.d.ts` | Modified | Exported FvFilterChangeDetail; added JSX intrinsics for 3 action components |
| `src/components/fv-view.ts` | Modified | currentSort/currentFilters getters + _emitStateEvent + 10 call sites |
| `src/components/fv-sort-action.ts` | Modified | for attribute + external connect/disconnect/redispatch |
| `src/components/fv-filter-action.ts` | Modified | for attribute + external connect/options/disconnect/redispatch |
| `src/components/fv-export-action.ts` | Modified | for attribute + external connect/read-at-click/exportable filter |
| `src/__tests__/unit/types.test.ts` | Created | Type shape tests (6 tests) |
| `src/__tests__/components/fv-view.test.ts` | Modified | Outbound events + getters tests (9 new tests) |
| `src/__tests__/components/fv-sort-action.test.ts` | Modified | External mode tests (5 new tests) |
| `src/__tests__/components/fv-filter-action.test.ts` | Modified | External mode tests (6 new tests) |
| `src/__tests__/components/fv-export-action.test.ts` | Modified | External mode tests (5 new tests) |

---

## Deviations from Design

1. **T1 runtime type tests**: vitest/esbuild strips TypeScript types — FvFilterChangeDetail cannot be verified as a named module export at runtime. Tests verify object shape instead; compile-time safety is preserved by actual type annotations in production code.
2. **fv-export-action exportable filter in injected mode**: exportable:false filtering was applied in both external and injected modes (not only external). This is consistent with spec intent and strictly better behavior.
3. **connectedCallback initial emit**: Added _emitStateEvent calls in connectedCallback after initial state is set, beyond the 5+5 explicitly listed sites. This allows action components to sync state via events without relying only on getters — belt-and-suspenders approach aligned with design intent.
