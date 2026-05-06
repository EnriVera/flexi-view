# Tasks: Icon Components + Theme Object

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: single-pr
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Add icon type + normalization + update components | PR 1 | All changes in single PR |

## Phase 1: Types and Foundation

- [x] 1.1 Add `FlexiViewIconValue` type union to `src/types.ts` (string | React.ComponentType | Function)
- [x] 1.2 Update `FlexiViewIcons` interface to use `FlexiViewIconValue` for all icon keys

## Phase 2: Core Implementation

- [x] 2.1 Add `normalizeIcon()` utility function to `src/registry.ts`
- [x] 2.2 Update `getFlexiConfig()` in `src/registry.ts` to use `normalizeIcon()` when returning icons
- [x] 2.3 Update `src/components/fv-switcher.ts` to use normalized icons from config
- [x] 2.4 Update `src/components/fv-sort-action.ts` to use normalized icons
- [x] 2.5 Update `src/components/fv-filter-action.ts` to use normalized icons
- [x] 2.6 Update `src/components/fv-export-action.ts` to use normalized icons
- [x] 2.7 Update `src/components/fv-header-menu.ts` to use normalized icons

## Phase 3: Testing

- [x] 3.1 Add unit tests in `src/__tests__/unit/registry.test.ts` for `normalizeIcon()` with string input
- [x] 3.2 Add unit tests for `normalizeIcon()` with render function input
- [ ] 3.3 Add unit tests for `normalizeIcon()` with React component-like object input
- [x] 3.4 Verify existing tests still pass (string icons backward compatibility)

## Phase 4: Verification

- [x] 4.1 Run `npm test` to verify all tests pass
- [x] 4.2 Verify type checking passes with TypeScript