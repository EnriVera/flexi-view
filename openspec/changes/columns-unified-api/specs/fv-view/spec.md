# Delta for fv-view (change: columns-unified-api)

## ADDED Requirements

### Requirement: fv-view MUST accept unified `columns` property

The `<fv-view>` component SHALL accept a `columns` property that sets column configuration for all view types simultaneously.

- Property name: `columns`
- Type: `ColumnConfig<T>[]`
- When set: populates `fieldGrids`, `fieldRows`, and `fieldCards` with the same value

#### Scenario: columns populates all view types

- GIVEN `<fv-view>` with `columns="[{field: &quot;id&quot;, title: &quot;ID&quot;}]"` and NO fieldXxx props
- WHEN component renders in any view (grid/list/cards)
- THEN all three internal column properties SHALL contain the same column config

#### Scenario: columns with partial fieldXxx uses explicit values

- GIVEN `<fv-view>` with `columns="[{field: &quot;c1&quot;}]"` and `fieldGrids="[{field: &quot;g1&quot;}]"`
- WHEN grid view renders
- THEN `<fv-grid>` SHALL use `fieldGrids` value `{field: "g1"}`
- AND `<fv-list>` and `<fv-cards>` SHALL use `columns` value `{field: "c1"}`

---

### Requirement: Column precedence MUST follow explicit-first rule

When `columns` and view-specific props are both provided:
1. Use explicitly-set view-specific prop if available
2. Use `columns` as fallback when view-specific prop is empty/unset

#### Scenario: explicit fieldRows takes precedence over columns

- GIVEN `<fv-view view="list">` with `columns="[{field: &quot;c&quot;}]"` and `fieldRows="[{field: &quot;r&quot;}]"`
- WHEN list view renders
- THEN `<fv-list>` SHALL receive `{field: "r"}` from `fieldRows`

#### Scenario: backward compatibility with only fieldGrids

- GIVEN `<fv-view view="grid">` with only `fieldGrids="[{field: &quot;id&quot;}]"` and NO `columns`
- WHEN grid view renders
- THEN existing fallback behavior SHALL apply: grid uses fieldGrids, list/cards fall back to fieldGrids

---

## Summary

| Requirement | Type | Status |
|-------------|------|--------|
| columns property | ADDED | Unified columns setter |
| Column precedence | ADDED | Explicit-first fallback |
| Backward compat | ADDED | fieldXxx only works unchanged |