# Proposal: rename-data-to-registers

## Intent

Rename public API properties from `data` to `registers` and `columns` to `fieldGroups` (with three variants) to improve API clarity and semantic meaning for list/grid data configurations.

## Scope

### In Scope
- Rename `data` property to `registers` in fv-view and all child components (12 files)
- Replace single `columns` prop with three view-specific props: `fieldGrids`, `fieldRows`, `fieldCards`
- Update TypeScript types in types.ts
- Update index.d.ts JSX types
- Update all related test files

### Out of Scope
- Backward compatibility aliases (breaking change accepted)
- Documentation updates (separate task)
- Backward compatible deprecation warnings

## Approach

**Recommendation: Pure rename (breaking change)**

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Compatibility | Pure rename | Cleaner public API, no alias technical debt, library consumers expected to migrate |
| Columns structure | Three separate props (fieldGrids, fieldRows, fieldCards) | Each view type (grid/list/cards) has distinct layout needs; explicit is better than implicit |

The three-prop approach mirrors existing view-type architecture: `<fv-grid>`, `<fv-list>`, `<fv-cards>` already exist, so `fieldGrids`/fieldRows`/`fieldCards` props align with component names.

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Consumer breakage | High | Document in CHANGELOG; major version bump |
| Missing property updates | Medium | Comprehensive grep for "data" and "columns" before build |
| Type errors in consumers | High | Provide type migration guide |

## Rollback Plan

1. Revert property names in all affected files
2. Run tests to verify
3. Rollback requires same scope as forward change

## Success Criteria

- [ ] All 12 files renamed without type errors
- [ ] `npm test` passes
- [ ] `npm run build` produces valid output
- [ ] Library consumers can migrate with provided mapping guide