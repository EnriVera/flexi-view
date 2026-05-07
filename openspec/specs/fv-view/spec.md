# Spec: fv-view (from change: rename-data-to-registers)

## ADDED Requirements

### Requirement: fv-view MUST accept `registers` property

The `<fv-view>` component SHALL accept a `registers` property as the primary data source, replacing the deprecated `data` property.

- Property name: `registers`
- Type: `T[] | string` (array of records or JSON string)
- Default: `[]`

#### Scenario: fv-view renders with registers prop

- GIVEN `<fv-view>` with `registers` attribute containing `[{id: 1, name: "Alice"}]`
- WHEN component renders
- THEN the internal data array SHALL contain one record with `id: 1` and `name: "Alice"`

#### Scenario: fv-view parses JSON string in registers

- GIVEN `<fv-view>` with `registers="[{&quot;id&quot;:2}]"` (JSON string)
- WHEN component renders
- THEN the internal data array SHALL contain parsed record `{id: 2}`

---

### Requirement: fv-view MUST accept view-specific column props

The `<fv-view>` component SHALL accept three distinct column configuration props, one for each view type:

| Property | Type | View Type |
|----------|------|-----------|
| `fieldGrids` | `ColumnConfig<T>[]` | grid |
| `fieldRows` | `ColumnConfig<T>[]` | list |
| `fieldCards` | `ColumnConfig<T>[]` | cards |

#### Scenario: fv-view renders grid with fieldGrids

- GIVEN `<fv-view view="grid">` with `fieldGrids="[{field: &quot;id&quot;, title: &quot;ID&quot;}]"`
- WHEN grid view renders
- THEN `<fv-grid>` SHALL receive column config with field "id"

#### Scenario: fv-view renders list with fieldRows

- GIVEN `<fv-view view="list">` with `fieldRows="[{field: &quot;name&quot;, title: &quot;Name&quot;}]"`
- WHEN list view renders
- THEN `<fv-list>` SHALL receive column config with field "name"

#### Scenario: fv-view renders cards with fieldCards

- GIVEN `<fv-view view="cards">` with `fieldCards="[{field: &quot;email&quot;, title: &quot;Email&quot;}]"`
- WHEN cards view renders
- THEN `<fv-cards>` SHALL receive column config with field "email"

---

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

## ADDED Requirements (from change: columns-unified-api)

### Requirement: fv-view MUST accept unified `columns` property

The `<fv-view>` component SHALL accept a `columns` property that sets column configuration for all view types simultaneously.

- Property name: `columns`
- Type: `ColumnConfig<T>[]`
- When set: populates `fieldGrids`, `fieldRows`, and `fieldCards` with the same value

#### Scenario: columns populates all view types

- GIVEN `<fv-view>` with `columns="[{field: "id", title: "ID"}]"` and NO fieldXxx props
- WHEN component renders in any view (grid/list/cards)
- THEN all three internal column properties SHALL contain the same column config

#### Scenario: columns with partial fieldXxx uses explicit values

- GIVEN `<fv-view>` with `columns="[{field: "c1"}]"` and `fieldGrids="[{field: "g1"}]"`
- WHEN grid view renders
- THEN `<fv-grid>` SHALL use `fieldGrids` value `{field: "g1"}`
- AND `<fv-list>` and `<fv-cards>` SHALL use `columns` value `{field: "c1"}`

---

### Requirement: Column precedence MUST follow explicit-first rule

When `columns` and view-specific props are both provided:
1. Use explicitly-set view-specific prop if available
2. Use `columns` as fallback when view-specific prop is empty/unset

#### Scenario: explicit fieldRows takes precedence over columns

- GIVEN `<fv-view view="list">` with `columns="[{field: "c"}]"` and `fieldRows="[{field: "r"}]"`
- WHEN list view renders
- THEN `<fv-list>` SHALL receive `{field: "r"}` from `fieldRows`

#### Scenario: backward compatibility with only fieldGrids

- GIVEN `<fv-view view="grid">` with only `fieldGrids="[{field: "id"}]"` and NO `columns`
- WHEN grid view renders
- THEN existing fallback behavior SHALL apply: grid uses fieldGrids, list/cards fall back to fieldGrids

---

## MODIFIED Requirements

### Requirement: DataViewOptions type MUST reflect renamed properties

The `DataViewOptions<T>` interface in `src/types.ts` SHALL use the new property names:

```typescript
export interface DataViewOptions<T = Record<string, unknown>> {
  registers: T[];
  fieldGrids?: ColumnConfig<T>[];
  fieldRows?: ColumnConfig<T>[];
  fieldCards?: ColumnConfig<T>[];
  view?: 'grid' | 'list' | 'cards';
  storageKey?: string;
}
```

(Previously: `data: T[]` and `columns: ColumnConfig<T>[]`)

#### Scenario: DataViewOptions with registers and fieldGrids

- GIVEN `DataViewOptions` with `registers: [{id: 1}]` and `fieldGrids: [{field: 'id'}]`
- WHEN options are applied to fv-view
- THEN view SHALL render with registers data and grid columns

#### Scenario: DataViewOptions with all three fieldXxx

- GIVEN `DataViewOptions` with `registers`, `fieldGrids`, `fieldRows`, `fieldCards` all provided
- WHEN view type changes between grid/list/cards
- THEN appropriate column config SHALL be used for each view

---

## REMOVED Requirements

### Requirement: `data` property MUST NOT be accepted

The `data` property on `<fv-view>` SHALL be removed. Consumers MUST use `registers` instead.

(Reason: Breaking change to improve API semantics)

### Requirement: `columns` property (optional convenience prop)

The `columns` property on `<fv-view>` is an optional convenience property that populates all three view column configs simultaneously. Consumers MAY use `columns` for simpler APIs or continue using `fieldGrids`, `fieldRows`, and `fieldCards` for explicit view-specific control.

(Note: Re-introduced in columns-unified-api change as backward compatibility convenience)

---

## Summary

| Requirement | Type | Status |
|-------------|------|--------|
| registers property | ADDED | New data source prop |
| fieldGrids/fieldRows/fieldCards | ADDED | View-specific column props |
| View-specific column independence | ADDED | Each view uses only its own prop |
| columns property (convenience) | ADDED | Unified columns setter (columns-unified-api) |
| Column precedence (explicit-first) | ADDED | Explicit props override columns fallback |
| DataViewOptions update | MODIFIED | Type signature change |
| data property | REMOVED | Replaced by registers |
| Column fallback logic | REMOVED | Eliminated - views are independent |