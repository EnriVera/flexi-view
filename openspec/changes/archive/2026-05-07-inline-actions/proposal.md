# Proposal: inline-actions

## Intent

Redesign `fv-sort-action`, `fv-filter-action`, `fv-export-action` as minimalist chip/icon buttons and support dual placement: external (standalone, existing) and internal (rendered inside `fv-view` when view !== 'grid'). Also fix grid column header sort feedback: sort icon visible when column is sorted, active direction button shows visual feedback.

## Scope

### In Scope
- Redesign `fv-sort-action`, `fv-filter-action`, `fv-export-action` to minimalist chip style (icon + label, same visual language as `fv-switcher`)
- Add `showSort`, `showFilter`, `showExport` boolean props to `fv-view` — render actions internally when view !== 'grid'
- External components (`fv-sort-action` etc.) remain fully functional and unchanged in API
- Fix fv-grid column header sort icon visibility when column is sorted
- Direction buttons (Asc/Desc) show visual feedback for active state
- Direction buttons show only "Asc" / "Desc" text (no column name)

### Out of Scope
- Changing event names or API contracts for external components
- Grid inline actions (grid always uses column headers for sort)
- Multi-target support for `for` attribute

## Capabilities

### New Capabilities
- `inline-sort-action`: `fv-sort-action` in minimalista chip style with internal rendering support
- `inline-filter-action`: `fv-filter-action` in minimalista chip style with internal rendering support
- `inline-export-action`: `fv-export-action` in minimalista chip style with internal rendering support

### Modified Capabilities
- `fv-view`: add `showSort`, `showFilter`, `showExport` props for internal action placement
- `fv-grid`: fix column header sort icon visibility and direction button active feedback

## Approach

1. **Component redesign**: Apply minimalist chip style to the three action components — compact inline buttons with icon + label, unified visual boundary, same design language as `fv-switcher`.
2. **Internal placement**: `fv-view` renders the three actions in its controls bar (alongside switcher/search) when the corresponding prop is true AND `_activeView !== 'grid'`.
3. **Grid header fix**: `fv-grid` column header shows sort icon when column is in `sortConfig`; direction buttons (Asc/Desc) get active state styling; labels show only direction text.
4. **Preserve external usage**: Standalone components (`<fv-sort-action for="...">`) remain fully functional — no API changes.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/components/fv-view.ts` | Modified | Add `showSort`, `showFilter`, `showExport` props; render actions internally |
| `src/components/fv-sort-action.ts` | Modified | Redesign to minimalista chip; internal rendering support |
| `src/components/fv-filter-action.ts` | Modified | Redesign to minimalista chip; internal rendering support |
| `src/components/fv-export-action.ts` | Modified | Redesign to minimalista chip; internal rendering support |
| `src/components/fv-grid.ts` | Modified | Fix sort icon visibility; direction button active feedback |
| `src/types.ts` | Modified | New prop types for fv-view |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|-------------|
| TDD regression: 248 tests must pass | High | Write tests first; ensure all existing tests pass before considering done |
| Chip style diverges from fv-switcher | Med | Reference fv-switcher CSS directly; shared design tokens |
| Internal rendering duplicates external component logic | Low | Share underlying logic; internal uses same component instances |

## Rollback Plan

Each component change is isolated and additive. To revert: remove `showSort`/`showFilter`/`showExport` props from `fv-view`, revert component redesigns to previous state. Grid sort header fix is CSS-only and easily reverted.

## Dependencies

- None.

## Success Criteria

- [ ] `pnpm test` passes — 248 tests baseline maintained
- [ ] `fv-sort-action`, `fv-filter-action`, `fv-export-action` display as minimalist chips (icon + label, unified chip boundary)
- [ ] `fv-view` accepts `showSort`, `showFilter`, `showExport` props
- [ ] Internal actions render only when view !== 'grid'
- [ ] External standalone components work unchanged
- [ ] Grid column header shows sort icon when column is sorted
- [ ] Grid direction buttons (Asc/Desc) show active state feedback
- [ ] Grid direction buttons show only "Asc" / "Desc" text