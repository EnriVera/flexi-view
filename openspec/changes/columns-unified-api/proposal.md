# Proposal: columns-unified-api

## Intent

Flexi-view currently requires users to pass 3 separate properties (`fieldGrids`, `fieldRows`, `fieldCards`) to configure columns for each view type. There's existing fallback logic (lines 462-463 in fv-view.ts) that reuses `fieldGrids` when other props are empty, but no way to set all three at once. Add a `columns` setter that populates all three column properties simultaneously for convenience while maintaining backward compatibility.

## Scope

### In Scope
- Add `columns` setter in `fv-view.ts` that assigns same column config to `fieldGrids`, `fieldRows`, and `fieldCards`
- Update TypeScript `DataViewOptions` interface to include optional `columns` property
- Document the new API in the fv-view spec

### Out of Scope
- Changes to individual view components (fv-grid, fv-list, fv-cards)
- Removing or modifying existing fallback behavior

## Capabilities

### New Capabilities
- `unified-columns-api`: Single `columns` property that sets columns for all view types at once

### Modified Capabilities
- `fv-view`: Extended to support `columns` as convenience setter alongside existing fieldXxx props

## Approach

Add a setter property `columns` in the fv-view component that, when assigned, populates `fieldGrids`, `fieldRows`, and `fieldCards` with the same column configuration. The setter should:
1. Accept `ColumnConfig<T>[]` type
2. Assign the value to all three internal properties
3. Not override explicitly set fieldXxx props if they were already set (or use standard property precedence)

This maintains backward compatibility since existing code using fieldXxx continues to work unchanged.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/components/fv-view.ts` | Modified | Add `columns` setter |
| `src/types.ts` | Modified | Add `columns` to DataViewOptions |
| `openspec/specs/fv-view/spec.md` | Modified | Document new requirement |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Setter conflicts with existing props | Low | Setter runs after fieldXxx initialization; document precedence |
| Type incompatibility | Low | Use same ColumnConfig<T>[] type as existing props |

## Rollback Plan

1. Revert changes in `fv-view.ts` to remove the `columns` setter
2. Remove `columns` from `DataViewOptions` in `types.ts`
3. Revert `openspec/specs/fv-view/spec.md` to remove the new requirement
4. All existing code using `fieldGrids`/`fieldRows`/`fieldCards` continues to work unchanged

## Dependencies

- None (pure internal API addition)

## Success Criteria

- [ ] Passing `columns` to `<fv-view>` populates all three view types with same columns
- [ ] Existing code using `fieldGrids`, `fieldRows`, or `fieldCards` continues to work
- [ ] TypeScript compiles without errors
- [ ] Component renders correctly in grid, list, and cards views with unified columns