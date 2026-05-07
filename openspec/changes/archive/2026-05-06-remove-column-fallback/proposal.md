# Proposal: remove-column-fallback

## Intent

Remove fallback logic in fv-view so each view type uses ONLY its own field configuration property. Currently grid, list, and cards views are not independent—setting `fieldCards` doesn't affect cards view if `fieldGrids` or `fieldRows` have content. This creates confusing API behavior where consumers cannot have different column configs per view.

## Scope

### In Scope
- Modify `src/components/fv-view.ts` to remove fallback in all 4 locations
- Update `openspec/specs/fv-view/spec.md` to remove fallback requirement
- Verify existing tests pass

### Out of Scope
- Changes to fv-list.ts, fv-cards.ts, fv-grid.ts (they don't have fallback)
- No new test files required

## Capabilities

### Modified Capabilities
- `fv-view`: Remove the "Column fallback logic" requirement from the spec

## Approach

Direct removal of fallback ternary chains in fv-view.ts:

1. **Line 44** (`get columnDefs()`): Change from cascading fallback to return only `_fieldGrids`
2. **Line 137** (`get columns()`): Change to return only `_fieldGrids`
3. **Line 209** (`_onSearch()`): Use only `fieldGrids` for search fields
4. **Lines 489-491** (`_renderView()`): Remove fallback assignments, use each prop directly

Also consider removing the `columns` setter (lines 112-135) since it populates all three fieldXxx props and may become unnecessary.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/components/fv-view.ts:44` | Modified | `columnDefs` getter returns only `_fieldGrids` |
| `src/components/fv-view.ts:137` | Modified | `columns` getter returns only `_fieldGrids` |
| `src/components/fv-view.ts:209` | Modified | `_onSearch` uses only `fieldGrids` |
| `src/components/fv-view.ts:489-491` | Modified | `_renderView` uses direct props |
| `openspec/specs/fv-view/spec.md` | Modified | Remove fallback requirement |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Breaking existing consumers relying on fallback | Low | Fallback was undocumented behavior; well-documented components should use explicit fieldXxx |
| Tests fail due to expected fallback | Low | Update test expectations as needed |

## Rollback Plan

Revert changes to fv-view.ts and restore fallback ternary chains. The change is purely mechanical—replacing fallbacks with direct property access. No data migration needed.

## Dependencies

- None—pure refactor within fv-view component

## Success Criteria

- [ ] fv-view with only fieldGrids: grid renders with columns, list/cards empty
- [ ] fv-view with only fieldRows: list renders with columns, grid/cards empty
- [ ] fv-view with only fieldCards: cards render with columns, grid/list empty
- [ ] All existing tests pass