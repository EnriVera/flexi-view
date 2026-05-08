# Tasks: remove-column-fallback

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~15 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Delivery strategy | single-pr |
| Chain strategy | N/A |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: N/A
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Remove fallback logic from fv-view.ts | Single PR | 5 location changes + test verification |

## Phase 1: Implementation

- [ ] 1.1 Update `get columnDefs()` at line 44 in fv-view.ts — remove fallback, return only `_fieldGrids`
- [ ] 1.2 Update `get columns()` at line 137 in fv-view.ts — remove fallback, return only `_fieldGrids`
- [ ] 1.3 Update `_onSearch()` around line 209 in fv-view.ts — remove fallback, use only `fieldGrids`
- [ ] 1.4 Update `_renderView()` around lines 489-491 in fv-view.ts — remove fallback, use `this._fieldRows` and `this._fieldCards` directly
- [ ] 1.5 Remove `columns` setter at lines 112-135 in fv-view.ts — delete entire setter block

## Phase 2: Verification

- [ ] 2.1 Run `npm test` to verify no regressions
- [ ] 2.2 If tests fail, update expectations to expect empty arrays where fallback was previously assumed

---

Total tasks: 6 (1.1–1.5 + 2.1–2.2)