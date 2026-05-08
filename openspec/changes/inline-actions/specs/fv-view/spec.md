# Delta for fv-view

## ADDED Requirements

### Requirement: fv-view MUST accept showSort, showFilter, showExport props

The `<fv-view>` component SHALL accept three boolean properties for internal action rendering:

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `showSort` | `boolean` | `false` | Show sort action inside fv-view |
| `showFilter` | `boolean` | `false` | Show filter action inside fv-view |
| `showExport` | `boolean` | `false` | Show export action inside fv-view |

**Scenario: showSort defaults to false**

- GIVEN `<fv-view>` with no `showSort` attribute
- WHEN component renders
- THEN no internal sort action is rendered
- AND external fv-sort-action components work normally

**Scenario: showSort=true renders internal sort chip**

- GIVEN `<fv-view showSort="true">`
- WHEN view type is "list" or "cards" (not "grid")
- THEN an internal fv-sort-action chip appears in the controls bar

**Scenario: showSort ignored in grid view**

- GIVEN `<fv-view view="grid" showSort="true">`
- WHEN component renders in grid view
- THEN no internal sort action appears in controls bar
- AND grid column headers handle sort (existing behavior)

**Scenario: All three props work independently**

- GIVEN `<fv-view showSort showFilter showExport>`
- WHEN view type is "list" or "cards"
- THEN internal chips for sort, filter, and export appear together in controls bar

---

### Requirement: Internal actions render in controls div

The internal actions (fv-sort-action, fv-filter-action, fv-export-action) SHALL render inside the controls `<div>` in `fv-view` render(), alongside search and switcher controls.

**Scenario: Controls div includes internal actions**

- GIVEN `<fv-view showSort="true" showSearch="true">`
- WHEN view renders
- THEN the controls div contains fv-search (if showSearch) AND fv-sort-action (if showSort and view !== 'grid')

**Scenario: _shouldShowInternalActions helper**

- GIVEN `fv-view` with showSort, showFilter, showExport props
- WHEN `_shouldShowInternalActions()` is called
- THEN it returns true when any internal action prop is set

---

### Requirement: fv-view MUST add internalMode to internal actions

When rendering internal actions, `fv-view` SHALL pass `internalMode` attribute to each action component so they operate without `for` attribute target requirements.

**Scenario: Internal actions receive internalMode**

- GIVEN `<fv-view showSort="true">`
- WHEN internal sort-action is rendered
- THEN it receives `internalMode` attribute
- AND the sort-action functions without a target view element