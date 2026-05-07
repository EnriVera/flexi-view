# Spec: fv-view (from change: remove-column-fallback)

## REMOVED Requirements

### Requirement: Column configs MUST fall back when view-specific prop missing

This requirement is REMOVED. The fallback behavior is eliminated to ensure each view type is independent.

**Removed behavior:**
- `fieldRows` no longer falls back to `fieldGrids`
- `fieldCards` no longer falls back to `fieldGrids`
- Each view type uses ONLY its configured field property

#### Scenario: fieldRows does NOT fall back to fieldGrids (REMOVED)

- GIVEN `<fv-view view="list">` with only `fieldGrids="[{field: &quot;id&quot;}]"` provided
- WHEN list view renders
- THEN `<fv-list>` SHALL receive empty column array `[]`

#### Scenario: fieldCards does NOT fall back to fieldGrids (REMOVED)

- GIVEN `<fv-view view="cards">` with only `fieldGrids="[{field: &quot;id&quot;}]"` provided
- WHEN cards view renders
- THEN `<fv-cards>` SHALL receive empty column array `[]`

---

## ADDED Requirements

### Requirement: Each view type MUST use only its own field property

Each view type in `<fv-view>` SHALL use exclusively the corresponding field property:

| View Type | Column Source | Fallback |
|-----------|---------------|----------|
| grid | `fieldGrids` | `[]` (empty) |
| list | `fieldRows` | `[]` (empty) |
| cards | `fieldCards` | `[]` (empty) |

#### Scenario: grid view uses only fieldGrids

- GIVEN `<fv-view view="grid">` with `fieldGrids="[{field: &quot;id&quot;, title: &quot;ID&quot;}]"` and `fieldRows` and `fieldCards` empty
- WHEN grid view renders
- THEN `<fv-grid>` SHALL receive column config from `fieldGrids`
- AND `<fv-list>` SHALL receive empty column array `[]`
- AND `<fv-cards>` SHALL receive empty column array `[]`

#### Scenario: list view uses only fieldRows

- GIVEN `<fv-view view="list">` with `fieldRows="[{field: &quot;name&quot;, title: &quot;Name&quot;}]"` and `fieldGrids` and `fieldCards` empty
- WHEN list view renders
- THEN `<fv-list>` SHALL receive column config from `fieldRows`
- AND `<fv-grid>` SHALL receive empty column array `[]`
- AND `<fv-cards>` SHALL receive empty column array `[]`

#### Scenario: cards view uses only fieldCards

- GIVEN `<fv-view view="cards">` with `fieldCards="[{field: &quot;email&quot;, title: &quot;Email&quot;}]"` and `fieldGrids` and `fieldRows` empty
- WHEN cards view renders
- THEN `<fv-cards>` SHALL receive column config from `fieldCards`
- AND `<fv-grid>` SHALL receive empty column array `[]`
- AND `<fv-list>` SHALL receive empty column array `[]`

#### Scenario: all three field props set independently

- GIVEN `<fv-view>` with:
  - `fieldGrids="[{field: &quot;id&quot;, title: &quot;ID&quot;}]"`
  - `fieldRows="[{field: &quot;name&quot;, title: &quot;Name&quot;}]"`
  - `fieldCards="[{field: &quot;email&quot;, title: &quot;Email&quot;}]"`
- WHEN view cycles through grid → list → cards
- THEN grid view shows "ID" column from `fieldGrids`
- AND list view shows "Name" column from `fieldRows`
- AND cards view shows "Email" column from `fieldCards`

#### Scenario: no fieldXxx props renders empty view

- GIVEN `<fv-view view="grid">` with no fieldXxx props
- WHEN grid view renders
- THEN `<fv-grid>` SHALL receive empty column array `[]`

#### Scenario: search uses only fieldGrids

- GIVEN `<fv-view view="grid">` with `fieldGrids="[{field: &quot;name&quot;}]"` and `fieldRows` empty
- WHEN user triggers search via `_onSearch()`
- THEN search operation SHALL use columns from `fieldGrids`
- AND NOT from `fieldRows` or `fieldCards`

---

## Summary

| Requirement | Type | Status |
|-------------|------|--------|
| Column fallback logic | REMOVED | Eliminated in all locations |
| View-specific column independence | ADDED | Each view uses only its own prop |